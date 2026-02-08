import type { EditorDirectories } from '../core/types.js';
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

  protected entryPointTitle = 'Project Steering';
  protected techStackHeading = 'Project Context';
  protected closingMessage = 'Steering files are managed by ai-toolkit.\nSee `.ai-content/` for the source of truth.';
}
