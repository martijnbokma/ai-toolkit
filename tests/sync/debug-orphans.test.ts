import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, symlink, realpath } from 'fs/promises';
import { tmpdir } from 'os';
import { runSync } from '../../src/sync/syncer.js';
import { loadConfig } from '../../src/core/config-loader.js';
import type { ToolkitConfig } from '../../src/core/types.js';

describe('Debug orphan detection', () => {
  let testDir: string;
  let realTestDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'ai-toolkit-debug-'));
    realTestDir = await realpath(testDir);
  });

  afterEach(async () => {
    await rm(realTestDir, { recursive: true, force: true });
  });

  it('should NOT flag synced skills as orphans', async () => {
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

  it('should NOT flag synced skills as orphans when projectRoot is a symlink (macOS /tmp)', async () => {
    // On macOS, /tmp is a symlink to /private/tmp
    // This test simulates a user whose cwd returns a symlinked path
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');
    await writeFile(join(skillsDir, 'api-designer.md'), '# API Designer\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    // Use the symlinked path (testDir uses /tmp which is symlink to /private/tmp on macOS)
    console.log('testDir (possibly symlinked):', testDir);
    console.log('realTestDir:', realTestDir);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    console.log('SYNCED:', result.synced);
    console.log('ORPHANS:', result.pendingOrphans.map(o => ({ rel: o.relativePath, abs: o.absolutePath })));

    // Check if any synced path uses realpath while orphan check uses symlinked path
    if (result.pendingOrphans.length > 0) {
      console.log('MISMATCH DETECTED!');
      console.log('First synced path prefix:', result.synced[0]?.substring(0, 30));
      console.log('First orphan abs prefix:', result.pendingOrphans[0]?.absolutePath.substring(0, 30));
    }

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag synced skills as orphans with content_sources', async () => {
    const sharedDir = join(testDir, 'shared-rules');
    const sharedSkillsDir = join(sharedDir, 'skills');
    await mkdir(sharedSkillsDir, { recursive: true });
    await writeFile(join(sharedSkillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nShared content.');
    await writeFile(join(sharedSkillsDir, 'api-designer.md'), '# API Designer\nShared content.');

    const sharedRulesDir = join(sharedDir, 'rules');
    await mkdir(sharedRulesDir, { recursive: true });
    await writeFile(join(sharedRulesDir, 'project-conventions.md'), '# Project Conventions\nShared content.');

    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:
  cursor: true
content_sources:
  - type: local
    path: ./shared-rules
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    console.log('SYNCED:', result.synced);
    console.log('ORPHANS:', result.pendingOrphans.map(o => ({ rel: o.relativePath, abs: o.absolutePath })));

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag synced skills as orphans with symlinked content_sources path', async () => {
    // Create the actual shared dir
    const actualSharedDir = join(realTestDir, 'actual-shared');
    const sharedSkillsDir = join(actualSharedDir, 'skills');
    await mkdir(sharedSkillsDir, { recursive: true });
    await writeFile(join(sharedSkillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nShared.');
    await writeFile(join(sharedSkillsDir, 'api-designer.md'), '# API Designer\nShared.');

    // Create a symlink to the shared dir
    const symlinkPath = join(testDir, 'shared-link');
    await symlink(actualSharedDir, symlinkPath);

    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:
  cursor: true
content_sources:
  - type: local
    path: ./shared-link
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    console.log('SYNCED:', result.synced);
    console.log('ORPHANS:', result.pendingOrphans.map(o => ({ rel: o.relativePath, abs: o.absolutePath })));

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag skills in subdirectories as orphans', async () => {
    const specialistsDir = join(testDir, '.ai-content', 'skills', 'specialists');
    await mkdir(specialistsDir, { recursive: true });
    await writeFile(join(specialistsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');
    await writeFile(join(specialistsDir, 'api-designer.md'), '# API Designer\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag skills as orphans with multiple editors', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:
  cursor: true
  claude: true
  windsurf: true
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag skills as orphans with ALL default editors (no editors key)', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');
    await writeFile(join(skillsDir, 'api-designer.md'), '# API Designer\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    // No editors key — all built-in adapters enabled
    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"
metadata:
  name: test-project
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    console.log('SYNCED count:', result.synced.length);
    console.log('ORPHANS count:', result.pendingOrphans.length);
    if (result.pendingOrphans.length > 0) {
      console.log('FIRST ORPHAN:', result.pendingOrphans[0]);
      // Find if the orphan's absolutePath is in synced
      const orphanAbs = result.pendingOrphans[0].absolutePath;
      const inSynced = result.synced.includes(orphanAbs);
      console.log('Orphan abs in synced?', inSynced);
      // Find closest match
      const closest = result.synced.find(s => s.includes(result.pendingOrphans[0].relativePath.split('/').pop()!));
      console.log('Closest synced match:', closest);
    }

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag files as orphans on second sync', async () => {
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility Specialist\nContent.');
    await writeFile(join(skillsDir, 'api-designer.md'), '# API Designer\nContent.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project-conventions.md'), '# Project Conventions\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), 'editors:\n  cursor: true\n');

    const config = await loadConfig(testDir);

    // First sync
    const result1 = await runSync(testDir, config);
    expect(result1.pendingOrphans).toEqual([]);

    // Second sync (files already exist from first sync)
    const result2 = await runSync(testDir, config);
    console.log('Second sync ORPHANS:', result2.pendingOrphans.length);
    if (result2.pendingOrphans.length > 0) {
      console.log('ORPHAN:', result2.pendingOrphans[0]);
    }

    expect(result2.pendingOrphans).toEqual([]);
  });

  it('should NOT flag files as orphans with content_sources pointing to ai-toolkit repo', async () => {
    // Reproduce exact user scenario: content_sources points to the actual ai-toolkit repo
    // which has BOTH .ai-content/ AND templates/ directories.
    // resolveSourcePath checks .ai-content/ first, so it uses that.
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });

    // Create a "shared" repo that has BOTH .ai-content/ and templates/
    // (like the real ai-toolkit repo)
    const sharedRepo = join(testDir, 'shared-repo');

    // .ai-content/ (checked first by resolveSourcePath)
    const aiContentSkills = join(sharedRepo, '.ai-content', 'skills');
    const aiContentSpecialists = join(aiContentSkills, 'specialists');
    const aiContentRules = join(sharedRepo, '.ai-content', 'rules');
    const aiContentWorkflows = join(sharedRepo, '.ai-content', 'workflows');
    await mkdir(aiContentSpecialists, { recursive: true });
    await mkdir(aiContentRules, { recursive: true });
    await mkdir(aiContentWorkflows, { recursive: true });

    // templates/ (also exists but should NOT be used since .ai-content/ is found first)
    const templatesSkills = join(sharedRepo, 'templates', 'skills');
    const templatesSpecialists = join(templatesSkills, 'specialists');
    const templatesRules = join(sharedRepo, 'templates', 'rules');
    const templatesWorkflows = join(sharedRepo, 'templates', 'workflows');
    await mkdir(templatesSpecialists, { recursive: true });
    await mkdir(templatesRules, { recursive: true });
    await mkdir(templatesWorkflows, { recursive: true });

    // Populate .ai-content/
    const skillNames = [
      'accessibility-specialist', 'api-designer', 'backend-developer',
      'code-review', 'debug-assistant', 'finding-refactor-candidates',
      'frontend-developer', 'incremental-development',
    ];
    for (const name of skillNames) {
      await writeFile(join(aiContentSkills, `${name}.md`), `# ${name}\nSkill content.`);
    }
    const specialistNames = ['database-specialist', 'security-specialist'];
    for (const name of specialistNames) {
      await writeFile(join(aiContentSpecialists, `${name}.md`), `# ${name}\nSpecialist.`);
    }
    await writeFile(join(aiContentRules, 'project-conventions.md'), '# Project Conventions\nRule.');
    await writeFile(join(aiContentWorkflows, 'create-prd.md'), '# Create PRD\nWorkflow.');
    await writeFile(join(aiContentWorkflows, 'implementation-loop.md'), '# Impl Loop\nWorkflow.');

    // Populate templates/ with same files (like real ai-toolkit)
    for (const name of skillNames) {
      await writeFile(join(templatesSkills, `${name}.md`), `# ${name}\nTemplate skill.`);
    }
    for (const name of specialistNames) {
      await writeFile(join(templatesSpecialists, `${name}.md`), `# ${name}\nTemplate specialist.`);
    }
    await writeFile(join(templatesRules, 'project-conventions.md'), '# Project Conventions\nTemplate.');
    await writeFile(join(templatesWorkflows, 'create-prd.md'), '# Create PRD\nTemplate.');
    await writeFile(join(templatesWorkflows, 'implementation-loop.md'), '# Impl Loop\nTemplate.');

    // Config matching user's setup
    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"
metadata:
  name: planpals
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

    console.log('SYNCED count:', result.synced.length);
    console.log('ORPHANS count:', result.pendingOrphans.length);
    if (result.pendingOrphans.length > 0) {
      for (const o of result.pendingOrphans.slice(0, 5)) {
        console.log('ORPHAN:', o.relativePath);
        console.log('  abs:', o.absolutePath);
        const inSynced = result.synced.includes(o.absolutePath);
        console.log('  In synced?', inSynced);
        const filename = o.relativePath.split('/').pop()!;
        const matches = result.synced.filter(s => s.includes(filename));
        console.log('  Synced matches for filename:', matches);
      }
    }

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag files as orphans with actual ai-toolkit as content_source', async () => {
    // Use the REAL ai-toolkit repo as content source (exactly what user does)
    const aiToolkitPath = join(__dirname, '..', '..');

    await mkdir(join(testDir, '.ai-content'), { recursive: true });

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"
metadata:
  name: planpals
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
    path: ${aiToolkitPath}
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    console.log('SYNCED count:', result.synced.length);
    console.log('ORPHANS count:', result.pendingOrphans.length);
    if (result.pendingOrphans.length > 0) {
      for (const o of result.pendingOrphans.slice(0, 5)) {
        console.log('ORPHAN:', o.relativePath);
        console.log('  abs:', o.absolutePath);
        const inSynced = result.synced.includes(o.absolutePath);
        console.log('  In synced?', inSynced);
        const filename = o.relativePath.split('/').pop()!;
        const matches = result.synced.filter(s => s.includes(filename));
        console.log('  Synced matches for filename:', matches.length > 0 ? matches[0] : 'NONE');
      }
    }

    expect(result.pendingOrphans).toEqual([]);
  });

  it('should NOT flag files as orphans when auto-promote copies to SSOT', async () => {
    // Scenario: user has local skills AND content_sources.
    // auto-promote copies local skills to SSOT.
    // Then the sync should still work correctly.
    const aiToolkitPath = join(__dirname, '..', '..');

    // Create local skills that will be auto-promoted
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'my-custom-skill.md'), '# My Custom Skill\nLocal content.');

    const rulesDir = join(testDir, '.ai-content', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'my-rule.md'), '# My Rule\nLocal rule.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `version: "1.0"
metadata:
  name: planpals
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
    path: ${aiToolkitPath}
`);

    const config = await loadConfig(testDir);

    // First sync — auto-promote will try to copy local skills to SSOT
    const result1 = await runSync(testDir, config);
    console.log('First sync - SYNCED:', result1.synced.length, 'ORPHANS:', result1.pendingOrphans.length);

    // Second sync — files already exist
    const result2 = await runSync(testDir, config);
    console.log('Second sync - SYNCED:', result2.synced.length, 'ORPHANS:', result2.pendingOrphans.length);
    if (result2.pendingOrphans.length > 0) {
      for (const o of result2.pendingOrphans.slice(0, 3)) {
        console.log('ORPHAN:', o.relativePath, '| abs:', o.absolutePath);
        console.log('  In synced?', result2.synced.includes(o.absolutePath));
      }
    }

    expect(result2.pendingOrphans).toEqual([]);
  });

  it('should NOT flag files as orphans with Trae subdirectory naming', async () => {
    // Trae uses subdirectory naming: skills go to .trae/skills/<name>/SKILL.md
    // This is a different path structure than flat naming
    const skillsDir = join(testDir, '.ai-content', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await writeFile(join(skillsDir, 'accessibility-specialist.md'), '# Accessibility\nContent.');
    await writeFile(join(skillsDir, 'api-designer.md'), '# API Designer\nContent.');

    await writeFile(join(testDir, 'ai-toolkit.yaml'), `editors:
  trae: true
`);

    const config = await loadConfig(testDir);
    const result = await runSync(testDir, config);

    console.log('Trae SYNCED:', result.synced);
    console.log('Trae ORPHANS:', result.pendingOrphans.length);
    if (result.pendingOrphans.length > 0) {
      for (const o of result.pendingOrphans) {
        console.log('ORPHAN:', o.relativePath, '| abs:', o.absolutePath);
        console.log('  In synced?', result.synced.includes(o.absolutePath));
      }
    }

    expect(result.pendingOrphans).toEqual([]);
  });
});
