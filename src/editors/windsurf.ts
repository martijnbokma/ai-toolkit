import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class WindsurfAdapter extends BaseEditorAdapter {
  name = 'windsurf';
  fileNaming: 'flat' = 'flat';
  entryPoint = '.windsurfrules';

  directories: EditorDirectories = {
    rules: '.windsurf/rules',
    skills: '.windsurf/skills',
    workflows: '.windsurf/workflows',
  };

  protected entryPointTitle = 'Windsurf Rules';
  protected closingMessage = 'Rules and workflows are managed by ai-toolkit.\nSee `.ai-content/` for the source of truth.';

  generateFrontmatter(_skillName: string, _description?: string): string {
    return ['---', 'description: Auto-synced by ai-toolkit', '---', ''].join('\n');
  }
}
