import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class ClineAdapter extends BaseEditorAdapter {
  name = 'cline';
  fileNaming: 'flat' | 'subdirectory' = 'flat';

  directories: EditorDirectories = {
    rules: '.clinerules',
  };
}
