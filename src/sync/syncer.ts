import { join } from 'path';
import type {
  ToolkitConfig,
  EditorAdapter,
  SyncResult,
  SyncOptions,
  ContentFile,
} from '../core/types.js';
import {
  CONTENT_DIR,
  SKILLS_DIR,
  RULES_DIR,
  WORKFLOWS_DIR,
  OVERRIDES_DIR,
  AUTO_GENERATED_MARKER,
} from '../core/types.js';
import { getEnabledAdapters } from '../editors/registry.js';
import {
  findMarkdownFiles,
  writeTextFile,
  ensureDir,
} from '../utils/file-ops.js';
import { log } from '../utils/logger.js';
import { updateGitignore } from './gitignore.js';
import { cleanupOrphans } from './cleanup.js';
import { syncEditorSettings } from './settings-syncer.js';
import { resolveContentSources, resolveSourcePath } from './content-resolver.js';
import { detectSsotOrphans, detectSsotDiffs } from './ssot-detector.js';
import { autoPromoteContent } from './auto-promoter.js';
import { generateMCPConfigs } from './mcp-generator.js';
import { generateEntryPoints } from './entry-points.js';

export async function runSync(
  projectRoot: string,
  config: ToolkitConfig,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const { dryRun = false } = options;
  const result: SyncResult = {
    synced: [],
    skipped: [],
    removed: [],
    errors: [],
    ssotOrphans: [],
    ssotDiffs: [],
  };

  const adapters = getEnabledAdapters(config);

  if (adapters.length === 0) {
    log.warn('No editors enabled. Nothing to sync.');
    return result;
  }

  const modeLabel = dryRun ? ' (dry-run)' : '';
  log.header(`Syncing to ${adapters.length} editor(s): ${adapters.map((a) => a.name).join(', ')}${modeLabel}`);

  const contentDir = join(projectRoot, CONTENT_DIR);

  // 1. Ensure editor directories exist
  if (!dryRun) {
    for (const adapter of adapters) {
      await ensureDir(join(projectRoot, adapter.directories.rules));
      if (adapter.directories.skills) {
        await ensureDir(join(projectRoot, adapter.directories.skills));
      }
      if (adapter.directories.workflows) {
        await ensureDir(join(projectRoot, adapter.directories.workflows));
      }
    }
  }

  // 2. Resolve external content sources
  let externalRules: ContentFile[] = [];
  let externalSkills: ContentFile[] = [];
  let externalWorkflows: ContentFile[] = [];

  if (config.content_sources && config.content_sources.length > 0) {
    const external = await resolveContentSources(projectRoot, config.content_sources);
    externalRules = external.rules;
    externalSkills = external.skills;
    externalWorkflows = external.workflows;
  }

  // 2b. Auto-promote new local content to SSOT
  let ssotRoot: string | null = null;
  if (config.content_sources && config.content_sources.length > 0) {
    const localSource = config.content_sources.find((s) => s.type === 'local' && s.path);
    if (localSource) {
      ssotRoot = await resolveSourcePath(projectRoot, localSource);
      if (ssotRoot && !dryRun) {
        await autoPromoteContent(contentDir, ssotRoot, dryRun);
      }
    }
  }

  // 3. Sync rules (external first, then local — local wins on name conflict)
  const rulesDir = join(contentDir, RULES_DIR);
  const localRules = await findMarkdownFiles(rulesDir, rulesDir);
  const localRuleNames = new Set(localRules.map((r) => r.name));
  const rules = [
    ...externalRules.filter((r) => !localRuleNames.has(r.name)),
    ...localRules,
  ];
  if (rules.length > 0) {
    log.info(`Found ${rules.length} rule(s)${externalRules.length > 0 ? ` (${externalRules.filter((r) => !localRuleNames.has(r.name)).length} external)` : ''}`);
    for (const rule of rules) {
      await syncContentToEditors(projectRoot, rule, 'rules', adapters, config, result, dryRun);
    }
  }

  // 4. Sync skills (external first, then local — local wins on name conflict)
  const skillsDir = join(contentDir, SKILLS_DIR);
  const localSkills = await findMarkdownFiles(skillsDir, skillsDir);
  const localSkillNames = new Set(localSkills.map((s) => s.name));
  const skills = [
    ...externalSkills.filter((s) => !localSkillNames.has(s.name)),
    ...localSkills,
  ];
  if (skills.length > 0) {
    log.info(`Found ${skills.length} skill(s)${externalSkills.length > 0 ? ` (${externalSkills.filter((s) => !localSkillNames.has(s.name)).length} external)` : ''}`);
    for (const skill of skills) {
      await syncContentToEditors(projectRoot, skill, 'skills', adapters, config, result, dryRun);
    }
  }

  // 5. Sync workflows (only to editors that support them)
  const workflowsDir = join(contentDir, WORKFLOWS_DIR);
  const localWorkflows = await findMarkdownFiles(workflowsDir, workflowsDir);
  const localWorkflowNames = new Set(localWorkflows.map((w) => w.name));
  const workflows = [
    ...externalWorkflows.filter((w) => !localWorkflowNames.has(w.name)),
    ...localWorkflows,
  ];
  if (workflows.length > 0) {
    log.info(`Found ${workflows.length} workflow(s)${externalWorkflows.length > 0 ? ` (${externalWorkflows.filter((w) => !localWorkflowNames.has(w.name)).length} external)` : ''}`);
    const workflowAdapters = adapters.filter((a) => a.directories.workflows);
    for (const workflow of workflows) {
      await syncContentToEditors(
        projectRoot,
        workflow,
        'workflows',
        workflowAdapters,
        config,
        result,
        dryRun,
      );
    }
  }

  // 5. Apply editor-specific overrides
  await syncOverrides(projectRoot, adapters, result, dryRun);

  // 6. Generate entry points
  await generateEntryPoints(projectRoot, adapters, config, result, dryRun);

  // 7. Generate MCP configs
  if (config.mcp_servers && config.mcp_servers.length > 0) {
    await generateMCPConfigs(projectRoot, adapters, config, result, dryRun);
  }

  // 8. Sync editor settings (.editorconfig, .vscode/settings.json)
  if (config.settings) {
    const settingsFiles = await syncEditorSettings(projectRoot, config, dryRun);
    result.synced.push(...settingsFiles);
  }

  // 9. Cleanup orphaned files
  if (!dryRun) {
    const removedFiles = await cleanupOrphans(projectRoot, adapters, result);
    result.removed.push(...removedFiles);
  }

  // 10. Update .gitignore
  if (!dryRun) {
    await updateGitignore(projectRoot, adapters);
  } else {
    log.dryRun('would update', '.gitignore');
  }

  // 11. Detect SSOT orphans and diffs (shown after summary by CLI)
  if (ssotRoot) {
    result.ssotOrphans = await detectSsotOrphans(contentDir, ssotRoot);
    result.ssotDiffs = await detectSsotDiffs(contentDir, ssotRoot);
  }

  return result;
}

async function syncContentToEditors(
  projectRoot: string,
  file: ContentFile,
  type: 'rules' | 'skills' | 'workflows',
  adapters: EditorAdapter[],
  config: ToolkitConfig,
  result: SyncResult,
  dryRun: boolean,
): Promise<void> {
  for (const adapter of adapters) {
    const targetDir = type === 'rules'
      ? adapter.directories.rules
      : type === 'skills'
        ? adapter.directories.skills
        : adapter.directories.workflows;

    if (!targetDir) continue;

    try {
      let content = file.content;
      const sourcePath = `${CONTENT_DIR}/${type}/${file.relativePath}`;

      // Add frontmatter if the adapter supports it and it's a skill
      if (type === 'skills' && adapter.generateFrontmatter) {
        const frontmatter = adapter.generateFrontmatter(file.name);
        content = frontmatter + content;
      }

      // Wrap with auto-generated marker and source reference
      const wrappedContent = [
        AUTO_GENERATED_MARKER,
        `<!-- Source: ${sourcePath} -->`,
        '',
        content,
      ].join('\n');

      // Determine target path based on file naming convention
      let targetPath: string;
      if (adapter.fileNaming === 'subdirectory') {
        targetPath = join(projectRoot, targetDir, file.name, 'SKILL.md');
      } else {
        targetPath = join(projectRoot, targetDir, `${file.name}.md`);
      }

      if (dryRun) {
        log.dryRun('would write', join(targetDir, `${file.name}.md`));
      } else {
        await writeTextFile(targetPath, wrappedContent);
        log.synced(sourcePath, join(targetDir, `${file.name}.md`));
      }
      result.synced.push(targetPath);
    } catch (error) {
      const msg = `Failed to sync ${file.name} to ${adapter.name}: ${error instanceof Error ? error.message : error}`;
      log.error(msg);
      result.errors.push(msg);
    }
  }
}

async function syncOverrides(
  projectRoot: string,
  adapters: EditorAdapter[],
  result: SyncResult,
  dryRun: boolean,
): Promise<void> {
  const overridesDir = join(projectRoot, CONTENT_DIR, OVERRIDES_DIR);

  for (const adapter of adapters) {
    const editorOverridesDir = join(overridesDir, adapter.name);
    const overrides = await findMarkdownFiles(editorOverridesDir, editorOverridesDir);

    for (const override of overrides) {
      try {
        // Overrides go to the rules directory by default
        const targetPath = join(
          projectRoot,
          adapter.directories.rules,
          `${override.name}.md`,
        );

        // Overrides are NOT marked as auto-generated (user-managed)
        if (dryRun) {
          log.dryRun('would write override', join(adapter.directories.rules, `${override.name}.md`));
        } else {
          await writeTextFile(targetPath, override.content);
          log.synced(
            `${CONTENT_DIR}/${OVERRIDES_DIR}/${adapter.name}/${override.relativePath}`,
            join(adapter.directories.rules, `${override.name}.md`),
          );
        }
        result.synced.push(targetPath);
      } catch (error) {
        const msg = `Failed to sync override ${override.name} to ${adapter.name}: ${error instanceof Error ? error.message : error}`;
        log.error(msg);
        result.errors.push(msg);
      }
    }
  }
}

