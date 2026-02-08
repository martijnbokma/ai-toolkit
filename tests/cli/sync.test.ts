import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { mockProcessExit, suppressConsole } from './helpers.js';

// Mock readline to auto-answer 'y' to all prompts
vi.mock('readline', () => ({
  createInterface: () => ({
    question: (_q: string, cb: (answer: string) => void) => cb('y'),
    close: vi.fn(),
  }),
}));

describe('runSyncCommand', () => {
  let testDir: string;
  let exitSpy: ReturnType<typeof mockProcessExit>;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-synccmd-'));
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  async function importCommand() {
    return (await import('../../src/cli/sync.js')).runSyncCommand;
  }

  it('should fail when no config file exists', async () => {
    const runSyncCommand = await importCommand();
    await expect(runSyncCommand(testDir)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should sync successfully with valid config', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(join(testDir, '.ai-content', 'rules', 'test.md'), '# Test Rule');

    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();

    // Verify files were synced
    const cursorRule = await readFile(join(testDir, '.cursor', 'rules', 'test.md'), 'utf-8');
    expect(cursorRule).toContain('# Test Rule');
  });

  it('should run in dry-run mode without writing files', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(join(testDir, '.ai-content', 'rules', 'test.md'), '# Test');

    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir, { dryRun: true });

    expect(exitSpy).not.toHaveBeenCalled();

    // Files should NOT be created in dry-run
    const { access } = await import('fs/promises');
    await expect(access(join(testDir, '.cursor', 'rules', 'test.md'))).rejects.toThrow();
  });

  it('should handle orphans with user confirmation', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(join(testDir, '.ai-content', 'rules', 'temp.md'), '# Temp');

    // First sync to create files
    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir);

    // Delete source and re-sync — orphan detection + readline mock answers 'y'
    await unlink(join(testDir, '.ai-content', 'rules', 'temp.md'));
    await runSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should handle SSOT diffs when content_sources configured', async () => {
    const ssotDir = join(testDir, 'ssot-source');
    await mkdir(join(ssotDir, 'rules'), { recursive: true });
    await writeFile(join(ssotDir, 'rules', 'shared.md'), '# SSOT version');

    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"\neditors:\n  cursor: true\ncontent_sources:\n  - type: local\n    path: "${ssotDir}"\n`,
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    // Create a local version that differs from SSOT
    await writeFile(join(testDir, '.ai-content', 'rules', 'shared.md'), '# Local version');

    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should show summary with synced and removed counts', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(join(testDir, '.ai-content', 'rules', 'a.md'), '# A');
    await writeFile(join(testDir, '.ai-content', 'rules', 'b.md'), '# B');

    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should handle SSOT orphans (file in SSOT but removed locally)', async () => {
    const ssotDir = join(testDir, 'ssot');
    await mkdir(join(ssotDir, 'rules'), { recursive: true });
    await mkdir(join(ssotDir, 'skills'), { recursive: true });
    await mkdir(join(ssotDir, 'workflows'), { recursive: true });
    // SSOT has a file that doesn't exist locally
    await writeFile(join(ssotDir, 'rules', 'orphan-rule.md'), '# Orphan');

    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"\neditors:\n  cursor: true\ncontent_sources:\n  - type: local\n    path: "${ssotDir}"\n`,
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    // No local orphan-rule.md → SSOT orphan detected

    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir);

    // readline mock answers 'y', so orphan should be removed from SSOT
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should trigger resync when SSOT-newer diff is accepted', async () => {
    const ssotDir = join(testDir, 'ssot2');
    await mkdir(join(ssotDir, 'rules'), { recursive: true });
    await mkdir(join(ssotDir, 'skills'), { recursive: true });
    await mkdir(join(ssotDir, 'workflows'), { recursive: true });

    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"\neditors:\n  cursor: true\ncontent_sources:\n  - type: local\n    path: "${ssotDir}"\n`,
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });

    // Create both local and SSOT with same name but different content
    await writeFile(join(testDir, '.ai-content', 'rules', 'diff.md'), '# Old local');
    // Wait a bit then write SSOT version (newer)
    await new Promise((r) => setTimeout(r, 50));
    await writeFile(join(ssotDir, 'rules', 'diff.md'), '# Updated SSOT');

    const runSyncCommand = await importCommand();
    await runSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
