import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { mockProcessExit, suppressConsole } from './helpers.js';

describe('runMonorepoSyncCommand', () => {
  let testDir: string;
  let exitSpy: ReturnType<typeof mockProcessExit>;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-syncall-'));
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  async function importCommand() {
    return (await import('../../src/cli/sync-all.js')).runMonorepoSyncCommand;
  }

  it('should sync a monorepo root project', async () => {
    // Create a root project with config
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(join(testDir, '.ai-content', 'rules', 'test.md'), '# Test');

    const runMonorepoSyncCommand = await importCommand();
    await runMonorepoSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should run in dry-run mode', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });

    const runMonorepoSyncCommand = await importCommand();
    await runMonorepoSyncCommand(testDir, { dryRun: true });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // No config file → loadConfig will fail inside monorepo scan
    // But monorepo sync handles errors per-project, so it shouldn't crash
    const runMonorepoSyncCommand = await importCommand();
    await runMonorepoSyncCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
