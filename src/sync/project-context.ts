import { join } from 'path';
import { readTextFile, getPackageRoot } from '../utils/file-ops.js';

export const DEFAULT_CONFIG = {
  version: '1.0',

  editors: {
    cursor: true,
    windsurf: true,
    claude: true,
    kiro: false,
    trae: false,
    gemini: false,
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

export async function generateProjectContext(config: typeof DEFAULT_CONFIG): Promise<string> {
  const packageRoot = getPackageRoot();
  const templatePath = join(packageRoot, 'templates', 'project-context.md');

  let template: string;
  try {
    template = await readTextFile(templatePath);
  } catch {
    // Fallback if template file is not found
    template = `# Project Context\n\n## Overview\n<!-- Describe what this project does -->\n\n## Tech Stack\n\n## Conventions\n`;
  }

  // Auto-fill tech stack from config
  if (config.tech_stack) {
    const entries = Object.entries(config.tech_stack).filter(([, v]) => v);
    if (entries.length > 0) {
      const stackLines = entries.map(([key, value]) => `- **${key}**: ${value}`).join('\n');
      template = template.replace(
        '<!-- Auto-filled from ai-toolkit.yaml — edit or expand as needed -->',
        `<!-- Auto-filled from ai-toolkit.yaml — edit or expand as needed -->\n${stackLines}`,
      );
    }
  }

  return template;
}
