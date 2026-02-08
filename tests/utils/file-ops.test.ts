import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import {
  ensureDir,
  fileExists,
  readTextFile,
  writeTextFile,
  removeFile,
  findMarkdownFiles,
  findAllManagedFiles,
} from '../../src/utils/file-ops.js';

describe('file-ops', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-fileops-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('ensureDir', () => {
    it('should create a directory recursively', async () => {
      const deep = join(testDir, 'a', 'b', 'c');
      await ensureDir(deep);
      await expect(access(deep)).resolves.toBeUndefined();
    });

    it('should not throw if directory already exists', async () => {
      await mkdir(join(testDir, 'existing'), { recursive: true });
      await expect(ensureDir(join(testDir, 'existing'))).resolves.toBeUndefined();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await writeFile(join(testDir, 'test.txt'), 'hello');
      expect(await fileExists(join(testDir, 'test.txt'))).toBe(true);
    });

    it('should return true for existing directory', async () => {
      await mkdir(join(testDir, 'subdir'));
      expect(await fileExists(join(testDir, 'subdir'))).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      expect(await fileExists(join(testDir, 'nope.txt'))).toBe(false);
    });
  });

  describe('readTextFile', () => {
    it('should read file content as UTF-8', async () => {
      await writeFile(join(testDir, 'read.txt'), 'héllo wörld');
      const content = await readTextFile(join(testDir, 'read.txt'));
      expect(content).toBe('héllo wörld');
    });

    it('should throw for non-existent file', async () => {
      await expect(readTextFile(join(testDir, 'missing.txt'))).rejects.toThrow();
    });
  });

  describe('writeTextFile', () => {
    it('should write content and create parent directories', async () => {
      const filePath = join(testDir, 'deep', 'nested', 'file.txt');
      await writeTextFile(filePath, 'content here');

      const content = await readTextFile(filePath);
      expect(content).toBe('content here');
    });

    it('should overwrite existing file', async () => {
      const filePath = join(testDir, 'overwrite.txt');
      await writeTextFile(filePath, 'first');
      await writeTextFile(filePath, 'second');

      const content = await readTextFile(filePath);
      expect(content).toBe('second');
    });
  });

  describe('removeFile', () => {
    it('should remove an existing file and return true', async () => {
      const filePath = join(testDir, 'remove-me.txt');
      await writeFile(filePath, 'bye');

      const result = await removeFile(filePath);
      expect(result).toBe(true);
      expect(await fileExists(filePath)).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const result = await removeFile(join(testDir, 'nonexistent.txt'));
      expect(result).toBe(false);
    });
  });

  describe('findMarkdownFiles', () => {
    it('should find .md files in a directory', async () => {
      const dir = join(testDir, 'content');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'rule1.md'), '# Rule 1');
      await writeFile(join(dir, 'rule2.md'), '# Rule 2');
      await writeFile(join(dir, 'readme.txt'), 'not markdown');

      const files = await findMarkdownFiles(dir, dir);

      expect(files.length).toBe(2);
      const names = files.map((f) => f.name).sort();
      expect(names).toEqual(['rule1', 'rule2']);
    });

    it('should find .md files recursively in subdirectories', async () => {
      const dir = join(testDir, 'content');
      await mkdir(join(dir, 'sub'), { recursive: true });
      await writeFile(join(dir, 'top.md'), '# Top');
      await writeFile(join(dir, 'sub', 'nested.md'), '# Nested');

      const files = await findMarkdownFiles(dir, dir);

      expect(files.length).toBe(2);
      const nested = files.find((f) => f.name === 'nested');
      expect(nested).toBeDefined();
      expect(nested!.relativePath).toBe(join('sub', 'nested.md'));
    });

    it('should include file content', async () => {
      const dir = join(testDir, 'content');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'test.md'), '# Hello World');

      const files = await findMarkdownFiles(dir, dir);

      expect(files[0].content).toBe('# Hello World');
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await findMarkdownFiles(join(testDir, 'nope'), join(testDir, 'nope'));
      expect(files).toEqual([]);
    });

    it('should return empty array for empty directory', async () => {
      const dir = join(testDir, 'empty');
      await mkdir(dir);
      const files = await findMarkdownFiles(dir, dir);
      expect(files).toEqual([]);
    });

    it('should set absolutePath correctly', async () => {
      const dir = join(testDir, 'content');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'abs.md'), '# Abs');

      const files = await findMarkdownFiles(dir, dir);
      expect(files[0].absolutePath).toBe(join(dir, 'abs.md'));
    });
  });

  describe('findAllManagedFiles', () => {
    it('should find markdown files across multiple editor directories', async () => {
      await mkdir(join(testDir, '.cursor', 'rules'), { recursive: true });
      await mkdir(join(testDir, '.claude', 'rules'), { recursive: true });
      await writeFile(join(testDir, '.cursor', 'rules', 'a.md'), '# A');
      await writeFile(join(testDir, '.claude', 'rules', 'b.md'), '# B');

      const managed = await findAllManagedFiles(testDir, ['.cursor/rules', '.claude/rules']);

      expect(managed.length).toBe(2);
    });

    it('should handle non-existent directories gracefully', async () => {
      const managed = await findAllManagedFiles(testDir, ['.nonexistent/rules']);
      expect(managed).toEqual([]);
    });
  });
});
