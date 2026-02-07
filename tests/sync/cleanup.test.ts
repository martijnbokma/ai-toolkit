import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import { cleanupOrphans } from '../../src/sync/cleanup.js';
import { AUTO_GENERATED_MARKER } from '../../src/core/types.js';
import type { EditorAdapter, SyncResult } from '../../src/core/types.js';

describe('Cleanup', () => {
  let testDir: string;

  const mockAdapter: EditorAdapter = {
    name: 'cursor',
    fileNaming: 'flat',
    directories: {
      rules: '.cursor/rules',
      skills: '.cursor/rules',
    },
  };

  function emptySyncResult(synced: string[] = []): SyncResult {
    return {
      synced,
      skipped: [],
      removed: [],
      errors: [],
      ssotOrphans: [],
      ssotDiffs: [],
    };
  }

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-cleanup-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should remove auto-generated files not in sync result', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    // Create an orphaned auto-generated file
    await writeFile(
      join(rulesDir, 'orphan.md'),
      `${AUTO_GENERATED_MARKER}\n# Orphan Rule`,
    );

    const result = emptySyncResult();
    const removed = await cleanupOrphans(testDir, [mockAdapter], result);

    expect(removed.length).toBe(1);
    expect(removed[0]).toContain('orphan.md');

    // Verify file is actually deleted
    await expect(access(join(rulesDir, 'orphan.md'))).rejects.toThrow();
  });

  it('should NOT remove files that are in the sync result', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    const filePath = join(rulesDir, 'synced.md');
    await writeFile(filePath, `${AUTO_GENERATED_MARKER}\n# Synced Rule`);

    // This file IS in the sync result — should not be removed
    const result = emptySyncResult([filePath]);
    const removed = await cleanupOrphans(testDir, [mockAdapter], result);

    expect(removed).toEqual([]);

    // Verify file still exists
    await expect(access(filePath)).resolves.toBeUndefined();
  });

  it('should NOT remove manually created files (without auto-generated marker)', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    await writeFile(
      join(rulesDir, 'manual.md'),
      '# Manual Rule\nCreated by user.',
    );

    const result = emptySyncResult();
    const removed = await cleanupOrphans(testDir, [mockAdapter], result);

    expect(removed).toEqual([]);

    // Verify file still exists
    await expect(access(join(rulesDir, 'manual.md'))).resolves.toBeUndefined();
  });

  it('should handle non-existent editor directories gracefully', async () => {
    const result = emptySyncResult();
    const removed = await cleanupOrphans(testDir, [mockAdapter], result);

    expect(removed).toEqual([]);
  });

  it('should clean up across multiple adapters', async () => {
    const claudeAdapter: EditorAdapter = {
      name: 'claude',
      fileNaming: 'flat',
      directories: {
        rules: '.claude/rules',
        skills: '.claude/skills',
      },
    };

    // Create orphans in both editor dirs
    const cursorDir = join(testDir, '.cursor', 'rules');
    const claudeDir = join(testDir, '.claude', 'rules');
    await mkdir(cursorDir, { recursive: true });
    await mkdir(claudeDir, { recursive: true });

    await writeFile(
      join(cursorDir, 'orphan-cursor.md'),
      `${AUTO_GENERATED_MARKER}\n# Orphan`,
    );
    await writeFile(
      join(claudeDir, 'orphan-claude.md'),
      `${AUTO_GENERATED_MARKER}\n# Orphan`,
    );

    const result = emptySyncResult();
    const removed = await cleanupOrphans(
      testDir,
      [mockAdapter, claudeAdapter],
      result,
    );

    expect(removed.length).toBe(2);
  });
});
