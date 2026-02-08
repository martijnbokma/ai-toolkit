import type { EditorDirectories } from '../core/types.js';
import { BaseEditorAdapter } from './base-adapter.js';

export class ReplitAdapter extends BaseEditorAdapter {
  name = 'replit';
  fileNaming: 'flat' | 'subdirectory' = 'flat';
  entryPoint = 'replit.md';

  directories: EditorDirectories = {
    rules: '.replit',
  };

  protected closingMessage = 'Rules are managed by ai-toolkit.\nSee `.ai-content/` for the source of truth.';
}
