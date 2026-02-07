import { join } from 'path';
import type { ToolkitConfig, EditorAdapter, SyncResult } from '../core/types.js';
import { writeTextFile } from '../utils/file-ops.js';
import { log } from '../utils/logger.js';

export async function generateMCPConfigs(
  projectRoot: string,
  adapters: EditorAdapter[],
  config: ToolkitConfig,
  result: SyncResult,
  dryRun: boolean,
): Promise<void> {
  const mcpServers: Record<string, { command: string; args?: string[]; env?: Record<string, string> }> = {};

  for (const server of config.mcp_servers ?? []) {
    if (server.enabled === false) continue;
    mcpServers[server.name] = {
      command: server.command,
      ...(server.args && { args: server.args }),
      ...(server.env && { env: server.env }),
    };
  }

  if (Object.keys(mcpServers).length === 0) return;

  const mcpJson = JSON.stringify({ mcpServers }, null, 2);

  for (const adapter of adapters) {
    if (!adapter.mcpConfigPath) continue;

    try {
      const mcpPath = join(projectRoot, adapter.mcpConfigPath);
      if (dryRun) {
        log.dryRun('would write MCP config', adapter.mcpConfigPath);
      } else {
        await writeTextFile(mcpPath, mcpJson);
        log.synced('mcp-servers', adapter.mcpConfigPath);
      }
      result.synced.push(mcpPath);
    } catch (error) {
      const msg = `Failed to generate MCP config for ${adapter.name}: ${error instanceof Error ? error.message : error}`;
      log.error(msg);
      result.errors.push(msg);
    }
  }
}
