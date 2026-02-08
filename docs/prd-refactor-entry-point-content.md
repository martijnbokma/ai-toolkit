# Refactoring PRD: Editor Adapter `generateEntryPointContent` DRY

> **Modules**: `src/editors/base-adapter.ts` + 7 adapter files + `src/editors/registry.ts`
> **Priority Score**: HIGH (8 files × ~20 duplicated lines = ~140 lines of duplication)
> **Date**: 2025-02-08

## 1. Overview & Rationale

The `generateEntryPointContent` method is copy-pasted across 8 locations with near-identical boilerplate. Each override follows the same pattern:

1. `AUTO_GENERATED_MARKER` + empty line
2. `# {name}` with optional title suffix (e.g., "— Cursor Rules")
3. Optional description
4. `---` separator (most adapters)
5. Tech stack section with `## Tech Stack` heading (identical in all except Kiro)
6. Closing message (varies per adapter)

Only 3 things differ between adapters: **title suffix**, **tech stack heading**, and **closing message**.

### Files with duplicated `generateEntryPointContent`:

| File | Title | Tech Stack Heading | Closing Message |
|------|-------|--------------------|-----------------|
| `base-adapter.ts` | `{name}` | `Tech Stack` | "Rules and skills are automatically synced..." |
| `cursor.ts` | `{name} — Cursor Rules` | `Tech Stack` | "Rules and commands are managed..." |
| `windsurf.ts` | `{name} — Windsurf Rules` | `Tech Stack` | "Rules and workflows are managed..." |
| `claude.ts` | `{name}` | `Tech Stack` | "Rules and skills are managed..." |
| `bolt.ts` | `{name}` | `Tech Stack` | *(none)* |
| `junie.ts` | `{name} — Junie Guidelines` | `Tech Stack` | "Guidelines are managed..." |
| `kiro.ts` | `{name} — Project Steering` | `Project Context` | "Steering files are managed..." |
| `replit.ts` | `{name}` | `Tech Stack` | "Rules are managed..." |
| `registry.ts` (custom) | `{name} — {editor} Rules` | *(none)* | *(none)* |

## 2. Principle Analysis

### DRY Check

The tech stack rendering block (lines 23-34 in most adapters) is **identical** across all 8 implementations:

```typescript
if (config.tech_stack) {
  const stack = Object.entries(config.tech_stack).filter(([, v]) => v);
  if (stack.length > 0) {
    lines.push('## Tech Stack', '');
    for (const [key, value] of stack) {
      lines.push(`- **${key}**: ${value}`);
    }
    lines.push('');
  }
}
```

### SSOT Check

No single source of truth for entry point content generation — each adapter is its own source.

## 3. Proposed Changes

### 3.1 Add configurable properties to `BaseEditorAdapter`

```typescript
protected entryPointTitle?: string;        // e.g., "Cursor Rules" → renders "# {name} — Cursor Rules"
protected techStackHeading = 'Tech Stack'; // Kiro overrides to 'Project Context'
protected closingMessage?: string;         // e.g., "Rules and commands are managed by ai-toolkit."
```

### 3.2 Rewrite `generateEntryPointContent` in base class

The base class method uses these properties to generate the content. Adapters only set properties instead of overriding the entire method.

### 3.3 Remove overrides from 7 adapter files

Each adapter replaces its `generateEntryPointContent` override with 1-3 property declarations.

### 3.4 Update `buildCustomAdapter` in `registry.ts`

Use the base class helper or a shared function for custom adapters.

## 4. Non-Goals

- No changes to output format — generated content must be byte-identical
- No changes to `EditorAdapter` interface
- No changes to test files

## 5. Verification

- [ ] `bun run typecheck` passes
- [ ] `bun run test:run` passes (all 424 tests, especially 101 adapter tests)
- [ ] `bun run build` succeeds
- [ ] Entry point content output is identical for all adapters

## 6. Success Metrics

- ~140 lines of duplicated code eliminated
- 7 adapter overrides removed
- Single implementation in `base-adapter.ts`
