import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { loadConfig, configExists } from '../../src/core/config-loader.js';

describe('ConfigLoader', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should throw if config file does not exist', async () => {
    await expect(loadConfig(testDir)).rejects.toThrow('Config file not found');
  });

  it('should load a valid config', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"\neditors:\n  cursor: true\n  windsurf: false\n`,
    );

    const config = await loadConfig(testDir);
    expect(config.version).toBe('1.0');
    expect(config.editors.cursor).toBe(true);
    expect(config.editors.windsurf).toBe(false);
  });

  it('should apply defaults for missing fields', async () => {
    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"\n`);

    const config = await loadConfig(testDir);
    expect(config.version).toBe('1.0');
    expect(config.editors).toEqual({});
  });

  it('should reject invalid config', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: 123\n`,
    );

    await expect(loadConfig(testDir)).rejects.toThrow('Invalid config');
  });

  it('should detect config existence', async () => {
    expect(await configExists(testDir)).toBe(false);
    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"\n`);
    expect(await configExists(testDir)).toBe(true);
  });

  it('should resolve extends from templates', async () => {
    // Create a template
    const templatesDir = join(testDir, '.ai-content', 'templates', 'stacks');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(
      join(templatesDir, 'nextjs.yaml'),
      `version: "1.0"\ntech_stack:\n  language: typescript\n  framework: nextjs\n`,
    );

    // Create config that extends the template
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"\nextends:\n  - stacks/nextjs\nmetadata:\n  name: "Test"\n`,
    );

    const config = await loadConfig(testDir);
    expect(config.tech_stack?.language).toBe('typescript');
    expect(config.tech_stack?.framework).toBe('nextjs');
    expect(config.metadata?.name).toBe('Test');
  });
});
