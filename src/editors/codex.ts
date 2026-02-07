import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class CodexAdapter extends BaseEditorAdapter {
  name = 'codex';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = 'AGENTS.md';

  directories: EditorDirectories = {
    rules: '.codex',
    skills: '.codex/skills',
  };
}
