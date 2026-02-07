import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class KiloCodeAdapter extends BaseEditorAdapter {
  name = 'kilocode';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  mcpConfigPath = '.kilocode/mcp.json';

  directories: EditorDirectories = {
    rules: '.kilocode/rules',
    skills: '.kilocode/skills',
  };
}
