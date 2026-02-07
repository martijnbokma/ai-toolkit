import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { syncEditorSettings } from '../../src/sync/settings-syncer.js';
import type { ToolkitConfig } from '../../src/core/types.js';

describe('SettingsSyncer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-settings-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return empty array when no settings configured', async () => {
    const config: ToolkitConfig = { version: '1.0', editors: {} };
    const result = await syncEditorSettings(testDir, config, false);

    expect(result).toEqual([]);
  });

  it('should generate .editorconfig with indent settings', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {},
      settings: { indent_size: 2, indent_style: 'space' },
    };

    const result = await syncEditorSettings(testDir, config, false);

    expect(result.length).toBeGreaterThan(0);

    const editorConfig = await readFile(
      join(testDir, '.editorconfig'),
      'utf-8',
    );
    expect(editorConfig).toContain('indent_style = space');
    expect(editorConfig).toContain('indent_size = 2');
    expect(editorConfig).toContain('root = true');
    expect(editorConfig).toContain('charset = utf-8');
  });

  it('should generate .editorconfig with tab indent style', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {},
      settings: { indent_style: 'tab' },
    };

    await syncEditorSettings(testDir, config, false);

    const editorConfig = await readFile(
      join(testDir, '.editorconfig'),
      'utf-8',
    );
    expect(editorConfig).toContain('indent_style = tab');
  });

  it('should generate .vscode/settings.json', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {},
      settings: { indent_size: 4, indent_style: 'space', format_on_save: true },
    };

    await syncEditorSettings(testDir, config, false);

    const vscodeSettings = await readFile(
      join(testDir, '.vscode', 'settings.json'),
      'utf-8',
    );
    const parsed = JSON.parse(vscodeSettings);
    expect(parsed['editor.tabSize']).toBe(4);
    expect(parsed['editor.insertSpaces']).toBe(true);
    expect(parsed['editor.formatOnSave']).toBe(true);
  });

  it('should merge with existing .vscode/settings.json', async () => {
    // Create existing settings
    await mkdir(join(testDir, '.vscode'), { recursive: true });
    await writeFile(
      join(testDir, '.vscode', 'settings.json'),
      JSON.stringify({ 'editor.wordWrap': 'on', 'editor.tabSize': 2 }, null, 2),
    );

    const config: ToolkitConfig = {
      version: '1.0',
      editors: {},
      settings: { indent_size: 4 },
    };

    await syncEditorSettings(testDir, config, false);

    const vscodeSettings = await readFile(
      join(testDir, '.vscode', 'settings.json'),
      'utf-8',
    );
    const parsed = JSON.parse(vscodeSettings);
    // New setting should override
    expect(parsed['editor.tabSize']).toBe(4);
    // Existing setting should be preserved
    expect(parsed['editor.wordWrap']).toBe('on');
  });

  it('should not write files in dry-run mode', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {},
      settings: { indent_size: 2, indent_style: 'space' },
    };

    const result = await syncEditorSettings(testDir, config, true);

    expect(result.length).toBeGreaterThan(0);

    // Verify no files were actually created
    const { access } = await import('fs/promises');
    await expect(access(join(testDir, '.editorconfig'))).rejects.toThrow();
    await expect(access(join(testDir, '.vscode', 'settings.json'))).rejects.toThrow();
  });

  it('should set insertSpaces to false for tab indent', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {},
      settings: { indent_style: 'tab' },
    };

    await syncEditorSettings(testDir, config, false);

    const vscodeSettings = await readFile(
      join(testDir, '.vscode', 'settings.json'),
      'utf-8',
    );
    const parsed = JSON.parse(vscodeSettings);
    expect(parsed['editor.insertSpaces']).toBe(false);
  });
});
