import { join, resolve, isAbsolute } from 'path';
import { createRequire } from 'module';
import type { ContentSource, ContentFile } from '../core/types.js';
import { RULES_DIR, SKILLS_DIR, WORKFLOWS_DIR } from '../core/types.js';
import { findMarkdownFiles, fileExists } from '../utils/file-ops.js';
import { log } from '../utils/logger.js';

type ContentCategory = 'rules' | 'skills' | 'workflows';

interface ResolvedContent {
  rules: ContentFile[];
  skills: ContentFile[];
  workflows: ContentFile[];
}

/**
 * Resolves content from external sources (local paths or npm packages).
 * Merges them with the project's own .ai-content/ files.
 */
export async function resolveContentSources(
  projectRoot: string,
  sources: ContentSource[],
): Promise<ResolvedContent> {
  const result: ResolvedContent = {
    rules: [],
    skills: [],
    workflows: [],
  };

  for (const source of sources) {
    try {
      const sourceRoot = await resolveSourcePath(projectRoot, source);
      if (!sourceRoot) {
        log.warn(`Content source not found: ${source.type === 'local' ? source.path : source.name}`);
        continue;
      }

      const categories: ContentCategory[] = source.include ?? ['rules', 'skills', 'workflows'];
      const label = source.type === 'local' ? source.path! : source.name!;

      for (const category of categories) {
        const dirName = categoryToDir(category);
        const contentDir = join(sourceRoot, dirName);
        const exists = await fileExists(contentDir);

        if (!exists) continue;

        const files = await findMarkdownFiles(contentDir, contentDir);
        if (files.length > 0) {
          log.info(`${label}: found ${files.length} ${category}`);
          result[category].push(...files);
        }
      }
    } catch (error) {
      log.error(
        `Failed to resolve content source: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return result;
}

export async function resolveSourcePath(
  projectRoot: string,
  source: ContentSource,
): Promise<string | null> {
  if (source.type === 'local') {
    if (!source.path) {
      log.error('Local content source requires a "path" field');
      return null;
    }

    const resolved = isAbsolute(source.path)
      ? source.path
      : resolve(projectRoot, source.path);

    const exists = await fileExists(resolved);
    if (!exists) return null;

    // Look for .ai-content/, templates/, or use the path directly
    const candidates = [
      join(resolved, '.ai-content'),
      join(resolved, 'templates'),
    ];

    for (const candidate of candidates) {
      if (await fileExists(candidate)) return candidate;
    }

    return resolved;
  }

  if (source.type === 'package') {
    if (!source.name) {
      log.error('Package content source requires a "name" field');
      return null;
    }

    return resolvePackagePath(projectRoot, source.name);
  }

  return null;
}

function resolvePackagePath(projectRoot: string, packageName: string): string | null {
  try {
    // Use createRequire from the project root to find the package
    const require = createRequire(join(projectRoot, 'package.json'));
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageRoot = join(packageJsonPath, '..');

    // Look for .ai-content/ or content/ or use package root
    const candidates = [
      join(packageRoot, '.ai-content'),
      join(packageRoot, 'content'),
      packageRoot,
    ];

    for (const candidate of candidates) {
      // We'll check existence synchronously via try/catch
      try {
        require.resolve(candidate);
        return candidate;
      } catch {
        // Try next candidate
      }
    }

    return packageRoot;
  } catch {
    log.warn(`Package "${packageName}" not found. Install it first: bun add -d ${packageName}`);
    return null;
  }
}

function categoryToDir(category: ContentCategory): string {
  switch (category) {
    case 'rules':
      return RULES_DIR;
    case 'skills':
      return SKILLS_DIR;
    case 'workflows':
      return WORKFLOWS_DIR;
  }
}
