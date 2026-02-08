# Tasks: Refactor `src/cli/init.ts`

> **PRD**: `docs/prd-refactor-init.md`
> **Date**: 2025-02-08

## Relevant Files

- `src/cli/init.ts` - Main file being refactored (712 lines → ~200 lines orchestrator)
- `src/cli/init/prompt-helpers.ts` - **New** — shared prompt utilities and composable setup functions
- `src/cli/init/quick-setup.ts` - **New** — quick setup flow
- `src/cli/init/advanced-setup.ts` - **New** — advanced setup flow
- `src/core/types.ts` - Reference for `ToolkitConfig` type (replaces `ExistingConfig`)
- `tests/cli/init.test.ts` - Existing tests, fix `any` types
- `tests/cli/init/prompt-helpers.test.ts` - **New** — tests for extracted helpers

### Notes

- Run `bun run typecheck` after each task to catch type errors early.
- Run `bun run test:run` after tasks 2, 3, 4, and 5 to verify no regressions.
- All imports must use `.js` extensions (ESM compatibility).
- Named exports only (project convention).
- `runInit` must remain the single public export from `src/cli/init.ts`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 1.0 Create `src/cli/init/prompt-helpers.ts` — Extract shared prompt utilities
  - [x] 1.1 Create the file with imports from `@clack/prompts`, `../core/types.js`, and `../utils/detect-stack.js`
  - [x] 1.2 Move `isCancelled()` function
  - [x] 1.3 Move `selectOrCustom()` function
  - [x] 1.4 Move `ALL_EDITORS` constant
  - [x] 1.5 Move `askTechStack()` function
  - [x] 1.6 Move `formatDetected()` helper function
  - [x] 1.7 Extract new `askProjectName(prev?: Partial<ToolkitConfig>)` composable from the duplicated project name prompt logic in both setup flows
  - [x] 1.8 Extract new `askTechStackWithDetection(projectRoot: string, prev?: Partial<ToolkitConfig>)` composable that combines the detect → confirm → fallback pattern shared by both flows
  - [x] 1.9 Extract new `askEditors(prev?: Partial<ToolkitConfig>)` composable that combines the duplicated multiselect + `Record<string, boolean>` construction
  - [x] 1.10 Replace `ExistingConfig` interface with `Partial<ToolkitConfig>` — update all function signatures to use it
  - [x] 1.11 Export all public functions and constants with named exports
  - [x] 1.12 Verify: `bun run typecheck` passes

- [x] 2.0 Create `src/cli/init/quick-setup.ts` — Move and refactor quick setup flow
  - [x] 2.1 Create the file with imports from `./prompt-helpers.js`
  - [x] 2.2 Move `runQuickSetup()` function, refactored to use `askProjectName()`, `askTechStackWithDetection()`, `askEditors()`
  - [x] 2.3 Move `detectNearbySsot()` function (only used by quick setup)
  - [x] 2.4 Export `runQuickSetup` and `detectNearbySsot` with named exports
  - [x] 2.5 Verify: `bun run typecheck` passes

- [x] 3.0 Create `src/cli/init/advanced-setup.ts` — Move and refactor advanced setup flow
  - [x] 3.1 Create the file with imports from `./prompt-helpers.js`
  - [x] 3.2 Move `runAdvancedSetup()` function, refactored to use `askProjectName()`, `askTechStackWithDetection()`, `askEditors()`
  - [x] 3.3 Keep the content sources prompts (advanced-only) inline in this file
  - [x] 3.4 Export `runAdvancedSetup` with named export
  - [x] 3.5 Verify: `bun run typecheck` passes

- [x] 4.0 Slim down `src/cli/init.ts` — Remove extracted code, wire up imports
  - [x] 4.1 Remove all functions and constants that were moved to sub-modules
  - [x] 4.2 Add imports from `./init/prompt-helpers.js`, `./init/quick-setup.js`, `./init/advanced-setup.js`
  - [x] 4.3 Verify `runInit()` still correctly calls `runQuickSetup` / `runAdvancedSetup` and handles the result
  - [x] 4.4 Verify `EXAMPLE_RULE`, `copyTemplates()`, and all post-setup file operations remain in `init.ts`
  - [x] 4.5 Verify the public export `runInit` is unchanged
  - [x] 4.6 Run `bun run typecheck` — must pass ✅
  - [x] 4.7 Run `bun run test:run` — all existing tests must pass ✅ (32 files, 424 tests)
  - [x] 4.8 Run `bun run build` — must succeed ✅

- [x] 5.0 Update tests and final verification
  - [x] 5.1 Fix `any[]` types in `tests/cli/init.test.ts` — replaced with `(string | boolean | string[])[]`
  - [x] 5.2 Run `bun run typecheck` — must pass ✅
  - [x] 5.3 Run `bun run test:run` — all tests must pass ✅ (32 files, 424 tests)
  - [ ] 5.4 Manual test: run `bun src/cli/index.ts init` and verify the wizard works identically
  - [x] 5.5 Verify line counts: `init.ts` 253 lines ✅, prompt-helpers 247 lines, quick-setup 127 lines, advanced-setup 154 lines
