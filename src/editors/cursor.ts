import type { EditorDirectories } from '../core/types.js';
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

  protected entryPointTitle = 'Cursor Rules';
  protected closingMessage = 'Rules and commands are managed by ai-toolkit.\nSee `.ai-content/` for the source of truth.';
}
