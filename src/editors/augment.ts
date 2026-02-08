import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class AugmentAdapter extends BaseEditorAdapter {
  name = 'augment';
  fileNaming: 'flat' | 'subdirectory' = 'flat';

  directories: EditorDirectories = {
    rules: '.augment/rules',
  };
}
