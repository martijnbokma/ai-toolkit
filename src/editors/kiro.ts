import type { EditorDirectories, ToolkitConfig } from '../core/types.js';
import { AUTO_GENERATED_MARKER } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class KiroAdapter extends BaseEditorAdapter {
  name = 'kiro';
  fileNaming: 'flat' = 'flat';
  mcpConfigPath = '.kiro/settings/mcp.json';

  directories: EditorDirectories = {
    rules: '.kiro/steering',
    skills: '.kiro/specs/workflows',
    workflows: '.kiro/specs/workflows',
  };

  generateEntryPointContent(config: ToolkitConfig): string {
    const lines: string[] = [AUTO_GENERATED_MARKER, ''];
    const name = config.metadata?.name || 'Project';
    const desc = config.metadata?.description;

    lines.push(`# ${name} — Project Steering`);
    if (desc) lines.push('', desc);
    lines.push('', '---', '');

    if (config.tech_stack) {
      const stack = Object.entries(config.tech_stack).filter(([, v]) => v);
      if (stack.length > 0) {
        lines.push('## Project Context', '');
        for (const [key, value] of stack) {
          lines.push(`- **${key}**: ${value}`);
        }
        lines.push('');
      }
    }

    lines.push(
      'Steering files are managed by ai-toolkit.',
      'See `.ai-content/` for the source of truth.',
      '',
    );

    return lines.join('\n');
  }
}
