import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { detectStack } from '../../src/utils/detect-stack.js';

describe('detectStack', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-detect-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect TypeScript from tsconfig.json', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    const result = await detectStack(testDir);
    expect(result.language).toBe('TypeScript');
  });

  it('should detect JavaScript from jsconfig.json', async () => {
    await writeFile(join(testDir, 'jsconfig.json'), '{}');
    const result = await detectStack(testDir);
    expect(result.language).toBe('JavaScript');
  });

  it('should detect Python from requirements.txt', async () => {
    await writeFile(join(testDir, 'requirements.txt'), 'flask==2.0.0');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Python');
    expect(result.runtime).toBe('Python');
  });

  it('should detect Go from go.mod', async () => {
    await writeFile(join(testDir, 'go.mod'), 'module example.com/app');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Go');
    expect(result.runtime).toBe('Go');
  });

  it('should detect Rust from Cargo.toml', async () => {
    await writeFile(join(testDir, 'Cargo.toml'), '[package]');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Rust');
  });

  it('should detect Bun runtime from bun.lock', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(join(testDir, 'bun.lock'), '');
    const result = await detectStack(testDir);
    expect(result.runtime).toBe('Bun');
  });

  it('should detect Node.js runtime from package-lock.json', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(join(testDir, 'package-lock.json'), '{}');
    const result = await detectStack(testDir);
    expect(result.runtime).toBe('Node.js');
  });

  it('should detect Deno runtime from deno.json', async () => {
    await writeFile(join(testDir, 'deno.json'), '{}');
    const result = await detectStack(testDir);
    expect(result.runtime).toBe('Deno');
  });

  it('should detect Next.js framework from package.json', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0', react: '^18.0.0' } }),
    );
    const result = await detectStack(testDir);
    expect(result.framework).toBe('Next.js');
  });

  it('should detect React framework from package.json', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^18.0.0' } }),
    );
    const result = await detectStack(testDir);
    expect(result.framework).toBe('React');
  });

  it('should detect Supabase database from package.json', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { '@supabase/supabase-js': '^2.0.0' } }),
    );
    const result = await detectStack(testDir);
    expect(result.database).toBe('Supabase');
  });

  it('should detect Prisma database from package.json', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ devDependencies: { prisma: '^5.0.0' } }),
    );
    const result = await detectStack(testDir);
    expect(result.database).toBe('Prisma');
  });

  it('should detect Django framework for Python projects', async () => {
    await writeFile(join(testDir, 'requirements.txt'), 'django==4.2.0\ncelery==5.0.0');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Python');
    expect(result.framework).toBe('Django');
  });

  it('should detect FastAPI framework for Python projects', async () => {
    await writeFile(join(testDir, 'requirements.txt'), 'fastapi==0.100.0\nuvicorn==0.23.0');
    const result = await detectStack(testDir);
    expect(result.framework).toBe('FastAPI');
  });

  it('should detect Flask framework from pyproject.toml', async () => {
    await writeFile(join(testDir, 'pyproject.toml'), '[tool.poetry.dependencies]\nflask = "^2.0"');
    const result = await detectStack(testDir);
    expect(result.framework).toBe('Flask');
  });

  it('should return empty result for empty directory', async () => {
    const result = await detectStack(testDir);
    expect(result.language).toBeUndefined();
    expect(result.framework).toBeUndefined();
    expect(result.runtime).toBeUndefined();
    expect(result.database).toBeUndefined();
  });

  it('should fallback to JavaScript when only package.json exists', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: {} }),
    );
    const result = await detectStack(testDir);
    expect(result.language).toBe('JavaScript');
  });

  it('should detect Java from pom.xml', async () => {
    await writeFile(join(testDir, 'pom.xml'), '<project></project>');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Java');
    expect(result.runtime).toBe('JVM');
  });

  it('should detect Ruby from Gemfile', async () => {
    await writeFile(join(testDir, 'Gemfile'), 'source "https://rubygems.org"');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Ruby');
  });

  it('should detect Python framework from Pipfile', async () => {
    await writeFile(join(testDir, 'Pipfile'), '[packages]\ndjango = "*"');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Python');
    expect(result.framework).toBe('Django');
  });

  it('should detect Starlette from pyproject.toml', async () => {
    await writeFile(join(testDir, 'pyproject.toml'), '[tool.poetry.dependencies]\nstarlette = "^0.27"');
    const result = await detectStack(testDir);
    expect(result.framework).toBe('Starlette');
  });

  it('should detect Kotlin from build.gradle.kts', async () => {
    await writeFile(join(testDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Kotlin');
    expect(result.runtime).toBe('JVM');
  });

  it('should detect PHP from composer.json', async () => {
    await writeFile(join(testDir, 'composer.json'), '{}');
    const result = await detectStack(testDir);
    expect(result.language).toBe('PHP');
  });

  it('should detect Elixir from mix.exs', async () => {
    await writeFile(join(testDir, 'mix.exs'), 'defmodule MyApp do end');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Elixir');
  });

  it('should detect Deno runtime from deno.jsonc', async () => {
    await writeFile(join(testDir, 'deno.jsonc'), '{}');
    const result = await detectStack(testDir);
    expect(result.runtime).toBe('Deno');
  });

  it('should detect Node.js from yarn.lock', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(join(testDir, 'yarn.lock'), '');
    const result = await detectStack(testDir);
    expect(result.runtime).toBe('Node.js');
  });

  it('should detect Node.js from pnpm-lock.yaml', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(join(testDir, 'pnpm-lock.yaml'), '');
    const result = await detectStack(testDir);
    expect(result.runtime).toBe('Node.js');
  });

  it('should handle invalid package.json gracefully', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(join(testDir, 'package.json'), 'not valid json');
    const result = await detectStack(testDir);
    expect(result.language).toBe('TypeScript');
    expect(result.framework).toBeUndefined();
  });

  it('should detect Swift from Package.swift', async () => {
    await writeFile(join(testDir, 'Package.swift'), 'import PackageDescription');
    const result = await detectStack(testDir);
    expect(result.language).toBe('Swift');
  });
});
