import { join } from 'path';
import { readdir, chmod } from 'fs/promises';
import yaml from 'js-yaml';
import {
  CONFIG_FILENAME,
  CONTENT_DIR,
  SKILLS_DIR,
  RULES_DIR,
  WORKFLOWS_DIR,
  OVERRIDES_DIR,
  PROJECT_CONTEXT_FILE,
} from '../core/types.js';
import { configExists } from '../core/config-loader.js';
import { ensureDir, writeTextFile, fileExists, readTextFile, getPackageRoot } from '../utils/file-ops.js';
import { log, createSpinner } from '../utils/logger.js';

const DEFAULT_CONFIG = {
  version: '1.0',

  editors: {
    cursor: true,
    windsurf: true,
    claude: true,
    kiro: false,
    trae: false,
    gemini: false,
  },

  metadata: {
    name: '',
    description: '',
  },

  tech_stack: {
    language: '',
    framework: '',
    database: '',
  },
};

const EXAMPLE_RULE = `# Project Conventions

## Code Style
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Keep functions small and focused

## Error Handling
- Handle errors gracefully
- Never expose sensitive information in error messages

## Testing
- Write tests for new functionality
- Maintain existing test coverage
`;


async function copyTemplates(templateSubdir: string, contentDir: string, targetSubdir: string): Promise<void> {
  const packageRoot = getPackageRoot();
  const templatesDir = join(packageRoot, 'templates', templateSubdir);
  const targetDir = join(contentDir, targetSubdir);

  try {
    const entries = await readdir(templatesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const targetPath = join(targetDir, entry.name);
      if (await fileExists(targetPath)) continue;

      const content = await readTextFile(join(templatesDir, entry.name));
      await writeTextFile(targetPath, content);
    }
  } catch {
    // Templates dir doesn't exist — skip silently
  }
}

const SYNC_SCRIPTS: Record<string, string> = {
  sync: 'ai-toolkit sync',
  'sync:dry': 'ai-toolkit sync --dry-run',
  'sync:watch': 'ai-toolkit watch',
};

async function addSyncScripts(projectRoot: string): Promise<boolean> {
  const pkgPath = join(projectRoot, 'package.json');
  let pkg: Record<string, unknown> = {};

  if (await fileExists(pkgPath)) {
    try {
      const raw = await readTextFile(pkgPath);
      pkg = JSON.parse(raw);
    } catch {
      return false;
    }
  }

  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  let added = false;

  for (const [name, cmd] of Object.entries(SYNC_SCRIPTS)) {
    if (!scripts[name]) {
      scripts[name] = cmd;
      added = true;
    }
  }

  if (!added) return false;

  pkg.scripts = scripts;
  await writeTextFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

const PRE_COMMIT_HOOK = `#!/bin/sh
# ai-toolkit: auto-sync before commit
# Ensures editor configs stay in sync with .ai-content/

if command -v ai-toolkit >/dev/null 2>&1; then
  ai-toolkit sync
  git add .cursorrules .windsurfrules CLAUDE.md .cursor/ .windsurf/ .claude/ .kiro/ .trae/ .gemini/ .github/copilot-instructions.md AGENTS.md .aider* .roo/ .kilocode/ .antigravity/ .bolt/ .warp/ 2>/dev/null
elif command -v npx >/dev/null 2>&1; then
  npx ai-toolkit sync
  git add .cursorrules .windsurfrules CLAUDE.md .cursor/ .windsurf/ .claude/ .kiro/ .trae/ .gemini/ .github/copilot-instructions.md AGENTS.md .aider* .roo/ .kilocode/ .antigravity/ .bolt/ .warp/ 2>/dev/null
fi
`;

async function installPreCommitHook(projectRoot: string): Promise<boolean> {
  const gitDir = join(projectRoot, '.git');
  if (!(await fileExists(gitDir))) return false;

  const hooksDir = join(gitDir, 'hooks');
  await ensureDir(hooksDir);

  const hookPath = join(hooksDir, 'pre-commit');

  if (await fileExists(hookPath)) {
    const existing = await readTextFile(hookPath);
    if (existing.includes('ai-toolkit')) return false;

    // Append to existing hook
    await writeTextFile(hookPath, existing.trimEnd() + '\n\n' + PRE_COMMIT_HOOK);
  } else {
    await writeTextFile(hookPath, PRE_COMMIT_HOOK);
  }

  await chmod(hookPath, 0o755);
  return true;
}

async function generateProjectContext(config: typeof DEFAULT_CONFIG): Promise<string> {
  const packageRoot = getPackageRoot();
  const templatePath = join(packageRoot, 'templates', 'project-context.md');

  let template: string;
  try {
    template = await readTextFile(templatePath);
  } catch {
    // Fallback if template file is not found
    template = `# Project Context\n\n## Overview\n<!-- Describe what this project does -->\n\n## Tech Stack\n\n## Conventions\n`;
  }

  // Auto-fill tech stack from config
  if (config.tech_stack) {
    const entries = Object.entries(config.tech_stack).filter(([, v]) => v);
    if (entries.length > 0) {
      const stackLines = entries.map(([key, value]) => `- **${key}**: ${value}`).join('\n');
      template = template.replace(
        '<!-- Auto-filled from ai-toolkit.yaml — edit or expand as needed -->',
        `<!-- Auto-filled from ai-toolkit.yaml — edit or expand as needed -->\n${stackLines}`,
      );
    }
  }

  return template;
}

export async function runInit(projectRoot: string, force: boolean): Promise<void> {
  const spinner = createSpinner('Initializing ai-toolkit...');
  spinner.start();

  try {
    const exists = await configExists(projectRoot);
    if (exists && !force) {
      spinner.warn('ai-toolkit is already initialized. Use --force to reinitialize.');
      return;
    }

    // Create config file
    const configPath = join(projectRoot, CONFIG_FILENAME);
    const configContent = yaml.dump(DEFAULT_CONFIG, {
      indent: 2,
      lineWidth: 100,
      quotingType: '"',
    });
    await writeTextFile(configPath, configContent);

    // Create content directories
    const contentDir = join(projectRoot, CONTENT_DIR);
    const dirs = [
      join(contentDir, RULES_DIR),
      join(contentDir, SKILLS_DIR),
      join(contentDir, WORKFLOWS_DIR),
      join(contentDir, OVERRIDES_DIR),
    ];

    for (const dir of dirs) {
      await ensureDir(dir);
    }

    // Create example files if they don't exist
    const exampleRulePath = join(contentDir, RULES_DIR, 'project-conventions.md');
    if (!(await fileExists(exampleRulePath))) {
      await writeTextFile(exampleRulePath, EXAMPLE_RULE);
    }

    // Generate PROJECT.md if it doesn't exist
    const projectContextPath = join(contentDir, PROJECT_CONTEXT_FILE);
    if (!(await fileExists(projectContextPath))) {
      const projectContext = await generateProjectContext(DEFAULT_CONFIG);
      await writeTextFile(projectContextPath, projectContext);
    }

    // Copy built-in skill and workflow templates
    await copyTemplates('skills', contentDir, SKILLS_DIR);
    await copyTemplates('workflows', contentDir, WORKFLOWS_DIR);

    // Add sync scripts to package.json
    const scriptsAdded = await addSyncScripts(projectRoot);

    // Install pre-commit hook
    const hookInstalled = await installPreCommitHook(projectRoot);

    spinner.succeed('ai-toolkit initialized!');

    log.info('Created:');
    log.dim(`${CONFIG_FILENAME} — edit this to configure editors and project metadata`);
    log.dim(`${CONTENT_DIR}/${PROJECT_CONTEXT_FILE} — describe your project here (included in all entry points)`);
    log.dim(`${CONTENT_DIR}/rules/ — add your project rules here`);
    log.dim(`${CONTENT_DIR}/skills/ — add your AI skills/commands here`);
    log.dim(`${CONTENT_DIR}/workflows/ — add dev workflows here`);
    log.dim(`${CONTENT_DIR}/overrides/ — add editor-specific overrides here`);
    if (scriptsAdded) {
      log.dim('package.json — added sync, sync:dry, and sync:watch scripts');
    }
    if (hookInstalled) {
      log.dim('.git/hooks/pre-commit — auto-sync on commit');
    }

    console.log('');
    log.info('Next steps:');
    log.dim(`1. Edit ${CONFIG_FILENAME} to enable your editors`);
    log.dim(`2. Fill in ${CONTENT_DIR}/${PROJECT_CONTEXT_FILE} with your project context`);
    log.dim(`3. Add rules and skills to ${CONTENT_DIR}/`);
    log.dim('4. Run "bun run sync" to distribute to all editors');
  } catch (error) {
    spinner.fail('Failed to initialize');
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
