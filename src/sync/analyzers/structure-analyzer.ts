import { join, extname, basename } from 'path';
import { readdir } from 'fs/promises';
import { fileExists } from '../../utils/file-ops.js';

export interface DirectoryNode {
  name: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  purpose?: string;
}

export interface FeatureInfo {
  name: string;
  hasIndex: boolean;
  subdirs: string[];
  fileCount: number;
}

export interface ArchitectureInfo {
  srcDir: string | null;
  isFeatureBased: boolean;
  features: FeatureInfo[];
  hasSharedDir: boolean;
  sharedSubdirs: string[];
  contexts: string[];
  layouts: string[];
  pages: string[];
  hooks: string[];
  entryPoints: string[];
  configFiles: string[];
  directoryTree: DirectoryNode[];
  patterns: ArchitecturePatterns;
}

export interface ArchitecturePatterns {
  hasModularBoundaries: boolean;
  hasServiceLayer: boolean;
  hasHookLayer: boolean;
  hasTypeDefinitions: boolean;
  hasTestFiles: boolean;
  testPattern: 'colocated' | 'separate' | 'none';
  hasI18n: boolean;
  i18nLanguages: string[];
  componentNaming: 'PascalCase' | 'camelCase' | 'kebab-case' | 'mixed';
}

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit',
  'dist', 'build', 'out', '.cache', '.turbo', 'coverage',
  '__pycache__', '.venv', 'venv', '.ai-content',
  '.specstory', '.windsurf', '.cursor', '.trae', '.claude',
  '.gemini', '.kiro', '.kilocode', '.bolt', '.agent',
  'playwright-report', 'test-results',
]);

const CONFIG_FILES = [
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'vite.config.ts', 'vite.config.js',
  'next.config.ts', 'next.config.js', 'next.config.mjs',
  'nuxt.config.ts', 'svelte.config.js',
  'vitest.config.ts', 'vitest.config.js',
  'jest.config.ts', 'jest.config.js',
  'playwright.config.ts',
  'eslint.config.js', '.eslintrc.js', '.eslintrc.json',
  'prettier.config.js', '.prettierrc',
  'tailwind.config.ts', 'tailwind.config.js',
  'postcss.config.js', 'postcss.config.cjs',
  '.env.example', '.env.local.example',
  'docker-compose.yml', 'Dockerfile',
];

const SRC_DIR_CANDIDATES = ['src', 'app', 'lib', 'packages'];

async function listDir(dirPath: string): Promise<Array<{ name: string; isDir: boolean }>> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith('.') || e.name === '.env.example')
      .map((e) => ({ name: e.name, isDir: e.isDirectory() }));
  } catch {
    return [];
  }
}

async function countFiles(dirPath: string): Promise<number> {
  let count = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += await countFiles(join(dirPath, entry.name));
      }
    }
  } catch {
    // skip
  }
  return count;
}

async function buildDirectoryTree(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<DirectoryNode[]> {
  if (currentDepth >= maxDepth) return [];

  const entries = await listDir(dirPath);
  const nodes: DirectoryNode[] = [];

  // Sort: directories first, then files
  const sorted = entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = join(dirPath, entry.name);

    if (entry.isDir) {
      const children = await buildDirectoryTree(fullPath, maxDepth, currentDepth + 1);
      nodes.push({
        name: entry.name,
        type: 'directory',
        children: children.length > 0 ? children : undefined,
      });
    } else {
      nodes.push({ name: entry.name, type: 'file' });
    }
  }

  return nodes;
}

async function detectFeatures(featuresDir: string): Promise<FeatureInfo[]> {
  const features: FeatureInfo[] = [];
  const entries = await listDir(featuresDir);

  for (const entry of entries) {
    if (!entry.isDir) continue;

    const featurePath = join(featuresDir, entry.name);
    const subdirEntries = await listDir(featurePath);
    const subdirs = subdirEntries.filter((e) => e.isDir).map((e) => e.name);
    const hasIndex = await fileExists(join(featurePath, 'index.ts'));
    const fileCount = await countFiles(featurePath);

    features.push({
      name: entry.name,
      hasIndex,
      subdirs,
      fileCount,
    });
  }

  return features;
}

function detectComponentNaming(files: string[]): ArchitecturePatterns['componentNaming'] {
  const tsxFiles = files.filter((f) => f.endsWith('.tsx'));
  if (tsxFiles.length === 0) return 'mixed';

  let pascal = 0;
  let camel = 0;
  let kebab = 0;

  for (const file of tsxFiles) {
    const name = basename(file, '.tsx');
    if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) pascal++;
    else if (/^[a-z][a-zA-Z0-9]*$/.test(name)) camel++;
    else if (/^[a-z][a-z0-9-]*$/.test(name)) kebab++;
  }

  const max = Math.max(pascal, camel, kebab);
  if (max === pascal) return 'PascalCase';
  if (max === camel) return 'camelCase';
  if (max === kebab) return 'kebab-case';
  return 'mixed';
}

async function collectFileNames(dirPath: string, maxDepth = 5, depth = 0): Promise<string[]> {
  if (depth >= maxDepth) return [];
  const files: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        files.push(entry.name);
      } else if (entry.isDirectory()) {
        // Include directory names too (for detecting __tests__ dirs etc.)
        files.push(entry.name);
        files.push(...await collectFileNames(fullPath, maxDepth, depth + 1));
      }
    }
  } catch {
    // skip
  }

  return files;
}

async function detectI18n(srcDir: string): Promise<{ hasI18n: boolean; languages: string[] }> {
  const localesDir = join(srcDir, 'locales');
  const i18nDir = join(srcDir, 'i18n');

  for (const dir of [localesDir, i18nDir]) {
    if (await fileExists(dir)) {
      const entries = await listDir(dir);
      const langs = entries.filter((e) => e.isDir).map((e) => e.name);
      if (langs.length > 0) return { hasI18n: true, languages: langs };
    }
  }

  return { hasI18n: false, languages: [] };
}

export async function analyzeStructure(projectRoot: string): Promise<ArchitectureInfo> {
  // Find source directory
  let srcDir: string | null = null;
  for (const candidate of SRC_DIR_CANDIDATES) {
    const candidatePath = join(projectRoot, candidate);
    if (await fileExists(candidatePath)) {
      srcDir = candidate;
      break;
    }
  }

  const result: ArchitectureInfo = {
    srcDir,
    isFeatureBased: false,
    features: [],
    hasSharedDir: false,
    sharedSubdirs: [],
    contexts: [],
    layouts: [],
    pages: [],
    hooks: [],
    entryPoints: [],
    configFiles: [],
    directoryTree: [],
    patterns: {
      hasModularBoundaries: false,
      hasServiceLayer: false,
      hasHookLayer: false,
      hasTypeDefinitions: false,
      hasTestFiles: false,
      testPattern: 'none',
      hasI18n: false,
      i18nLanguages: [],
      componentNaming: 'mixed',
    },
  };

  // Detect config files at project root
  for (const configFile of CONFIG_FILES) {
    if (await fileExists(join(projectRoot, configFile))) {
      result.configFiles.push(configFile);
    }
  }

  // Build directory tree (max 3 levels deep from project root)
  result.directoryTree = await buildDirectoryTree(projectRoot, 3);

  if (!srcDir) return result;

  const srcPath = join(projectRoot, srcDir);

  // Detect features
  const featuresDir = join(srcPath, 'features');
  if (await fileExists(featuresDir)) {
    result.isFeatureBased = true;
    result.features = await detectFeatures(featuresDir);
    result.patterns.hasModularBoundaries = result.features.some((f) => f.hasIndex);
  }

  // Detect shared directory
  const sharedDir = join(srcPath, 'shared');
  if (await fileExists(sharedDir)) {
    result.hasSharedDir = true;
    const sharedEntries = await listDir(sharedDir);
    result.sharedSubdirs = sharedEntries.filter((e) => e.isDir).map((e) => e.name);
  }

  // Detect contexts
  const contextsDir = join(srcPath, 'contexts');
  if (await fileExists(contextsDir)) {
    const entries = await listDir(contextsDir);
    result.contexts = entries
      .filter((e) => !e.isDir && e.name.endsWith('.tsx'))
      .map((e) => basename(e.name, '.tsx'));
  }

  // Detect layouts
  const layoutsDir = join(srcPath, 'layouts');
  if (await fileExists(layoutsDir)) {
    const entries = await listDir(layoutsDir);
    result.layouts = entries
      .filter((e) => !e.isDir && (e.name.endsWith('.tsx') || e.name.endsWith('.ts')))
      .map((e) => basename(e.name, extname(e.name)));
  }

  // Detect pages
  const pagesDir = join(srcPath, 'pages');
  if (await fileExists(pagesDir)) {
    const entries = await listDir(pagesDir);
    result.pages = entries
      .filter((e) => !e.isDir && (e.name.endsWith('.tsx') || e.name.endsWith('.ts')))
      .map((e) => basename(e.name, extname(e.name)));
  }

  // Detect hooks at root level
  const hooksDir = join(srcPath, 'hooks');
  if (await fileExists(hooksDir)) {
    const entries = await listDir(hooksDir);
    result.hooks = entries
      .filter((e) => !e.isDir && (e.name.endsWith('.ts') || e.name.endsWith('.tsx')))
      .map((e) => basename(e.name, extname(e.name)));
  }

  // Detect entry points
  for (const entry of ['main.tsx', 'main.ts', 'index.tsx', 'index.ts', 'App.tsx', 'App.ts']) {
    if (await fileExists(join(srcPath, entry))) {
      result.entryPoints.push(entry);
    }
  }

  // Detect patterns
  const allFiles = await collectFileNames(srcPath);

  result.patterns.hasServiceLayer = allFiles.some((f) => f.includes('Service') || f.includes('service'));
  result.patterns.hasHookLayer = allFiles.some((f) => f.startsWith('use') && f.endsWith('.ts'));
  result.patterns.hasTypeDefinitions = allFiles.some((f) => f.endsWith('.types.ts') || f.endsWith('.d.ts'));
  result.patterns.hasTestFiles = allFiles.some((f) => f.includes('.test.') || f.includes('.spec.'));

  // Detect test pattern
  if (result.patterns.hasTestFiles) {
    const hasTestDirs = allFiles.some((f) => f === '__tests__');
    result.patterns.testPattern = hasTestDirs ? 'colocated' : 'separate';
  }

  // Detect i18n
  const i18n = await detectI18n(srcPath);
  result.patterns.hasI18n = i18n.hasI18n;
  result.patterns.i18nLanguages = i18n.languages;

  // Detect component naming
  result.patterns.componentNaming = detectComponentNaming(allFiles);

  return result;
}
