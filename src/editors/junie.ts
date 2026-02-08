import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class JunieAdapter extends BaseEditorAdapter {
  name = 'junie';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = '.junie/guidelines.md';

  directories: EditorDirectories = {
    rules: '.junie',
  };

  protected entryPointTitle = 'Junie Guidelines';
  protected closingMessage = 'Guidelines are managed by ai-toolkit.\nSee `.ai-content/` for the source of truth.';
}
