import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class TraeAdapter extends BaseEditorAdapter {
  name = 'trae';
  fileNaming: 'flat' | 'subdirectory' = 'subdirectory';

  directories: EditorDirectories = {
    rules: '.trae/rules',
    skills: '.trae/skills',
  };

  generateFrontmatter(skillName: string, description?: string): string {
    const lines = ['---', `name: ${skillName}`];
    if (description) lines.push(`description: ${description}`);
    lines.push('---', '');
    return lines.join('\n');
  }
}
