import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { suppressConsole } from './helpers.js';

// Mock @clack/prompts before importing the module
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  isCancel: () => false,
}));

describe('runGenerateContext', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-genctx-'));
    consoleSpy = suppressConsole();
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  async function importCommand() {
    return (await import('../../src/cli/generate-context.js')).runGenerateContext;
  }

  it('should generate PROJECT.md in content directory', async () => {
    await mkdir(join(testDir, '.ai-content'), { recursive: true });
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'test-app', dependencies: { react: '^18.0.0' } }),
    );

    const runGenerateContext = await importCommand();
    await runGenerateContext(testDir);

    const content = await readFile(join(testDir, '.ai-content', 'PROJECT.md'), 'utf-8');
    expect(content).toContain('Project Context');
    expect(content.length).toBeGreaterThan(100);
  });

  it('should skip when PROJECT.md already has rich content', async () => {
    await mkdir(join(testDir, '.ai-content'), { recursive: true });
    // Write a rich PROJECT.md (>20 non-empty lines)
    const richContent = Array.from({ length: 25 }, (_, i) => `Line ${i}: Some real content here`).join('\n');
    await writeFile(join(testDir, '.ai-content', 'PROJECT.md'), richContent);

    const runGenerateContext = await importCommand();
    await runGenerateContext(testDir);

    // Content should be unchanged (not overwritten)
    const content = await readFile(join(testDir, '.ai-content', 'PROJECT.md'), 'utf-8');
    expect(content).toBe(richContent);
  });

  it('should overwrite with --force even when rich content exists', async () => {
    await mkdir(join(testDir, '.ai-content'), { recursive: true });
    const richContent = Array.from({ length: 25 }, (_, i) => `Line ${i}: content`).join('\n');
    await writeFile(join(testDir, '.ai-content', 'PROJECT.md'), richContent);

    const runGenerateContext = await importCommand();
    await runGenerateContext(testDir, { force: true });

    const content = await readFile(join(testDir, '.ai-content', 'PROJECT.md'), 'utf-8');
    expect(content).toContain('Project Context');
    expect(content).not.toBe(richContent);
  });

  it('should overwrite template-only content (mostly HTML comments)', async () => {
    await mkdir(join(testDir, '.ai-content'), { recursive: true });
    await writeFile(
      join(testDir, '.ai-content', 'PROJECT.md'),
      '<!-- Fill in your project details -->\n<!-- Another comment -->\nShort line',
    );

    const runGenerateContext = await importCommand();
    await runGenerateContext(testDir);

    const content = await readFile(join(testDir, '.ai-content', 'PROJECT.md'), 'utf-8');
    expect(content).toContain('Project Context');
  });

  it('should use config metadata when ai-toolkit.yaml exists', async () => {
    await mkdir(join(testDir, '.ai-content'), { recursive: true });
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\nmetadata:\n  name: "MyApp"\n  description: "A cool app"\n',
    );

    const runGenerateContext = await importCommand();
    await runGenerateContext(testDir);

    const content = await readFile(join(testDir, '.ai-content', 'PROJECT.md'), 'utf-8');
    expect(content).toContain('MyApp');
  });
});
