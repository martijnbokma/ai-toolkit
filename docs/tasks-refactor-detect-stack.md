# Tasks: Refactor `detect-stack.ts` + `package-analyzer.ts`

> **PRD**: `docs/prd-refactor-detect-stack.md`
> **Date**: 2025-02-08

## Relevant Files

- `src/utils/detect-stack.ts` - Main file being refactored (193 → ~90 lines)
- `src/sync/analyzers/package-analyzer.ts` - Canonical source, minor addition
- `tests/utils/detect-stack.test.ts` - 28 existing tests (should pass unchanged)
- `tests/sync/analyzers/package-analyzer.test.ts` - 25 existing tests (should pass unchanged)

### Notes

- The public API `detectStack()` must remain unchanged.
- All imports must use `.js` extensions.
- Run `bun run typecheck` and `bun run test:run` after each task.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`.

## Tasks

- [x] 1.0 Add missing entry to `package-analyzer.ts`
  - [x] 1.1 Add `'@nestjs/core': 'NestJS'` to `FRAMEWORK_MAP`
  - [x] 1.2 Run `bun run typecheck` — must pass ✅

- [x] 2.0 Rewrite `detect-stack.ts` to delegate to `package-analyzer.ts`
  - [x] 2.1 Add import for `readPackageJson` and `analyzeDependencies` from `../sync/analyzers/package-analyzer.js`
  - [x] 2.2 Remove private `PackageJson` interface
  - [x] 2.3 Remove private `readPackageJson()` function
  - [x] 2.4 Remove `FRAMEWORK_DETECTORS` array
  - [x] 2.5 Remove `DATABASE_DETECTORS` array
  - [x] 2.6 Rewrite `detectStack()` to use `readPackageJson` + `analyzeDependencies` for framework/database detection
  - [x] 2.7 Compose runtime: keep file-based `detectRuntime()`, fall back to `analyzeDependencies().runtime` if file-based returns nothing
  - [x] 2.8 Keep `detectLanguage()`, `detectRuntime()` (file-based), and `detectPythonFramework()` unchanged
  - [x] 2.9 Run `bun run typecheck` — must pass ✅

- [x] 3.0 Verify and finalize
  - [x] 3.1 Run `bun run test:run` — all tests must pass ✅ (32 files, 424 tests)
  - [x] 3.2 Run `bun run build` — must succeed ✅ (cli.js 131KB, index.js 46KB)
  - [x] 3.3 Verify line count: `detect-stack.ts` 136 lines ✅ (down from 193)
