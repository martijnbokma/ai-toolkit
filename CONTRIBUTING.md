# Contributing to ai-toolkit

Thanks for your interest in contributing! This guide will get you up and running in minutes.

## Prerequisites

- **[Bun](https://bun.sh/)** (v1.3+) — used as package manager and runtime
- **Node.js** 18+ (for compatibility)
- **Git**

## Quick Setup

```bash
# 1. Fork & clone
git clone https://github.com/<your-username>/ai-toolkit.git
cd ai-toolkit

# 2. Install dependencies
bun install

# 3. Verify everything works
bun run typecheck
bun run test:run
```

That's it — you're ready to contribute.

## Project Structure

```
src/
├── cli/            # CLI commands (init, sync, validate, watch, etc.)
├── core/           # Config loader, types, Zod schemas
├── editors/        # One adapter per AI editor (cursor.ts, claude.ts, …)
├── sync/           # Sync engine, SSOT logic, cleanup, analyzers
├── utils/          # Shared helpers
└── index.ts        # Public API exports

tests/              # Mirrors src/ structure
templates/          # Built-in content templates (rules, skills, workflows, stacks)
docs/               # User-facing documentation
```

### Key concepts

- **Editor adapters** (`src/editors/`) — each file implements the sync logic for one AI editor. Adding a new editor means adding one file here.
- **Sync engine** (`src/sync/`) — orchestrates content resolution, SSOT diffing, auto-promote, and cleanup.
- **Config loader** (`src/core/config-loader.ts`) — parses and validates `ai-toolkit.yaml` using Zod.
- **Templates** (`templates/`) — shipped with the npm package; copied during `init`.

## Development Workflow

### Running locally

```bash
# Run the CLI directly from source
bun src/cli/index.ts init
bun src/cli/index.ts sync
bun src/cli/index.ts sync --dry-run

# Or use the npm scripts
bun run start          # same as bun src/cli/index.ts
bun run sync           # runs sync from source
```

### Testing in another project

```bash
# Link globally
bun link

# In your test project
bun link ai-toolkit
bun ai-toolkit sync
```

### TypeScript

```bash
bun run typecheck      # Type-check without emitting
```

### Building

```bash
bun run build          # Produces dist/ via tsup
```

## Testing

We use [Vitest](https://vitest.dev/) with globals enabled.

```bash
bun run test           # Watch mode
bun run test:run       # Single run
bun run test:coverage  # With coverage report
```

### Test structure

Tests mirror the `src/` directory:

```
tests/
├── cli/               # CLI command tests
├── core/              # Config loader tests
├── editors/           # Editor adapter tests
├── sync/              # Sync engine tests
├── utils/             # Utility tests
└── fixtures/          # Shared test helpers
```

### Writing tests

- Place tests next to the module they cover: `src/sync/cleanup.ts` → `tests/sync/cleanup.test.ts`
- Use the helpers in `tests/fixtures/helpers.ts` for common setup
- Aim for isolated, fast tests — avoid filesystem side effects where possible

## Making Changes

### 1. Create a branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make your changes

- Follow existing code patterns and style
- Keep functions small and focused
- Add/update tests for any new or changed behavior

### 3. Verify

```bash
bun run typecheck      # No type errors
bun run test:run       # All tests pass
```

### 4. Commit

Write clear commit messages:

```
feat: add support for SuperMaven editor
fix: handle missing skills directory during sync
docs: add monorepo setup example
```

We follow [Conventional Commits](https://www.conventionalcommits.org/) loosely:

| Prefix | Use for |
|---|---|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `refactor:` | Code changes that don't add features or fix bugs |
| `chore:` | Tooling, deps, CI changes |

### 5. Push & open a PR

```bash
git push origin feat/my-feature
```

Open a Pull Request against `main`. Describe **what** you changed and **why**.

## Common Contributions

### Adding a new editor adapter

1. Create `src/editors/my-editor.ts` — implement the adapter (use an existing one like `src/editors/cursor.ts` as a reference)
2. Register it in `src/editors/registry.ts`
3. Add the editor to the types in `src/core/types.ts`
4. Add tests in `tests/editors/`
5. Update the editor table in `README.md` and `docs/GUIDE.md`

### Adding a new CLI command

1. Add the command in `src/cli/my-command.ts`
2. Register it in `src/cli/index.ts`
3. Add tests in `tests/cli/`

### Adding a new template

1. Add the file to `templates/` (in the appropriate subdirectory)
2. Make sure it's included in the `files` array in `package.json` (already covers `templates/`)

### Fixing a bug

1. Write a failing test that reproduces the bug
2. Fix the code
3. Verify the test passes

## Code Style

- **TypeScript** with strict mode
- **ES modules** (`import`/`export`)
- **2-space indentation**
- No linter configured yet — follow existing patterns
- Prefer explicit types over `any`
- Use `zod` for runtime validation of config/input

## Questions?

Open an [issue](https://github.com/martijnbokma/ai-toolkit/issues) or start a [discussion](https://github.com/martijnbokma/ai-toolkit/discussions) — we're happy to help.
