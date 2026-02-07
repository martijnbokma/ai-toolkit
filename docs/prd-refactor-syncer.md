# R-PRD: Refactor `src/sync/syncer.ts`

## 1. Overview & Rationale

`syncer.ts` is het hart van ai-toolkit — het orkestreert het volledige sync-proces. Met **490 regels** en **8 functies** is het een god-file geworden dat meerdere verantwoordelijkheden combineert:

- Sync-orchestratie (de `runSync` flow)
- Content distributie naar editors
- Override-syncing
- Entry point generatie
- MCP config generatie
- SSOT orphan-detectie
- SSOT diff-detectie
- Auto-promote van content

Dit maakt het bestand moeilijk te testen, te begrijpen en uit te breiden.

## 2. Principle Analysis

### DRY Check
- De `categories` array (`[SKILLS_DIR, WORKFLOWS_DIR, RULES_DIR]`) wordt **3x herhaald** in `detectSsotOrphans`, `detectSsotDiffs`, en `autoPromoteContent`.
- Het merge-patroon voor external + local content (regels 96-148) herhaalt dezelfde logica voor rules, skills, en workflows.

### SSOT Check
- ✅ Types zijn gedefinieerd in `core/types.ts`
- ✅ Constanten zijn gecentraliseerd
- ⚠️ De `categories` array is een lokale SSOT-schending (3x gedefinieerd)

### Modularity Check
- ❌ **Schending**: SSOT-detectie (orphans/diffs) is sync-gerelateerd maar conceptueel een aparte analyse-stap
- ❌ **Schending**: MCP config generatie is een output-concern, geen sync-concern
- ❌ **Schending**: Entry point generatie is een output-concern
- ❌ **Schending**: Auto-promote is een content-management concern

### Architecture Check
- De `runSync` functie is zowel orchestrator als implementator — het zou alleen moeten delegeren

## 3. Refactoring Goals

1. **Extract SSOT-detectie** naar `sync/ssot-detector.ts` (`detectSsotOrphans`, `detectSsotDiffs`)
2. **Extract auto-promote** naar `sync/auto-promoter.ts` (`autoPromoteContent`)
3. **Extract MCP config generatie** naar `sync/mcp-generator.ts` (`generateMCPConfigs`)
4. **Extract entry point generatie** naar `sync/entry-points.ts` (`generateEntryPoints`)
5. **DRY de categories array** — definieer eenmalig en hergebruik
6. **DRY het content-merge patroon** — extract naar een helper
7. **Reduceer `syncer.ts`** tot een pure orchestrator (~100-150 regels)

## 4. Impact Analysis

### Affected Components/Modules
- `src/sync/syncer.ts` — hoofdbestand, wordt gesplitst
- `src/sync/monorepo.ts` — importeert `runSync`, geen wijziging nodig
- `src/cli/sync.ts` — importeert `runSync`, geen wijziging nodig
- `tests/sync/syncer.test.ts` — moet mogelijk imports updaten

### Dependencies
- `runSync` wordt aangeroepen door: `cli/sync.ts`, `sync/monorepo.ts`, `cli/watch.ts`
- Alleen de publieke API (`runSync`) moet stabiel blijven

### Location Decision
- Alle nieuwe bestanden blijven in `src/sync/` — ze zijn sync-gerelateerd

## 5. Proposed Changes & Rationale

### Structural Changes

| Actie | Van | Naar | Waarom |
|-------|-----|------|--------|
| Extract | `syncer.ts:322-410` | `sync/ssot-detector.ts` | Aparte analyse-verantwoordelijkheid |
| Extract | `syncer.ts:412-447` | `sync/auto-promoter.ts` | Content-management concern |
| Extract | `syncer.ts:449-489` | `sync/mcp-generator.ts` | Output-concern |
| Extract | `syncer.ts:289-319` | `sync/entry-points.ts` | Output-concern |

### DRY Improvements

- **Categories constant**: Definieer `CONTENT_CATEGORIES` in `core/types.ts`:
  ```typescript
  export const CONTENT_CATEGORIES = [
    { dir: SKILLS_DIR, name: 'skills' as const },
    { dir: WORKFLOWS_DIR, name: 'workflows' as const },
    { dir: RULES_DIR, name: 'rules' as const },
  ];
  ```
- **Content merge helper**: Extract het herhaalde external+local merge patroon naar een `mergeContentFiles(external, local)` functie in `syncer.ts`

### Logic Refactoring

- `runSync` wordt een orchestrator die stappen delegeert:
  ```typescript
  export async function runSync(...): Promise<SyncResult> {
    ensureEditorDirs(...)
    resolveExternalContent(...)
    autoPromoteIfNeeded(...)
    syncAllContent(...)
    syncOverrides(...)
    generateEntryPoints(...)
    generateMCPConfigs(...)
    syncEditorSettings(...)
    cleanupOrphans(...)
    updateGitignore(...)
    detectSsotIssues(...)
  }
  ```

## 6. Non-Goals

- Geen functionele wijzigingen aan het sync-gedrag
- Geen wijzigingen aan de publieke API (`runSync` signature blijft gelijk)
- Geen wijzigingen aan editor adapters
- Geen nieuwe features

## 7. Technical Constraints

- Alle imports gebruiken `.js` extensies (ESM)
- Bestaande tests in `tests/sync/syncer.test.ts` moeten blijven slagen
- De `SyncResult` interface wijzigt niet

## 8. Verification & Quality Checklist

- [ ] Typecheck passes (`bun run build`)
- [ ] Linter passes
- [ ] Bestaande tests passing (`bun run test:run`)
- [ ] Geen nieuwe DRY violations
- [ ] SSOT maintained
- [ ] `syncer.ts` < 200 regels na refactor
- [ ] Alle extracted modules hebben duidelijke single-responsibility

## 9. Success Metrics

- **LOC reductie**: `syncer.ts` van 490 → ~150 regels
- **Nieuwe modules**: 4 gefocuste bestanden (ssot-detector, auto-promoter, mcp-generator, entry-points)
- **DRY**: Categories array van 3x → 1x gedefinieerd
- **Zero regressions**: Alle bestaande tests slagen
