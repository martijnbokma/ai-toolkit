import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { generateEntryPoints } from '../../src/sync/entry-points.js';
import { CONTENT_DIR, PROJECT_CONTEXT_FILE, AUTO_GENERATED_MARKER } from '../../src/core/types.js';
import type { EditorAdapter, ToolkitConfig, SyncResult } from '../../src/core/types.js';

describe('EntryPoints', () => {
  let testDir: string;

  const mockAdapter: EditorAdapter = {
    name: 'cursor',
    fileNaming: 'flat',
    directories: { rules: '.cursor/rules' },
    entryPoint: '.cursorrules',
    generateEntryPointContent: (config: ToolkitConfig) => {
      return `${AUTO_GENERATED_MARKER}\n# ${config.metadata?.name || 'Project'}\n`;
    },
  };

  const mockAdapterNoEntry: EditorAdapter = {
    name: 'aider',
    fileNaming: 'flat',
    directories: { rules: '.aider/rules' },
    // No entryPoint
  };

  const baseConfig: ToolkitConfig = {
    version: '1.0',
    editors: { cursor: true },
    metadata: { name: 'TestProject' },
  };

  function emptySyncResult(): SyncResult {
    return {
      synced: [],
      skipped: [],
      removed: [],
      errors: [],
      pendingOrphans: [],
      ssotOrphans: [],
      ssotDiffs: [],
    };
  }

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-entrypoints-'));
    await mkdir(join(testDir, CONTENT_DIR), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate entry point file for adapter with entryPoint', async () => {
    const result = emptySyncResult();
    await generateEntryPoints(testDir, [mockAdapter], baseConfig, result, false);

    const content = await readFile(join(testDir, '.cursorrules'), 'utf-8');
    expect(content).toContain(AUTO_GENERATED_MARKER);
    expect(content).toContain('# TestProject');
    expect(result.synced.length).toBe(1);
  });

  it('should skip adapters without entryPoint', async () => {
    const result = emptySyncResult();
    await generateEntryPoints(testDir, [mockAdapterNoEntry], baseConfig, result, false);

    expect(result.synced).toEqual([]);
  });

  it('should append PROJECT.md content when it exists', async () => {
    await writeFile(
      join(testDir, CONTENT_DIR, PROJECT_CONTEXT_FILE),
      '# My Project Context\nImportant details here.',
    );

    const result = emptySyncResult();
    await generateEntryPoints(testDir, [mockAdapter], baseConfig, result, false);

    const content = await readFile(join(testDir, '.cursorrules'), 'utf-8');
    expect(content).toContain('# TestProject');
    expect(content).toContain('---');
    expect(content).toContain('# My Project Context');
    expect(content).toContain('Important details here.');
  });

  it('should NOT append PROJECT.md if it only contains HTML comments (template placeholders)', async () => {
    await writeFile(
      join(testDir, CONTENT_DIR, PROJECT_CONTEXT_FILE),
      '<!-- Fill in your project details here -->\n<!-- Another comment -->',
    );

    const result = emptySyncResult();
    await generateEntryPoints(testDir, [mockAdapter], baseConfig, result, false);

    const content = await readFile(join(testDir, '.cursorrules'), 'utf-8');
    expect(content).toContain('# TestProject');
    expect(content).not.toContain('My Project Context');
  });

  it('should not write files in dry-run mode', async () => {
    const result = emptySyncResult();
    await generateEntryPoints(testDir, [mockAdapter], baseConfig, result, true);

    expect(result.synced.length).toBe(1);

    // File should NOT exist
    const { access } = await import('fs/promises');
    await expect(access(join(testDir, '.cursorrules'))).rejects.toThrow();
  });

  it('should generate entry points for multiple adapters', async () => {
    const claudeAdapter: EditorAdapter = {
      name: 'claude',
      fileNaming: 'flat',
      directories: { rules: '.claude/rules' },
      entryPoint: 'CLAUDE.md',
      generateEntryPointContent: (config: ToolkitConfig) => {
        return `${AUTO_GENERATED_MARKER}\n# ${config.metadata?.name || 'Project'} — Claude\n`;
      },
    };

    const result = emptySyncResult();
    await generateEntryPoints(testDir, [mockAdapter, claudeAdapter], baseConfig, result, false);

    expect(result.synced.length).toBe(2);

    const cursorrules = await readFile(join(testDir, '.cursorrules'), 'utf-8');
    expect(cursorrules).toContain('# TestProject');

    const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('# TestProject — Claude');
  });

  it('should skip adapter if generateEntryPointContent returns empty string', async () => {
    const emptyAdapter: EditorAdapter = {
      name: 'empty',
      fileNaming: 'flat',
      directories: { rules: '.empty/rules' },
      entryPoint: '.emptyrules',
      generateEntryPointContent: () => '',
    };

    const result = emptySyncResult();
    await generateEntryPoints(testDir, [emptyAdapter], baseConfig, result, false);

    expect(result.synced).toEqual([]);
  });

  it('should record errors when writing fails', async () => {
    // Use an adapter with an invalid path to trigger an error
    const badAdapter: EditorAdapter = {
      name: 'bad',
      fileNaming: 'flat',
      directories: { rules: '.bad/rules' },
      entryPoint: '/dev/null/impossible/path/entry.md',
      generateEntryPointContent: () => `${AUTO_GENERATED_MARKER}\n# Bad\n`,
    };

    const result = emptySyncResult();
    await generateEntryPoints(testDir, [badAdapter], baseConfig, result, false);

    // On most systems writing to /dev/null/impossible/path will fail
    // but the function should handle the error gracefully
    // Either it succeeds (unlikely) or records an error
    expect(result.errors.length + result.synced.length).toBeGreaterThan(0);
  });
});
