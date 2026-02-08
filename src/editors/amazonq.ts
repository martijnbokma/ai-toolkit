import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class AmazonQAdapter extends BaseEditorAdapter {
  name = 'amazonq';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  mcpConfigPath = '.amazonq/default.json';

  directories: EditorDirectories = {
    rules: '.amazonq/rules',
  };
}
