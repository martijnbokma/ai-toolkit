import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { mockProcessExit, suppressConsole } from './helpers.js';

// Mock @clack/prompts to simulate user input
vi.mock('@clack/prompts', () => {
  let callIndex = 0;
  const responses: any[] = [];

  return {
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    note: vi.fn(),
    isCancel: () => false,
    spinner: () => ({
      start: vi.fn(),
      stop: vi.fn(),
    }),
    text: vi.fn(async () => {
      return responses[callIndex++] ?? 'test-value';
    }),
    select: vi.fn(async () => {
      return responses[callIndex++] ?? 'quick';
    }),
    confirm: vi.fn(async () => {
      return responses[callIndex++] ?? true;
    }),
    multiselect: vi.fn(async () => {
      return responses[callIndex++] ?? ['cursor'];
    }),
    // Helper to set responses for a test
    __setResponses: (r: any[]) => {
      callIndex = 0;
      responses.length = 0;
      responses.push(...r);
    },
    __reset: () => {
      callIndex = 0;
      responses.length = 0;
    },
  };
});

describe('runInit', () => {
  let testDir: string;
  let exitSpy: ReturnType<typeof mockProcessExit>;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-init-'));
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();

    const prompts = await import('@clack/prompts');
    (prompts as any).__reset();
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  async function importRunInit() {
    return (await import('../../src/cli/init.js')).runInit;
  }

  it('should skip when already initialized without --force', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );

    const runInit = await importRunInit();
    await runInit(testDir, false);

    // Should not exit, just warn
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should initialize a new project with quick setup', async () => {
    const prompts = await import('@clack/prompts');
    // Quick setup flow:
    // 1. text: project name
    // 2. confirm: accept detected stack
    // 3. multiselect: editors
    (prompts as any).__setResponses([
      'my-project',   // project name
      true,           // accept detected stack
      ['cursor'],     // editors
    ]);

    const runInit = await importRunInit();
    await runInit(testDir, false);

    // Config file should be created
    const configExists = await import('fs/promises').then((fs) =>
      fs.access(join(testDir, 'ai-toolkit.yaml')).then(() => true).catch(() => false),
    );
    expect(configExists).toBe(true);

    // Content directories should be created
    const rulesExists = await import('fs/promises').then((fs) =>
      fs.access(join(testDir, '.ai-content', 'rules')).then(() => true).catch(() => false),
    );
    expect(rulesExists).toBe(true);
  });

  it('should create content directories and example rule', async () => {
    const prompts = await import('@clack/prompts');
    (prompts as any).__setResponses([
      'test-project',
      true,
      ['cursor'],
    ]);

    const runInit = await importRunInit();
    await runInit(testDir, false);

    // Example rule should exist
    const exampleRule = await readFile(
      join(testDir, '.ai-content', 'rules', 'project-conventions.md'),
      'utf-8',
    );
    expect(exampleRule).toContain('Project Conventions');
  });

  it('should re-init with --force on existing project', async () => {
    // First init
    const prompts = await import('@clack/prompts');
    (prompts as any).__setResponses([
      'first-project',
      true,
      ['cursor'],
    ]);

    const runInit = await importRunInit();
    await runInit(testDir, false);

    // Re-init with force
    (prompts as any).__setResponses([
      'updated-project',
      true,
      ['cursor', 'claude'],
      false, // don't regenerate PROJECT.md
    ]);

    await runInit(testDir, true);

    const config = await readFile(join(testDir, 'ai-toolkit.yaml'), 'utf-8');
    expect(config).toContain('updated-project');
  });
});
