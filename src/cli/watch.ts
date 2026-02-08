import { join } from 'path';
import { watch } from 'fs';
import { CONFIG_FILENAME, CONTENT_DIR } from '../core/types.js';
import { loadConfig } from '../core/config-loader.js';
import { resolveSourcePath } from '../sync/content-resolver.js';
import { runSyncCommand } from './sync.js';
import { log } from '../utils/logger.js';

export async function runWatchCommand(projectRoot: string): Promise<void> {
  log.header('Watching for changes...');

  // Run initial sync
  await runSyncCommand(projectRoot);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 300;

  const triggerSync = (source?: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log('');
      log.info(source ? `Change detected in ${source}, re-syncing...` : 'Change detected, re-syncing...');
      try {
        await runSyncCommand(projectRoot);
      } catch (error) {
        log.error(`Sync failed: ${error instanceof Error ? error.message : error}`);
      }
    }, DEBOUNCE_MS);
  };

  const watchPaths: string[] = [CONFIG_FILENAME, `${CONTENT_DIR}/`];

  // Watch config file
  const configPath = join(projectRoot, CONFIG_FILENAME);
  try {
    watch(configPath, () => triggerSync(CONFIG_FILENAME));
  } catch {
    log.warn(`Could not watch ${CONFIG_FILENAME}`);
  }

  // Watch content directory recursively
  const contentDir = join(projectRoot, CONTENT_DIR);
  try {
    watch(contentDir, { recursive: true }, () => triggerSync(CONTENT_DIR));
  } catch {
    log.warn(`Could not watch ${CONTENT_DIR}/`);
  }

  // Watch SSOT content source directories (enables cross-project sync)
  try {
    const config = await loadConfig(projectRoot);
    if (config.content_sources && config.content_sources.length > 0) {
      for (const source of config.content_sources) {
        if (source.type !== 'local') continue;

        const ssotRoot = await resolveSourcePath(projectRoot, source);
        if (!ssotRoot) continue;

        const label = source.path || 'content source';
        try {
          watch(ssotRoot, { recursive: true }, () => triggerSync(label));
          watchPaths.push(`${label} (SSOT)`);
        } catch {
          log.warn(`Could not watch content source: ${label}`);
        }
      }
    }
  } catch {
    // Config load failed — skip SSOT watching
  }

  log.dim(`Watching: ${watchPaths.join(', ')}`);
  log.dim('Press Ctrl+C to stop\n');

  // Keep process alive
  await new Promise(() => {});
}
