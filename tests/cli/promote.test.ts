import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { detectContentType, resolveFilePath } from '../../src/cli/promote.js';
import { mockProcessExit, suppressConsole } from './helpers.js';

describe('Promote', () => {
  let testDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-promote-'));
    sourceDir = join(testDir, 'shared-toolkit');

    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await mkdir(join(sourceDir, 'templates', 'skills'), { recursive: true });
    await mkdir(join(sourceDir, 'templates', 'workflows'), { recursive: true });
    await mkdir(join(sourceDir, 'templates', 'rules'), { recursive: true });

    const config = [
      'version: "1.0"',
      'editors:',
      '  cursor: true',
      'content_sources:',
      '  - type: local',
      `    path: "${sourceDir}"`,
    ].join('\n');
    await writeFile(join(testDir, 'ai-toolkit.yaml'), config);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('detectContentType', () => {
    it('should detect skills content type', () => {
      expect(detectContentType('skills/test.md')).toBe('skills');
    });

    it('should detect workflows content type', () => {
      expect(detectContentType('workflows/test.md')).toBe('workflows');
    });

    it('should detect rules content type', () => {
      expect(detectContentType('rules/test.md')).toBe('rules');
    });

    it('should return null for unknown content type', () => {
      expect(detectContentType('unknown/test.md')).toBeNull();
    });

    it('should return null for root-level files', () => {
      expect(detectContentType('test.md')).toBeNull();
    });
  });

  describe('resolveFilePath', () => {
    it('should resolve .ai-content/ prefixed paths', () => {
      const result = resolveFilePath(testDir, '.ai-content/skills/test-skill.md');
      expect(result.relativePath).toBe('skills/test-skill.md');
      expect(result.absoluteFilePath).toBe(join(testDir, '.ai-content', 'skills', 'test-skill.md'));
    });

    it('should resolve absolute paths', () => {
      const absPath = join(testDir, '.ai-content', 'skills', 'test-skill.md');
      const result = resolveFilePath(testDir, absPath);
      expect(result.absoluteFilePath).toBe(absPath);
      expect(result.relativePath).toBe('skills/test-skill.md');
    });

    it('should resolve relative paths', () => {
      const result = resolveFilePath(testDir, 'skills/test-skill.md');
      expect(result.relativePath).toBe('skills/test-skill.md');
      expect(result.absoluteFilePath).toBe(join(testDir, '.ai-content', 'skills', 'test-skill.md'));
    });
  });

  describe('runPromote', () => {
    let exitSpy: ReturnType<typeof mockProcessExit>;
    let consoleSpy: ReturnType<typeof suppressConsole>;

    beforeEach(() => {
      exitSpy = mockProcessExit();
      consoleSpy = suppressConsole();
    });

    afterEach(() => {
      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    async function importRunPromote() {
      return (await import('../../src/cli/promote.js')).runPromote;
    }

    it('should promote a skill to SSOT', async () => {
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'my-skill.md'),
        '# My Skill',
      );

      const runPromote = await importRunPromote();
      await runPromote(testDir, 'skills/my-skill.md');

      expect(exitSpy).not.toHaveBeenCalled();
      const promoted = await readFile(
        join(sourceDir, 'templates', 'skills', 'my-skill.md'),
        'utf-8',
      );
      expect(promoted).toBe('# My Skill');
    });

    it('should not overwrite existing SSOT file without force', async () => {
      await writeFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        '# Old',
      );
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'existing.md'),
        '# New',
      );

      const runPromote = await importRunPromote();
      await runPromote(testDir, 'skills/existing.md');

      // Should NOT overwrite
      const content = await readFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        'utf-8',
      );
      expect(content).toBe('# Old');
    });

    it('should overwrite existing SSOT file with force', async () => {
      await writeFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        '# Old',
      );
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'existing.md'),
        '# New',
      );

      const runPromote = await importRunPromote();
      await runPromote(testDir, 'skills/existing.md', true);

      const content = await readFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        'utf-8',
      );
      expect(content).toBe('# New');
    });

    it('should exit when file does not exist', async () => {
      const runPromote = await importRunPromote();
      await expect(
        runPromote(testDir, 'skills/nonexistent.md'),
      ).rejects.toThrow('process.exit');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit when content type cannot be determined', async () => {
      await writeFile(join(testDir, '.ai-content', 'random.md'), '# Random');

      const runPromote = await importRunPromote();
      await expect(
        runPromote(testDir, 'random.md'),
      ).rejects.toThrow('process.exit');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit when no content_source is configured', async () => {
      await writeFile(
        join(testDir, 'ai-toolkit.yaml'),
        'version: "1.0"\neditors:\n  cursor: true\n',
      );
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'test.md'),
        '# Test',
      );

      const runPromote = await importRunPromote();
      await expect(
        runPromote(testDir, 'skills/test.md'),
      ).rejects.toThrow('process.exit');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
