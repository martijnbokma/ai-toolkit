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
import { detectOrphans } from './cleanup.js';
import { syncEditorSettings } from './settings-syncer.js';
import { resolveContentSources, resolveSourcePath } from './content-resolver.js';
import { detectSsotOrphans, detectSsotDiffs } from './ssot-detector.js';
import { autoPromoteContent } from './auto-promoter.js';
import { generateMCPConfigs } from './mcp-generator.js';
import { generateEntryPoints } from './entry-points.js';

type ContentType = 'rules' | 'skills' | 'workflows';

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
    pendingOrphans: [],
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
  let external: Record<ContentType, ContentFile[]> = {
    rules: [],
    skills: [],
    workflows: [],
  };

  if (config.content_sources && config.content_sources.length > 0) {
    const resolved = await resolveContentSources(projectRoot, config.content_sources);
    external = resolved;
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

  // 3. Sync content types (rules, skills, workflows)
  const contentTypes: Array<{ type: ContentType; dir: string; filterAdapters?: boolean }> = [
    { type: 'rules', dir: RULES_DIR },
    { type: 'skills', dir: SKILLS_DIR },
    { type: 'workflows', dir: WORKFLOWS_DIR, filterAdapters: true },
  ];

  for (const { type, dir, filterAdapters } of contentTypes) {
    await mergeAndSyncContent(
      projectRoot,
      contentDir,
      dir,
      type,
      external[type],
      filterAdapters ? adapters.filter((a) => a.directories[type]) : adapters,
      config,
      result,
      dryRun,
    );
  }

  // 4. Apply editor-specific overrides
  await syncOverrides(projectRoot, adapters, result, dryRun);

  // 5. Generate entry points
  await generateEntryPoints(projectRoot, adapters, config, result, dryRun);

  // 6. Generate MCP configs
  if (config.mcp_servers && config.mcp_servers.length > 0) {
    await generateMCPConfigs(projectRoot, adapters, config, result, dryRun);
  }

  // 7. Sync editor settings (.editorconfig, .vscode/settings.json)
  if (config.settings) {
    const settingsFiles = await syncEditorSettings(projectRoot, config, dryRun);
    result.synced.push(...settingsFiles);
  }

  // 8. Detect orphaned files (removal is handled by CLI with user confirmation)
  const orphans = await detectOrphans(projectRoot, adapters, result);
  if (orphans.length > 0) {
    result.pendingOrphans = orphans;
    if (dryRun) {
      for (const orphan of orphans) {
        log.dryRun('would remove orphan', orphan.relativePath);
      }
    }
  }

  // 9. Update .gitignore
  if (!dryRun) {
    await updateGitignore(projectRoot, adapters);
  } else {
    log.dryRun('would update', '.gitignore');
  }

  // 10. Detect SSOT orphans and diffs (shown after summary by CLI)
  if (ssotRoot) {
    result.ssotOrphans = await detectSsotOrphans(contentDir, ssotRoot);
    result.ssotDiffs = await detectSsotDiffs(contentDir, ssotRoot);
  }

  return result;
}

async function mergeAndSyncContent(
  projectRoot: string,
  contentDir: string,
  dir: string,
  type: ContentType,
  externalFiles: ContentFile[],
  adapters: EditorAdapter[],
  config: ToolkitConfig,
  result: SyncResult,
  dryRun: boolean,
): Promise<void> {
  const localDir = join(contentDir, dir);
  const localFiles = await findMarkdownFiles(localDir, localDir);
  const localNames = new Set(localFiles.map((f) => f.name));
  const merged = [
    ...externalFiles.filter((f) => !localNames.has(f.name)),
    ...localFiles,
  ];

  if (merged.length === 0) return;

  const externalCount = externalFiles.filter((f) => !localNames.has(f.name)).length;
  log.info(`Found ${merged.length} ${type}${externalCount > 0 ? ` (${externalCount} external)` : ''}`);

  for (const file of merged) {
    await syncContentToEditors(projectRoot, file, type, adapters, config, result, dryRun);
  }
}

async function syncContentToEditors(
  projectRoot: string,
  file: ContentFile,
  type: ContentType,
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

