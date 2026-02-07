import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class CopilotAdapter extends BaseEditorAdapter {
  name = 'copilot';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = '.github/copilot-instructions.md';
  mcpConfigPath = '.vscode/mcp.json';

  directories: EditorDirectories = {
    rules: '.github/instructions',
    skills: '.github/instructions',
  };
}
