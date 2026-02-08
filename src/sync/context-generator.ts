import type { ProjectAnalysis } from './analyzers/index.js';
import type { DirectoryNode } from './analyzers/structure-analyzer.js';

export function generateRichProjectContext(analysis: ProjectAnalysis): string {
  const sections: string[] = [];

  sections.push(generateHeader(analysis));
  sections.push(generateOverview(analysis));
  sections.push(generateTechStack(analysis));
  sections.push(generateArchitecture(analysis));
  sections.push(generateProjectStructure(analysis));
  sections.push(generateCodeConventions(analysis));
  sections.push(generateKeyPatterns(analysis));

  if (analysis.database) {
    sections.push(generateDatabaseSection(analysis));
  }

  sections.push(generateDevelopment(analysis));

  if (analysis.architecture.patterns.hasTestFiles) {
    sections.push(generateTesting(analysis));
  }

  sections.push(generateImportantFiles(analysis));
  sections.push(generateAIAgentNotes(analysis));

  return sections.filter(Boolean).join('\n\n---\n\n') + '\n';
}

function generateHeader(analysis: ProjectAnalysis): string {
  const name = analysis.projectName || 'Project';
  const lines = [
    `# ${name} - Project Context`,
    '',
    `> **Auto-generated** by ai-toolkit \`generate-context\`. Edit freely — this file is yours.`,
  ];

  if (analysis.description) {
    lines.push('', `> ${analysis.description}`);
  }

  return lines.join('\n');
}

function generateOverview(analysis: ProjectAnalysis): string {
  const lines = ['## Overview'];
  const { techStack, architecture } = analysis;

  const parts: string[] = [];
  if (techStack.framework) parts.push(`**${techStack.framework}**`);
  if (techStack.language) parts.push(`${techStack.language}`);
  if (techStack.database) parts.push(`with **${techStack.database}**`);

  if (parts.length > 0) {
    lines.push('', `${analysis.projectName || 'This project'} is a ${parts.join(' ')} application.`);
  }

  const appType: string[] = [];
  if (techStack.framework) appType.push(`- **Framework**: ${techStack.framework}`);
  if (techStack.language) appType.push(`- **Language**: ${techStack.language}`);
  if (techStack.database) appType.push(`- **Database**: ${techStack.database}`);
  if (techStack.buildTool) appType.push(`- **Build Tool**: ${techStack.buildTool}`);
  if (techStack.runtime) appType.push(`- **Runtime**: ${techStack.runtime}`);

  if (appType.length > 0) {
    lines.push('', '### Application Type', '', ...appType);
  }

  if (architecture.features.length > 0) {
    lines.push('', '### Detected Features', '');
    for (const feature of architecture.features) {
      const featureParts = [`- **${feature.name}**`];
      if (feature.subdirs.length > 0) {
        featureParts.push(`(${feature.subdirs.join(', ')})`);
      }
      lines.push(featureParts.join(' '));
    }
  }

  return lines.join('\n');
}

function generateTechStack(analysis: ProjectAnalysis): string {
  const lines = ['## Technology Stack'];
  const { techStack, packageInfo } = analysis;

  if (packageInfo) {
    const coreDeps: Record<string, string> = {};
    const allDeps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };

    const importantPrefixes = [
      'react', 'react-dom', 'react-router', 'vue', 'next', 'nuxt', 'svelte',
      '@angular/core', '@supabase/supabase-js', 'prisma', 'drizzle',
    ];

    for (const prefix of importantPrefixes) {
      if (allDeps[prefix]) {
        coreDeps[prefix] = allDeps[prefix];
      }
    }

    if (Object.keys(coreDeps).length > 0) {
      lines.push('', '### Core Dependencies', '', '```json', JSON.stringify(coreDeps, null, 2), '```');
    }
  }

  const devTools: string[] = [];
  if (techStack.buildTool) devTools.push(`- **Build Tool**: ${techStack.buildTool}${getVersion(packageInfo, techStack.buildTool.toLowerCase())}`);
  if (techStack.language === 'TypeScript') devTools.push(`- **TypeScript**:${getVersion(packageInfo, 'typescript') || ' strict mode'}`);
  if (techStack.testing.length > 0) devTools.push(`- **Testing**: ${techStack.testing.join(' + ')}`);
  if (techStack.styling.length > 0) devTools.push(`- **Styling**: ${techStack.styling.join(', ')}`);
  if (techStack.uiLibrary) devTools.push(`- **UI Library**: ${techStack.uiLibrary}`);
  if (techStack.linting.length > 0) devTools.push(`- **Linting**: ${techStack.linting.join(', ')}`);
  if (techStack.runtime) devTools.push(`- **Package Manager**: ${techStack.runtime}`);

  if (devTools.length > 0) {
    lines.push('', '### Development Tools', '', ...devTools);
  }

  const infra: string[] = [];
  if (techStack.database) infra.push(`- **Database**: ${techStack.database}`);
  if (techStack.auth.length > 0) infra.push(`- **Authentication**: ${techStack.auth.join(', ')}`);
  if (techStack.stateManagement) infra.push(`- **State Management**: ${techStack.stateManagement}`);

  if (infra.length > 0) {
    lines.push('', '### Infrastructure', '', ...infra);
  }

  return lines.join('\n');
}

function generateArchitecture(analysis: ProjectAnalysis): string {
  const lines = ['## Architecture Patterns'];
  const { architecture } = analysis;

  if (architecture.isFeatureBased) {
    lines.push('', '### Feature-Based Architecture', '');
    lines.push('The project follows a **feature-based architecture** where related code is co-located by domain feature:');
    lines.push('', '```');

    const featureExample = architecture.features[0];
    if (featureExample) {
      lines.push(`src/features/{feature}/`);
      if (architecture.patterns.hasModularBoundaries) {
        lines.push(`  ├── index.ts          # Public API - exports for external consumers`);
      }
      for (const subdir of featureExample.subdirs) {
        const purpose = getSubdirPurpose(subdir);
        lines.push(`  ├── ${subdir}/            # ${purpose}`);
      }
    }
    lines.push('```');

    if (architecture.patterns.hasModularBoundaries) {
      lines.push('', '### Modular Feature Boundaries', '');
      lines.push('Features expose a **public API** via an `index.ts` file. Consumers import only from this public API, not from internal folders.');
      lines.push('', '```typescript');
      lines.push('// ✅ CORRECT: Import from feature index');
      lines.push('import { ... } from "../features/{feature}";');
      lines.push('');
      lines.push('// ❌ WRONG: Deep imports into feature internals');
      lines.push('import { ... } from "../features/{feature}/hooks/useHook";');
      lines.push('```');
    }
  }

  if (architecture.hasSharedDir) {
    lines.push('', '### Shared Code Organization', '');
    lines.push('Cross-cutting concerns are organized in `src/shared/`:');
    lines.push('', '```');
    lines.push('src/shared/');
    for (const subdir of architecture.sharedSubdirs) {
      const purpose = getSubdirPurpose(subdir);
      lines.push(`  ├── ${subdir}/     # ${purpose}`);
    }
    lines.push('```');
  }

  if (architecture.patterns.hasServiceLayer || architecture.patterns.hasHookLayer) {
    lines.push('', '### Separation of Concerns', '');
    let n = 1;
    if (architecture.patterns.hasServiceLayer) {
      lines.push(`${n}. **Services** (\`services/\`): Handle all database operations, no UI logic`);
      n++;
    }
    if (architecture.patterns.hasHookLayer) {
      lines.push(`${n}. **Hooks** (\`hooks/\`): Manage state, data fetching, and business logic`);
      n++;
    }
    lines.push(`${n}. **Components** (\`components/\`): UI components, receive data via props/hooks`);
    n++;
    if (architecture.patterns.hasTypeDefinitions) {
      lines.push(`${n}. **Types** (\`types/\`): TypeScript interfaces and types`);
    }
  }

  if (architecture.contexts.length > 0) {
    lines.push('', '### State Management', '');
    lines.push('- **Local State**: React `useState` and `useReducer`');
    lines.push(`- **Global State**: React Context — ${architecture.contexts.map((c) => `\`${c}\``).join(', ')}`);
    if (architecture.patterns.hasHookLayer) {
      lines.push('- **Server State**: Custom hooks for data fetching');
    }
  }

  return lines.join('\n');
}

function generateProjectStructure(analysis: ProjectAnalysis): string {
  const lines = ['## Project Structure', '', '```'];

  const tree = analysis.architecture.directoryTree;
  lines.push(`${analysis.projectName || 'project'}/`);
  lines.push(...renderTree(tree, ''));
  lines.push('```');

  return lines.join('\n');
}

function renderTree(nodes: DirectoryNode[], prefix: string): string[] {
  const lines: string[] = [];
  const filtered = nodes.filter((n) => {
    if (n.name.startsWith('.') && !['src', 'public'].includes(n.name)) return false;
    return true;
  });

  for (let i = 0; i < filtered.length; i++) {
    const node = filtered[i];
    const isLast = i === filtered.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    if (node.type === 'directory') {
      const purpose = getDirectoryPurpose(node.name);
      const suffix = purpose ? `  # ${purpose}` : '';
      lines.push(`${prefix}${connector}${node.name}/${suffix}`);
      if (node.children && node.children.length > 0) {
        lines.push(...renderTree(node.children, prefix + childPrefix));
      }
    } else {
      lines.push(`${prefix}${connector}${node.name}`);
    }
  }

  return lines;
}

function generateCodeConventions(analysis: ProjectAnalysis): string {
  const lines = ['## Code Conventions'];
  const { architecture, techStack } = analysis;

  if (techStack.language === 'TypeScript') {
    lines.push('', '### TypeScript', '');
    lines.push('- **Strict Mode**: Enabled');
    lines.push('- **Naming**: PascalCase for components/types, camelCase for functions/variables');
    lines.push('- **Exports**: Named exports preferred');
    if (architecture.patterns.hasTypeDefinitions) {
      lines.push('- **Types**: Dedicated `.types.ts` files detected');
    }
  }

  if (architecture.patterns.componentNaming !== 'mixed') {
    lines.push('', '### File Naming', '');
    lines.push(`- **Components**: ${architecture.patterns.componentNaming} (e.g., \`EventCard.tsx\`)`);
    if (architecture.patterns.hasHookLayer) {
      lines.push('- **Hooks**: camelCase with `use` prefix (e.g., `useEvents.ts`)');
    }
    if (architecture.patterns.hasServiceLayer) {
      lines.push('- **Services**: camelCase with `Service` suffix (e.g., `eventService.ts`)');
    }
    if (architecture.patterns.hasTypeDefinitions) {
      lines.push('- **Types**: camelCase with `.types.ts` suffix (e.g., `event.types.ts`)');
    }
  }

  if (architecture.patterns.hasI18n) {
    lines.push('', '### Internationalization', '');
    lines.push(`- **Languages**: ${architecture.patterns.i18nLanguages.join(', ')}`);
    lines.push('- **Location**: `src/locales/`');
  }

  return lines.join('\n');
}

function generateKeyPatterns(analysis: ProjectAnalysis): string {
  const lines = ['## Key Patterns'];
  const { architecture } = analysis;

  if (architecture.patterns.hasServiceLayer && architecture.patterns.hasHookLayer) {
    lines.push('', '### Data Fetching Pattern', '');
    lines.push('1. **Service Layer**: Pure functions that perform database queries');
    lines.push('2. **Hook Layer**: Manages state, calls services, handles loading/error states');
    lines.push('3. **Component Layer**: Uses hooks to get data and render UI');
  }

  if (analysis.techStack.auth.length > 0) {
    lines.push('', '### Authentication', '');
    lines.push(`Authentication is handled via **${analysis.techStack.auth[0]}**.`);
    if (architecture.contexts.some((c) => c.toLowerCase().includes('auth'))) {
      lines.push('An `AuthContext` provides user state throughout the app.');
    }
  }

  return lines.join('\n');
}

function generateDatabaseSection(analysis: ProjectAnalysis): string {
  const db = analysis.database!;
  const lines = ['## Database Schema'];

  lines.push('', `**Provider**: ${db.provider}`);

  if (db.hasRLS) {
    lines.push('', '**Row-Level Security (RLS)**: Enabled');
  }

  if (db.tables.length > 0) {
    lines.push('', '### Tables', '');
    for (const table of db.tables) {
      lines.push(`#### \`${table.name}\``);
      lines.push('');
      if (table.fields.length > 0) {
        lines.push(`- **Fields**: \`${table.fields.join('`, `')}\``);
      }
      if (table.hasRLS) {
        lines.push('- **RLS**: Enabled');
      }
      lines.push('');
    }
  }

  if (db.hasEdgeFunctions) {
    lines.push('### Edge Functions', '');
    for (const fn of db.edgeFunctions) {
      lines.push(`- **${fn.name}**: \`${fn.path}\``);
    }
  }

  if (db.hasMigrations) {
    lines.push('', '### Migrations', '');
    lines.push(`Total: ${db.migrations.length} migration(s)`);
    if (db.migrations.length > 0) {
      lines.push('');
      const toShow = db.migrations.length <= 6
        ? db.migrations
        : [...db.migrations.slice(0, 3), null, ...db.migrations.slice(-2)];

      for (const m of toShow) {
        if (m === null) {
          lines.push('- ...');
        } else {
          lines.push(`- \`${m.filename}\`: ${m.description}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function generateDevelopment(analysis: ProjectAnalysis): string {
  const lines = ['## Development'];
  const { scripts } = analysis;

  if (scripts) {
    lines.push('', '### Commands', '');
    if (scripts.dev) lines.push(`- **Dev**: \`${scripts.dev}\``);
    if (scripts.build) lines.push(`- **Build**: \`${scripts.build}\``);
    if (scripts.test) lines.push(`- **Test**: \`${scripts.test}\``);
    if (scripts.lint) lines.push(`- **Lint**: \`${scripts.lint}\``);
    if (scripts.typecheck) lines.push(`- **Typecheck**: \`${scripts.typecheck}\``);
  }

  if (analysis.dependencies?.keyDeps && analysis.dependencies.keyDeps.length > 0) {
    lines.push('', '### Key Dependencies', '');
    lines.push('| Dependency | Version | Purpose |');
    lines.push('|------------|---------|---------|');
    for (const dep of analysis.dependencies.keyDeps) {
      lines.push(`| ${dep.name} | ${dep.version} | ${dep.purpose} |`);
    }
  }

  return lines.join('\n');
}

function generateTesting(analysis: ProjectAnalysis): string {
  const lines = ['## Testing'];
  const { architecture, techStack } = analysis;

  if (techStack.testing.length > 0) {
    lines.push('', `**Framework**: ${techStack.testing.join(' + ')}`);
  }

  lines.push('', `**Test Pattern**: ${architecture.patterns.testPattern === 'colocated'
    ? 'Tests are co-located with source files in `__tests__/` directories'
    : 'Tests are in a separate test directory'}`);

  return lines.join('\n');
}

function generateImportantFiles(analysis: ProjectAnalysis): string {
  const lines = ['## Important Files'];
  const { architecture } = analysis;

  if (architecture.configFiles.length > 0) {
    lines.push('', '### Configuration', '');
    for (const file of architecture.configFiles) {
      lines.push(`- **\`${file}\`**`);
    }
  }

  if (architecture.entryPoints.length > 0) {
    lines.push('', '### Entry Points', '');
    for (const entry of architecture.entryPoints) {
      lines.push(`- **\`${architecture.srcDir}/${entry}\`**`);
    }
  }

  if (architecture.contexts.length > 0) {
    lines.push('', '### Contexts', '');
    for (const ctx of architecture.contexts) {
      lines.push(`- **\`${architecture.srcDir}/contexts/${ctx}.tsx\`**`);
    }
  }

  return lines.join('\n');
}

function generateAIAgentNotes(analysis: ProjectAnalysis): string {
  const lines = ['## Notes for AI Agents', ''];
  const { architecture } = analysis;

  let n = 1;
  lines.push(`${n++}. **Always read existing code first** before making changes`);

  if (architecture.isFeatureBased) {
    lines.push(`${n++}. **Follow the feature-based architecture** for new code`);
  }

  if (analysis.techStack.language === 'TypeScript') {
    lines.push(`${n++}. **Maintain type safety** — no \`any\` types without justification`);
  }

  if (architecture.patterns.hasTestFiles) {
    lines.push(`${n++}. **Write tests** for new functionality`);
  }

  if (architecture.patterns.hasModularBoundaries) {
    lines.push(`${n++}. **Import from feature index** — never deep-import into feature internals`);
  }

  lines.push(`${n++}. **Use existing patterns** — consistency is key`);
  lines.push(`${n++}. **Update this document** if you introduce significant architectural changes`);

  lines.push('', '---', '', '**End of Project Context**');

  return lines.join('\n');
}

// ============================================
// Helpers
// ============================================

function getVersion(packageInfo: ProjectAnalysis['packageInfo'], depName: string): string {
  if (!packageInfo) return '';
  const allDeps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
  const version = allDeps[depName];
  return version ? ` ${version}` : '';
}

function getSubdirPurpose(name: string): string {
  const purposes: Record<string, string> = {
    hooks: 'Custom React hooks',
    services: 'Data access layer',
    components: 'UI components',
    types: 'TypeScript types',
    utils: 'Utility functions',
    constants: 'Constants',
    styles: 'Styles',
    tests: 'Tests',
    __tests__: 'Tests',
  };
  return purposes[name] || name;
}

function getDirectoryPurpose(name: string): string {
  const purposes: Record<string, string> = {
    src: 'Source code',
    public: 'Static assets',
    docs: 'Documentation',
    scripts: 'Utility scripts',
    supabase: 'Supabase config & migrations',
    prisma: 'Prisma schema & migrations',
    e2e: 'End-to-end tests',
    deploy: 'Deployment configuration',
    marketing: 'Marketing website',
  };
  return purposes[name] || '';
}
