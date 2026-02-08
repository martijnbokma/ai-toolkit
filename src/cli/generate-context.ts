import { join } from 'path';
import * as p from '@clack/prompts';
import { loadConfig, configExists } from '../core/config-loader.js';
import { CONTENT_DIR, PROJECT_CONTEXT_FILE } from '../core/types.js';
import { fileExists, readTextFile, writeTextFile } from '../utils/file-ops.js';
import { analyzeProject } from '../sync/analyzers/index.js';
import { generateRichProjectContext } from '../sync/context-generator.js';

export async function runGenerateContext(
  projectRoot: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const projectContextPath = join(projectRoot, CONTENT_DIR, PROJECT_CONTEXT_FILE);

  // Check if PROJECT.md already has content (not just template)
  if (!options.force && (await fileExists(projectContextPath))) {
    const existing = await readTextFile(projectContextPath);
    const stripped = existing.replace(/<!--.*?-->/gs, '').trim();

    // Check if it's more than just a skeleton template
    const isRichContent = stripped.split('\n').filter((l) => l.trim().length > 0).length > 20;

    if (isRichContent) {
      p.note(
        'PROJECT.md already has content.\n' +
        'Use --force to overwrite, or edit it manually.',
        'Skipped',
      );
      return;
    }
  }

  // Check for config
  let config;
  if (await configExists(projectRoot)) {
    config = await loadConfig(projectRoot);
  }

  p.intro('🔍 Analyzing project...');

  const s = p.spinner();
  s.start('Scanning project structure, dependencies, and database...');

  const analysis = await analyzeProject(projectRoot, config);

  s.stop('Analysis complete!');

  // Show summary
  const summary: string[] = [];
  if (analysis.techStack.framework) summary.push(`Framework: ${analysis.techStack.framework}`);
  if (analysis.techStack.language) summary.push(`Language: ${analysis.techStack.language}`);
  if (analysis.techStack.database) summary.push(`Database: ${analysis.techStack.database}`);
  if (analysis.architecture.features.length > 0) {
    summary.push(`Features: ${analysis.architecture.features.map((f) => f.name).join(', ')}`);
  }
  if (analysis.database?.tables.length) {
    summary.push(`Tables: ${analysis.database.tables.map((t) => t.name).join(', ')}`);
  }
  if (analysis.architecture.patterns.hasTestFiles) {
    summary.push(`Testing: ${analysis.techStack.testing.join(' + ') || 'detected'}`);
  }

  if (summary.length > 0) {
    p.note(summary.join('\n'), 'Detected');
  }

  // Generate content
  const s2 = p.spinner();
  s2.start('Generating PROJECT.md...');

  const content = generateRichProjectContext(analysis);
  await writeTextFile(projectContextPath, content);

  s2.stop('PROJECT.md generated!');

  p.note(
    `${CONTENT_DIR}/${PROJECT_CONTEXT_FILE}\n\n` +
    'This file is included in all editor entry points (CLAUDE.md, .cursorrules, etc.).\n' +
    'Edit it freely to add project-specific details, conventions, and patterns.\n' +
    'Run "ai-toolkit sync" to distribute changes to all editors.',
    'Created',
  );

  p.outro('Done! Review and customize your PROJECT.md.');
}
