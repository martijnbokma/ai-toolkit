import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class AntigravityAdapter extends BaseEditorAdapter {
  name = 'antigravity';
  fileNaming: 'flat' | 'subdirectory' = 'flat';

  directories: EditorDirectories = {
    rules: '.agent/rules',
    skills: '.agent/skills',
  };
}
