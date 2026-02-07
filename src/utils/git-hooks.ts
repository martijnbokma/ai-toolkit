import { join } from 'path';
import { chmod } from 'fs/promises';
import { ensureDir, writeTextFile, fileExists, readTextFile } from './file-ops.js';

const PRE_COMMIT_HOOK = `#!/bin/sh
# ai-toolkit: auto-sync before commit
# Ensures editor configs stay in sync with .ai-content/

if command -v ai-toolkit >/dev/null 2>&1; then
  ai-toolkit sync
  git add .cursorrules .windsurfrules CLAUDE.md .cursor/ .windsurf/ .claude/ .kiro/ .trae/ .gemini/ .github/copilot-instructions.md AGENTS.md .aider* .roo/ .kilocode/ .antigravity/ .bolt/ .warp/ 2>/dev/null
elif command -v npx >/dev/null 2>&1; then
  npx ai-toolkit sync
  git add .cursorrules .windsurfrules CLAUDE.md .cursor/ .windsurf/ .claude/ .kiro/ .trae/ .gemini/ .github/copilot-instructions.md AGENTS.md .aider* .roo/ .kilocode/ .antigravity/ .bolt/ .warp/ 2>/dev/null
fi
`;

export async function installPreCommitHook(projectRoot: string): Promise<boolean> {
  const gitDir = join(projectRoot, '.git');
  if (!(await fileExists(gitDir))) return false;

  const hooksDir = join(gitDir, 'hooks');
  await ensureDir(hooksDir);

  const hookPath = join(hooksDir, 'pre-commit');

  if (await fileExists(hookPath)) {
    const existing = await readTextFile(hookPath);
    if (existing.includes('ai-toolkit')) return false;

    // Append to existing hook
    await writeTextFile(hookPath, existing.trimEnd() + '\n\n' + PRE_COMMIT_HOOK);
  } else {
    await writeTextFile(hookPath, PRE_COMMIT_HOOK);
  }

  await chmod(hookPath, 0o755);
  return true;
}
