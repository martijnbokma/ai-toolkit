import { join } from 'path';
import { loadConfig } from '../core/config-loader.js';
import { CONTENT_DIR, RULES_DIR, SKILLS_DIR, WORKFLOWS_DIR, OVERRIDES_DIR } from '../core/types.js';
import { getEnabledAdapters } from '../editors/registry.js';
import { findMarkdownFiles, fileExists } from '../utils/file-ops.js';
import { log, createSpinner } from '../utils/logger.js';

export async function runValidateCommand(projectRoot: string): Promise<void> {
  const spinner = createSpinner('Validating configuration...');
  spinner.start();

  let hasErrors = false;

  try {
    // 1. Validate config file
    const config = await loadConfig(projectRoot);
    spinner.succeed('Configuration is valid');

    // 2. Check enabled editors
    const adapters = getEnabledAdapters(config);
    if (adapters.length === 0) {
      log.warn('No editors enabled in config');
      hasErrors = true;
    } else {
      log.success(`Editors enabled: ${adapters.map((a) => a.name).join(', ')}`);
    }

    // 3. Check content directories
    const contentDir = join(projectRoot, CONTENT_DIR);
    const contentExists = await fileExists(contentDir);
    if (!contentExists) {
      log.error(`Content directory not found: ${CONTENT_DIR}/`);
      log.dim('Run "ai-toolkit init" to create it.');
      hasErrors = true;
    } else {
      log.success(`Content directory exists: ${CONTENT_DIR}/`);
    }

    // 4. Check for content files
    const rulesDir = join(contentDir, RULES_DIR);
    const skillsDir = join(contentDir, SKILLS_DIR);
    const workflowsDir = join(contentDir, WORKFLOWS_DIR);

    const rules = await findMarkdownFiles(rulesDir, rulesDir);
    const skills = await findMarkdownFiles(skillsDir, skillsDir);
    const workflows = await findMarkdownFiles(workflowsDir, workflowsDir);

    log.info(`Content: ${rules.length} rule(s), ${skills.length} skill(s), ${workflows.length} workflow(s)`);

    if (rules.length === 0 && skills.length === 0) {
      log.warn('No rules or skills found. Add markdown files to .ai-content/rules/ or .ai-content/skills/');
    }

    // 5. Check overrides reference valid editors
    const overridesDir = join(contentDir, OVERRIDES_DIR);
    if (await fileExists(overridesDir)) {
      const { readdir } = await import('fs/promises');
      try {
        const entries = await readdir(overridesDir, { withFileTypes: true });
        const editorNames = new Set(adapters.map((a) => a.name));

        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (!editorNames.has(entry.name as any)) {
              log.warn(`Override directory "${entry.name}" does not match any enabled editor`);
            }
          }
        }
      } catch {
        // overrides dir doesn't exist, that's fine
      }
    }

    // 6. Validate MCP servers
    if (config.mcp_servers && config.mcp_servers.length > 0) {
      const mcpAdapters = adapters.filter((a) => a.mcpConfigPath);
      if (mcpAdapters.length === 0) {
        log.warn('MCP servers configured but no enabled editors support MCP');
      } else {
        log.success(`MCP servers: ${config.mcp_servers.length} server(s) → ${mcpAdapters.map((a) => a.name).join(', ')}`);
      }

      for (const server of config.mcp_servers) {
        if (!server.command) {
          log.error(`MCP server "${server.name}" is missing a command`);
          hasErrors = true;
        }
      }
    }

    // Summary
    console.log('');
    if (hasErrors) {
      log.error('Validation completed with issues');
      process.exit(1);
    } else {
      log.success('Validation passed — ready to sync!');
    }
  } catch (error) {
    spinner.fail('Validation failed');
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
