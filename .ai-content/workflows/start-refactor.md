# Workflow: Start Single File Refactor

## Goal

Start a focused refactor for a single file from the candidates list. This workflow is designed to be used in a **fresh chat session** — one refactor per chat.

## Input

The user provides:
- The file path to refactor
- (Optional) Its row from the Priority Matrix in `docs/REFACTOR_CANDIDATES.md`

## Process

1. **Read Context:** Read `docs/REFACTOR_CANDIDATES.md` to understand the file's scores, issues, and architectural violations.
2. **Generate Refactoring PRD:** Use the `refactor-prd` workflow for this specific file.
   - Input: the file path, its scores, and any architectural violations from the candidates list.
   - Output: `docs/prd-refactor-[filename].md`
3. **Generate Task List:** This is **MANDATORY** and triggered automatically by the `refactor-prd` workflow.
   - Use the `generate-tasks` workflow with the PRD from step 2 as input.
   - Output: `docs/tasks-refactor-[filename].md`
4. **Execute Tasks:** Work through the generated task list, checking off sub-tasks as they are completed.
5. **Update Status:** Mark the file as completed (✅) in the Priority Matrix in `docs/REFACTOR_CANDIDATES.md`.

## Example Prompt

```
Refactor `src/features/events/hooks/useEvents.ts` using the start-refactor workflow.
```

Or with more context:

```
Refactor `src/features/events/hooks/useEvents.ts` using the start-refactor workflow.
Score: 14 | Issues: mixed data access and UI logic, 380 lines, 3 any-types.
```

## Key Rules

- **One file per chat session** — keeps context clean and focused.
- **Always read the candidates list first** — even if the user provides context, verify against the source.
- **Complete the full pipeline** — PRD → Tasks → Execute → Update status. Do not skip steps.
- **Ask before executing** — after generating the task list, ask the user: "Shall we start with the first task?"
