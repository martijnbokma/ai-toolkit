import { join } from 'path';
import { stat } from 'fs/promises';
import { SKILLS_DIR, WORKFLOWS_DIR, RULES_DIR } from '../core/types.js';
import type { SsotOrphan, SsotDiff } from '../core/types.js';
import { findMarkdownFiles, fileExists, readTextFile } from '../utils/file-ops.js';

const CONTENT_CATEGORIES: Array<{ dir: string; name: string }> = [
  { dir: SKILLS_DIR, name: 'skills' },
  { dir: WORKFLOWS_DIR, name: 'workflows' },
  { dir: RULES_DIR, name: 'rules' },
];

export async function detectSsotOrphans(
  contentDir: string,
  ssotRoot: string,
): Promise<SsotOrphan[]> {
  const orphans: SsotOrphan[] = [];

  for (const category of CONTENT_CATEGORIES) {
    const localDir = join(contentDir, category.dir);
    const ssotDir = join(ssotRoot, category.dir);

    try {
      const ssotFiles = await findMarkdownFiles(ssotDir, ssotDir);
      if (ssotFiles.length === 0) continue;

      let localPaths: Set<string>;
      try {
        const localFiles = await findMarkdownFiles(localDir, localDir);
        localPaths = new Set(localFiles.map((f) => f.relativePath));
      } catch {
        localPaths = new Set();
      }

      for (const ssotFile of ssotFiles) {
        if (!localPaths.has(ssotFile.relativePath)) {
          orphans.push({
            category: category.name,
            name: ssotFile.name,
            absolutePath: ssotFile.absolutePath,
          });
        }
      }
    } catch {
      // SSOT dir doesn't exist — skip
    }
  }

  return orphans;
}

export async function detectSsotDiffs(
  contentDir: string,
  ssotRoot: string,
): Promise<SsotDiff[]> {
  const diffs: SsotDiff[] = [];

  for (const category of CONTENT_CATEGORIES) {
    const localDir = join(contentDir, category.dir);
    const ssotDir = join(ssotRoot, category.dir);

    try {
      const localFiles = await findMarkdownFiles(localDir, localDir);
      if (localFiles.length === 0) continue;

      for (const localFile of localFiles) {
        const ssotPath = join(ssotDir, localFile.relativePath);
        if (!(await fileExists(ssotPath))) continue;

        const ssotContent = await readTextFile(ssotPath);
        if (localFile.content !== ssotContent) {
          const localStat = await stat(localFile.absolutePath);
          const ssotStat = await stat(ssotPath);
          const direction = localStat.mtimeMs >= ssotStat.mtimeMs ? 'local-newer' : 'ssot-newer';

          diffs.push({
            category: category.name,
            name: localFile.name,
            localPath: localFile.absolutePath,
            ssotPath,
            direction,
          });
        }
      }
    } catch {
      // Local dir doesn't exist — skip
    }
  }

  return diffs;
}
