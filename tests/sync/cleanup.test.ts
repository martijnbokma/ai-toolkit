import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import { detectOrphans, removeOrphanFile } from '../../src/sync/cleanup.js';
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
      pendingOrphans: [],
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

  it('should detect auto-generated files not in sync result', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    // Create an orphaned auto-generated file
    await writeFile(
      join(rulesDir, 'orphan.md'),
      `${AUTO_GENERATED_MARKER}\n# Orphan Rule`,
    );

    const result = emptySyncResult();
    const orphans = await detectOrphans(testDir, [mockAdapter], result);

    expect(orphans.length).toBe(1);
    expect(orphans[0].relativePath).toContain('orphan.md');

    // File should still exist (detect-only, no deletion)
    await expect(access(join(rulesDir, 'orphan.md'))).resolves.toBeUndefined();
  });

  it('should remove orphan file when removeOrphanFile is called', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    await writeFile(
      join(rulesDir, 'orphan.md'),
      `${AUTO_GENERATED_MARKER}\n# Orphan Rule`,
    );

    const result = emptySyncResult();
    const orphans = await detectOrphans(testDir, [mockAdapter], result);
    expect(orphans.length).toBe(1);

    const success = await removeOrphanFile(orphans[0]);
    expect(success).toBe(true);

    // Verify file is actually deleted
    await expect(access(join(rulesDir, 'orphan.md'))).rejects.toThrow();
  });

  it('should NOT detect files that are in the sync result', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    const filePath = join(rulesDir, 'synced.md');
    await writeFile(filePath, `${AUTO_GENERATED_MARKER}\n# Synced Rule`);

    // This file IS in the sync result — should not be detected as orphan
    const result = emptySyncResult([filePath]);
    const orphans = await detectOrphans(testDir, [mockAdapter], result);

    expect(orphans).toEqual([]);

    // Verify file still exists
    await expect(access(filePath)).resolves.toBeUndefined();
  });

  it('should NOT detect manually created files (without auto-generated marker)', async () => {
    const rulesDir = join(testDir, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });

    await writeFile(
      join(rulesDir, 'manual.md'),
      '# Manual Rule\nCreated by user.',
    );

    const result = emptySyncResult();
    const orphans = await detectOrphans(testDir, [mockAdapter], result);

    expect(orphans).toEqual([]);

    // Verify file still exists
    await expect(access(join(rulesDir, 'manual.md'))).resolves.toBeUndefined();
  });

  it('should handle non-existent editor directories gracefully', async () => {
    const result = emptySyncResult();
    const orphans = await detectOrphans(testDir, [mockAdapter], result);

    expect(orphans).toEqual([]);
  });

  it('should detect orphans across multiple adapters', async () => {
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
    const orphans = await detectOrphans(
      testDir,
      [mockAdapter, claudeAdapter],
      result,
    );

    expect(orphans.length).toBe(2);
  });
});
