import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { analyzeProject } from '../../../src/sync/analyzers/index.js';

describe('analyzeProject', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-analyze-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should analyze a basic TypeScript project', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'my-app',
        version: '1.0.0',
        description: 'Test app',
        scripts: { dev: 'vite', build: 'tsc' },
        dependencies: { react: '^18.0.0', next: '^14.0.0' },
        devDependencies: { vitest: '^1.0.0', typescript: '^5.0.0' },
      }),
    );
    await mkdir(join(testDir, 'src'), { recursive: true });

    const result = await analyzeProject(testDir);

    expect(result.projectName).toBe('my-app');
    expect(result.description).toBe('Test app');
    expect(result.packageInfo).not.toBeNull();
    expect(result.dependencies).not.toBeNull();
    expect(result.dependencies!.framework).toBe('Next.js');
    expect(result.scripts).not.toBeNull();
    expect(result.scripts!.dev).toBe('vite');
    expect(result.techStack.language).toBe('TypeScript');
    expect(result.techStack.framework).toBe('Next.js');
    expect(result.techStack.testing).toContain('Vitest');
  });

  it('should use config metadata when provided', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({ name: 'pkg-name' }));

    const config = {
      version: '1.0' as const,
      editors: {},
      metadata: { name: 'Config Name', description: 'Config Desc' },
      tech_stack: { language: 'Python', framework: 'Django' },
    };

    const result = await analyzeProject(testDir, config);

    expect(result.projectName).toBe('Config Name');
    expect(result.description).toBe('Config Desc');
    expect(result.techStack.language).toBe('Python');
    expect(result.techStack.framework).toBe('Django');
  });

  it('should handle project without package.json', async () => {
    const result = await analyzeProject(testDir);

    expect(result.packageInfo).toBeNull();
    expect(result.dependencies).toBeNull();
    expect(result.scripts).toBeNull();
    expect(result.projectName).toBe('');
  });

  it('should detect database when supabase dir exists', async () => {
    await mkdir(join(testDir, 'supabase', 'migrations'), { recursive: true });
    await writeFile(
      join(testDir, 'supabase', 'migrations', '20240101000000_init.sql'),
      'CREATE TABLE users (id uuid PRIMARY KEY);',
    );

    const result = await analyzeProject(testDir);

    expect(result.database).not.toBeNull();
    expect(result.database!.provider).toBe('Supabase');
  });

  it('should detect TypeScript from tsconfig in architecture', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await mkdir(join(testDir, 'src'), { recursive: true });

    const result = await analyzeProject(testDir);

    expect(result.techStack.language).toBe('TypeScript');
  });
});
