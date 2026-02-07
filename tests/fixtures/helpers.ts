import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import type { ToolkitConfig } from '../../src/core/types.js';

export async function createTempProject(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), 'ai-toolkit-test-'));
  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export async function setupContentDirs(root: string): Promise<void> {
  await mkdir(join(root, '.ai-content', 'rules'), { recursive: true });
  await mkdir(join(root, '.ai-content', 'skills'), { recursive: true });
  await mkdir(join(root, '.ai-content', 'workflows'), { recursive: true });
  await mkdir(join(root, '.ai-content', 'overrides'), { recursive: true });
}

export function createMockConfig(
  overrides?: Partial<ToolkitConfig>,
): ToolkitConfig {
  return {
    version: '1.0',
    editors: { cursor: true, claude: true },
    ...overrides,
  };
}

export async function writeMarkdown(
  dir: string,
  name: string,
  content: string,
): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${name}.md`), content);
}
