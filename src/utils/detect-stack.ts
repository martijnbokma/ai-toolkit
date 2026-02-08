import { join } from 'path';
import { fileExists, readTextFile } from './file-ops.js';
import { readPackageJson, analyzeDependencies } from '../sync/analyzers/package-analyzer.js';

export interface DetectedStack {
  language?: string;
  framework?: string;
  runtime?: string;
  database?: string;
}

/**
 * Auto-detect tech stack by scanning project files.
 * Returns only fields that could be confidently detected.
 */
export async function detectStack(projectRoot: string): Promise<DetectedStack> {
  const detected: DetectedStack = {};

  // Detect language
  detected.language = await detectLanguage(projectRoot);

  // Detect runtime (file-based: lockfiles)
  detected.runtime = await detectRuntime(projectRoot);

  // Parse package.json for framework + database detection
  const pkg = await readPackageJson(projectRoot);
  if (pkg) {
    const deps = analyzeDependencies(pkg);

    if (deps.framework) detected.framework = deps.framework;
    if (deps.database.length > 0) detected.database = deps.database[0];

    // Fall back to packageManager-based runtime if file-based didn't detect
    if (!detected.runtime && deps.runtime) {
      detected.runtime = deps.runtime;
    }
  }

  // Python framework detection (overrides package.json-based detection)
  if (detected.language === 'Python') {
    const pyFramework = await detectPythonFramework(projectRoot);
    if (pyFramework) detected.framework = pyFramework;
  }

  return detected;
}

async function detectLanguage(projectRoot: string): Promise<string | undefined> {
  const checks: Array<{ file: string; language: string }> = [
    { file: 'tsconfig.json', language: 'TypeScript' },
    { file: 'jsconfig.json', language: 'JavaScript' },
    { file: 'requirements.txt', language: 'Python' },
    { file: 'pyproject.toml', language: 'Python' },
    { file: 'Pipfile', language: 'Python' },
    { file: 'go.mod', language: 'Go' },
    { file: 'Cargo.toml', language: 'Rust' },
    { file: 'pom.xml', language: 'Java' },
    { file: 'build.gradle', language: 'Java' },
    { file: 'build.gradle.kts', language: 'Kotlin' },
    { file: 'Gemfile', language: 'Ruby' },
    { file: 'Package.swift', language: 'Swift' },
    { file: 'composer.json', language: 'PHP' },
    { file: 'mix.exs', language: 'Elixir' },
  ];

  for (const { file, language } of checks) {
    if (await fileExists(join(projectRoot, file))) {
      return language;
    }
  }

  // Fallback: check package.json existence → JavaScript
  if (await fileExists(join(projectRoot, 'package.json'))) {
    return 'JavaScript';
  }

  return undefined;
}

async function detectRuntime(projectRoot: string): Promise<string | undefined> {
  // Bun
  if (await fileExists(join(projectRoot, 'bun.lock'))) return 'Bun';
  if (await fileExists(join(projectRoot, 'bunfig.toml'))) return 'Bun';

  // Deno
  if (await fileExists(join(projectRoot, 'deno.json'))) return 'Deno';
  if (await fileExists(join(projectRoot, 'deno.jsonc'))) return 'Deno';

  // Node.js (package-lock.json or yarn.lock)
  if (await fileExists(join(projectRoot, 'package-lock.json'))) return 'Node.js';
  if (await fileExists(join(projectRoot, 'yarn.lock'))) return 'Node.js';
  if (await fileExists(join(projectRoot, 'pnpm-lock.yaml'))) return 'Node.js';

  // Python
  if (await fileExists(join(projectRoot, 'requirements.txt'))) return 'Python';
  if (await fileExists(join(projectRoot, 'pyproject.toml'))) return 'Python';

  // Go
  if (await fileExists(join(projectRoot, 'go.mod'))) return 'Go';

  // JVM
  if (await fileExists(join(projectRoot, 'pom.xml'))) return 'JVM';
  if (await fileExists(join(projectRoot, 'build.gradle'))) return 'JVM';
  if (await fileExists(join(projectRoot, 'build.gradle.kts'))) return 'JVM';

  // .NET
  const hasCsproj = await fileExists(join(projectRoot, '*.csproj'));
  if (hasCsproj) return '.NET';

  return undefined;
}

async function detectPythonFramework(projectRoot: string): Promise<string | undefined> {
  const reqFiles = ['requirements.txt', 'pyproject.toml', 'Pipfile'];

  for (const reqFile of reqFiles) {
    const filePath = join(projectRoot, reqFile);
    if (!(await fileExists(filePath))) continue;

    try {
      const content = await readTextFile(filePath);
      const lower = content.toLowerCase();

      if (lower.includes('django')) return 'Django';
      if (lower.includes('fastapi')) return 'FastAPI';
      if (lower.includes('flask')) return 'Flask';
      if (lower.includes('starlette')) return 'Starlette';
      if (lower.includes('tornado')) return 'Tornado';
    } catch {
      continue;
    }
  }

  return undefined;
}

