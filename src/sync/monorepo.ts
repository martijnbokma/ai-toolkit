import { join } from 'path';
import { readdir } from 'fs/promises';
import { CONFIG_FILENAME } from '../core/types.js';
import type { SyncOptions, SyncResult } from '../core/types.js';
import { loadConfig } from '../core/config-loader.js';
import { fileExists } from '../utils/file-ops.js';
import { runSync } from './syncer.js';
import { log } from '../utils/logger.js';

export async function runMonorepoSync(
  projectRoot: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const combinedResult: SyncResult = {
    synced: [],
    skipped: [],
    removed: [],
    errors: [],
    pendingOrphans: [],
    ssotOrphans: [],
    ssotDiffs: [],
  };

  // 1. Sync root config
  const rootConfigExists = await fileExists(join(projectRoot, CONFIG_FILENAME));
  if (rootConfigExists) {
    log.header('Root project');
    const rootConfig = await loadConfig(projectRoot);
    const rootResult = await runSync(projectRoot, rootConfig, options);
    mergeResults(combinedResult, rootResult);
  }

  // 2. Find and sync sub-project configs
  const subProjects = await findSubProjects(projectRoot);

  for (const subProject of subProjects) {
    const relativePath = subProject.replace(projectRoot + '/', '');
    log.header(`Sub-project: ${relativePath}`);

    try {
      const subConfig = await loadConfig(subProject);
      const subResult = await runSync(subProject, subConfig, options);
      mergeResults(combinedResult, subResult);
    } catch (error) {
      const msg = `Failed to sync ${relativePath}: ${error instanceof Error ? error.message : error}`;
      log.error(msg);
      combinedResult.errors.push(msg);
    }
  }

  return combinedResult;
}

async function findSubProjects(rootDir: string): Promise<string[]> {
  const subProjects: string[] = [];
  const ignoreDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    '.svelte-kit',
    'vendor',
    '__pycache__',
    '.venv',
  ]);

  async function scan(dir: string, depth: number): Promise<void> {
    if (depth > 3) return; // Max 3 levels deep

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (ignoreDirs.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        const subDir = join(dir, entry.name);
        const hasConfig = await fileExists(join(subDir, CONFIG_FILENAME));

        if (hasConfig) {
          subProjects.push(subDir);
        } else {
          await scan(subDir, depth + 1);
        }
      }
    } catch {
      // Permission denied or similar
    }
  }

  await scan(rootDir, 0);
  return subProjects;
}

function mergeResults(target: SyncResult, source: SyncResult): void {
  target.synced.push(...source.synced);
  target.skipped.push(...source.skipped);
  target.removed.push(...source.removed);
  target.errors.push(...source.errors);
  target.ssotOrphans.push(...source.ssotOrphans);
  target.ssotDiffs.push(...source.ssotDiffs);
}
