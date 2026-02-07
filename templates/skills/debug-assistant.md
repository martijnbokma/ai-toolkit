# Debug Assistant

Systematically debug issues by identifying root causes, not just symptoms.

## When

Use this skill when:
- The user reports a bug or unexpected behavior.
- An error message appears during development.
- Tests are failing unexpectedly.
- The user asks: "debug", "fix this", "why is this broken", "what's wrong".

## How

### 1. Reproduce the Issue
- Confirm the exact steps to reproduce the problem.
- Note the expected vs actual behavior.
- Identify the environment (browser, Node version, OS).

### 2. Gather Evidence
- Read error messages and stack traces carefully.
- Check relevant log output.
- Identify the last known working state (what changed?).

### 3. Isolate the Root Cause
- **Binary search**: Narrow down the problem area by halving the search space.
- **Minimal reproduction**: Strip away unrelated code until only the bug remains.
- **Check assumptions**: Verify inputs, types, and state at each step.
- **Dependency check**: Has a dependency been updated? Check `package.json` and lock files.

### 4. Fix Strategy
- **Upstream fix**: Fix the root cause, not the symptom.
- **Minimal change**: Prefer single-line fixes over large refactors.
- **Regression test**: Add a test that would have caught this bug.
- **No side effects**: Ensure the fix doesn't break other functionality.

### 5. Verify
Run the project's verification toolchain:
- Typecheck passes
- Linter passes
- All tests pass (including the new regression test)
- Manual verification of the original issue

## Output Format

```markdown
## Bug Analysis

**Symptom:** [What the user sees]
**Root Cause:** [Why it happens]
**Fix:** [What was changed]
**Regression Test:** [Test added to prevent recurrence]
**Verification:** [Commands run to verify the fix]
```

## Key Rules
- **Root cause first**: Never patch symptoms without understanding the cause.
- **One fix at a time**: Don't bundle unrelated changes with the bug fix.
- **Explain the why**: Help the user understand what went wrong and how to prevent it.
- **Preserve behavior**: A bug fix should not change unrelated functionality.
