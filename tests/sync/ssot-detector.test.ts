import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, utimes } from 'fs/promises';
import { tmpdir } from 'os';
import { detectSsotOrphans, detectSsotDiffs } from '../../src/sync/ssot-detector.js';

describe('SsotDetector', () => {
  let testDir: string;
  let contentDir: string;
  let ssotRoot: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-ssot-'));
    contentDir = join(testDir, '.ai-content');
    ssotRoot = join(testDir, 'ssot');

    await mkdir(join(contentDir, 'rules'), { recursive: true });
    await mkdir(join(contentDir, 'skills'), { recursive: true });
    await mkdir(join(contentDir, 'workflows'), { recursive: true });
    await mkdir(join(ssotRoot, 'rules'), { recursive: true });
    await mkdir(join(ssotRoot, 'skills'), { recursive: true });
    await mkdir(join(ssotRoot, 'workflows'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('detectSsotOrphans', () => {
    it('should detect SSOT files that do not exist locally', async () => {
      // SSOT has a file, local does not
      await writeFile(join(ssotRoot, 'skills', 'orphan.md'), '# Orphan');

      const orphans = await detectSsotOrphans(contentDir, ssotRoot);

      expect(orphans.length).toBe(1);
      expect(orphans[0].category).toBe('skills');
      expect(orphans[0].name).toBe('orphan');
      expect(orphans[0].absolutePath).toBe(join(ssotRoot, 'skills', 'orphan.md'));
    });

    it('should NOT flag files that exist both locally and in SSOT', async () => {
      await writeFile(join(ssotRoot, 'skills', 'shared.md'), '# Shared');
      await writeFile(join(contentDir, 'skills', 'shared.md'), '# Shared');

      const orphans = await detectSsotOrphans(contentDir, ssotRoot);

      expect(orphans).toEqual([]);
    });

    it('should detect orphans across all categories', async () => {
      await writeFile(join(ssotRoot, 'rules', 'orphan-rule.md'), '# Rule');
      await writeFile(join(ssotRoot, 'skills', 'orphan-skill.md'), '# Skill');
      await writeFile(join(ssotRoot, 'workflows', 'orphan-wf.md'), '# Workflow');

      const orphans = await detectSsotOrphans(contentDir, ssotRoot);

      expect(orphans.length).toBe(3);
      const categories = orphans.map((o) => o.category).sort();
      expect(categories).toEqual(['rules', 'skills', 'workflows']);
    });

    it('should return empty array when SSOT has no files', async () => {
      await writeFile(join(contentDir, 'skills', 'local-only.md'), '# Local');

      const orphans = await detectSsotOrphans(contentDir, ssotRoot);

      expect(orphans).toEqual([]);
    });

    it('should handle non-existent SSOT directories gracefully', async () => {
      const nonexistentSsot = join(testDir, 'nonexistent');

      const orphans = await detectSsotOrphans(contentDir, nonexistentSsot);

      expect(orphans).toEqual([]);
    });

    it('should handle non-existent local directories gracefully', async () => {
      const nonexistentContent = join(testDir, 'nonexistent-content');
      await writeFile(join(ssotRoot, 'skills', 'ssot-file.md'), '# SSOT');

      const orphans = await detectSsotOrphans(nonexistentContent, ssotRoot);

      expect(orphans.length).toBe(1);
      expect(orphans[0].name).toBe('ssot-file');
    });
  });

  describe('detectSsotDiffs', () => {
    it('should detect files with different content (local newer)', async () => {
      // Write SSOT file first
      await writeFile(join(ssotRoot, 'skills', 'diff.md'), '# Old Content');

      // Wait a bit then write local file (to ensure local is newer)
      await new Promise((r) => setTimeout(r, 50));
      await writeFile(join(contentDir, 'skills', 'diff.md'), '# New Content');

      const diffs = await detectSsotDiffs(contentDir, ssotRoot);

      expect(diffs.length).toBe(1);
      expect(diffs[0].category).toBe('skills');
      expect(diffs[0].name).toBe('diff');
      expect(diffs[0].direction).toBe('local-newer');
    });

    it('should detect files with different content (SSOT newer)', async () => {
      // Write local file first
      await writeFile(join(contentDir, 'skills', 'diff.md'), '# Old Content');

      // Wait a bit then write SSOT file (to ensure SSOT is newer)
      await new Promise((r) => setTimeout(r, 50));
      await writeFile(join(ssotRoot, 'skills', 'diff.md'), '# New Content');

      const diffs = await detectSsotDiffs(contentDir, ssotRoot);

      expect(diffs.length).toBe(1);
      expect(diffs[0].direction).toBe('ssot-newer');
    });

    it('should NOT flag files with identical content', async () => {
      await writeFile(join(ssotRoot, 'skills', 'same.md'), '# Same');
      await writeFile(join(contentDir, 'skills', 'same.md'), '# Same');

      const diffs = await detectSsotDiffs(contentDir, ssotRoot);

      expect(diffs).toEqual([]);
    });

    it('should skip local files that do not exist in SSOT', async () => {
      await writeFile(join(contentDir, 'skills', 'local-only.md'), '# Local');

      const diffs = await detectSsotDiffs(contentDir, ssotRoot);

      expect(diffs).toEqual([]);
    });

    it('should detect diffs across all categories', async () => {
      await writeFile(join(ssotRoot, 'rules', 'r.md'), '# Old');
      await writeFile(join(ssotRoot, 'skills', 's.md'), '# Old');
      await writeFile(join(ssotRoot, 'workflows', 'w.md'), '# Old');

      await new Promise((r) => setTimeout(r, 50));

      await writeFile(join(contentDir, 'rules', 'r.md'), '# New');
      await writeFile(join(contentDir, 'skills', 's.md'), '# New');
      await writeFile(join(contentDir, 'workflows', 'w.md'), '# New');

      const diffs = await detectSsotDiffs(contentDir, ssotRoot);

      expect(diffs.length).toBe(3);
      const categories = diffs.map((d) => d.category).sort();
      expect(categories).toEqual(['rules', 'skills', 'workflows']);
    });

    it('should return empty array when local content dir is empty', async () => {
      await writeFile(join(ssotRoot, 'skills', 'ssot-only.md'), '# SSOT');

      const diffs = await detectSsotDiffs(contentDir, ssotRoot);

      expect(diffs).toEqual([]);
    });

    it('should handle non-existent local directories gracefully', async () => {
      const nonexistentContent = join(testDir, 'nonexistent');

      const diffs = await detectSsotDiffs(nonexistentContent, ssotRoot);

      expect(diffs).toEqual([]);
    });
  });
});
