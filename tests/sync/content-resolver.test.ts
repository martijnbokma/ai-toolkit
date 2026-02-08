import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import {
  resolveContentSources,
  resolveSourcePath,
} from '../../src/sync/content-resolver.js';
import type { ContentSource } from '../../src/core/types.js';

describe('ContentResolver', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-resolver-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('resolveSourcePath', () => {
    it('should resolve a local path with .ai-content/ subdirectory', async () => {
      const sourceDir = join(testDir, 'shared-toolkit');
      await mkdir(join(sourceDir, '.ai-content'), { recursive: true });

      const source: ContentSource = { type: 'local', path: sourceDir };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBe(join(sourceDir, '.ai-content'));
    });

    it('should resolve a local path with templates/ subdirectory', async () => {
      const sourceDir = join(testDir, 'shared-toolkit');
      await mkdir(join(sourceDir, 'templates'), { recursive: true });

      const source: ContentSource = { type: 'local', path: sourceDir };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBe(join(sourceDir, 'templates'));
    });

    it('should prefer .ai-content/ over templates/', async () => {
      const sourceDir = join(testDir, 'shared-toolkit');
      await mkdir(join(sourceDir, '.ai-content'), { recursive: true });
      await mkdir(join(sourceDir, 'templates'), { recursive: true });

      const source: ContentSource = { type: 'local', path: sourceDir };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBe(join(sourceDir, '.ai-content'));
    });

    it('should fall back to the path itself if no subdirectory found', async () => {
      const sourceDir = join(testDir, 'shared-toolkit');
      await mkdir(sourceDir, { recursive: true });

      const source: ContentSource = { type: 'local', path: sourceDir };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBe(sourceDir);
    });

    it('should resolve relative paths from projectRoot', async () => {
      const sourceDir = join(testDir, 'relative-source');
      await mkdir(sourceDir, { recursive: true });

      const source: ContentSource = { type: 'local', path: './relative-source' };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBe(sourceDir);
    });

    it('should return null for non-existent path', async () => {
      const source: ContentSource = { type: 'local', path: '/nonexistent/path' };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBeNull();
    });

    it('should return null for local source without path', async () => {
      const source: ContentSource = { type: 'local' };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBeNull();
    });

    it('should return null for package source without name', async () => {
      const source: ContentSource = { type: 'package' };
      const result = await resolveSourcePath(testDir, source);

      expect(result).toBeNull();
    });
  });

  describe('resolveContentSources', () => {
    it('should resolve rules from a local source', async () => {
      const sourceDir = join(testDir, 'shared');
      const rulesDir = join(sourceDir, 'rules');
      await mkdir(rulesDir, { recursive: true });
      await writeFile(join(rulesDir, 'shared-rule.md'), '# Shared Rule');

      const sources: ContentSource[] = [
        { type: 'local', path: sourceDir, include: ['rules'] },
      ];

      const result = await resolveContentSources(testDir, sources);

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].name).toBe('shared-rule');
      expect(result.rules[0].content).toBe('# Shared Rule');
      expect(result.skills).toHaveLength(0);
      expect(result.workflows).toHaveLength(0);
    });

    it('should resolve all categories by default', async () => {
      const sourceDir = join(testDir, 'shared');
      await mkdir(join(sourceDir, 'rules'), { recursive: true });
      await mkdir(join(sourceDir, 'skills'), { recursive: true });
      await mkdir(join(sourceDir, 'workflows'), { recursive: true });
      await writeFile(join(sourceDir, 'rules', 'r.md'), '# Rule');
      await writeFile(join(sourceDir, 'skills', 's.md'), '# Skill');
      await writeFile(join(sourceDir, 'workflows', 'w.md'), '# Workflow');

      const sources: ContentSource[] = [
        { type: 'local', path: sourceDir },
      ];

      const result = await resolveContentSources(testDir, sources);

      expect(result.rules).toHaveLength(1);
      expect(result.skills).toHaveLength(1);
      expect(result.workflows).toHaveLength(1);
    });

    it('should handle non-existent source gracefully', async () => {
      const sources: ContentSource[] = [
        { type: 'local', path: '/nonexistent' },
      ];

      const result = await resolveContentSources(testDir, sources);

      expect(result.rules).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
      expect(result.workflows).toHaveLength(0);
    });

    it('should merge multiple sources', async () => {
      const source1 = join(testDir, 'source1');
      const source2 = join(testDir, 'source2');
      await mkdir(join(source1, 'rules'), { recursive: true });
      await mkdir(join(source2, 'rules'), { recursive: true });
      await writeFile(join(source1, 'rules', 'rule-a.md'), '# Rule A');
      await writeFile(join(source2, 'rules', 'rule-b.md'), '# Rule B');

      const sources: ContentSource[] = [
        { type: 'local', path: source1, include: ['rules'] },
        { type: 'local', path: source2, include: ['rules'] },
      ];

      const result = await resolveContentSources(testDir, sources);

      expect(result.rules).toHaveLength(2);
      const names = result.rules.map((r) => r.name).sort();
      expect(names).toEqual(['rule-a', 'rule-b']);
    });

    it('should handle package source that is not installed', async () => {
      const sources: ContentSource[] = [
        { type: 'package', name: 'nonexistent-ai-toolkit-package-xyz' },
      ];

      const result = await resolveContentSources(testDir, sources);

      expect(result.rules).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
      expect(result.workflows).toHaveLength(0);
    });

    it('should handle source with category dir that has no markdown files', async () => {
      const sourceDir = join(testDir, 'empty-source');
      await mkdir(join(sourceDir, 'rules'), { recursive: true });
      // rules dir exists but has no .md files

      const sources: ContentSource[] = [
        { type: 'local', path: sourceDir, include: ['rules'] },
      ];

      const result = await resolveContentSources(testDir, sources);

      expect(result.rules).toHaveLength(0);
    });
  });

  describe('resolveSourcePath — package type', () => {
    it('should return null for non-installed package', async () => {
      const source: ContentSource = { type: 'package', name: 'nonexistent-pkg-xyz-123' };
      const result = await resolveSourcePath(testDir, source);
      expect(result).toBeNull();
    });
  });
});
