import type { EditorDirectories, ToolkitConfig } from '../core/types.js';
import { AUTO_GENERATED_MARKER } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class BoltAdapter extends BaseEditorAdapter {
  name = 'bolt';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = '.bolt/prompt';

  directories: EditorDirectories = {
    rules: '.bolt',
  };

  generateEntryPointContent(config: ToolkitConfig): string {
    const lines: string[] = [AUTO_GENERATED_MARKER, ''];
    const name = config.metadata?.name || 'Project';
    const desc = config.metadata?.description;

    lines.push(`# ${name}`);
    if (desc) lines.push('', desc);
    lines.push('');

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

    return lines.join('\n');
  }
}
