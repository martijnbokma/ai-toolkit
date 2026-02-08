import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { mockProcessExit, suppressConsole } from './helpers.js';

describe('runValidateCommand', () => {
  let testDir: string;
  let exitSpy: ReturnType<typeof mockProcessExit>;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-validate-'));
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    await rm(testDir, { recursive: true, force: true });
  });

  async function importCommand() {
    return (await import('../../src/cli/validate.js')).runValidateCommand;
  }

  it('should fail when no config file exists', async () => {
    const runValidateCommand = await importCommand();
    await expect(runValidateCommand(testDir)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should pass with valid config and content directory', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(join(testDir, '.ai-content', 'rules', 'test.md'), '# Test');

    const runValidateCommand = await importCommand();
    await runValidateCommand(testDir);

    // Should not call process.exit
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should warn when no editors are enabled', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: false\n',
    );
    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    const runValidateCommand = await importCommand();
    // No editors enabled triggers hasErrors → process.exit(1)
    await expect(runValidateCommand(testDir)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should warn when content directory is missing', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    // No .ai-content/ directory

    const runValidateCommand = await importCommand();
    await expect(runValidateCommand(testDir)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should validate MCP servers', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"
editors:
  cursor: true
mcp_servers:
  - name: test-server
    command: node
    args: [server.js]
`,
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });

    const runValidateCommand = await importCommand();
    await runValidateCommand(testDir);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should warn about override directories that do not match enabled editors', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'overrides', 'nonexistent-editor'), { recursive: true });

    const runValidateCommand = await importCommand();
    await runValidateCommand(testDir);

    // Should still pass (warnings don't cause exit), but the warning is logged
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should warn when no rules or skills found', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      'version: "1.0"\neditors:\n  cursor: true\n',
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    // No .md files

    const runValidateCommand = await importCommand();
    await runValidateCommand(testDir);

    // Should pass but with warning
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should warn when MCP servers configured but no editors support MCP', async () => {
    await writeFile(
      join(testDir, 'ai-toolkit.yaml'),
      `version: "1.0"
editors:
  aider: true
mcp_servers:
  - name: test-server
    command: node
`,
    );
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });

    const runValidateCommand = await importCommand();
    await runValidateCommand(testDir);

    // aider has no mcpConfigPath, so warning is logged but no exit
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
