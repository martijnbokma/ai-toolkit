import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class ZedAdapter extends BaseEditorAdapter {
  name = 'zed';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = '.rules';

  directories: EditorDirectories = {
    rules: '.zed/rules',
  };
}
