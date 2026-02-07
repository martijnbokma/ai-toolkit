import { createInterface } from 'readline';
import { unlink, copyFile } from 'fs/promises';
import type { SyncOptions } from '../core/types.js';
import { loadConfig } from '../core/config-loader.js';
import { runSync } from '../sync/syncer.js';
import { log, createSpinner } from '../utils/logger.js';

function askYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

export async function runSyncCommand(
  projectRoot: string,
  options: SyncOptions = {},
): Promise<void> {
  const spinner = createSpinner('Loading configuration...');
  spinner.start();

  try {
    const config = await loadConfig(projectRoot);
    spinner.succeed('Configuration loaded');

    const result = await runSync(projectRoot, config, options);

    console.log('');
    log.header(options.dryRun ? 'Dry-Run Summary' : 'Sync Summary');
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

    if (result.ssotDiffs.length > 0) {
      console.log('');
      log.warn(`Found ${result.ssotDiffs.length} file(s) out of sync with SSOT:`);
      for (const diff of result.ssotDiffs) {
        if (diff.direction === 'local-newer') {
          const confirmed = await askYesNo(`  ⚠ ${diff.category}/${diff.name}.md — local is newer. Update SSOT? (y/n) `);
          if (confirmed) {
            try {
              await copyFile(diff.localPath, diff.ssotPath);
              log.success(`  Updated ${diff.category}/${diff.name}.md in SSOT`);
            } catch (err) {
              log.error(`  Failed to update: ${err instanceof Error ? err.message : err}`);
            }
          } else {
            log.dim(`  Skipped ${diff.category}/${diff.name}.md`);
          }
        } else {
          const confirmed = await askYesNo(`  ⚠ ${diff.category}/${diff.name}.md — SSOT is newer. Update local? (y/n) `);
          if (confirmed) {
            try {
              await copyFile(diff.ssotPath, diff.localPath);
              log.success(`  Updated ${diff.category}/${diff.name}.md locally`);
            } catch (err) {
              log.error(`  Failed to update: ${err instanceof Error ? err.message : err}`);
            }
          } else {
            log.dim(`  Skipped ${diff.category}/${diff.name}.md`);
          }
        }
      }
    }

    if (result.ssotOrphans.length > 0) {
      console.log('');
      log.warn(`Found ${result.ssotOrphans.length} SSOT orphan(s) — exists in SSOT but removed locally:`);
      for (const orphan of result.ssotOrphans) {
        const confirmed = await askYesNo(`  ⚠ ${orphan.category}/${orphan.name}.md — remove from SSOT? (y/n) `);
        if (confirmed) {
          try {
            await unlink(orphan.absolutePath);
            log.success(`  Removed ${orphan.category}/${orphan.name}.md from SSOT`);
          } catch (err) {
            log.error(`  Failed to remove: ${err instanceof Error ? err.message : err}`);
          }
        } else {
          log.dim(`  Skipped ${orphan.category}/${orphan.name}.md`);
        }
      }
    }

    console.log('');
    log.success('Sync complete!');
  } catch (error) {
    spinner.fail('Sync failed');
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
