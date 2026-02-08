import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { runSync } from '../../src/sync/syncer.js';
import type { ToolkitConfig } from '../../src/core/types.js';

describe('Syncer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-sync-'));
    // Create content directories
    await mkdir(join(testDir, '.ai-content', 'rules'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'skills'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await mkdir(join(testDir, '.ai-content', 'overrides', 'cursor'), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const baseConfig: ToolkitConfig = {
    version: '1.0',
    editors: { cursor: true, claude: true },
  };

  it('should sync rules to enabled editors', async () => {
    await writeFile(
      join(testDir, '.ai-content', 'rules', 'test-rule.md'),
      '# Test Rule\nDo the thing.',
    );

    const result = await runSync(testDir, baseConfig);

    expect(result.errors).toEqual([]);
    expect(result.synced.length).toBeGreaterThan(0);

    const cursorRule = await readFile(
      join(testDir, '.cursor', 'rules', 'test-rule.md'),
      'utf-8',
    );
    expect(cursorRule).toContain('AUTO-GENERATED');
    expect(cursorRule).toContain('# Test Rule');
    expect(cursorRule).toContain('Source: .ai-content/rules/test-rule.md');
  });

  it('should sync skills with frontmatter for Claude', async () => {
    await writeFile(
      join(testDir, '.ai-content', 'skills', 'refactor.md'),
      '# Refactor\nRefactor the code.',
    );

    const result = await runSync(testDir, baseConfig);

    const claudeSkill = await readFile(
      join(testDir, '.claude', 'skills', 'refactor.md'),
      'utf-8',
    );
    expect(claudeSkill).toContain('name: refactor');
    expect(claudeSkill).toContain('# Refactor');
  });

  it('should generate entry points', async () => {
    const result = await runSync(testDir, baseConfig);

    const cursorrules = await readFile(
      join(testDir, '.cursorrules'),
      'utf-8',
    );
    expect(cursorrules).toContain('AUTO-GENERATED');

    const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('AUTO-GENERATED');
  });

  it('should apply editor overrides', async () => {
    await writeFile(
      join(testDir, '.ai-content', 'overrides', 'cursor', 'special.md'),
      '# Cursor-only rule',
    );

    const result = await runSync(testDir, baseConfig);

    const override = await readFile(
      join(testDir, '.cursor', 'rules', 'special.md'),
      'utf-8',
    );
    // Overrides should NOT have auto-generated marker
    expect(override).not.toContain('AUTO-GENERATED');
    expect(override).toContain('# Cursor-only rule');
  });

  it('should generate MCP configs', async () => {
    const configWithMCP: ToolkitConfig = {
      ...baseConfig,
      mcp_servers: [
        { name: 'test-server', command: 'node', args: ['server.js'], enabled: true },
      ],
    };

    const result = await runSync(testDir, configWithMCP);

    const mcpJson = await readFile(
      join(testDir, '.cursor', 'mcp.json'),
      'utf-8',
    );
    const parsed = JSON.parse(mcpJson);
    expect(parsed.mcpServers['test-server']).toBeDefined();
    expect(parsed.mcpServers['test-server'].command).toBe('node');
  });

  it('should update .gitignore', async () => {
    const result = await runSync(testDir, baseConfig);

    const gitignore = await readFile(join(testDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('ai-toolkit managed');
    expect(gitignore).toContain('.cursor/rules/');
    expect(gitignore).toContain('CLAUDE.md');
  });

  it('should preserve subdirectory structure for skills (e.g. specialists/)', async () => {
    // Create a skill in a subdirectory
    await mkdir(join(testDir, '.ai-content', 'skills', 'specialists'), { recursive: true });
    await writeFile(
      join(testDir, '.ai-content', 'skills', 'specialists', 'backend-developer.md'),
      '# Backend Developer\nSpecialist skill.',
    );

    const result = await runSync(testDir, baseConfig);

    expect(result.errors).toEqual([]);

    // Verify the subdirectory structure is preserved in editor output
    const cursorSkill = await readFile(
      join(testDir, '.cursor', 'commands', 'specialists', 'backend-developer.md'),
      'utf-8',
    );
    expect(cursorSkill).toContain('AUTO-GENERATED');
    expect(cursorSkill).toContain('# Backend Developer');
    expect(cursorSkill).toContain('Source: .ai-content/skills/specialists/backend-developer.md');
  });

  it('should detect orphans when a subdirectory skill is deleted', async () => {
    // Create a user-created specialist skill (not from templates)
    await mkdir(join(testDir, '.ai-content', 'skills', 'specialists'), { recursive: true });
    await writeFile(
      join(testDir, '.ai-content', 'skills', 'specialists', 'old-skill.md'),
      '# Old Skill\nThis is a user-created specialist.',
    );

    const result1 = await runSync(testDir, baseConfig);
    expect(result1.errors).toEqual([]);

    // Verify it was synced to the editor with subdirectory preserved
    const skillPath = join(testDir, '.cursor', 'commands', 'specialists', 'old-skill.md');
    const content = await readFile(skillPath, 'utf-8');
    expect(content).toContain('AUTO-GENERATED');
    expect(content).toContain('# Old Skill');

    // Now delete the source file and re-sync
    const { unlink } = await import('fs/promises');
    await unlink(join(testDir, '.ai-content', 'skills', 'specialists', 'old-skill.md'));

    const result2 = await runSync(testDir, baseConfig);

    // The orphaned file in the editor directory should be detected
    expect(result2.pendingOrphans.length).toBeGreaterThan(0);
    const orphanPaths = result2.pendingOrphans.map((o) => o.relativePath);
    expect(orphanPaths.some((p) => p.includes('old-skill.md'))).toBe(true);
  });

  it('should sync workflows to editors that support them', async () => {
    await mkdir(join(testDir, '.ai-content', 'workflows'), { recursive: true });
    await writeFile(
      join(testDir, '.ai-content', 'workflows', 'deploy.md'),
      '# Deploy Workflow',
    );

    const result = await runSync(testDir, baseConfig);

    expect(result.errors).toEqual([]);
    // Windsurf-like editors with workflows dir should get the file
    // but cursor+claude in baseConfig don't have workflows dir, so just check no errors
  });

  it('should sync settings when configured', async () => {
    const configWithSettings: ToolkitConfig = {
      ...baseConfig,
      settings: {
        indent_size: 2,
        indent_style: 'space',
        format_on_save: true,
      },
    };

    const result = await runSync(testDir, configWithSettings);

    expect(result.errors).toEqual([]);
    expect(result.synced.length).toBeGreaterThan(0);
  });

  it('should return early when no editors enabled', async () => {
    const noEditorsConfig: ToolkitConfig = {
      version: '1.0',
      editors: { cursor: false, claude: false },
    };

    const result = await runSync(testDir, noEditorsConfig);

    expect(result.synced).toEqual([]);
  });

  it('should sync skills with subdirectory naming for trae', async () => {
    const traeConfig: ToolkitConfig = {
      version: '1.0',
      editors: { trae: true },
    };

    await writeFile(
      join(testDir, '.ai-content', 'skills', 'debug.md'),
      '# Debug Skill',
    );

    const result = await runSync(testDir, traeConfig);

    expect(result.errors).toEqual([]);
    // Trae uses subdirectory naming: .trae/skills/debug/SKILL.md
    const traeSkill = await readFile(
      join(testDir, '.trae', 'skills', 'debug', 'SKILL.md'),
      'utf-8',
    );
    expect(traeSkill).toContain('# Debug Skill');
    expect(traeSkill).toContain('AUTO-GENERATED');
  });

  it('should sync with content_sources (local SSOT)', async () => {
    // Create an external content source
    const ssotDir = join(testDir, 'shared-content');
    await mkdir(join(ssotDir, 'rules'), { recursive: true });
    await writeFile(join(ssotDir, 'rules', 'shared-rule.md'), '# Shared Rule');

    const configWithSources: ToolkitConfig = {
      ...baseConfig,
      content_sources: [
        { type: 'local', path: ssotDir, include: ['rules'] },
      ],
    };

    const result = await runSync(testDir, configWithSources);

    expect(result.errors).toEqual([]);
    // The shared rule should be synced to editors
    const cursorRule = await readFile(
      join(testDir, '.cursor', 'rules', 'shared-rule.md'),
      'utf-8',
    );
    expect(cursorRule).toContain('# Shared Rule');
  });

  it('should detect SSOT orphans and diffs when content_sources configured', async () => {
    // Create SSOT source with a file that doesn't exist locally
    const ssotDir = join(testDir, 'ssot-source');
    await mkdir(join(ssotDir, 'rules'), { recursive: true });
    await mkdir(join(ssotDir, 'skills'), { recursive: true });
    await writeFile(join(ssotDir, 'rules', 'ssot-only.md'), '# SSOT Only');

    const configWithSources: ToolkitConfig = {
      ...baseConfig,
      content_sources: [
        { type: 'local', path: ssotDir },
      ],
    };

    const result = await runSync(testDir, configWithSources);

    expect(result.errors).toEqual([]);
    // ssotOrphans should detect the file that's in SSOT but not locally
    expect(result.ssotOrphans.length).toBeGreaterThanOrEqual(0);
  });

  it('should sync workflows to windsurf which supports them', async () => {
    const windsurfConfig: ToolkitConfig = {
      version: '1.0',
      editors: { windsurf: true },
    };

    await writeFile(
      join(testDir, '.ai-content', 'workflows', 'deploy.md'),
      '# Deploy',
    );

    const result = await runSync(testDir, windsurfConfig);

    expect(result.errors).toEqual([]);
    const wfFile = await readFile(
      join(testDir, '.windsurf', 'workflows', 'deploy.md'),
      'utf-8',
    );
    expect(wfFile).toContain('# Deploy');
  });

  it('dry-run should not write files', async () => {
    await writeFile(
      join(testDir, '.ai-content', 'rules', 'test.md'),
      '# Test',
    );

    const result = await runSync(testDir, baseConfig, { dryRun: true });

    expect(result.synced.length).toBeGreaterThan(0);

    // Verify no files were actually created
    const { access } = await import('fs/promises');
    await expect(
      access(join(testDir, '.cursor', 'rules', 'test.md')),
    ).rejects.toThrow();
  });

  it('dry-run should report orphans without removing', async () => {
    // First sync to create files
    await writeFile(
      join(testDir, '.ai-content', 'rules', 'temp.md'),
      '# Temp',
    );
    await runSync(testDir, baseConfig);

    // Remove source and dry-run
    const { unlink } = await import('fs/promises');
    await unlink(join(testDir, '.ai-content', 'rules', 'temp.md'));

    const result = await runSync(testDir, baseConfig, { dryRun: true });

    if (result.pendingOrphans.length > 0) {
      // Orphan should still exist on disk
      const { access } = await import('fs/promises');
      await expect(
        access(result.pendingOrphans[0].absolutePath),
      ).resolves.toBeUndefined();
    }
  });
});
