# Refactoring PRD: `src/utils/detect-stack.ts` + `src/sync/analyzers/package-analyzer.ts`

> **Modules**: `src/utils/detect-stack.ts` (192 lines) + `src/sync/analyzers/package-analyzer.ts` (266 lines)
> **Priority Score**: 11 (HIGH)
> **Date**: 2025-02-08

## 1. Overview & Rationale

These two files independently implement overlapping functionality for detecting project tech stacks from `package.json`:

- **`detect-stack.ts`** — Lightweight CLI init-time detector. Used by `init` command to auto-detect language, framework, runtime, and database.
- **`package-analyzer.ts`** — Deep analyzer for `generate-context`. Reads `package.json` and categorizes all dependencies (framework, UI, state, testing, styling, database, auth, build tools, linting).

Both files contain their own:
1. `readPackageJson()` function (different return types)
2. `detectRuntime()` function (different strategies)
3. Framework detection maps (overlapping but inconsistent entries)
4. Database detection maps (overlapping but inconsistent entries)

This violates DRY and SSOT — changes to detection logic must be made in two places, and the maps have already drifted apart.

## 2. Principle Analysis

### DRY Check

| Violation | detect-stack.ts | package-analyzer.ts |
|-----------|-----------------|---------------------|
| `readPackageJson()` | Lines 182-192 (returns minimal `PackageJson`) | Lines 216-235 (returns rich `PackageInfo`) |
| Runtime detection | `detectRuntime()` lines 125-156 (file-based: lockfiles) | `detectRuntime()` lines 142-153 (field-based: `packageManager`, type deps) |
| Framework map | `FRAMEWORK_DETECTORS` lines 16-30 (13 entries, includes `@nestjs/core`) | `FRAMEWORK_MAP` lines 37-54 (16 entries, includes `react-dom`, `gatsby`, `@remix-run/react`) |
| Database map | `DATABASE_DETECTORS` lines 32-47 (14 entries, uses `Drizzle`) | `DATABASE_MAP` lines 99-112 (12 entries, uses `Drizzle ORM`, includes `typeorm`, `sequelize`) |

### SSOT Check

- **`PackageJson` type** in `detect-stack.ts` is a strict subset of `PackageInfo` in `package-analyzer.ts` — violates SSOT
- **Framework entries differ** — `@nestjs/core` only in `detect-stack.ts`, `gatsby` only in `package-analyzer.ts`
- **Database label inconsistency** — `Drizzle` vs `Drizzle ORM`, `MongoDB` vs `Mongoose (MongoDB)`, `PostgreSQL` vs `PostgreSQL (pg)`

### Modularity Check

- `detect-stack.ts` lives in `utils/` (shared utilities) — correct location for a lightweight detector
- `package-analyzer.ts` lives in `sync/analyzers/` — correct location for deep analysis
- The dependency direction should be: `detect-stack.ts` → imports from → `package-analyzer.ts` (lightweight delegates to canonical)

## 3. Refactoring Goals

1. **Eliminate duplicate `readPackageJson`** — `detect-stack.ts` imports `readPackageJson` from `package-analyzer.ts` instead of having its own
2. **Eliminate duplicate framework/database maps** — `detect-stack.ts` uses `analyzeDependencies()` from `package-analyzer.ts` to get framework and database detection
3. **Compose runtime detection** — `detect-stack.ts` keeps its file-based detection (lockfiles) as primary, falls back to `package-analyzer.ts`'s `packageManager`-based detection
4. **Unify framework map** — Add `@nestjs/core: NestJS` to `FRAMEWORK_MAP` in `package-analyzer.ts`
5. **Keep `DetectedStack` interface** — The public API of `detectStack()` remains unchanged

## 4. Impact Analysis

### Affected Files

| File | Change Type |
|------|-------------|
| `src/utils/detect-stack.ts` | Major refactor — delegate to `package-analyzer.ts` |
| `src/sync/analyzers/package-analyzer.ts` | Minor — add `@nestjs/core` to `FRAMEWORK_MAP` |

### Dependencies (consumers)

- `src/cli/init/prompt-helpers.ts` imports `detectStack` and `DetectedStack` from `detect-stack.ts` — **no change needed**
- `src/sync/analyzers/index.ts` imports from `package-analyzer.ts` — **no change needed**
- `tests/utils/detect-stack.test.ts` (28 tests) — **no change needed** (public API unchanged)
- `tests/sync/analyzers/package-analyzer.test.ts` (25 tests) — **no change needed**

## 5. Proposed Changes & Rationale

### 5.1 Add `@nestjs/core` to `FRAMEWORK_MAP` in `package-analyzer.ts`

Add the missing entry so the canonical map is a superset of what `detect-stack.ts` had.

**Why**: SSOT — one complete framework map.

### 5.2 Rewrite `detect-stack.ts` to delegate dependency detection

Remove:
- Private `PackageJson` interface
- Private `readPackageJson()` function
- `FRAMEWORK_DETECTORS` array
- `DATABASE_DETECTORS` array

Replace framework/database detection with:
```typescript
import { readPackageJson, analyzeDependencies } from '../sync/analyzers/package-analyzer.js';

const pkg = await readPackageJson(projectRoot);
if (pkg) {
  const deps = analyzeDependencies(pkg);
  detected.framework = deps.framework ?? undefined;
  detected.database = deps.database[0] ?? undefined;
}
```

**Why**: Eliminates all 4 DRY violations. The `analyzeDependencies` function already does everything `detect-stack.ts` was doing manually, plus more.

### 5.3 Compose runtime detection

Keep `detect-stack.ts`'s file-based `detectRuntime()` (lockfile scanning) as the primary strategy. If it returns nothing, fall back to `package-analyzer.ts`'s `packageManager`-based detection via `analyzeDependencies().runtime`.

**Why**: File-based detection (lockfiles) is more reliable for the init wizard context. The `packageManager` field is a good fallback.

### 5.4 Keep `detect-stack.ts`-specific logic

These functions stay in `detect-stack.ts` because they're unique to it:
- `detectLanguage()` — file-existence-based language detection
- `detectRuntime()` — file-based lockfile scanning
- `detectPythonFramework()` — content-based Python framework detection

## 6. Non-Goals

- **No changes to `package-analyzer.ts` exports** — only adding one map entry
- **No changes to `DetectedStack` interface** — public API stays the same
- **No changes to test files** — all existing tests should pass unchanged
- **No label normalization** — `package-analyzer.ts` uses richer labels like `Drizzle ORM` and `PostgreSQL (pg)` for context generation; `detect-stack.ts` will now use these same labels (acceptable for init wizard)

## 7. Technical Constraints

- Import path: `detect-stack.ts` is in `utils/`, `package-analyzer.ts` is in `sync/analyzers/` — the import will be `../sync/analyzers/package-analyzer.js`
- All imports must use `.js` extensions
- Named exports only

## 8. Verification & Quality Checklist

- [ ] `bun run typecheck` passes
- [ ] `bun run test:run` passes (all 424 existing tests)
- [ ] `bun run build` succeeds
- [ ] No new DRY violations introduced
- [ ] SSOT maintained — single `readPackageJson`, single framework map
- [ ] `detectStack()` public API unchanged

## 9. Success Metrics

- `detect-stack.ts` reduced from 193 lines to ~90 lines
- 4 DRY violations eliminated (readPackageJson, framework map, database map, PackageJson type)
- Framework map unified with `@nestjs/core` added
- Zero test changes needed, zero regressions
