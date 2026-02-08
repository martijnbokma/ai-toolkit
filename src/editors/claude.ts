import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class ClaudeAdapter extends BaseEditorAdapter {
  name = 'claude';
  fileNaming: 'flat' = 'flat';
  entryPoint = 'CLAUDE.md';
  mcpConfigPath = '.claude/settings.json';

  directories: EditorDirectories = {
    rules: '.claude/rules',
    skills: '.claude/skills',
  };

  protected closingMessage = 'Rules and skills are managed by ai-toolkit.\nSee `.ai-content/` for the source of truth.';

  generateFrontmatter(skillName: string, description?: string): string {
    const lines = ['---', `name: ${skillName}`];
    if (description) lines.push(`description: ${description}`);
    lines.push('---', '');
    return lines.join('\n');
  }
}
