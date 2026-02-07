import type { SyncOptions } from '../core/types.js';
import { runMonorepoSync } from '../sync/monorepo.js';
import { log, createSpinner } from '../utils/logger.js';

export async function runMonorepoSyncCommand(
  projectRoot: string,
  options: SyncOptions = {},
): Promise<void> {
  const spinner = createSpinner('Scanning for projects...');
  spinner.start();

  try {
    spinner.succeed('Scanning complete');

    const result = await runMonorepoSync(projectRoot, options);

    console.log('');
    log.header(options.dryRun ? 'Monorepo Dry-Run Summary' : 'Monorepo Sync Summary');
    log.success(`${options.dryRun ? 'Would sync' : 'Synced'}: ${result.synced.length} file(s)`);

    if (result.removed.length > 0) {
      log.warn(`Removed: ${result.removed.length} orphaned file(s)`);
    }

    if (result.errors.length > 0) {
      log.error(`Errors: ${result.errors.length}`);
      for (const err of result.errors) {
        log.dim(err);
      }
      process.exit(1);
    }

    console.log('');
    log.success('Monorepo sync complete!');
  } catch (error) {
    spinner.fail('Monorepo sync failed');
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
