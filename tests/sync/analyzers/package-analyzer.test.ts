import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import {
  readPackageJson,
  analyzeDependencies,
  analyzeScripts,
} from '../../../src/sync/analyzers/package-analyzer.js';

describe('PackageAnalyzer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-pkg-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('readPackageJson', () => {
    it('should read and parse package.json', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'my-app',
          version: '1.0.0',
          description: 'A test app',
          scripts: { dev: 'vite', build: 'tsc && vite build' },
          dependencies: { react: '^18.0.0' },
          devDependencies: { vitest: '^1.0.0' },
          packageManager: 'bun@1.0.0',
        }),
      );

      const result = await readPackageJson(testDir);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('my-app');
      expect(result!.version).toBe('1.0.0');
      expect(result!.description).toBe('A test app');
      expect(result!.scripts.dev).toBe('vite');
      expect(result!.dependencies.react).toBe('^18.0.0');
      expect(result!.devDependencies.vitest).toBe('^1.0.0');
      expect(result!.packageManager).toBe('bun@1.0.0');
    });

    it('should return null when package.json does not exist', async () => {
      const result = await readPackageJson(testDir);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await writeFile(join(testDir, 'package.json'), 'not json');
      const result = await readPackageJson(testDir);
      expect(result).toBeNull();
    });

    it('should handle missing fields gracefully', async () => {
      await writeFile(join(testDir, 'package.json'), '{}');
      const result = await readPackageJson(testDir);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('');
      expect(result!.scripts).toEqual({});
      expect(result!.dependencies).toEqual({});
    });
  });

  describe('analyzeDependencies', () => {
    it('should detect Next.js framework', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { next: '^14.0.0', react: '^18.0.0' }, devDependencies: {},
      });
      expect(result.framework).toBe('Next.js');
    });

    it('should detect React framework', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { react: '^18.0.0' }, devDependencies: {},
      });
      expect(result.framework).toBe('React');
    });

    it('should detect Vue framework', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { vue: '^3.0.0' }, devDependencies: {},
      });
      expect(result.framework).toBe('Vue');
    });

    it('should detect UI library', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { '@radix-ui/react-dialog': '^1.0.0' }, devDependencies: {},
      });
      expect(result.uiLibrary).toBe('Radix UI (shadcn)');
    });

    it('should detect state management', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { zustand: '^4.0.0' }, devDependencies: {},
      });
      expect(result.stateManagement).toBe('Zustand');
    });

    it('should detect testing frameworks', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: { vitest: '^1.0.0', '@playwright/test': '^1.0.0' },
      });
      expect(result.testing).toContain('Vitest');
      expect(result.testing).toContain('Playwright');
    });

    it('should detect styling', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: { tailwindcss: '^3.0.0', postcss: '^8.0.0' },
      });
      expect(result.styling).toContain('TailwindCSS');
      expect(result.styling).toContain('PostCSS');
    });

    it('should detect database', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { '@supabase/supabase-js': '^2.0.0' }, devDependencies: {},
      });
      expect(result.database).toContain('Supabase');
    });

    it('should detect auth', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { 'next-auth': '^4.0.0' }, devDependencies: {},
      });
      expect(result.auth).toContain('NextAuth.js');
    });

    it('should detect build tool', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: { vite: '^5.0.0' },
      });
      expect(result.buildTool).toBe('Vite');
    });

    it('should detect linting', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: { eslint: '^8.0.0', prettier: '^3.0.0' },
      });
      expect(result.linting).toContain('ESLint');
      expect(result.linting).toContain('Prettier');
    });

    it('should detect Bun runtime from packageManager', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: {},
        packageManager: 'bun@1.0.0',
      });
      expect(result.runtime).toBe('Bun');
    });

    it('should detect pnpm runtime from packageManager', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: {},
        packageManager: 'pnpm@8.0.0',
      });
      expect(result.runtime).toBe('pnpm (Node.js)');
    });

    it('should detect yarn runtime from packageManager', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: {},
        packageManager: 'yarn@4.0.0',
      });
      expect(result.runtime).toBe('Yarn (Node.js)');
    });

    it('should detect Bun runtime from bun-types dep', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: { 'bun-types': '^1.0.0' },
      });
      expect(result.runtime).toBe('Bun');
    });

    it('should categorize key dependencies', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: { zod: '^3.22.0', 'lucide-react': '^0.300.0' }, devDependencies: {},
      });
      expect(result.keyDeps.length).toBe(2);
      expect(result.keyDeps.find((d) => d.name === 'zod')?.purpose).toBe('Schema validation');
      expect(result.keyDeps.find((d) => d.name === 'lucide-react')?.purpose).toBe('Icons');
    });

    it('should return null for unknown framework', () => {
      const result = analyzeDependencies({
        name: 'app', version: '1.0.0', description: '',
        scripts: {}, dependencies: {}, devDependencies: {},
      });
      expect(result.framework).toBeNull();
    });
  });

  describe('analyzeScripts', () => {
    it('should extract standard scripts', () => {
      const result = analyzeScripts({
        name: 'app', version: '1.0.0', description: '',
        scripts: { dev: 'vite', build: 'tsc && vite build', test: 'vitest', lint: 'eslint .', typecheck: 'tsc --noEmit' },
        dependencies: {}, devDependencies: {},
      });
      expect(result.dev).toBe('vite');
      expect(result.build).toBe('tsc && vite build');
      expect(result.test).toBe('vitest');
      expect(result.lint).toBe('eslint .');
      expect(result.typecheck).toBe('tsc --noEmit');
    });

    it('should fallback to start for dev', () => {
      const result = analyzeScripts({
        name: 'app', version: '1.0.0', description: '',
        scripts: { start: 'node server.js' },
        dependencies: {}, devDependencies: {},
      });
      expect(result.dev).toBe('node server.js');
    });

    it('should fallback to type-check for typecheck', () => {
      const result = analyzeScripts({
        name: 'app', version: '1.0.0', description: '',
        scripts: { 'type-check': 'tsc --noEmit' },
        dependencies: {}, devDependencies: {},
      });
      expect(result.typecheck).toBe('tsc --noEmit');
    });

    it('should return null for missing scripts', () => {
      const result = analyzeScripts({
        name: 'app', version: '1.0.0', description: '',
        scripts: {},
        dependencies: {}, devDependencies: {},
      });
      expect(result.dev).toBeNull();
      expect(result.build).toBeNull();
      expect(result.test).toBeNull();
    });
  });
});
