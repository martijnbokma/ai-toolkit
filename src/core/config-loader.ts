import { join } from 'path';
import yaml from 'js-yaml';
import { ToolkitConfigSchema, CONFIG_FILENAME } from './types.js';
import type { ToolkitConfig } from './types.js';
import { readTextFile, fileExists, getPackageRoot } from '../utils/file-ops.js';

export async function loadConfig(projectRoot: string): Promise<ToolkitConfig> {
  const configPath = join(projectRoot, CONFIG_FILENAME);

  if (!(await fileExists(configPath))) {
    throw new Error(
      `Config file not found: ${configPath}\nRun "ai-toolkit init" to create one.`,
    );
  }

  const content = await readTextFile(configPath);
  const raw = yaml.load(content) as Record<string, unknown>;

  const result = ToolkitConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i: { path: (string | number)[]; message: string }) =>
        `  - ${i.path.join('.')}: ${i.message}`,
      )
      .join('\n');
    throw new Error(`Invalid config in ${CONFIG_FILENAME}:\n${issues}`);
  }

  let config = result.data;

  // Resolve template inheritance
  if (config.extends && config.extends.length > 0) {
    config = await resolveExtends(config, projectRoot);
  }

  return config;
}

async function resolveExtends(
  config: ToolkitConfig,
  projectRoot: string,
): Promise<ToolkitConfig> {
  if (!config.extends || config.extends.length === 0) return config;

  // Find templates directory — check toolkit package location first, then project-local
  const templatesDirs = [
    join(projectRoot, '.ai-content', 'templates'),
    join(getPackageRoot(), 'templates'),
  ];

  let merged = { ...config };

  for (const templateName of config.extends) {
    let templateConfig: ToolkitConfig | null = null;

    for (const dir of templatesDirs) {
      const templatePath = join(dir, `${templateName}.yaml`);
      if (await fileExists(templatePath)) {
        const content = await readTextFile(templatePath);
        const raw = yaml.load(content) as Record<string, unknown>;
        const parsed = ToolkitConfigSchema.safeParse(raw);
        if (parsed.success) {
          templateConfig = parsed.data;
          break;
        }
      }
    }

    if (!templateConfig) {
      throw new Error(
        `Template "${templateName}" not found. Searched in:\n${templatesDirs.map((d) => `  - ${d}`).join('\n')}`,
      );
    }

    // Merge: project config takes priority over template
    merged = mergeConfigs(templateConfig, merged);
  }

  return merged;
}

function mergeConfigs(base: ToolkitConfig, override: ToolkitConfig): ToolkitConfig {
  return {
    version: override.version || base.version,
    editors: { ...base.editors, ...override.editors },
    metadata: {
      ...base.metadata,
      ...override.metadata,
    },
    tech_stack: {
      ...base.tech_stack,
      ...override.tech_stack,
    },
    mcp_servers: [
      ...(base.mcp_servers ?? []),
      ...(override.mcp_servers ?? []),
    ],
    settings: {
      ...base.settings,
      ...override.settings,
    },
    ignore_patterns: [
      ...new Set([
        ...(base.ignore_patterns ?? []),
        ...(override.ignore_patterns ?? []),
      ]),
    ],
    custom_editors: [
      ...(base.custom_editors ?? []),
      ...(override.custom_editors ?? []),
    ],
    content_sources: [
      ...(base.content_sources ?? []),
      ...(override.content_sources ?? []),
    ],
    // Don't inherit extends
  };
}

export async function configExists(projectRoot: string): Promise<boolean> {
  return fileExists(join(projectRoot, CONFIG_FILENAME));
}
