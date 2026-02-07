# R-PRD: Refactor `src/cli/init.ts`

## 1. Overview & Rationale

`init.ts` (236 regels) is het initialisatie-commando van ai-toolkit. Het bevat **drie grote inline string-constanten** die het bestand opblazen en de leesbaarheid verminderen:

- `EXAMPLE_RULE` (14 regels) — voorbeeld markdown content
- `PRE_COMMIT_HOOK` (12 regels) — shell script als string
- `SYNC_SCRIPTS` (4 regels) — package.json script definities

Daarnaast mengt het bestand meerdere verantwoordelijkheden: config-generatie, template-kopiëring, package.json-manipulatie, en git hook-installatie.

## 2. Principle Analysis

### DRY Check
- ✅ Geen directe duplicatie binnen het bestand
- ⚠️ `getPackageRoot()` is ook gedefinieerd in `config-loader.ts` (regels 122-130) — **DRY-schending** tussen bestanden

### SSOT Check
- ❌ `EXAMPLE_RULE` is een inline template dat beter als `.md` bestand in `templates/` past
- ❌ `PRE_COMMIT_HOOK` is een inline shell script dat beter als apart bestand past
- ❌ `getPackageRoot()` is op 2 plekken gedefinieerd — SSOT-schending

### Modularity Check
- ⚠️ `addSyncScripts()` is package.json-manipulatie — apart concern
- ⚠️ `installPreCommitHook()` is git-concern — apart concern
- ⚠️ `copyTemplates()` is template-concern — apart concern
- De `runInit` functie doet te veel zelf

### Architecture Check
- ✅ CLI-laag (spinner/log) is correct gescheiden van file-operaties
- ⚠️ `DEFAULT_CONFIG` object zou beter in `core/` passen als het door meerdere modules gebruikt wordt

## 3. Refactoring Goals

1. **Verplaats inline constanten**: `EXAMPLE_RULE` → `templates/rules/project-conventions.md` (bestaat al!), `PRE_COMMIT_HOOK` → `templates/hooks/pre-commit.sh`
2. **DRY `getPackageRoot()`**: Verplaats naar `utils/file-ops.ts` en hergebruik in zowel `init.ts` als `config-loader.ts`
3. **Extract git hook logica**: Verplaats `installPreCommitHook` naar `sync/gitignore.ts` of een nieuw `utils/git-hooks.ts`
4. **Extract package.json logica**: Verplaats `addSyncScripts` naar `utils/package-json.ts` of houd in `init.ts` (acceptabel)

## 4. Impact Analysis

### Affected Components/Modules
- `src/cli/init.ts` — hoofdbestand
- `src/core/config-loader.ts` — `getPackageRoot()` wordt gedeeld
- `src/utils/file-ops.ts` — ontvangt `getPackageRoot()`
- `templates/hooks/pre-commit.sh` — nieuw bestand

### Dependencies
- `runInit` wordt alleen aangeroepen vanuit `cli/index.ts`
- `getPackageRoot` wordt gebruikt door `init.ts` en `config-loader.ts`

### Location Decision
- `getPackageRoot()` → `src/utils/file-ops.ts` (utility)
- `PRE_COMMIT_HOOK` → `templates/hooks/pre-commit.sh` (template)
- `EXAMPLE_RULE` → verwijderen, `templates/rules/project-conventions.md` bestaat al en wordt gekopieerd door `copyTemplates`

## 5. Proposed Changes & Rationale

### Structural Changes

| Actie | Van | Naar | Waarom |
|-------|-----|------|--------|
| Move | `getPackageRoot()` in `init.ts` + `config-loader.ts` | `utils/file-ops.ts` | DRY — 1x definiëren |
| Move | `PRE_COMMIT_HOOK` string | `templates/hooks/pre-commit.sh` | SSOT — template als bestand |
| Remove | `EXAMPLE_RULE` string | (al in `templates/rules/`) | SSOT — template bestaat al |

### DRY Improvements

- `getPackageRoot()` van 2x → 1x gedefinieerd in `utils/file-ops.ts`
- `EXAMPLE_RULE` verwijderen — `copyTemplates('rules', ...)` kopieert al `templates/rules/project-conventions.md`

### Logic Refactoring

- De expliciete `EXAMPLE_RULE` write (regels 195-198) kan verwijderd worden omdat `copyTemplates('rules', contentDir, RULES_DIR)` op regel 201 al hetzelfde bestand kopieert
- `PRE_COMMIT_HOOK` wordt gelezen uit `templates/hooks/pre-commit.sh` via `readTextFile`

## 6. Non-Goals

- Geen wijziging aan het init-gedrag
- Geen wijziging aan de config-structuur
- `addSyncScripts` en `installPreCommitHook` blijven in `init.ts` (ze zijn init-specifiek)
- Geen nieuwe features

## 7. Technical Constraints

- `getPackageRoot()` gebruikt `import.meta.url` — werkt alleen in ESM
- Het `templates/` directory moet mee in de npm package (`files` in package.json)
- `PRE_COMMIT_HOOK` template moet `chmod 755` krijgen na schrijven

## 8. Verification & Quality Checklist

- [ ] Typecheck passes (`bun run build`)
- [ ] Linter passes
- [ ] Bestaande tests passing (`bun run test:run`)
- [ ] Handmatige test: `ai-toolkit init` in een nieuw project
- [ ] Handmatige test: `ai-toolkit init --force` in een bestaand project
- [ ] Pre-commit hook wordt correct geïnstalleerd
- [ ] Templates worden correct gekopieerd

## 9. Success Metrics

- **LOC reductie**: `init.ts` van 236 → ~190 regels
- **DRY**: `getPackageRoot()` van 2x → 1x
- **SSOT**: Inline templates van 2 → 0 (alles in `templates/`)
- **Zero regressions**: Init gedrag identiek
