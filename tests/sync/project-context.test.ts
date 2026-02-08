import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { createTempProject } from '../fixtures/helpers.js';
import { generateProjectContext } from '../../src/sync/project-context.js';

describe('generateProjectContext', () => {
  let cleanup: () => Promise<void>;
  let root: string;

  afterEach(async () => {
    if (cleanup) await cleanup();
  });

  it('should auto-fill overview from metadata', async () => {
    const config = {
      metadata: { name: 'my-app', description: 'A cool app' },
      tech_stack: {},
    };
    const result = await generateProjectContext(config);
    expect(result).toContain('**my-app** — A cool app');
  });

  it('should auto-fill tech stack from config', async () => {
    const config = {
      metadata: {},
      tech_stack: { language: 'TypeScript', framework: 'Next.js', database: 'PostgreSQL' },
    };
    const result = await generateProjectContext(config);
    expect(result).toContain('- **language**: TypeScript');
    expect(result).toContain('- **framework**: Next.js');
    expect(result).toContain('- **database**: PostgreSQL');
  });

  it('should skip empty tech stack values', async () => {
    const config = {
      metadata: {},
      tech_stack: { language: 'Go', framework: '', database: '' },
    };
    const result = await generateProjectContext(config);
    expect(result).toContain('- **language**: Go');
    expect(result).not.toContain('- **framework**: ');
  });

  it('should auto-detect directory structure from projectRoot', async () => {
    ({ root, cleanup } = await createTempProject());
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'tests'), { recursive: true });
    await mkdir(join(root, 'docs'), { recursive: true });
    // Should be ignored
    await mkdir(join(root, 'node_modules'), { recursive: true });
    await mkdir(join(root, '.git'), { recursive: true });

    const result = await generateProjectContext({ metadata: {}, tech_stack: {} }, root);
    expect(result).toContain('docs/');
    expect(result).toContain('src/');
    expect(result).toContain('tests/');
    expect(result).not.toContain('node_modules');
    expect(result).not.toContain('.git');
  });

  it('should auto-detect scripts from package.json', async () => {
    ({ root, cleanup } = await createTempProject());
    const pkg = {
      scripts: {
        dev: 'next dev',
        build: 'next build',
        test: 'vitest run',
      },
    };
    await writeFile(join(root, 'package.json'), JSON.stringify(pkg));

    const result = await generateProjectContext({ metadata: {}, tech_stack: {} }, root);
    expect(result).toContain('`next dev`');
    expect(result).toContain('`next build`');
    expect(result).toContain('`vitest run`');
  });

  it('should auto-detect dependencies from package.json', async () => {
    ({ root, cleanup } = await createTempProject());
    const pkg = {
      dependencies: { react: '^18.0.0', next: '^14.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    };
    await writeFile(join(root, 'package.json'), JSON.stringify(pkg));

    const result = await generateProjectContext({ metadata: {}, tech_stack: {} }, root);
    expect(result).toContain('| react | ^18.0.0 |');
    expect(result).toContain('| next | ^14.0.0 |');
    expect(result).toContain('| vitest | ^1.0.0 |');
    // Header should be updated
    expect(result).toContain('| Dependency | Version |');
  });

  it('should handle missing projectRoot gracefully', async () => {
    const result = await generateProjectContext({ metadata: {}, tech_stack: {} });
    expect(result).toContain('# Project Context');
    // Template placeholders should remain
    expect(result).toContain('- **Dev**: ');
  });

  it('should use start script as fallback for dev', async () => {
    ({ root, cleanup } = await createTempProject());
    const pkg = { scripts: { start: 'node server.js' } };
    await writeFile(join(root, 'package.json'), JSON.stringify(pkg));

    const result = await generateProjectContext({ metadata: {}, tech_stack: {} }, root);
    expect(result).toContain('`node server.js`');
  });
});
