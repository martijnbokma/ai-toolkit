import { join } from 'path';
import type { EditorAdapter } from '../core/types.js';
import { fileExists, readTextFile, writeTextFile } from '../utils/file-ops.js';
import { log } from '../utils/logger.js';

const GITIGNORE_START = '# >>> ai-toolkit managed (DO NOT EDIT) >>>';
const GITIGNORE_END = '# <<< ai-toolkit managed <<<';

export async function updateGitignore(
  projectRoot: string,
  adapters: EditorAdapter[],
): Promise<void> {
  const gitignorePath = join(projectRoot, '.gitignore');

  // Collect all generated paths that should be gitignored
  const generatedPaths = new Set<string>();

  for (const adapter of adapters) {
    generatedPaths.add(adapter.directories.rules + '/');
    if (adapter.directories.skills) {
      generatedPaths.add(adapter.directories.skills + '/');
    }
    if (adapter.directories.workflows && adapter.directories.workflows !== adapter.directories.skills) {
      generatedPaths.add(adapter.directories.workflows + '/');
    }
    if (adapter.entryPoint) {
      generatedPaths.add(adapter.entryPoint);
    }
    if (adapter.mcpConfigPath) {
      generatedPaths.add(adapter.mcpConfigPath);
    }
  }

  const managedBlock = [
    GITIGNORE_START,
    ...Array.from(generatedPaths).sort(),
    GITIGNORE_END,
  ].join('\n');

  let content = '';

  if (await fileExists(gitignorePath)) {
    content = await readTextFile(gitignorePath);

    // Replace existing managed block
    const startIdx = content.indexOf(GITIGNORE_START);
    const endIdx = content.indexOf(GITIGNORE_END);

    if (startIdx !== -1 && endIdx !== -1) {
      content =
        content.substring(0, startIdx) +
        managedBlock +
        content.substring(endIdx + GITIGNORE_END.length);
    } else {
      // Append managed block
      content = content.trimEnd() + '\n\n' + managedBlock + '\n';
    }
  } else {
    content = managedBlock + '\n';
  }

  await writeTextFile(gitignorePath, content);
  log.dim('Updated .gitignore with managed paths');
}
