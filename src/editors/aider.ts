import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class AiderAdapter extends BaseEditorAdapter {
  name = 'aider';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = 'AGENTS.md';

  directories: EditorDirectories = {
    rules: '.aider',
  };
}
