# Refactor

Perform a safe code refactor: improve readability, structure, DRY, and maintainability without changing functional behavior (unless explicitly requested).

## When

Use this skill when:
- The user asks: "refactor", "cleanup", "restructure".
- Reducing duplication (DRY).
- Improving structure (module boundaries, separation of concerns).
- Making code "cleaner" or more idiomatic according to project conventions.

## Core Principles

### 1. SSOT (Single Source of Truth)
- **Principle**: Define data, types, and logic in one place.
- **Implementation**:
  - Types: dedicated type files (e.g., `*.types.ts`, `types/`).
  - Constants/Config: central config files.
  - Styling: use design tokens, not hardcoded values.
- **Anti-pattern**: Creating "convenience copies" of types or interfaces. Refactor the callers instead.

### 2. Modular Architecture
- **Location**:
  - Feature-specific → feature modules (e.g., `src/features/{feature}/`).
  - Cross-feature/generic → shared modules (e.g., `src/shared/`, `src/lib/`).
- **Dependency Rule**: Features should not directly depend on each other (use shared modules or events).
- **Separation of Concerns**:
  1. **Data layer** (services, repositories): Data access, error throwing. No UI or state logic.
  2. **State layer** (hooks, composables, stores): State management, lifecycle, error handling.
  3. **UI layer** (components, views): Rendering, props. No complex business logic.

### 3. DRY (Don't Repeat Yourself)
- If a pattern appears 2+ times → extract to shared utilities or feature-level helpers.
- Normalize naming and structure across the codebase.

## Workflow

### Phase 1: Analysis & Proposal
1. **Inventory**:
   - Identify the goal (e.g., "Extract hook", "Split component", "Remove duplication").
   - Find callers and dependencies.
   - Check what other modules are affected.
2. **Plan**:
   - Determine the new location (feature module vs shared module).
   - Propose the change to the user if it impacts architecture.

### Phase 2: Execution (Iterative)
1. **Step by step**: One mechanical change at a time (Rename, Extract, Move).
2. **Stability**: Keep the application working between steps.
3. **Conventions**:
   - Follow the project's existing export style (named vs default).
   - No `any` types; use proper interfaces or imported types.
   - Keep imports organized (External → Shared → Relative).

### Phase 3: Verification & Quality
Run the project's verification toolchain to ensure integrity:
1. **Typecheck**: Must pass.
2. **Lint**: Must pass.
3. **Tests**: Run relevant tests.
4. **Cleanup**: Remove unused imports/exports and dead code.

## Refactor Patterns

| Pattern | Solution | Location |
|---------|----------|----------|
| **Large component** | Split into Container (data/logic) + Presentational (UI). | Feature components |
| **Data access in UI** | Move to a service/repository. | Feature services |
| **Duplicate logic** | Extract to a hook/composable or utility. | Shared or feature utils |
| **Messy imports** | Organize and group imports consistently. | — |
| **Magic strings/numbers** | Extract to constants or enums. | Constants file |

## Checklist
- [ ] No functional change (behavior is identical).
- [ ] Typecheck passes.
- [ ] Linter passes.
- [ ] Tests pass.
- [ ] Code is in the correct location (feature vs shared).
- [ ] No unnecessary dependencies added.
