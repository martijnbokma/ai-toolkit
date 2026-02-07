import { join, resolve, basename } from 'path';
import type { ToolkitConfig } from '../core/types.js';
import { CONTENT_DIR, SKILLS_DIR, WORKFLOWS_DIR, RULES_DIR } from '../core/types.js';
import { loadConfig } from '../core/config-loader.js';
import { fileExists, readTextFile, writeTextFile, ensureDir } from '../utils/file-ops.js';
import { log, createSpinner } from '../utils/logger.js';

type ContentType = 'skills' | 'workflows' | 'rules';

function detectContentType(relativePath: string): ContentType | null {
  if (relativePath.startsWith(SKILLS_DIR + '/') || relativePath.startsWith('skills/')) return 'skills';
  if (relativePath.startsWith(WORKFLOWS_DIR + '/') || relativePath.startsWith('workflows/')) return 'workflows';
  if (relativePath.startsWith(RULES_DIR + '/') || relativePath.startsWith('rules/')) return 'rules';
  return null;
}

function resolveContentSourcePath(projectRoot: string, config: ToolkitConfig): string | null {
  const sources = config.content_sources;
  if (!sources || sources.length === 0) return null;

  const localSource = sources.find((s) => s.type === 'local' && s.path);
  if (!localSource?.path) return null;

  return resolve(projectRoot, localSource.path);
}

function resolveFilePath(
  projectRoot: string,
  filePath: string,
): { absoluteFilePath: string; relativePath: string } {
  const contentDir = join(projectRoot, CONTENT_DIR);

  if (filePath.startsWith(CONTENT_DIR + '/')) {
    // e.g. .ai-content/skills/test-skill.md
    return {
      relativePath: filePath.slice(CONTENT_DIR.length + 1),
      absoluteFilePath: join(projectRoot, filePath),
    };
  } else if (filePath.startsWith('/')) {
    // Absolute path
    return {
      absoluteFilePath: filePath,
      relativePath: filePath.replace(contentDir + '/', ''),
    };
  }
  // e.g. skills/test-skill.md
  return {
    relativePath: filePath,
    absoluteFilePath: join(contentDir, filePath),
  };
}

async function promoteContent(
  projectRoot: string,
  filePath: string,
  force: boolean,
): Promise<void> {
  const spinner = createSpinner(`Promoting content${force ? ' (force)' : ''}...`);
  spinner.start();

  try {
    const config = await loadConfig(projectRoot);

    // Resolve the content source (ai-toolkit location)
    const sourceRoot = resolveContentSourcePath(projectRoot, config);
    if (!sourceRoot) {
      spinner.fail('No local content_source configured in ai-toolkit.yaml');
      log.dim('Add a content_sources entry to promote content to:');
      log.dim('  content_sources:');
      log.dim('    - type: local');
      log.dim('      path: ../ai-toolkit');
      process.exit(1);
    }

    // Resolve the file path relative to .ai-content/
    const { absoluteFilePath, relativePath } = resolveFilePath(projectRoot, filePath);

    // Verify file exists
    if (!(await fileExists(absoluteFilePath))) {
      spinner.fail(`File not found: ${absoluteFilePath}`);
      process.exit(1);
    }

    // Detect content type
    const contentType = detectContentType(relativePath);
    if (!contentType) {
      spinner.fail(`Cannot determine content type from path: ${relativePath}`);
      log.dim('Path must start with skills/, workflows/, or rules/');
      process.exit(1);
    }

    // Determine target path in the content source
    const fileName = basename(absoluteFilePath);
    const targetDir = join(sourceRoot, 'templates', contentType);
    const targetPath = join(targetDir, fileName);

    // Check if target already exists (skip in force mode)
    if (!force && await fileExists(targetPath)) {
      spinner.warn(`Already exists in SSOT: templates/${contentType}/${fileName}`);
      log.dim('Use --force to overwrite');
      return;
    }

    // Copy file
    await ensureDir(targetDir);
    const content = await readTextFile(absoluteFilePath);
    await writeTextFile(targetPath, content);

    spinner.succeed(`Promoted to SSOT: templates/${contentType}/${fileName}`);
    log.dim(`Source: ${relativePath}`);
    log.dim(`Target: ${sourceRoot}/templates/${contentType}/${fileName}`);

    if (!force) {
      log.dim('');
      log.info('This skill is now available to all projects via content_sources.');
    }
  } catch (error) {
    spinner.fail('Failed to promote');
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export async function runPromote(projectRoot: string, filePath: string): Promise<void> {
  await promoteContent(projectRoot, filePath, false);
}

export async function runPromoteForce(projectRoot: string, filePath: string): Promise<void> {
  await promoteContent(projectRoot, filePath, true);
}
