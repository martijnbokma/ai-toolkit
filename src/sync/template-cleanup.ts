import { join } from 'path';
import { SKILLS_DIR, WORKFLOWS_DIR } from '../core/types.js';
import { findMarkdownFiles, removeFile, getPackageRoot } from '../utils/file-ops.js';
import { log } from '../utils/logger.js';

const TEMPLATE_CATEGORIES = [SKILLS_DIR, WORKFLOWS_DIR];

/**
 * Removes files from .ai-content/ that were originally copied from templates
 * but no longer exist in the templates directory.
 *
 * A file is only removed if ALL of these conditions are met:
 * 1. It is in a template-managed subdirectory (e.g. skills/specialists/)
 * 2. The template file no longer exists
 * 3. The local content is identical to a known template (i.e. unmodified)
 *
 * User-created or user-modified files are never removed, even if they
 * live in a template-managed subdirectory.
 */
export async function cleanupRemovedTemplates(
  contentDir: string,
  dryRun: boolean,
  overrideTemplatesDir?: string,
): Promise<string[]> {
  const templatesDir = overrideTemplatesDir ?? join(getPackageRoot(), 'templates');
  const removed: string[] = [];

  for (const category of TEMPLATE_CATEGORIES) {
    const templateCategoryDir = join(templatesDir, category);
    const contentCategoryDir = join(contentDir, category);

    // Get all template files (relative paths like "specialists/backend-developer.md")
    const templateFiles = await findMarkdownFiles(templateCategoryDir, templateCategoryDir);
    const templatePaths = new Set(templateFiles.map((f) => f.relativePath));

    // Build a set of known template contents for identity comparison
    const templateContents = new Set(templateFiles.map((f) => f.content));

    // Get all subdirectories that exist in templates (e.g. "specialists")
    const templateSubdirs = new Set<string>();
    for (const tf of templateFiles) {
      const slashIndex = tf.relativePath.indexOf('/');
      if (slashIndex !== -1) {
        templateSubdirs.add(tf.relativePath.substring(0, slashIndex));
      } else {
        // Top-level template file — track with empty string sentinel
        templateSubdirs.add('');
      }
    }

    // Get all content files
    const contentFiles = await findMarkdownFiles(contentCategoryDir, contentCategoryDir);

    for (const cf of contentFiles) {
      // Determine if this content file is in a template-managed path
      const slashIndex = cf.relativePath.indexOf('/');
      const subdir = slashIndex !== -1 ? cf.relativePath.substring(0, slashIndex) : '';

      if (!templateSubdirs.has(subdir)) {
        // This file is in a user-created subdirectory — skip
        continue;
      }

      if (templatePaths.has(cf.relativePath)) {
        // Template still exists for this path — skip
        continue;
      }

      // Template no longer exists for this path.
      // Only remove if the local content is an unmodified template copy.
      if (!templateContents.has(cf.content)) {
        // Content was modified by the user or is user-created — keep it
        continue;
      }

      if (dryRun) {
        log.dryRun('would remove template-orphan', `${category}/${cf.relativePath}`);
      } else {
        const success = await removeFile(cf.absolutePath);
        if (success) {
          log.removed(`${category}/${cf.relativePath} (removed from templates)`);
        }
      }
      removed.push(cf.absolutePath);
    }
  }

  return removed;
}
