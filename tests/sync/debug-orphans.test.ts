import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, symlink, realpath } from 'fs/promises';
import { tmpdir } from 'os';
import { runSync } from '../../src/sync/syncer.js';
import { loadConfig } from '../../src/core/config-loader.js';

describe('Orphan detection regression', () => {
  let testDir: string;
  let realTestDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-orphan-'));
    realTestDir = await realpath(testDir);
  });

  afterEach(async () => {
    await rm(realTestDir, { recursive: true, force: true });
  });

  it('should not flag synced files as orphans (basic)', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');
    await writeFile(join(skillsDir, 'api-designer.md'), '# API Designer\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans with symlinked projectRoot', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans with content_sources', async () => {
    const sharedDir = join(testDir, 'shared-rules');
    const sharedSkillsDir = join(sharedDir, 'skills');
    await mkdir(sharedSkillsDir, { recursive: true });
    await writeFile(join(sharedSkillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nShared.');
    await writeFile(join(sharedSkillsDir, 'api-designer.md'), '# API Designer\nShared.');

    const sharedRulesDir = join(sharedDir, 'rules');
    await mkdir(sharedRulesDir, { recursive: true });
    await writeFile(join(sharedRulesDir, 'project-conventions.md'), '# Project Conventions\nShared.');

    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:\n  cursor: true\ncontent_sources:\n  - type: local\n    path: ./shared-rules\n`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans with symlinked content_sources', async () => {
    const actualSharedDir = join(realTestDir, 'actual-shared');
    const sharedSkillsDir = join(actualSharedDir, 'skills');
    await mkdir(sharedSkillsDir, { recursive: true });
    await writeFile(join(sharedSkillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nShared.');

    const symlinkPath = join(testDir, 'shared-link');
    await symlink(actualSharedDir, symlinkPath);

    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:\n  cursor: true\ncontent_sources:\n  - type: local\n    path: ./shared-link\n`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag skills in subdirectories as orphans', async () => {
    const specialistsDir = join(testDir, '.ai-content', 'skills', 'specialists');
    await mkdir(specialistsDir, { recursive: true });
    await writeFile(join(specialistsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');
    await writeFile(join(specialistsDir, 'api-designer.md'), '# API Designer\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans with multiple editors', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:\n  cursor: true\n  claude: true\n  windsurf: true\n`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans on second sync', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    const config = await loadConfig(testDir);

    const result1 = await runSync(testDir, config);
    expect(result1.pendingOrphans).toEqual([]);

    const result2 = await runSync(testDir, config);
    expect(result2.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans with many editors + content_sources (user scenario)', async () => {
    // Reproduces the exact user scenario: many editors + content_sources pointing
    // to a shared repo with .ai-content/ and templates/ directories
    const sharedRepo = join(testDir, 'shared-repo');

    const aiContentSkills = join(sharedRepo, '.ai-content', 'skills');
    const aiContentSpecialists = join(aiContentSkills, 'specialists');
    const aiContentRules = join(sharedRepo, '.ai-content', 'rules');
    const aiContentWorkflows = join(sharedRepo, '.ai-content', 'workflows');
    await mkdir(aiContentSpecialists, { recursive: true });
    await mkdir(aiContentRules, { recursive: true });
    await mkdir(aiContentWorkflows, { recursive: true });

    const skillNames = [
      'accessibility-specialist', 'api-designer', 'backend-developer',
      'code-review', 'debug-assistant', 'finding-refactor-candidates',
    ];
    for (const name of skillNames) {
      await writeFile(join(aiContentSkills, `${name}.md`), `# ${name}\nSkill content.`);
    }
    for (const name of ['database-specialist', 'security-specialist']) {
      await writeFile(join(aiContentSpecialists, `${name}.md`), `# ${name}\nSpecialist.`);
    }
    await writeFile(join(aiContentRules, 'project-conventions.md'), '# Project Conventions\nRule.');
    await writeFile(join(aiContentWorkflows, 'create-prd.md'), '# Create PRD\nWorkflow.');

    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"
editors:
  cursor: true
  windsurf: true
  claude: true
  kiro: true
  trae: true
  gemini: true
  copilot: true
  codex: true
  kilocode: true
  antigravity: true
content_sources:
  - type: local
    path: ./shared-repo
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should not flag synced files as orphans with Trae subdirectory naming', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility\nContent.');
    await writeFile(join(skillsDir, 'api-designer.md'), '# API Designer\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  trae: true\n');

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });
});
