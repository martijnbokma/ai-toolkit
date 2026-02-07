import { join } from 'path';
import { SKILLS_DIR, WORKFLOWS_DIR, RULES_DIR } from '../core/types.js';
import { findMarkdownFiles, fileExists, writeTextFile, ensureDir } from '../utils/file-ops.js';
import { log } from '../utils/logger.js';

const CONTENT_CATEGORIES: Array<{ dir: string; name: string }> = [
  { dir: SKILLS_DIR, name: 'skills' },
  { dir: WORKFLOWS_DIR, name: 'workflows' },
  { dir: RULES_DIR, name: 'rules' },
];

export async function autoPromoteContent(
  contentDir: string,
  ssotRoot: string,
  dryRun: boolean,
): Promise<void> {
  for (const category of CONTENT_CATEGORIES) {
    const localDir = join(contentDir, category.dir);
    const ssotDir = join(ssotRoot, category.dir);

    try {
      const localFiles = await findMarkdownFiles(localDir, localDir);
      if (localFiles.length === 0) continue;

      for (const file of localFiles) {
        const targetPath = join(ssotDir, file.relativePath);
        if (await fileExists(targetPath)) continue;

        if (dryRun) {
          log.dryRun('would promote', `${category.name}/${file.relativePath} → SSOT`);
        } else {
          await ensureDir(ssotDir);
          await writeTextFile(targetPath, file.content);
          log.synced(`auto-promote ${category.name}/${file.relativePath}`, 'SSOT');
        }
      }
    } catch {
      // Local dir doesn't exist — skip
    }
  }
}
