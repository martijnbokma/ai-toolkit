import { join } from 'path';
import { watch } from 'fs';
import { CONFIG_FILENAME, CONTENT_DIR } from '../core/types.js';
import { runSyncCommand } from './sync.js';
import { log } from '../utils/logger.js';

export async function runWatchCommand(projectRoot: string): Promise<void> {
  log.header('Watching for changes...');
  log.dim(`Watching: ${CONFIG_FILENAME}, ${CONTENT_DIR}/`);
  log.dim('Press Ctrl+C to stop\n');

  // Run initial sync
  await runSyncCommand(projectRoot);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 300;

  const triggerSync = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log('');
      log.info('Change detected, re-syncing...');
      try {
        await runSyncCommand(projectRoot);
      } catch (error) {
        log.error(`Sync failed: ${error instanceof Error ? error.message : error}`);
      }
    }, DEBOUNCE_MS);
  };

  // Watch config file
  const configPath = join(projectRoot, CONFIG_FILENAME);
  try {
    watch(configPath, () => triggerSync());
  } catch {
    log.warn(`Could not watch ${CONFIG_FILENAME}`);
  }

  // Watch content directory recursively
  const contentDir = join(projectRoot, CONTENT_DIR);
  try {
    watch(contentDir, { recursive: true }, () => triggerSync());
  } catch {
    log.warn(`Could not watch ${CONTENT_DIR}/`);
  }

  // Keep process alive
  await new Promise(() => {});
}
