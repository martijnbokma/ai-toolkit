import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { suppressConsole } from './helpers.js';

// Mock fs.watch to avoid actually watching files
vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>();
  return {
    ...original,
    watch: vi.fn(() => ({ close: vi.fn() })),
  };
});

describe('runWatchCommand', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-watch-'));
    consoleSpy = suppressConsole();
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should set up watchers and run initial sync', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });

    const { watch } = await import('fs');
    const { runWatchCommand } = await import('../../src/cli/watch.js');

    // runWatchCommand blocks forever with `await new Promise(() => {})`,
    // so we race it with a timeout
    const result = await Promise.race([
      runWatchCommand(testDir).catch(() => 'completed'),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 500)),
    ]);

    expect(result).toBe('timeout');
    // fs.watch should have been called for config and content dir
    expect(watch).toHaveBeenCalled();
  });
});
