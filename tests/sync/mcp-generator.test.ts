import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { generateMCPConfigs } from '../../src/sync/mcp-generator.js';
import type { EditorAdapter, ToolkitConfig, SyncResult } from '../../src/core/types.js';

describe('MCPGenerator', () => {
  let testDir: string;

  const cursorAdapter: EditorAdapter = {
    name: 'cursor',
    fileNaming: 'flat',
    directories: { rules: '.cursor/rules' },
    mcpConfigPath: '.cursor/mcp.json',
  };

  const claudeAdapter: EditorAdapter = {
    name: 'claude',
    fileNaming: 'flat',
    directories: { rules: '.claude/rules' },
    mcpConfigPath: '.claude/settings.json',
  };

  const noMcpAdapter: EditorAdapter = {
    name: 'aider',
    fileNaming: 'flat',
    directories: { rules: '.aider/rules' },
    // No mcpConfigPath
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
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-mcp-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate MCP config with enabled servers', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
      mcp_servers: [
        { name: 'test-server', command: 'node', args: ['server.js'], enabled: true },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, false);

    const mcpJson = await readFile(join(testDir, '.cursor', 'mcp.json'), 'utf-8');
    const parsed = JSON.parse(mcpJson);

    expect(parsed.mcpServers['test-server']).toBeDefined();
    expect(parsed.mcpServers['test-server'].command).toBe('node');
    expect(parsed.mcpServers['test-server'].args).toEqual(['server.js']);
    expect(result.synced.length).toBe(1);
  });

  it('should skip disabled MCP servers', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
      mcp_servers: [
        { name: 'enabled-server', command: 'node', args: ['a.js'], enabled: true },
        { name: 'disabled-server', command: 'node', args: ['b.js'], enabled: false },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, false);

    const mcpJson = await readFile(join(testDir, '.cursor', 'mcp.json'), 'utf-8');
    const parsed = JSON.parse(mcpJson);

    expect(parsed.mcpServers['enabled-server']).toBeDefined();
    expect(parsed.mcpServers['disabled-server']).toBeUndefined();
  });

  it('should do nothing when no MCP servers are configured', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, false);

    expect(result.synced).toEqual([]);
  });

  it('should do nothing when all MCP servers are disabled', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
      mcp_servers: [
        { name: 'disabled', command: 'node', enabled: false },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, false);

    expect(result.synced).toEqual([]);
  });

  it('should skip adapters without mcpConfigPath', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { aider: true },
      mcp_servers: [
        { name: 'test-server', command: 'node', enabled: true },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [noMcpAdapter], config, result, false);

    expect(result.synced).toEqual([]);
  });

  it('should generate MCP configs for multiple adapters', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true, claude: true },
      mcp_servers: [
        { name: 'my-server', command: 'npx', args: ['my-server'], enabled: true },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter, claudeAdapter], config, result, false);

    expect(result.synced.length).toBe(2);

    const cursorMcp = JSON.parse(await readFile(join(testDir, '.cursor', 'mcp.json'), 'utf-8'));
    const claudeMcp = JSON.parse(await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8'));

    expect(cursorMcp.mcpServers['my-server'].command).toBe('npx');
    expect(claudeMcp.mcpServers['my-server'].command).toBe('npx');
  });

  it('should include env vars when provided', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
      mcp_servers: [
        {
          name: 'env-server',
          command: 'node',
          args: ['server.js'],
          env: { API_KEY: 'secret123', NODE_ENV: 'production' },
          enabled: true,
        },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, false);

    const parsed = JSON.parse(await readFile(join(testDir, '.cursor', 'mcp.json'), 'utf-8'));
    expect(parsed.mcpServers['env-server'].env).toEqual({
      API_KEY: 'secret123',
      NODE_ENV: 'production',
    });
  });

  it('should not write files in dry-run mode', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
      mcp_servers: [
        { name: 'test-server', command: 'node', enabled: true },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, true);

    expect(result.synced.length).toBe(1);

    const { access } = await import('fs/promises');
    await expect(access(join(testDir, '.cursor', 'mcp.json'))).rejects.toThrow();
  });

  it('should omit args and env when not provided', async () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: true },
      mcp_servers: [
        { name: 'minimal', command: 'my-tool', enabled: true },
      ],
    };

    const result = emptySyncResult();
    await generateMCPConfigs(testDir, [cursorAdapter], config, result, false);

    const parsed = JSON.parse(await readFile(join(testDir, '.cursor', 'mcp.json'), 'utf-8'));
    expect(parsed.mcpServers['minimal'].command).toBe('my-tool');
    expect(parsed.mcpServers['minimal'].args).toBeUndefined();
    expect(parsed.mcpServers['minimal'].env).toBeUndefined();
  });
});
