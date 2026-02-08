import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import { cleanupRemovedTemplates } from '../../src/sync/template-cleanup.js';

describe('cleanupRemovedTemplates', () => {
  let testDir: string;
  let contentDir: string;
  let templatesDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-template-cleanup-'));
    contentDir = join(testDir, '.ai-content');
    templatesDir = join(testDir, 'templates');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should remove content files that no longer exist in templates (unmodified copies)', async () => {
    // Setup: templates has only backend-developer, but content has both.
    // removed-skill.md has content identical to an existing template (unmodified copy).
    const templateSkillsDir = join(templatesDir, 'skills', 'specialists');
    const contentSkillsDir = join(contentDir, 'skills', 'specialists');
    await mkdir(templateSkillsDir, { recursive: true });
    await mkdir(contentSkillsDir, { recursive: true });

    await writeFile(join(templateSkillsDir, 'backend-developer.md'), '# Backend');
    await writeFile(join(contentSkillsDir, 'backend-developer.md'), '# Backend');
    // Content matches a known template — simulates an unmodified copy
    await writeFile(join(contentSkillsDir, 'removed-skill.md'), '# Backend');

    const removed = await cleanupRemovedTemplates(contentDir, false, templatesDir);

    expect(removed.length).toBe(1);
    expect(removed[0]).toContain('removed-skill.md');

    // Verify removed-skill.md is actually deleted
    await expect(access(join(contentSkillsDir, 'removed-skill.md'))).rejects.toThrow();

    // Verify backend-developer.md still exists
    await expect(access(join(contentSkillsDir, 'backend-developer.md'))).resolves.toBeUndefined();
  });

  it('should NOT remove user-modified files even if template was deleted', async () => {
    // Setup: templates has only backend-developer, content has a file
    // whose template was removed but content was modified by the user.
    const templateSkillsDir = join(templatesDir, 'skills', 'specialists');
    const contentSkillsDir = join(contentDir, 'skills', 'specialists');
    await mkdir(templateSkillsDir, { recursive: true });
    await mkdir(contentSkillsDir, { recursive: true });

    await writeFile(join(templateSkillsDir, 'backend-developer.md'), '# Backend');
    await writeFile(join(contentSkillsDir, 'backend-developer.md'), '# Backend');
    // Content does NOT match any template — user modified it
    await writeFile(join(contentSkillsDir, 'removed-skill.md'), '# My Custom Content');

    const removed = await cleanupRemovedTemplates(contentDir, false, templatesDir);

    expect(removed).toEqual([]);

    // Verify the user-modified file still exists
    await expect(access(join(contentSkillsDir, 'removed-skill.md'))).resolves.toBeUndefined();
  });

  it('should NOT remove user-created files in non-template subdirectories', async () => {
    // Setup: templates has specialists/, but user created custom/
    const templateSkillsDir = join(templatesDir, 'skills', 'specialists');
    const contentSpecialistsDir = join(contentDir, 'skills', 'specialists');
    const contentCustomDir = join(contentDir, 'skills', 'custom');
    await mkdir(templateSkillsDir, { recursive: true });
    await mkdir(contentSpecialistsDir, { recursive: true });
    await mkdir(contentCustomDir, { recursive: true });

    await writeFile(join(templateSkillsDir, 'backend-developer.md'), '# Backend');
    await writeFile(join(contentSpecialistsDir, 'backend-developer.md'), '# Backend');
    await writeFile(join(contentCustomDir, 'my-custom-skill.md'), '# Custom');

    const removed = await cleanupRemovedTemplates(contentDir, false, templatesDir);

    expect(removed).toEqual([]);

    // Verify custom skill still exists
    await expect(access(join(contentCustomDir, 'my-custom-skill.md'))).resolves.toBeUndefined();
  });

  it('should handle dry-run mode without deleting files', async () => {
    const templateSkillsDir = join(templatesDir, 'skills', 'specialists');
    const contentSkillsDir = join(contentDir, 'skills', 'specialists');
    await mkdir(templateSkillsDir, { recursive: true });
    await mkdir(contentSkillsDir, { recursive: true });

    await writeFile(join(templateSkillsDir, 'backend-developer.md'), '# Backend');
    await writeFile(join(contentSkillsDir, 'backend-developer.md'), '# Backend');
    // Content matches a known template — unmodified copy
    await writeFile(join(contentSkillsDir, 'removed-skill.md'), '# Backend');

    const removed = await cleanupRemovedTemplates(contentDir, true, templatesDir);

    expect(removed.length).toBe(1);

    // File should still exist in dry-run mode
    await expect(access(join(contentSkillsDir, 'removed-skill.md'))).resolves.toBeUndefined();
  });

  it('should handle top-level template files', async () => {
    // Setup: templates has a top-level skill that was removed
    const templateSkillsDir = join(templatesDir, 'skills');
    const contentSkillsDir = join(contentDir, 'skills');
    await mkdir(templateSkillsDir, { recursive: true });
    await mkdir(contentSkillsDir, { recursive: true });

    await writeFile(join(templateSkillsDir, 'code-review.md'), '# Code Review');
    await writeFile(join(contentSkillsDir, 'code-review.md'), '# Code Review');
    // Content matches a known template — unmodified copy
    await writeFile(join(contentSkillsDir, 'removed-top-level.md'), '# Code Review');

    const removed = await cleanupRemovedTemplates(contentDir, false, templatesDir);

    expect(removed.length).toBe(1);
    expect(removed[0]).toContain('removed-top-level.md');
  });

  it('should handle non-existent template directories gracefully', async () => {
    // Content dir exists but templates dir does not
    const contentSkillsDir = join(contentDir, 'skills');
    await mkdir(contentSkillsDir, { recursive: true });
    await writeFile(join(contentSkillsDir, 'some-skill.md'), '# Skill');

    const removed = await cleanupRemovedTemplates(contentDir, false, templatesDir);

    expect(removed).toEqual([]);
  });

  it('should also clean up workflows', async () => {
    const templateWorkflowsDir = join(templatesDir, 'workflows');
    const contentWorkflowsDir = join(contentDir, 'workflows');
    await mkdir(templateWorkflowsDir, { recursive: true });
    await mkdir(contentWorkflowsDir, { recursive: true });

    await writeFile(join(templateWorkflowsDir, 'deploy.md'), '# Deploy');
    await writeFile(join(contentWorkflowsDir, 'deploy.md'), '# Deploy');
    // Content matches a known template — unmodified copy
    await writeFile(join(contentWorkflowsDir, 'removed-workflow.md'), '# Deploy');

    const removed = await cleanupRemovedTemplates(contentDir, false, templatesDir);

    expect(removed.length).toBe(1);
    expect(removed[0]).toContain('removed-workflow.md');
  });
});
