import { readFile, writeFile, mkdir, readdir, unlink, access, constants } from 'fs/promises';
import { accessSync, constants as fsConstants } from 'fs';
import { join, dirname, relative, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import type { ContentFile } from '../core/types.js';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8');
}

export async function writeTextFile(
  filePath: string,
  content: string,
): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, 'utf-8');
}

export async function removeFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function findMarkdownFiles(
  dirPath: string,
  baseDir: string,
): Promise<ContentFile[]> {
  const files: ContentFile[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await findMarkdownFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        const content = await readTextFile(fullPath);
        files.push({
          name: basename(entry.name, '.md'),
          relativePath: relative(baseDir, fullPath),
          absolutePath: fullPath,
          content,
        });
      }
    }
  } catch {
    // Directory doesn't exist — that's fine
  }

  return files;
}

export function getPackageRoot(): string {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    let dir = dirname(currentFile);
    // Walk up until we find package.json (works from both src/ and dist/)
    for (let i = 0; i < 5; i++) {
      try {
        accessSync(join(dir, 'package.json'), fsConstants.R_OK);
        return dir;
      } catch {
        dir = dirname(dir);
      }
    }
    return dirname(currentFile);
  } catch {
    return process.cwd();
  }
}

export async function findAllManagedFiles(
  projectRoot: string,
  editorDirs: string[],
): Promise<string[]> {
  const managed: string[] = [];

  for (const dir of editorDirs) {
    const fullDir = join(projectRoot, dir);
    try {
      const files = await findMarkdownFiles(fullDir, projectRoot);
      managed.push(...files.map((f) => f.relativePath));
    } catch {
      // Directory doesn't exist
    }
  }

  return managed;
}
