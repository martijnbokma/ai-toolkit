# Workflow: Implementation Loop

## Goal

Guide an AI assistant through an iterative build cycle that combines planning, implementation, testing, and debugging into a structured loop. This ensures features are built incrementally with verification at every step.

## Process

### Phase 1: Plan

1. **Understand the requirement:** Read the feature request, PRD, or user description carefully.
2. **Break it into steps:** Decompose the work into the smallest independently testable units (aim for 1-5 minute steps).
3. **Identify risks:** Note edge cases, potential breaking changes, and dependencies upfront.
4. **Present the plan:** Share the numbered step list with the user. Wait for confirmation before proceeding.

### Phase 2: Loop (repeat for each step)

For each step in the plan:

```
┌─────────────────────────────────────────┐
│  1. IMPLEMENT — Build the current step  │
│  2. TEST — Run tests / verify behavior  │
│  3. PASS? ──┬── Yes → COMMIT & next     │
│             └── No  → DEBUG & retry     │
└─────────────────────────────────────────┘
```

#### 2a. Implement
- Focus only on the current step. Do not jump ahead.
- Keep changes minimal and scoped.

#### 2b. Test
- Run the project's test suite or relevant subset.
- Manually verify behavior if no automated tests exist.
- Check for regressions in related functionality.

#### 2c. On Success
- Commit with a descriptive message summarizing the step.
- Inform the user: "Step N complete. Moving to step N+1."
- Proceed to the next step.

#### 2d. On Failure (Debug)
- **Read the error** carefully — what does it actually say?
- **Gather clues** — check logs, stack traces, and recent changes.
- **Isolate** — what specific change caused the failure?
- **Fix or rollback:**
  - If the fix is clear and small: apply it, re-test.
  - If stuck after 2-3 attempts: roll back to the last commit and try a different approach.
- **Never stack fixes** — don't add more changes on top of broken code.

### Phase 3: Finalize

After all steps are complete:
1. Run the full test suite.
2. Verify the feature end-to-end.
3. Summarize what was built, listing all commits/changes made.
4. Note any follow-up items or improvements for later.

## Communication

Throughout the loop, keep the user informed:
- **Before each step:** "Starting step N: [description]"
- **After each step:** "Step N complete ✓" or "Step N failed — debugging..."
- **On rollback:** "Rolling back to last working state. Trying alternative approach."
- **On completion:** Summary of all changes made.

## When to Use

- Implementing any feature that involves more than a trivial change.
- The user says: "build this", "implement this feature", "let's build".
- After a PRD or task list has been created and approved.

## Key Principles

- **Small steps beat big leaps** — each step should be independently verifiable.
- **Test before moving on** — never assume code works.
- **Commit working code** — every commit should leave the project functional.
- **Debug systematically** — don't guess, gather evidence.
- **Roll back over patching** — if stuck, go back to a known good state.
- **Communicate progress** — the user should always know where you are in the loop.
