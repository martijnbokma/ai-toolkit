import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { updateGitignore } from '../../src/sync/gitignore.js';
import type { EditorAdapter } from '../../src/core/types.js';

describe('Gitignore', () => {
  let testDir: string;

  const cursorAdapter: EditorAdapter = {
    name: 'cursor',
    fileNaming: 'flat',
    entryPoint: '.cursorrules',
    mcpConfigPath: '.cursor/mcp.json',
    directories: {
      rules: '.cursor/rules',
    },
  };

  const claudeAdapter: EditorAdapter = {
    name: 'claude',
    fileNaming: 'flat',
    entryPoint: 'CLAUDE.md',
    directories: {
      rules: '.claude/rules',
      skills: '.claude/skills',
    },
  };

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-gitignore-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create .gitignore with managed block when none exists', async () => {
    await updateGitignore(testDir, [cursorAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('ai-toolkit managed');
    expect(content).toContain('.cursor/rules/');
    expect(content).toContain('.cursorrules');
    expect(content).toContain('.cursor/mcp.json');
  });

  it('should append managed block to existing .gitignore', async () => {
    await writeFile(join(testDir, '.gitignore'), 'node_modules/\ndist/\n');

    await updateGitignore(testDir, [cursorAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('ai-toolkit managed');
    expect(content).toContain('.cursor/rules/');
  });

  it('should replace existing managed block', async () => {
    // First run — creates managed block with cursor
    await updateGitignore(testDir, [cursorAdapter]);

    // Second run — replaces with cursor + claude
    await updateGitignore(testDir, [cursorAdapter, claudeAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.cursor/rules/');
    expect(content).toContain('.claude/rules/');
    expect(content).toContain('.claude/skills/');
    expect(content).toContain('CLAUDE.md');

    // Should only have one managed block (not duplicated)
    const startCount = (content.match(/ai-toolkit managed \(DO NOT EDIT\)/g) || []).length;
    expect(startCount).toBe(1);
  });

  it('should include entry points in gitignore', async () => {
    await updateGitignore(testDir, [cursorAdapter, claudeAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.cursorrules');
    expect(content).toContain('CLAUDE.md');
  });

  it('should include MCP config paths in gitignore', async () => {
    await updateGitignore(testDir, [cursorAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.cursor/mcp.json');
  });

  it('should sort paths alphabetically within managed block', async () => {
    await updateGitignore(testDir, [cursorAdapter, claudeAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    const startMarker = '# >>> ai-toolkit managed (DO NOT EDIT) >>>';
    const endMarker = '# <<< ai-toolkit managed <<<';
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);
    const block = content.substring(startIdx + startMarker.length, endIdx).trim();
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    // Verify sorted
    const sorted = [...lines].sort();
    expect(lines).toEqual(sorted);
  });

  it('should preserve content outside managed block', async () => {
    await writeFile(
      join(testDir, '.gitignore'),
      'node_modules/\n\n# Custom\n*.log\n',
    );

    await updateGitignore(testDir, [cursorAdapter]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('*.log');
    expect(content).toContain('.cursor/rules/');
  });

  it('should deduplicate paths when skills and rules share a directory', async () => {
    const adapterWithSharedDir: EditorAdapter = {
      name: 'test',
      fileNaming: 'flat',
      directories: {
        rules: '.test/rules',
        skills: '.test/rules', // Same as rules
      },
    };

    await updateGitignore(testDir, [adapterWithSharedDir]);

    const content = await readFile(join(testDir, '.gitignore'), 'utf-8');
    const rulesDirCount = (content.match(/\.test\/rules\//g) || []).length;
    expect(rulesDirCount).toBe(1);
  });
});
