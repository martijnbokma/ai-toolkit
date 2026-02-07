import { join } from 'path';
import type { ToolkitConfig, EditorAdapter, SyncResult } from '../core/types.js';
import { CONTENT_DIR, PROJECT_CONTEXT_FILE } from '../core/types.js';
import { writeTextFile, fileExists, readTextFile } from '../utils/file-ops.js';
import { log } from '../utils/logger.js';

export async function generateEntryPoints(
  projectRoot: string,
  adapters: EditorAdapter[],
  config: ToolkitConfig,
  result: SyncResult,
  dryRun: boolean,
): Promise<void> {
  // Read PROJECT.md content if it exists
  let projectContext = '';
  const projectContextPath = join(projectRoot, CONTENT_DIR, PROJECT_CONTEXT_FILE);
  if (await fileExists(projectContextPath)) {
    const raw = await readTextFile(projectContextPath);
    // Only include if the user has filled in content beyond the template placeholders
    const stripped = raw.replace(/<!--.*?-->/gs, '').trim();
    if (stripped.length > 0) {
      projectContext = raw.trim();
    }
  }

  for (const adapter of adapters) {
    if (!adapter.entryPoint) continue;

    try {
      const entryPath = join(projectRoot, adapter.entryPoint);
      const content = adapter.generateEntryPointContent
        ? adapter.generateEntryPointContent(config)
        : '';

      if (content) {
        // Append PROJECT.md content after the generated entry point header
        const fullContent = projectContext
          ? content.trimEnd() + '\n\n---\n\n' + projectContext + '\n'
          : content;

        if (dryRun) {
          log.dryRun('would generate', adapter.entryPoint);
        } else {
          await writeTextFile(entryPath, fullContent);
          log.synced('generated', adapter.entryPoint);
        }
        result.synced.push(entryPath);
      }
    } catch (error) {
      const msg = `Failed to generate entry point for ${adapter.name}: ${error instanceof Error ? error.message : error}`;
      log.error(msg);
      result.errors.push(msg);
    }
  }
}
