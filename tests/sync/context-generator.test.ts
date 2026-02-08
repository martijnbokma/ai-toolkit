import { describe, it, expect } from 'vitest';
import { generateRichProjectContext } from '../../src/sync/context-generator.js';
import type { ProjectAnalysis } from '../../src/sync/analyzers/index.js';

function createMinimalAnalysis(overrides?: Partial<ProjectAnalysis>): ProjectAnalysis {
  return {
    projectName: 'test-project',
    description: 'A test project',
    packageInfo: null,
    dependencies: null,
    scripts: null,
    architecture: {
      srcDir: 'src',
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
    },
    database: null,
    techStack: {
      language: '',
      framework: '',
      database: '',
      runtime: '',
      buildTool: '',
      testing: [],
      styling: [],
      linting: [],
      uiLibrary: null,
      stateManagement: null,
      auth: [],
    },
    ...overrides,
  };
}

describe('ContextGenerator', () => {
  describe('generateRichProjectContext', () => {
    it('should generate a basic context with project name', () => {
      const analysis = createMinimalAnalysis();
      const result = generateRichProjectContext(analysis);

      expect(result).toContain('# test-project - Project Context');
      expect(result).toContain('Auto-generated');
    });

    it('should include project description', () => {
      const analysis = createMinimalAnalysis({ description: 'My awesome app' });
      const result = generateRichProjectContext(analysis);

      expect(result).toContain('My awesome app');
    });

    it('should include tech stack when provided', () => {
      const analysis = createMinimalAnalysis({
        techStack: {
          language: 'TypeScript',
          framework: 'Next.js',
          database: 'PostgreSQL',
          runtime: 'Node.js',
          buildTool: 'Vite',
          testing: ['Vitest'],
          styling: ['TailwindCSS'],
          linting: ['ESLint'],
          uiLibrary: 'shadcn/ui',
          stateManagement: 'Zustand',
          auth: ['NextAuth.js'],
        },
      });
      const result = generateRichProjectContext(analysis);

      expect(result).toContain('TypeScript');
      expect(result).toContain('Next.js');
      expect(result).toContain('PostgreSQL');
      expect(result).toContain('Vite');
      expect(result).toContain('Vitest');
      expect(result).toContain('TailwindCSS');
      expect(result).toContain('ESLint');
      expect(result).toContain('shadcn/ui');
      expect(result).toContain('Zustand');
      expect(result).toContain('NextAuth.js');
    });

    it('should include feature-based architecture info', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.isFeatureBased = true;
      analysis.architecture.features = [
        { name: 'auth', hasIndex: true, subdirs: ['hooks', 'components', 'services'], fileCount: 10 },
        { name: 'dashboard', hasIndex: true, subdirs: ['hooks', 'components'], fileCount: 8 },
      ];
      analysis.architecture.patterns.hasModularBoundaries = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Feature-Based Architecture');
      expect(result).toContain('Modular Feature Boundaries');
      expect(result).toContain('Import from feature index');
    });

    it('should include shared directory info', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.hasSharedDir = true;
      analysis.architecture.sharedSubdirs = ['utils', 'hooks', 'components'];

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Shared Code Organization');
      expect(result).toContain('src/shared/');
    });

    it('should include separation of concerns when service/hook layers detected', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.patterns.hasServiceLayer = true;
      analysis.architecture.patterns.hasHookLayer = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Separation of Concerns');
      expect(result).toContain('Services');
      expect(result).toContain('Hooks');
    });

    it('should include state management contexts', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.contexts = ['AuthContext', 'ThemeContext'];
      analysis.architecture.patterns.hasHookLayer = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('State Management');
      expect(result).toContain('AuthContext');
      expect(result).toContain('ThemeContext');
    });

    it('should include database section when database info exists', () => {
      const analysis = createMinimalAnalysis({
        database: {
          provider: 'Supabase',
          hasMigrations: true,
          migrations: [
            { filename: '20240101000000_create_users.sql', timestamp: '20240101000000', description: 'create users' },
          ],
          tables: [
            { name: 'users', fields: ['id', 'email', 'name'], hasRLS: true },
            { name: 'posts', fields: ['id', 'title', 'content'], hasRLS: false },
          ],
          hasRLS: true,
          hasEdgeFunctions: true,
          edgeFunctions: [{ name: 'send-email', path: 'supabase/functions/send-email' }],
          configFile: 'supabase/config.toml',
        },
      });

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Database Schema');
      expect(result).toContain('Supabase');
      expect(result).toContain('Row-Level Security');
      expect(result).toContain('`users`');
      expect(result).toContain('`posts`');
      expect(result).toContain('Edge Functions');
      expect(result).toContain('send-email');
      expect(result).toContain('Migrations');
    });

    it('should include development commands from scripts', () => {
      const analysis = createMinimalAnalysis({
        scripts: {
          dev: 'bun run dev',
          build: 'bun run build',
          test: 'vitest',
          lint: 'eslint .',
          typecheck: 'tsc --noEmit',
          all: { dev: 'bun run dev', build: 'bun run build', test: 'vitest', lint: 'eslint .', typecheck: 'tsc --noEmit' },
        },
      });

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Development');
      expect(result).toContain('bun run dev');
      expect(result).toContain('bun run build');
      expect(result).toContain('vitest');
    });

    it('should include testing section when test files detected', () => {
      const analysis = createMinimalAnalysis({
        techStack: {
          language: 'TypeScript',
          framework: '',
          database: '',
          runtime: '',
          buildTool: '',
          testing: ['Vitest', 'Playwright'],
          styling: [],
          linting: [],
          uiLibrary: null,
          stateManagement: null,
          auth: [],
        },
      });
      analysis.architecture.patterns.hasTestFiles = true;
      analysis.architecture.patterns.testPattern = 'separate';

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Testing');
      expect(result).toContain('Vitest + Playwright');
      expect(result).toContain('separate test directory');
    });

    it('should include colocated test pattern', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.patterns.hasTestFiles = true;
      analysis.architecture.patterns.testPattern = 'colocated';
      analysis.techStack.testing = ['Jest'];

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('co-located');
      expect(result).toContain('__tests__');
    });

    it('should include important files section', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.configFiles = ['tsconfig.json', 'vite.config.ts'];
      analysis.architecture.entryPoints = ['main.tsx'];

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Important Files');
      expect(result).toContain('tsconfig.json');
      expect(result).toContain('vite.config.ts');
      expect(result).toContain('main.tsx');
    });

    it('should include AI agent notes', () => {
      const analysis = createMinimalAnalysis();
      analysis.techStack.language = 'TypeScript';
      analysis.architecture.patterns.hasTestFiles = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Notes for AI Agents');
      expect(result).toContain('Always read existing code first');
      expect(result).toContain('Maintain type safety');
      expect(result).toContain('Write tests');
      expect(result).toContain('End of Project Context');
    });

    it('should include TypeScript conventions when language is TypeScript', () => {
      const analysis = createMinimalAnalysis();
      analysis.techStack.language = 'TypeScript';
      analysis.architecture.patterns.hasTypeDefinitions = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('TypeScript');
      expect(result).toContain('Strict Mode');
      expect(result).toContain('.types.ts');
    });

    it('should include file naming conventions', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.patterns.componentNaming = 'PascalCase';
      analysis.architecture.patterns.hasHookLayer = true;
      analysis.architecture.patterns.hasServiceLayer = true;
      analysis.architecture.patterns.hasTypeDefinitions = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('File Naming');
      expect(result).toContain('PascalCase');
    });

    it('should include i18n section when detected', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.patterns.hasI18n = true;
      analysis.architecture.patterns.i18nLanguages = ['en', 'nl', 'de'];

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Internationalization');
      expect(result).toContain('en, nl, de');
    });

    it('should include key dependencies table', () => {
      const analysis = createMinimalAnalysis({
        dependencies: {
          framework: 'Next.js',
          uiLibrary: null,
          stateManagement: null,
          testing: [],
          styling: [],
          database: [],
          auth: [],
          buildTool: null,
          linting: [],
          runtime: null,
          keyDeps: [
            { name: 'zod', version: '^3.22.0', purpose: 'Schema validation' },
            { name: 'lucide-react', version: '^0.300.0', purpose: 'Icons' },
          ],
        },
      });

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Key Dependencies');
      expect(result).toContain('zod');
      expect(result).toContain('Schema validation');
    });

    it('should include core dependencies from packageInfo', () => {
      const analysis = createMinimalAnalysis({
        packageInfo: {
          name: 'my-app',
          version: '1.0.0',
          description: '',
          scripts: {},
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', next: '^14.0.0' },
          devDependencies: {},
        },
      });

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Core Dependencies');
      expect(result).toContain('react');
    });

    it('should include auth key patterns', () => {
      const analysis = createMinimalAnalysis();
      analysis.techStack.auth = ['Supabase Auth'];
      analysis.architecture.contexts = ['AuthContext'];

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Authentication');
      expect(result).toContain('Supabase Auth');
      expect(result).toContain('AuthContext');
    });

    it('should include data fetching pattern when both service and hook layers exist', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.patterns.hasServiceLayer = true;
      analysis.architecture.patterns.hasHookLayer = true;

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Data Fetching Pattern');
      expect(result).toContain('Service Layer');
      expect(result).toContain('Hook Layer');
      expect(result).toContain('Component Layer');
    });

    it('should include directory tree in project structure', () => {
      const analysis = createMinimalAnalysis();
      analysis.architecture.directoryTree = [
        {
          name: 'src',
          type: 'directory',
          children: [
            { name: 'components', type: 'directory' },
            { name: 'index.ts', type: 'file' },
          ],
        },
        { name: 'package.json', type: 'file' },
      ];

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Project Structure');
      expect(result).toContain('src/');
      expect(result).toContain('package.json');
    });

    it('should handle database with many migrations (truncated display)', () => {
      const migrations = Array.from({ length: 10 }, (_, i) => ({
        filename: `2024010${i}000000_migration_${i}.sql`,
        timestamp: `2024010${i}000000`,
        description: `migration ${i}`,
      }));

      const analysis = createMinimalAnalysis({
        database: {
          provider: 'Supabase',
          hasMigrations: true,
          migrations,
          tables: [],
          hasRLS: false,
          hasEdgeFunctions: false,
          edgeFunctions: [],
          configFile: null,
        },
      });

      const result = generateRichProjectContext(analysis);

      expect(result).toContain('Migrations');
      expect(result).toContain('10 migration(s)');
      // Should show first 3 and last 2 with ellipsis
      expect(result).toContain('...');
    });

    it('should use fallback project name when not provided', () => {
      const analysis = createMinimalAnalysis({ projectName: '' });
      const result = generateRichProjectContext(analysis);

      expect(result).toContain('# Project - Project Context');
    });

    it('should handle getVersion with matching dep version', () => {
      const analysis = createMinimalAnalysis({
        techStack: {
          language: 'TypeScript',
          framework: '',
          database: '',
          runtime: '',
          buildTool: 'Vite',
          testing: [],
          styling: [],
          linting: [],
          uiLibrary: null,
          stateManagement: null,
          auth: [],
        },
        packageInfo: {
          name: 'test',
          version: '1.0.0',
          description: '',
          scripts: {},
          dependencies: {},
          devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
        },
      });
      const result = generateRichProjectContext(analysis);
      // getVersion should find the typescript version
      expect(result).toContain('^5.0.0');
    });

    it('should handle getVersion with no matching dep', () => {
      const analysis = createMinimalAnalysis({
        techStack: {
          language: 'TypeScript',
          framework: '',
          database: '',
          runtime: '',
          buildTool: 'Webpack',
          testing: [],
          styling: [],
          linting: [],
          uiLibrary: null,
          stateManagement: null,
          auth: [],
        },
        packageInfo: {
          name: 'test',
          version: '1.0.0',
          description: '',
          scripts: {},
          dependencies: {},
          devDependencies: {},
        },
      });
      const result = generateRichProjectContext(analysis);
      // Should still render without crashing
      expect(result).toContain('Webpack');
    });

    it('should end with a newline', () => {
      const analysis = createMinimalAnalysis();
      const result = generateRichProjectContext(analysis);

      expect(result.endsWith('\n')).toBe(true);
    });

    it('should separate sections with horizontal rules', () => {
      const analysis = createMinimalAnalysis();
      const result = generateRichProjectContext(analysis);

      expect(result).toContain('---');
    });
  });
});
