# Refactoring PRD: `src/cli/init.ts`

> **Module**: `src/cli/init.ts` (712 lines)
> **Priority Score**: 15 (CRITICAL)
> **Date**: 2025-02-08

## 1. Overview & Rationale

`src/cli/init.ts` is the largest file in the codebase at 712 lines — more than double the 350-line threshold for components/views. It handles five distinct responsibilities in a single file:

1. **Prompt helpers** — `selectOrCustom`, `isCancelled`, `askTechStack`
2. **Quick setup flow** — `runQuickSetup` (interactive wizard, simplified)
3. **Advanced setup flow** — `runAdvancedSetup` (full wizard with content sources)
4. **File operations** — `copyTemplates`, `detectNearbySsot`, config writing, directory creation
5. **Orchestration** — `runInit` ties everything together

This violates the project convention of keeping functions small and focused, and introduces DRY violations between the two setup flows.

## 2. Principle Analysis

### DRY Check

| Violation | Location | Description |
|-----------|----------|-------------|
| Editor multiselect | Lines 268-288 vs 425-445 | Identical editor selection logic duplicated in both setup flows |
| Project name prompt | Lines 219-224 vs 398-403 | Same `p.text()` call with same parameters |
| Tech stack detection | Lines 229-265 vs 415-422 | Similar detect-then-ask pattern, slightly different branching |
| Editor config building | Lines 282-288 vs 439-445 | Identical `Record<string, boolean>` construction loop |

### SSOT Check

- **`ExistingConfig` interface** (lines 151-161): Defines a loose type that partially duplicates `ToolkitConfig` from `core/types.ts`. Should use `Partial<ToolkitConfig>` instead.
- **`ALL_EDITORS` array** (lines 83-105): Editor metadata (labels, hints) is defined only here. This is acceptable as it's UI-specific data not needed elsewhere.
- **`EXAMPLE_RULE` constant** (lines 35-49): Inline string constant. Could move to a shared location but is only used here — acceptable.

### Modularity Check

- **Mixed concerns**: UI prompts, file I/O, config generation, and sync orchestration are all in one file.
- **Separation of concerns violated**: `runInit` directly calls `analyzeProject`, `generateRichProjectContext`, `runSync`, `installPreCommitHook`, and `addSyncScripts` — it's both a UI layer and an orchestration layer.

### Architecture Check

- The file acts as both **UI layer** (prompts) and **orchestration layer** (file operations, sync). These should be separated so the prompt logic is testable independently of the file system operations.

## 3. Refactoring Goals

1. **Split `init.ts` into focused sub-modules** under `src/cli/init/`:
   - `prompt-helpers.ts` — Shared prompt utilities (`selectOrCustom`, `isCancelled`, `askTechStack`, `askEditors`, `askProjectName`)
   - `quick-setup.ts` — Quick setup flow
   - `advanced-setup.ts` — Advanced setup flow
   - `init.ts` (original) — Thin orchestrator that imports from sub-modules

2. **Eliminate DRY violations** by extracting shared setup steps into composable functions in `prompt-helpers.ts`.

3. **Replace `ExistingConfig`** with `Partial<ToolkitConfig>` to maintain SSOT.

4. **Improve test types** — Remove `any[]` usage in `tests/cli/init.test.ts`.

## 4. Impact Analysis

### Affected Files

| File | Change Type |
|------|-------------|
| `src/cli/init.ts` | Major refactor — becomes thin orchestrator |
| `src/cli/init/prompt-helpers.ts` | **New** — shared prompt functions |
| `src/cli/init/quick-setup.ts` | **New** — quick setup flow |
| `src/cli/init/advanced-setup.ts` | **New** — advanced setup flow |
| `tests/cli/init.test.ts` | Minor — fix `any` types, add tests for helpers |

### Dependencies

- `src/cli/index.ts` imports `runInit` from `./init.js` — **no change needed** (export stays the same)
- No other files import from `init.ts`

### Location Decision

All new files stay within `src/cli/` — this is CLI-specific code, not shared infrastructure.

## 5. Proposed Changes & Rationale

### 5.1 Create `src/cli/init/prompt-helpers.ts`

Extract and deduplicate:
- `isCancelled()` — Used by all setup flows
- `selectOrCustom()` — Reusable prompt pattern
- `askProjectName()` — **New** composable (extracted from both flows)
- `askTechStack()` — Already a function, just move it
- `askTechStackWithDetection()` — **New** composable (extract detect + confirm + fallback pattern)
- `askEditors()` — **New** composable (extract the duplicated multiselect + config building)
- `ALL_EDITORS` constant — Moved here as it's prompt-specific data
- `ExistingConfig` type — Replaced with `Partial<ToolkitConfig>`

**Why**: These are reusable prompt building blocks. Extracting them eliminates all 4 DRY violations and makes each function independently testable.

### 5.2 Create `src/cli/init/quick-setup.ts`

Move `runQuickSetup()` here, refactored to use composable functions:
```
askProjectName() → askTechStackWithDetection() → askEditors() → detectNearbySsot()
```

**Why**: The quick flow becomes ~40 lines instead of ~95, with zero duplication.

### 5.3 Create `src/cli/init/advanced-setup.ts`

Move `runAdvancedSetup()` here, refactored to use composable functions:
```
askProjectName() → askDescription() → askTechStackWithDetection() → askEditors() → askContentSources()
```

**Why**: The advanced flow becomes ~60 lines instead of ~150, with zero duplication.

### 5.4 Slim down `src/cli/init.ts`

Keep only:
- `runInit()` — Orchestration function (the public API)
- `copyTemplates()` — File operation helper
- `EXAMPLE_RULE` constant
- Post-setup file operations (directory creation, template copying, sync)

**Why**: `init.ts` becomes a ~200-line orchestrator focused solely on the init pipeline. The UI logic is fully separated.

### 5.5 Fix test types

Replace `any[]` with proper types in `tests/cli/init.test.ts`.

## 6. Non-Goals

- **No functional changes** — The init wizard behavior must remain identical
- **No UI changes** — Prompt text, ordering, and defaults stay the same
- **No new features** — This is purely structural
- **No changes to other CLI commands** — Only `init.ts` is in scope
- **No `EditorName` enum fix** — That's a separate refactor candidate

## 7. Technical Constraints

- All imports must use `.js` extensions (ESM compatibility)
- Named exports only (project convention)
- `@clack/prompts` is the prompt library — all interactive UI goes through it
- `runInit` must remain the single public export (used by `src/cli/index.ts`)

## 8. Verification & Quality Checklist

- [ ] `bun run typecheck` passes
- [ ] `bun run test:run` passes (all existing tests)
- [ ] `bun run build` succeeds
- [ ] No new DRY violations introduced
- [ ] SSOT maintained (no duplicate type definitions)
- [ ] `runInit` public API unchanged
- [ ] Manual test: `bun src/cli/index.ts init` works identically

## 9. Success Metrics

- `init.ts` reduced from 712 lines to ~200 lines
- Zero duplicated code between quick and advanced setup flows
- `ExistingConfig` eliminated in favor of `Partial<ToolkitConfig>`
- `any` types removed from test file
- All 4 DRY violations resolved
- New helper functions are independently testable
