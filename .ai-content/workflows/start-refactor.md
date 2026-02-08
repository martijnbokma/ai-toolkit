# Workflow: Start Single File Refactor

## Goal

Start a focused refactor for a single file from the candidates list. This workflow is designed to be used in a **fresh chat session** — one refactor per chat. It combines the PRD analysis and task list into a **single document** for maximum efficiency.

## Input

The user provides:

- The file path to refactor
- (Optional) Its row from the Priority Matrix in `docs/REFACTOR_CANDIDATES.md`

## Process

### Step 1: Gather Context (silent — no output to user)

1. Read `docs/REFACTOR_CANDIDATES.md` — get the file's scores, issues, and architectural violations.
2. Read the target file(s) and any related files (imports, consumers, tests).
3. Read the project's architecture documentation if needed.

### Step 2: Generate Combined Refactor Document

Create a **single document** `docs/refactor-[filename].md` that contains both the PRD analysis and the task list. Use the `refactor-prd` workflow in **fast-track mode** (no clarifying questions) and the `generate-tasks` workflow in **direct mode** (no "Go" pause).

The document structure:

```markdown
# Refactor: [filename]

## Analysis

(Condensed PRD: rationale, principle analysis, goals, impact, proposed changes, non-goals, constraints)

## Verification Checklist

- [ ] Typecheck passes
- [ ] Linter passes
- [ ] Tests pass
- [ ] (file-specific checks)

## Relevant Files

- `path/to/file.ts` - Description
- `path/to/file.test.ts` - Tests

## Tasks

- [ ] 1.0 Parent Task
  - [ ] 1.1 Sub-task
  - [ ] 1.2 Sub-task
- [ ] 2.0 Parent Task
      ...
```

**IMPORTANT:** Generate the full document in one pass — analysis + tasks together. Do NOT pause between PRD and task generation.

### Step 3: Ask to Start

After saving the document, ask:

> "Refactor plan saved to `docs/refactor-[filename].md`. Shall we start with task 1?"

Wait for confirmation before executing.

### Step 4: Execute Tasks

Work through the task list using the `implementation-loop` workflow:

- One task at a time
- Test after each task
- Check off sub-tasks in the document as they are completed

### Step 5: Finalize

1. Run full verification checklist (typecheck, lint, tests).
2. Update `docs/REFACTOR_CANDIDATES.md` — mark the file as ✅.
3. Summarize what changed.

## Example Prompt

```
Refactor `src/features/events/hooks/useEvents.ts` using the start-refactor workflow.
```

Or with context from the candidates list:

```
Refactor `src/features/events/hooks/useEvents.ts` using the start-refactor workflow.
Score: 14 | Issues: mixed data access and UI logic, 380 lines, 3 any-types.
```

## Key Rules

- **One file per chat session** — keeps context clean and focused.
- **Always read the candidates list first** — even if the user provides context, verify against the source.
- **No clarifying questions** — the candidates list provides all needed context. Use the `refactor-prd` fast-track mode.
- **No "Go" pause** — generate the full document (analysis + tasks) in one pass.
- **Single document** — combine PRD and tasks into `docs/refactor-[filename].md` (not two separate files).
- **Ask once before executing** — after generating the document, ask to start. That's the only pause point.
