# Tasks: Refactor Editor Adapter `generateEntryPointContent`

> **PRD**: `docs/prd-refactor-entry-point-content.md`
> **Date**: 2025-02-08

## Relevant Files

- `src/editors/base-adapter.ts` — Add configurable properties, rewrite base method
- `src/editors/cursor.ts` — Remove override
- `src/editors/windsurf.ts` — Remove override
- `src/editors/claude.ts` — Remove override
- `src/editors/bolt.ts` — Remove override
- `src/editors/junie.ts` — Remove override
- `src/editors/kiro.ts` — Remove override
- `src/editors/replit.ts` — Remove override
- `src/editors/registry.ts` — Update `buildCustomAdapter`
- `tests/editors/adapters.test.ts` — Should pass unchanged (101 tests)

## Tasks

- [x] 1.0 Rewrite `BaseEditorAdapter.generateEntryPointContent` with configurable properties
  - [x] 1.1 Add `entryPointTitle`, `techStackHeading`, `closingMessage`, `hasSeparator` properties
  - [x] 1.2 Rewrite `generateEntryPointContent` to use these properties
  - [x] 1.3 Run `bun run typecheck` — must pass ✅

- [x] 2.0 Remove overrides from adapter files
  - [x] 2.1 `cursor.ts` — replace override with properties (45 → 18 lines)
  - [x] 2.2 `windsurf.ts` — replace override with properties (49 → 22 lines)
  - [x] 2.3 `claude.ts` — replace override with properties (52 → 24 lines)
  - [x] 2.4 `bolt.ts` — replace override with properties (37 → 16 lines)
  - [x] 2.5 `junie.ts` — replace override with properties (43 → 16 lines)
  - [x] 2.6 `kiro.ts` — replace override with properties (45 → 19 lines)
  - [x] 2.7 `replit.ts` — replace override with properties (43 → 15 lines)
  - [x] 2.8 `registry.ts` — extracted `generateCustomEntryPointContent` helper
  - [x] 2.9 Run `bun run typecheck` — must pass ✅

- [x] 3.0 Verify and finalize
  - [x] 3.1 Run `bun run test:run` — all tests must pass ✅ (32 files, 424 tests)
  - [x] 3.2 Run `bun run build` — must succeed ✅ (cli.js 128KB, index.js 42KB — ~7KB smaller)
