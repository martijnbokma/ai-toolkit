import type { EditorAdapter, EditorDirectories, ToolkitConfig } from '../core/types.js';
import { AUTO_GENERATED_MARKER } from '../core/types.js';

export abstract class BaseEditorAdapter implements EditorAdapter {
  abstract name: string;
  abstract directories: EditorDirectories;
  abstract fileNaming: 'flat' | 'subdirectory';

  entryPoint?: string;
  mcpConfigPath?: string;

  generateFrontmatter?(skillName: string, description?: string): string;

  generateEntryPointContent(config: ToolkitConfig): string {
    const lines: string[] = [AUTO_GENERATED_MARKER, ''];

    const name = config.metadata?.name || 'Project';
    const desc = config.metadata?.description;

    lines.push(`# ${name}`);
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
      '## Rules & Skills',
      '',
      'This project uses ai-toolkit to manage AI editor configurations.',
      'Rules and skills are automatically synced from `.ai-content/`.',
      '',
    );

    return lines.join('\n');
  }

  wrapContent(content: string, sourcePath: string): string {
    return [
      AUTO_GENERATED_MARKER,
      `<!-- Source: ${sourcePath} -->`,
      '',
      content,
    ].join('\n');
  }
}
