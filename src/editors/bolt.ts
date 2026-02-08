import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class BoltAdapter extends BaseEditorAdapter {
  name = 'bolt';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = '.bolt/prompt';

  directories: EditorDirectories = {
    rules: '.bolt',
  };

  protected hasSeparator = false;
  protected closingMessage = undefined;
}
