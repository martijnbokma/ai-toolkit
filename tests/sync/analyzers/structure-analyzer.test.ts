import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { analyzeStructure } from '../../../src/sync/analyzers/structure-analyzer.js';

describe('StructureAnalyzer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-struct-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect src directory', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    const result = await analyzeStructure(testDir);
    expect(result.srcDir).toBe('src');
  });

  it('should detect app directory as srcDir', async () => {
    await mkdir(join(testDir, 'app'), { recursive: true });
    const result = await analyzeStructure(testDir);
    expect(result.srcDir).toBe('app');
  });

  it('should return null srcDir when no src-like directory exists', async () => {
    const result = await analyzeStructure(testDir);
    expect(result.srcDir).toBeNull();
  });

  it('should detect config files at project root', async () => {
    await writeFile(join(testDir, 'tsconfig.json'), '{}');
    await writeFile(join(testDir, 'vite.config.ts'), '');
    await writeFile(join(testDir, 'vitest.config.ts'), '');

    const result = await analyzeStructure(testDir);
    expect(result.configFiles).toContain('tsconfig.json');
    expect(result.configFiles).toContain('vite.config.ts');
    expect(result.configFiles).toContain('vitest.config.ts');
  });

  it('should detect feature-based architecture', async () => {
    await mkdir(join(testDir, 'src', 'features', 'auth'), { recursive: true });
    await mkdir(join(testDir, 'src', 'features', 'dashboard'), { recursive: true });
    await writeFile(join(testDir, 'src', 'features', 'auth', 'index.ts'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.isFeatureBased).toBe(true);
    expect(result.features.length).toBe(2);
    expect(result.features.find((f) => f.name === 'auth')?.hasIndex).toBe(true);
    expect(result.patterns.hasModularBoundaries).toBe(true);
  });

  it('should detect shared directory', async () => {
    await mkdir(join(testDir, 'src', 'shared', 'utils'), { recursive: true });
    await mkdir(join(testDir, 'src', 'shared', 'hooks'), { recursive: true });

    const result = await analyzeStructure(testDir);
    expect(result.hasSharedDir).toBe(true);
    expect(result.sharedSubdirs).toContain('utils');
    expect(result.sharedSubdirs).toContain('hooks');
  });

  it('should detect contexts', async () => {
    await mkdir(join(testDir, 'src', 'contexts'), { recursive: true });
    await writeFile(join(testDir, 'src', 'contexts', 'AuthContext.tsx'), 'export {}');
    await writeFile(join(testDir, 'src', 'contexts', 'ThemeContext.tsx'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.contexts).toContain('AuthContext');
    expect(result.contexts).toContain('ThemeContext');
  });

  it('should detect layouts', async () => {
    await mkdir(join(testDir, 'src', 'layouts'), { recursive: true });
    await writeFile(join(testDir, 'src', 'layouts', 'MainLayout.tsx'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.layouts).toContain('MainLayout');
  });

  it('should detect pages', async () => {
    await mkdir(join(testDir, 'src', 'pages'), { recursive: true });
    await writeFile(join(testDir, 'src', 'pages', 'Home.tsx'), 'export {}');
    await writeFile(join(testDir, 'src', 'pages', 'About.tsx'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.pages).toContain('Home');
    expect(result.pages).toContain('About');
  });

  it('should detect hooks', async () => {
    await mkdir(join(testDir, 'src', 'hooks'), { recursive: true });
    await writeFile(join(testDir, 'src', 'hooks', 'useAuth.ts'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.hooks).toContain('useAuth');
  });

  it('should detect entry points', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'main.tsx'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.entryPoints).toContain('main.tsx');
  });

  it('should detect service layer pattern', async () => {
    await mkdir(join(testDir, 'src', 'services'), { recursive: true });
    await writeFile(join(testDir, 'src', 'services', 'authService.ts'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.patterns.hasServiceLayer).toBe(true);
  });

  it('should detect hook layer pattern', async () => {
    await mkdir(join(testDir, 'src', 'hooks'), { recursive: true });
    await writeFile(join(testDir, 'src', 'hooks', 'useAuth.ts'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.patterns.hasHookLayer).toBe(true);
  });

  it('should detect type definitions', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'types.d.ts'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.patterns.hasTypeDefinitions).toBe(true);
  });

  it('should detect test files and separate test pattern', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'app.test.ts'), 'test()');

    const result = await analyzeStructure(testDir);
    expect(result.patterns.hasTestFiles).toBe(true);
    expect(result.patterns.testPattern).toBe('separate');
  });

  it('should detect colocated test pattern', async () => {
    await mkdir(join(testDir, 'src', '__tests__'), { recursive: true });
    await writeFile(join(testDir, 'src', '__tests__', 'app.test.ts'), 'test()');

    const result = await analyzeStructure(testDir);
    expect(result.patterns.hasTestFiles).toBe(true);
    expect(result.patterns.testPattern).toBe('colocated');
  });

  it('should detect i18n', async () => {
    await mkdir(join(testDir, 'src', 'locales', 'en'), { recursive: true });
    await mkdir(join(testDir, 'src', 'locales', 'nl'), { recursive: true });

    const result = await analyzeStructure(testDir);
    expect(result.patterns.hasI18n).toBe(true);
    expect(result.patterns.i18nLanguages).toContain('en');
    expect(result.patterns.i18nLanguages).toContain('nl');
  });

  it('should detect PascalCase component naming', async () => {
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src', 'Button.tsx'), 'export {}');
    await writeFile(join(testDir, 'src', 'Header.tsx'), 'export {}');
    await writeFile(join(testDir, 'src', 'Footer.tsx'), 'export {}');

    const result = await analyzeStructure(testDir);
    expect(result.patterns.componentNaming).toBe('PascalCase');
  });

  it('should build directory tree', async () => {
    await mkdir(join(testDir, 'src', 'components'), { recursive: true });
    await writeFile(join(testDir, 'src', 'index.ts'), 'export {}');
    await writeFile(join(testDir, 'package.json'), '{}');

    const result = await analyzeStructure(testDir);
    expect(result.directoryTree.length).toBeGreaterThan(0);
    const srcNode = result.directoryTree.find((n) => n.name === 'src');
    expect(srcNode).toBeDefined();
    expect(srcNode!.type).toBe('directory');
  });
});
