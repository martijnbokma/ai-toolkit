import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class ContinueAdapter extends BaseEditorAdapter {
  name = 'continue';
  fileNaming: 'flat' | 'subdirectory' = 'flat';

  directories: EditorDirectories = {
    rules: '.continue/rules',
  };
}
