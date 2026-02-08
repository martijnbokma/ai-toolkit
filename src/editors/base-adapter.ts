import type { EditorAdapter, EditorDirectories, ToolkitConfig } from '../core/types.js';
import { AUTO_GENERATED_MARKER } from '../core/types.js';

export abstract class BaseEditorAdapter implements EditorAdapter {
  abstract name: string;
  abstract directories: EditorDirectories;
  abstract fileNaming: 'flat' | 'subdirectory';

  entryPoint?: string;
  mcpConfigPath?: string;

  /** Title suffix appended after project name, e.g. "Cursor Rules" → "# MyApp — Cursor Rules" */
  protected entryPointTitle?: string;
  /** Heading for the tech stack section. Defaults to 'Tech Stack'. */
  protected techStackHeading = 'Tech Stack';
  /** Closing message shown after tech stack. Set to undefined to omit. */
  protected closingMessage: string | undefined =
    '## Rules & Skills\n\nThis project uses ai-toolkit to manage AI editor configurations.\nRules and skills are automatically synced from `.ai-content/`.';
  /** Whether to include a `---` separator after the title block. Defaults to true. */
  protected hasSeparator = true;

  generateFrontmatter?(skillName: string, description?: string): string;

  generateEntryPointContent(config: ToolkitConfig): string {
    const lines: string[] = [AUTO_GENERATED_MARKER, ''];

    const name = config.metadata?.name || 'Project';
    const desc = config.metadata?.description;

    const title = this.entryPointTitle ? `# ${name} — ${this.entryPointTitle}` : `# ${name}`;
    lines.push(title);
    if (desc) lines.push('', desc);

    if (this.hasSeparator) {
      lines.push('', '---', '');
    } else {
      lines.push('');
    }

    if (config.tech_stack) {
      const stack = Object.entries(config.tech_stack).filter(([, v]) => v);
      if (stack.length > 0) {
        lines.push(`## ${this.techStackHeading}`, '');
        for (const [key, value] of stack) {
          lines.push(`- **${key}**: ${value}`);
        }
        lines.push('');
      }
    }

    if (this.closingMessage) {
      lines.push(this.closingMessage, '');
    }

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
