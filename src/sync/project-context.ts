import { join } from 'path';
import { readdir } from 'fs/promises';
import { readTextFile, fileExists, getPackageRoot } from '../utils/file-ops.js';

export const DEFAULT_CONFIG = {
  version: '1.0',

  editors: {
    cursor: true,
    windsurf: true,
    claude: true,
    kiro: false,
    trae: false,
    gemini: false,
    copilot: false,
    codex: false,
    aider: false,
    roo: false,
    kilocode: false,
    antigravity: false,
    bolt: false,
    warp: false,
    replit: false,
    cline: false,
    amazonq: false,
    junie: false,
    augment: false,
    zed: false,
    continue: false,
  },

  metadata: {
    name: '',
    description: '',
  },

  tech_stack: {
    language: '',
    framework: '',
    database: '',
  },
};

export async function generateProjectContext(
  config: Record<string, unknown>,
  projectRoot?: string,
): Promise<string> {
  const packageRoot = getPackageRoot();
  const templatePath = join(packageRoot, 'templates', 'project-context.md');

  let template: string;
  try {
    template = await readTextFile(templatePath);
  } catch {
    // Fallback if template file is not found
    template = `# Project Context\n\n## Overview\n<!-- Describe what this project does -->\n\n## Tech Stack\n\n## Conventions\n`;
  }

  // Auto-fill overview from metadata
  const metadata = config.metadata as { name?: string; description?: string } | undefined;
  if (metadata?.name || metadata?.description) {
    const parts: string[] = [];
    if (metadata.name) parts.push(`**${metadata.name}**`);
    if (metadata.description) parts.push(metadata.description);
    template = template.replace(
      '<!-- Describe what this project does, its purpose, and target audience -->',
      `<!-- Describe what this project does, its purpose, and target audience -->\n${parts.join(' — ')}`,
    );
  }

  // Auto-fill tech stack from config
  const techStack = config.tech_stack as Record<string, string> | undefined;
  if (techStack) {
    const entries = Object.entries(techStack).filter(([, v]) => v);
    if (entries.length > 0) {
      const stackLines = entries.map(([key, value]) => `- **${key}**: ${value}`).join('\n');
      template = template.replace(
        '<!-- Auto-filled from ai-toolkit.yaml — edit or expand as needed -->',
        `<!-- Auto-filled from ai-toolkit.yaml — edit or expand as needed -->\n${stackLines}`,
      );
    }
  }

  // Auto-detect from project root
  if (projectRoot) {
    // Directory structure
    try {
      const tree = await detectDirectoryStructure(projectRoot);
      if (tree) {
        template = template.replace(
          '<!-- Describe the key directories and their purpose -->\n```\nsrc/\n├── ...\n```',
          `<!-- Describe the key directories and their purpose -->\n\`\`\`\n${tree}\`\`\``,
        );
      }
    } catch {
      // Skip if detection fails
    }

    // Package.json scripts & dependencies
    try {
      const pkgPath = join(projectRoot, 'package.json');
      if (await fileExists(pkgPath)) {
        const pkg = JSON.parse(await readTextFile(pkgPath));

        // Development scripts
        if (pkg.scripts) {
          const dev = pkg.scripts.dev || pkg.scripts.start || '';
          const build = pkg.scripts.build || '';
          const test = pkg.scripts.test || '';
          if (dev) template = template.replace('- **Dev**: ', `- **Dev**: \`${dev}\``);
          if (build) template = template.replace('- **Build**: ', `- **Build**: \`${build}\``);
          if (test) template = template.replace('- **Test**: ', `- **Test**: \`${test}\``);
        }

        // Key dependencies
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps && Object.keys(deps).length > 0) {
          const rows = Object.entries(deps)
            .slice(0, 15) // Limit to avoid huge tables
            .map(([name, version]) => `| ${name} | ${version} |`)
            .join('\n');
          template = template.replace(
            '| Dependency | Purpose |\n|------------|---------|\n|            |         |',
            `| Dependency | Version |\n|------------|---------|\n${rows}`,
          );
        }
      }
    } catch {
      // Skip if package.json parsing fails
    }
  }

  return template;
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.ai-content', 'dist', 'build', 'out',
  '.next', '.nuxt', '.svelte-kit', 'coverage', '.cache', '__pycache__',
  '.venv', 'venv', '.idea', '.vscode', '.DS_Store',
]);

async function detectDirectoryStructure(projectRoot: string, prefix = '', depth = 0): Promise<string> {
  if (depth > 2) return '';

  const entries = await readdir(projectRoot, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  let result = '';
  for (let i = 0; i < dirs.length; i++) {
    const isLast = i === dirs.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';
    result += `${prefix}${connector}${dirs[i].name}/\n`;

    const subTree = await detectDirectoryStructure(
      join(projectRoot, dirs[i].name),
      prefix + childPrefix,
      depth + 1,
    );
    result += subTree;
  }
  return result;
}
