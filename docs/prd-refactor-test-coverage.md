# R-PRD: Test Coverage Uitbreiden

## 1. Overview & Rationale

Het ai-toolkit project heeft **34 bronbestanden** maar slechts **3 testbestanden** — een dekking van 8.8%. Kritieke modules zoals `content-resolver.ts`, `promote.ts`, alle CLI-commando's, en alle individuele editor adapters hebben **geen tests**.

Dit maakt het project kwetsbaar voor regressies, vooral bij de refactors uit R-PRD #1-#4. Tests moeten eerst worden toegevoegd voordat de refactors veilig kunnen worden uitgevoerd.

## 2. Principle Analysis

### DRY Check
- ✅ Bestaande tests zijn goed gestructureerd zonder duplicatie
- ⚠️ Test setup (temp directories, mock configs) kan worden gedeeld via test utilities

### SSOT Check
- ✅ Tests gebruiken de juiste types uit `core/types.ts`
- ⚠️ Mock config objecten worden inline gedefinieerd — overweeg een `tests/fixtures/` map

### Modularity Check
- ✅ Tests volgen de bronstructuur (`tests/core/`, `tests/editors/`, `tests/sync/`)
- ⚠️ Geen test utilities of shared fixtures

### Architecture Check
- ✅ Tests zijn correct gescheiden van broncode
- ⚠️ CLI-tests vereisen een andere aanpak (integration tests vs unit tests)

## 3. Refactoring Goals

1. **Prioriteit 1 — Kritieke paden**: Tests voor `content-resolver.ts` en `promote.ts` (complexe pad-logica, bug-gevoelig)
2. **Prioriteit 2 — Sync modules**: Tests voor `settings-syncer.ts`, `cleanup.ts`, `gitignore.ts`, `monorepo.ts`
3. **Prioriteit 3 — CLI commando's**: Integration tests voor `init`, `sync`, `validate`
4. **Prioriteit 4 — Utilities**: Tests voor `file-ops.ts` en `logger.ts`
5. **Test infrastructure**: Shared fixtures en test utilities

## 4. Impact Analysis

### Affected Components/Modules
- `tests/` — nieuwe testbestanden
- `tests/fixtures/` — nieuw, gedeelde test data
- `package.json` — mogelijk test scripts toevoegen

### Dependencies
- Vitest is al geconfigureerd (`vitest.config.ts`)
- Geen nieuwe dependencies nodig

### Location Decision
- Tests volgen de bestaande conventie: `tests/{module}/{file}.test.ts`

## 5. Proposed Changes & Rationale

### Nieuwe Test Bestanden (Prioriteit 1 & 2)

| Bestand | Test Focus | Prioriteit |
|---------|-----------|------------|
| `tests/sync/content-resolver.test.ts` | Pad-resolutie (local, package), content merging, edge cases | P1 |
| `tests/cli/promote.test.ts` | Pad-resolutie (3 branches), force mode, error handling | P1 |
| `tests/sync/monorepo.test.ts` | `mergeResults` completeness, `findSubProjects` scanning | P2 |
| `tests/sync/settings-syncer.test.ts` | EditorConfig generatie, VSCode settings merge | P2 |
| `tests/sync/cleanup.test.ts` | Orphan detection en removal | P2 |
| `tests/sync/gitignore.test.ts` | .gitignore update logica | P2 |

### Test Infrastructure

```
tests/
├── fixtures/
│   ├── mock-config.ts        # Gedeelde ToolkitConfig factories
│   └── temp-project.ts       # Helper voor temp project directories
├── core/
│   └── config-loader.test.ts # (bestaand)
├── editors/
│   └── registry.test.ts      # (bestaand)
├── sync/
│   ├── syncer.test.ts         # (bestaand)
│   ├── content-resolver.test.ts # (nieuw)
│   ├── monorepo.test.ts       # (nieuw)
│   ├── settings-syncer.test.ts # (nieuw)
│   ├── cleanup.test.ts        # (nieuw)
│   └── gitignore.test.ts      # (nieuw)
└── cli/
    └── promote.test.ts        # (nieuw)
```

### Voorbeeld Test Cases

**`content-resolver.test.ts`**:
- Resolves local path correctly (relative)
- Resolves local path correctly (absolute)
- Returns null for non-existent path
- Finds `.ai-content/` subdirectory
- Finds `templates/` subdirectory
- Filters by `include` categories
- Handles package source type

**`promote.test.ts`**:
- Resolves `.ai-content/` prefixed path
- Resolves absolute path
- Resolves relative path
- Detects content type from path (skills, workflows, rules)
- Returns null for unknown content type
- Skips existing files without --force
- Overwrites existing files with --force

**`monorepo.test.ts`**:
- Merges all SyncResult fields including ssotOrphans and ssotDiffs
- Finds sub-projects up to 3 levels deep
- Ignores node_modules and .git directories
- Handles missing root config gracefully

### Shared Fixtures

```typescript
// tests/fixtures/mock-config.ts
import type { ToolkitConfig } from '../../src/core/types.js';

export function createMockConfig(overrides?: Partial<ToolkitConfig>): ToolkitConfig {
  return {
    version: '1.0',
    editors: { cursor: true, windsurf: true },
    ...overrides,
  };
}
```

```typescript
// tests/fixtures/temp-project.ts
import { mkdtemp, rm } from 'fs/promises';
import { join, tmpdir } from 'path';

export async function createTempProject(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'ai-toolkit-test-'));
  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
```

## 6. Non-Goals

- Geen 100% code coverage — focus op kritieke paden
- Geen E2E tests voor de volledige CLI (te complex voor nu)
- Geen performance tests
- Geen snapshot tests voor gegenereerde content

## 7. Technical Constraints

- Vitest is al geconfigureerd
- Tests moeten werken met `bun run test:run`
- File system tests moeten temp directories gebruiken en opruimen
- Geen mocking van `process.exit` — test de logica, niet de CLI wrapper

## 8. Verification & Quality Checklist

- [ ] Alle nieuwe tests passing (`bun run test:run`)
- [ ] Bestaande tests blijven passing
- [ ] Geen flaky tests (temp dirs worden opgeruimd)
- [ ] Test coverage voor kritieke pad-resolutie logica
- [ ] Test coverage voor `mergeResults` bug (R-PRD #4)

## 9. Success Metrics

- **Test bestanden**: Van 3 → 9+
- **Test coverage**: Van 8.8% → ~40% van modules
- **Kritieke paden**: 100% van pad-resolutie logica getest
- **Refactor-ready**: Voldoende tests om R-PRD #1-#4 veilig uit te voeren
