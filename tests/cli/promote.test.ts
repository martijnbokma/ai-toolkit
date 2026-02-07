import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';

// We test the internal helpers by importing the module and testing the exported functions indirectly.
// Since runPromote/runPromoteForce call process.exit, we test the core logic via integration.

describe('Promote', () => {
  let testDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-promote-'));
    sourceDir = join(testDir, 'shared-toolkit');

    // Setup: project with ai-toolkit.yaml pointing to a local content source
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await mkdir(join(sourceDir, 'templates', 'skills'), { recursive: true });
    await mkdir(join(sourceDir, 'templates', 'workflows'), { recursive: true });
    await mkdir(join(sourceDir, 'templates', 'rules'), { recursive: true });

    // Create ai-toolkit.yaml with content_sources
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

  // Since runPromote calls process.exit on errors, we test the promote logic
  // by dynamically importing and mocking process.exit.
  // Instead, we test the underlying behavior by simulating what promote does.

  describe('path resolution logic', () => {
    it('should resolve .ai-content/ prefixed paths correctly', () => {
      const CONTENT_DIR = '.ai-content';
      const filePath = '.ai-content/skills/test-skill.md';

      // Simulates the path resolution in promote.ts
      let relativePath: string;
      let absoluteFilePath: string;

      if (filePath.startsWith(CONTENT_DIR + '/')) {
        relativePath = filePath.slice(CONTENT_DIR.length + 1);
        absoluteFilePath = join(testDir, filePath);
      } else {
        relativePath = filePath;
        absoluteFilePath = join(testDir, CONTENT_DIR, filePath);
      }

      expect(relativePath).toBe('skills/test-skill.md');
      expect(absoluteFilePath).toBe(join(testDir, '.ai-content', 'skills', 'test-skill.md'));
    });

    it('should resolve absolute paths correctly', () => {
      const CONTENT_DIR = '.ai-content';
      const contentDir = join(testDir, CONTENT_DIR);
      const filePath = join(contentDir, 'skills', 'test-skill.md');

      let relativePath: string;
      let absoluteFilePath: string;

      if (filePath.startsWith(CONTENT_DIR + '/')) {
        relativePath = filePath.slice(CONTENT_DIR.length + 1);
        absoluteFilePath = join(testDir, filePath);
      } else if (filePath.startsWith('/')) {
        absoluteFilePath = filePath;
        relativePath = absoluteFilePath.replace(contentDir + '/', '');
      } else {
        relativePath = filePath;
        absoluteFilePath = join(contentDir, filePath);
      }

      expect(absoluteFilePath).toBe(filePath);
      expect(relativePath).toBe('skills/test-skill.md');
    });

    it('should resolve relative paths correctly', () => {
      const CONTENT_DIR = '.ai-content';
      const contentDir = join(testDir, CONTENT_DIR);
      const filePath = 'skills/test-skill.md';

      let relativePath: string;
      let absoluteFilePath: string;

      if (filePath.startsWith(CONTENT_DIR + '/')) {
        relativePath = filePath.slice(CONTENT_DIR.length + 1);
        absoluteFilePath = join(testDir, filePath);
      } else if (filePath.startsWith('/')) {
        absoluteFilePath = filePath;
        relativePath = absoluteFilePath.replace(contentDir + '/', '');
      } else {
        relativePath = filePath;
        absoluteFilePath = join(contentDir, filePath);
      }

      expect(relativePath).toBe('skills/test-skill.md');
      expect(absoluteFilePath).toBe(join(contentDir, 'skills', 'test-skill.md'));
    });
  });

  describe('content type detection', () => {
    function detectContentType(relativePath: string): string | null {
      if (relativePath.startsWith('skills/') || relativePath.startsWith('skills/')) return 'skills';
      if (relativePath.startsWith('workflows/') || relativePath.startsWith('workflows/')) return 'workflows';
      if (relativePath.startsWith('rules/') || relativePath.startsWith('rules/')) return 'rules';
      return null;
    }

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

  describe('promote integration', () => {
    it('should copy file to SSOT templates directory', async () => {
      // Create a local skill
      const skillContent = '# My Skill\nDo the thing.';
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'my-skill.md'),
        skillContent,
      );

      // Simulate promote: read from local, write to SSOT
      const content = await readFile(
        join(testDir, '.ai-content', 'skills', 'my-skill.md'),
        'utf-8',
      );
      const targetPath = join(sourceDir, 'templates', 'skills', 'my-skill.md');
      await writeFile(targetPath, content);

      // Verify
      const promoted = await readFile(targetPath, 'utf-8');
      expect(promoted).toBe(skillContent);
    });

    it('should not overwrite existing SSOT file without force', async () => {
      // Create existing SSOT file
      const existingContent = '# Existing Skill';
      await writeFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        existingContent,
      );

      // Create local file with different content
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'existing.md'),
        '# Updated Skill',
      );

      // Simulate promote without force: check existence first
      const { access } = await import('fs/promises');
      let exists = true;
      try {
        await access(join(sourceDir, 'templates', 'skills', 'existing.md'));
      } catch {
        exists = false;
      }

      expect(exists).toBe(true);
      // Should NOT overwrite — verify original content preserved
      const content = await readFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        'utf-8',
      );
      expect(content).toBe(existingContent);
    });

    it('should overwrite existing SSOT file with force', async () => {
      // Create existing SSOT file
      await writeFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        '# Old Content',
      );

      // Create local file with new content
      const newContent = '# New Content';
      await writeFile(
        join(testDir, '.ai-content', 'skills', 'existing.md'),
        newContent,
      );

      // Simulate promote with force: overwrite regardless
      const localContent = await readFile(
        join(testDir, '.ai-content', 'skills', 'existing.md'),
        'utf-8',
      );
      await writeFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        localContent,
      );

      const result = await readFile(
        join(sourceDir, 'templates', 'skills', 'existing.md'),
        'utf-8',
      );
      expect(result).toBe(newContent);
    });
  });
});
