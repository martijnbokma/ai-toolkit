import type { EditorDirectories, ToolkitConfig } from '../core/types.js';
import { AUTO_GENERATED_MARKER } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class CursorAdapter extends BaseEditorAdapter {
  name = 'cursor';
  fileNaming: 'flat' = 'flat';
  entryPoint = '.cursorrules';
  mcpConfigPath = '.cursor/mcp.json';

  directories: EditorDirectories = {
    rules: '.cursor/rules',
    skills: '.cursor/commands',
  };

  generateEntryPointContent(config: ToolkitConfig): string {
    const lines: string[] = [AUTO_GENERATED_MARKER, ''];
    const name = config.metadata?.name || 'Project';
    const desc = config.metadata?.description;

    lines.push(`# ${name} — Cursor Rules`);
    if (desc) lines.push('', desc);
    lines.push('', '---', '');

    if (config.tech_stack) {
      const stack = Object.entries(config.tech_stack).filter(([, v]) => v);
      if (stack.length > 0) {
        lines.push('## Tech Stack', '');
        for (const [key, value] of stack) {
          lines.push(`- **${key}**: ${value}`);
        }
        lines.push('');
      }
    }

    lines.push(
      'Rules and commands are managed by ai-toolkit.',
      'See `.ai-content/` for the source of truth.',
      '',
    );

    return lines.join('\n');
  }
}
