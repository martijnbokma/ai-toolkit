import { join } from 'path';
import { readdir } from 'fs/promises';
import yaml from 'js-yaml';
import * as p from '@clack/prompts';
import {
  CONFIG_FILENAME,
  CONTENT_DIR,
  SKILLS_DIR,
  RULES_DIR,
  WORKFLOWS_DIR,
  OVERRIDES_DIR,
  PROJECT_CONTEXT_FILE,
} from '../core/types.js';
import { configExists, loadConfig } from '../core/config-loader.js';
import { ensureDir, writeTextFile, fileExists, readTextFile, getPackageRoot } from '../utils/file-ops.js';
import { log, createSpinner } from '../utils/logger.js';
import { runSync } from '../sync/syncer.js';
import { DEFAULT_CONFIG, generateProjectContext } from '../sync/project-context.js';
import { installPreCommitHook } from '../utils/git-hooks.js';
import { addSyncScripts } from '../utils/package-scripts.js';

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
      if (entry.isDirectory()) {
        await copyTemplates(join(templateSubdir, entry.name), contentDir, join(targetSubdir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const targetPath = join(targetDir, entry.name);
        if (await fileExists(targetPath)) continue;

        const content = await readTextFile(join(templatesDir, entry.name));
        await writeTextFile(targetPath, content);
      }
    }
  } catch {
    // Templates dir doesn't exist — skip silently
  }
}

const ALL_EDITORS = [
  { value: 'cursor', label: 'Cursor', hint: 'AI-first code editor' },
  { value: 'windsurf', label: 'Windsurf', hint: 'Codeium editor' },
  { value: 'claude', label: 'Claude Code', hint: 'Anthropic CLI' },
  { value: 'kiro', label: 'Kiro', hint: 'AWS AI editor' },
  { value: 'trae', label: 'Trae', hint: 'ByteDance AI editor' },
  { value: 'gemini', label: 'Gemini CLI', hint: 'Google CLI' },
  { value: 'copilot', label: 'GitHub Copilot', hint: 'VS Code extension' },
  { value: 'codex', label: 'Codex CLI', hint: 'OpenAI CLI' },
  { value: 'aider', label: 'Aider', hint: 'terminal pair programmer' },
  { value: 'roo', label: 'Roo Code', hint: 'VS Code extension' },
  { value: 'kilocode', label: 'KiloCode', hint: 'VS Code extension' },
  { value: 'antigravity', label: 'Antigravity', hint: 'AI editor' },
  { value: 'bolt', label: 'Bolt', hint: 'StackBlitz AI' },
  { value: 'warp', label: 'Warp', hint: 'AI terminal' },
  { value: 'replit', label: 'Replit', hint: 'Replit Agent' },
  { value: 'cline', label: 'Cline', hint: 'VS Code extension' },
  { value: 'amazonq', label: 'Amazon Q', hint: 'AWS AI assistant' },
  { value: 'junie', label: 'Junie', hint: 'JetBrains AI agent' },
  { value: 'augment', label: 'Augment Code', hint: 'AI coding assistant' },
  { value: 'zed', label: 'Zed', hint: 'AI code editor' },
  { value: 'continue', label: 'Continue', hint: 'open-source AI extension' },
];

function isCancelled(value: unknown): value is symbol {
  return p.isCancel(value);
}

async function selectOrCustom(message: string, options: string[]): Promise<string | null> {
  const allOptions = [
    ...options.map((o) => ({ value: o, label: o })),
    { value: '__none__', label: 'None / skip' },
    { value: '__other__', label: 'Other...' },
  ];

  const selected = await p.select({ message, options: allOptions });
  if (isCancelled(selected)) return null;

  if (selected === '__none__') return '';
  if (selected === '__other__') {
    const custom = await p.text({ message: `${message} (custom)`, placeholder: 'Type your answer...' });
    if (isCancelled(custom)) return null;
    return custom as string;
  }
  return selected as string;
}

async function runInteractiveSetup(): Promise<Record<string, unknown> | null> {
  const config: Record<string, unknown> = { version: '1.0' };

  // --- 1. Project metadata ---
  const name = await p.text({
    message: 'Project name',
    placeholder: 'my-project',
  });
  if (isCancelled(name)) return null;

  const description = await p.text({
    message: 'Description (optional)',
    placeholder: 'A short description of your project',
    defaultValue: '',
  });
  if (isCancelled(description)) return null;

  config.metadata = { name, description };

  // --- 2. Tech stack (select from common options or type custom) ---
  const language = await selectOrCustom('Language', [
    'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  ]);
  if (language === null) return null;

  const framework = await selectOrCustom('Framework', [
    'Next.js', 'React', 'Vue', 'Svelte', 'Angular', 'Nuxt', 'Remix', 'Astro',
    'Express', 'Fastify', 'Hono', 'Django', 'Flask', 'FastAPI', 'Rails', 'Laravel', 'Spring Boot',
  ]);
  if (framework === null) return null;

  const database = await selectOrCustom('Database', [
    'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Supabase', 'PlanetScale',
    'DynamoDB', 'Firestore', 'Prisma', 'Drizzle',
  ]);
  if (database === null) return null;

  const runtime = await selectOrCustom('Runtime', [
    'Node.js', 'Bun', 'Deno', 'Python', 'Go', 'JVM', '.NET',
  ]);
  if (runtime === null) return null;

  config.tech_stack = {
    ...(language && { language }),
    ...(framework && { framework }),
    ...(database && { database }),
    ...(runtime && { runtime }),
  };

  // --- 3. Editors (multiselect with arrow keys + spacebar) ---
  const selectedEditors = await p.multiselect({
    message: 'Which editors do you use? (space to toggle, enter to confirm)',
    options: ALL_EDITORS,
    initialValues: ['cursor', 'windsurf', 'claude'],
    required: true,
  });
  if (isCancelled(selectedEditors)) return null;

  const editors: Record<string, boolean> = {};
  for (const editor of ALL_EDITORS) {
    editors[editor.value] = (selectedEditors as string[]).includes(editor.value);
  }
  config.editors = editors;

  // --- 4. Content sources ---
  p.note(
    'A shared content source lets you reuse the same rules, skills,\n' +
    'and workflows across multiple projects. New files you add locally\n' +
    'are automatically synced back to the shared source.',
    'Shared content source',
  );

  const wantSsot = await p.confirm({
    message: 'Do you have a shared folder or package with reusable rules/skills?',
    initialValue: false,
  });
  if (isCancelled(wantSsot)) return null;

  if (wantSsot) {
    const sourceType = await p.select({
      message: 'Where are the shared rules/skills stored?',
      options: [
        { value: 'local', label: 'Local folder', hint: 'a folder on your machine, e.g. ../shared-rules' },
        { value: 'package', label: 'npm package', hint: 'an installed package, e.g. @company/ai-rules' },
      ],
    });
    if (isCancelled(sourceType)) return null;

    if (sourceType === 'package') {
      const packageName = await p.text({
        message: 'Package name',
        placeholder: '@company/ai-rules',
      });
      if (isCancelled(packageName)) return null;
      if (packageName) {
        config.content_sources = [{ type: 'package', name: packageName }];
      }
    } else {
      const localPath = await p.select({
        message: 'Path to the shared folder',
        options: [
          { value: '../ai-toolkit', label: '../ai-toolkit', hint: 'default' },
          { value: '__custom__', label: 'Custom path...' },
        ],
      });
      if (isCancelled(localPath)) return null;

      let finalPath = localPath as string;
      if (localPath === '__custom__') {
        const custom = await p.text({
          message: 'Custom path (relative to this project)',
          placeholder: '../my-shared-rules',
        });
        if (isCancelled(custom)) return null;
        finalPath = custom as string;
      }
      if (finalPath) {
        config.content_sources = [{ type: 'local', path: finalPath }];
      }
    }
  }

  return config;
}

export async function runInit(projectRoot: string, force: boolean): Promise<void> {
  try {
    const exists = await configExists(projectRoot);
    if (exists && !force) {
      log.warn('ai-toolkit is already initialized. Use --force to reinitialize.');
      return;
    }

    const configPath = join(projectRoot, CONFIG_FILENAME);
    let finalConfig: Record<string, unknown>;

    // Always run the interactive wizard (fresh or re-init)
    p.intro(force ? '🔄 ai-toolkit re-init' : '🚀 ai-toolkit setup');
    const result = await runInteractiveSetup();
    if (!result) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }
    finalConfig = result;

    // Write config
    const s = p.spinner();
    s.start('Setting up project...');

    const configContent = yaml.dump(finalConfig, {
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

    // Generate PROJECT.md
    const projectContextPath = join(contentDir, PROJECT_CONTEXT_FILE);
    const projectContextExists = await fileExists(projectContextPath);
    let writeProjectContext = !projectContextExists;

    if (projectContextExists && force) {
      s.stop('');
      const overwrite = await p.confirm({
        message: `${CONTENT_DIR}/${PROJECT_CONTEXT_FILE} already exists. Regenerate it?`,
        initialValue: false,
      });
      if (isCancelled(overwrite)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
      writeProjectContext = !!overwrite;
      s.start('Setting up project...');
    }

    if (writeProjectContext) {
      const projectContext = await generateProjectContext(finalConfig, projectRoot);
      await writeTextFile(projectContextPath, projectContext);
    }

    // Copy built-in skill and workflow templates
    await copyTemplates('skills', contentDir, SKILLS_DIR);
    await copyTemplates('workflows', contentDir, WORKFLOWS_DIR);

    // Add sync scripts to package.json
    const scriptsAdded = await addSyncScripts(projectRoot);

    // Install pre-commit hook
    const hookInstalled = await installPreCommitHook(projectRoot);

    s.stop('Project initialized!');

    const created = [
      `${CONFIG_FILENAME} — project configuration`,
      `${CONTENT_DIR}/${PROJECT_CONTEXT_FILE} — project context (included in all entry points)`,
      `${CONTENT_DIR}/rules/ — project rules`,
      `${CONTENT_DIR}/skills/ — AI skills/commands`,
      `${CONTENT_DIR}/workflows/ — dev workflows`,
      `${CONTENT_DIR}/overrides/ — editor-specific overrides`,
    ];
    if (scriptsAdded) {
      created.push('package.json — added sync, sync:dry, and sync:watch scripts');
    }
    if (hookInstalled) {
      created.push('.git/hooks/pre-commit — auto-sync on commit');
    }

    p.note(created.join('\n'), 'Created');

    // Auto-run sync to generate editor files immediately
    s.start('Syncing to editors...');
    try {
      const config = await loadConfig(projectRoot);
      const syncResult = await runSync(projectRoot, config);
      s.stop(`Synced ${syncResult.synced.length} file(s) to editors`);
    } catch (syncError) {
      s.stop('Sync skipped — run "ai-toolkit sync" manually');
      log.dim(syncError instanceof Error ? syncError.message : String(syncError));
    }

    p.outro('Done! Your editors are ready.');
  } catch (error) {
    p.cancel(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
