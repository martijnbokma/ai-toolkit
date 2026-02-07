# Workflow: Generating a Task List from Requirements

## Goal

Guide an AI assistant in creating a detailed, step-by-step task list in Markdown format based on user requirements, feature requests, or existing documentation. The task list should guide a developer through implementation.

## Output

- **Format:** Markdown (`.md`)
- **Filename:** `tasks-[feature-name].md`

## Process

1. **Receive Requirements:** The user provides a feature request, task description, or points to existing documentation (e.g., a PRD).
2. **Analyze Requirements:** Analyze the functional requirements, user needs, and implementation scope from the provided information.
3. **Phase 1: Generate Parent Tasks:** Create the main, high-level tasks required to implement the feature. Use your judgement on how many high-level tasks to use (typically around 5). Present these tasks to the user in the specified format (without sub-tasks yet). Inform the user: "I have generated the high-level tasks. Ready to generate the sub-tasks? Respond with 'Go' to proceed."
4. **Wait for Confirmation:** Pause and wait for the user to respond with "Go".
5. **Phase 2: Generate Sub-Tasks:** Once the user confirms, break down each parent task into smaller, actionable sub-tasks. Ensure sub-tasks logically follow from the parent task and cover the implementation details.
6. **Identify Relevant Files:** Based on the tasks and requirements, identify potential files that will need to be created or modified. List these under the `Relevant Files` section, including corresponding test files if applicable.
7. **Generate Final Output:** Combine the parent tasks, sub-tasks, relevant files, and notes into the final Markdown structure.
8. **Save Task List:** Save the generated document with the filename `tasks-[feature-name].md`.

## Output Format

The generated task list _must_ follow this structure:

```markdown
## Relevant Files

- `path/to/file1.ts` - Brief description of why this file is relevant.
- `path/to/file1.test.ts` - Unit tests for `file1.ts`.
- `path/to/another/file.tsx` - Brief description.

### Notes

- Unit tests should be placed alongside the code files they are testing.
- Follow the project's architecture and conventions when implementing.
- Run the project's test suite after completing each task to verify no regressions.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 1.0 Parent Task Title
  - [ ] 1.1 [Sub-task description 1.1]
  - [ ] 1.2 [Sub-task description 1.2]
- [ ] 2.0 Parent Task Title
  - [ ] 2.1 [Sub-task description 2.1]
- [ ] 3.0 Parent Task Title
```

## Interaction Model

The process explicitly requires a pause after generating parent tasks to get user confirmation ("Go") before proceeding to generate the detailed sub-tasks. This ensures the high-level plan aligns with user expectations before diving into details.

## Target Audience

Assume the primary reader of the task list is a developer who will implement the feature. Provide enough detail for them to work through each task without ambiguity.
