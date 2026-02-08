import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { autoPromoteContent } from '../../src/sync/auto-promoter.js';

describe('AutoPromoter', () => {
  let testDir: string;
  let contentDir: string;
  let ssotRoot: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-promoter-'));
    contentDir = join(testDir, '.ai-content');
    ssotRoot = join(testDir, 'ssot');

    await mkdir(join(contentDir, 'rules'), { recursive: true });
    await mkdir(join(contentDir, 'skills'), { recursive: true });
    await mkdir(join(contentDir, 'workflows'), { recursive: true });
    await mkdir(join(ssotRoot, 'rules'), { recursive: true });
    await mkdir(join(ssotRoot, 'skills'), { recursive: true });
    await mkdir(join(ssotRoot, 'workflows'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should promote new local files to SSOT', async () => {
    await writeFile(join(contentDir, 'skills', 'new-skill.md'), '# New Skill');

    await autoPromoteContent(contentDir, ssotRoot, false);

    const promoted = await readFile(join(ssotRoot, 'skills', 'new-skill.md'), 'utf-8');
    expect(promoted).toBe('# New Skill');
  });

  it('should NOT overwrite existing SSOT files', async () => {
    await writeFile(join(ssotRoot, 'skills', 'existing.md'), '# Original');
    await writeFile(join(contentDir, 'skills', 'existing.md'), '# Updated');

    await autoPromoteContent(contentDir, ssotRoot, false);

    const content = await readFile(join(ssotRoot, 'skills', 'existing.md'), 'utf-8');
    expect(content).toBe('# Original');
  });

  it('should promote across all categories (rules, skills, workflows)', async () => {
    await writeFile(join(contentDir, 'rules', 'new-rule.md'), '# Rule');
    await writeFile(join(contentDir, 'skills', 'new-skill.md'), '# Skill');
    await writeFile(join(contentDir, 'workflows', 'new-workflow.md'), '# Workflow');

    await autoPromoteContent(contentDir, ssotRoot, false);

    expect(await readFile(join(ssotRoot, 'rules', 'new-rule.md'), 'utf-8')).toBe('# Rule');
    expect(await readFile(join(ssotRoot, 'skills', 'new-skill.md'), 'utf-8')).toBe('# Skill');
    expect(await readFile(join(ssotRoot, 'workflows', 'new-workflow.md'), 'utf-8')).toBe('# Workflow');
  });

  it('should not write files in dry-run mode', async () => {
    await writeFile(join(contentDir, 'skills', 'dry-skill.md'), '# Dry');

    await autoPromoteContent(contentDir, ssotRoot, true);

    await expect(access(join(ssotRoot, 'skills', 'dry-skill.md'))).rejects.toThrow();
  });

  it('should handle empty content directories gracefully', async () => {
    // No files in contentDir — should not throw
    await autoPromoteContent(contentDir, ssotRoot, false);
    // No error means success
  });

  it('should handle non-existent content directories gracefully', async () => {
    const emptyContentDir = join(testDir, 'nonexistent');
    // Should not throw even if the content dir doesn't exist
    await autoPromoteContent(emptyContentDir, ssotRoot, false);
  });

  it('should promote files in subdirectories', async () => {
    await mkdir(join(contentDir, 'skills', 'specialists'), { recursive: true });
    await writeFile(
      join(contentDir, 'skills', 'specialists', 'backend.md'),
      '# Backend Specialist',
    );

    await autoPromoteContent(contentDir, ssotRoot, false);

    const promoted = await readFile(
      join(ssotRoot, 'skills', 'specialists', 'backend.md'),
      'utf-8',
    );
    expect(promoted).toBe('# Backend Specialist');
  });
});
