import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class WarpAdapter extends BaseEditorAdapter {
  name = 'warp';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = 'WARP.md';

  directories: EditorDirectories = {
    rules: '.warp/rules',
  };
}
