import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { addSyncScripts } from '../../src/utils/package-scripts.js';

describe('addSyncScripts', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-scripts-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should add sync scripts to package.json', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'test', scripts: { dev: 'vite' } }),
    );

    const result = await addSyncScripts(testDir);
    expect(result).toBe(true);

    const pkg = JSON.parse(await readFile(join(testDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.sync).toBe('ai-toolkit sync');
    expect(pkg.scripts['sync:dry']).toBe('ai-toolkit sync --dry-run');
    expect(pkg.scripts['sync:watch']).toBe('ai-toolkit watch');
    expect(pkg.scripts.dev).toBe('vite');
  });

  it('should not overwrite existing sync scripts', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        scripts: { sync: 'custom-sync', 'sync:dry': 'custom-dry', 'sync:watch': 'custom-watch' },
      }),
    );

    const result = await addSyncScripts(testDir);
    expect(result).toBe(false);

    const pkg = JSON.parse(await readFile(join(testDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.sync).toBe('custom-sync');
  });

  it('should create scripts when package.json has no scripts field', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({ name: 'test' }));

    const result = await addSyncScripts(testDir);
    expect(result).toBe(true);

    const pkg = JSON.parse(await readFile(join(testDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.sync).toBe('ai-toolkit sync');
  });

  it('should return false for invalid package.json', async () => {
    await writeFile(join(testDir, 'package.json'), 'not valid json');

    const result = await addSyncScripts(testDir);
    expect(result).toBe(false);
  });

  it('should handle missing package.json by creating scripts', async () => {
    const result = await addSyncScripts(testDir);
    expect(result).toBe(true);

    const pkg = JSON.parse(await readFile(join(testDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts.sync).toBe('ai-toolkit sync');
  });
});
