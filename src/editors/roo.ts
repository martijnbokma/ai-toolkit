import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class RooAdapter extends BaseEditorAdapter {
  name = 'roo';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  mcpConfigPath = '.roo/mcp.json';

  directories: EditorDirectories = {
    rules: '.roo/rules',
    skills: '.roo/skills',
  };
}
