# Incremental Development

Build features in small, verifiable steps. Test after each step and commit on success.

## When

Use this skill when:
- Implementing a new feature or significant change.
- The user asks: "build this", "implement", "add feature", "create".
- The task involves more than a single file change.

## How

### 1. Break Down the Work

Before writing any code:
- Identify the smallest unit of functionality that can be built and tested independently.
- Order steps so each builds on the last and the app stays functional throughout.
- Aim for steps that take 1-5 minutes each, not hours.

### 2. One Step at a Time

For each step:
- **Implement** only the current step — resist the urge to jump ahead.
- **Test immediately** — run the app, execute tests, or verify in the browser.
- **Confirm it works** before moving to the next step.

### 3. Commit on Success

After each working step:
- Create a meaningful commit with a descriptive message.
- This gives you a safe rollback point if the next step breaks something.
- Never batch multiple unrelated changes into one commit.

### 4. Handle Failures

If a step breaks something:
- **Stop and debug** — don't pile more changes on top of broken code.
- If the fix isn't obvious within a few minutes, roll back to the last working commit and try a different approach.
- Avoid the trap of "one more change might fix it" — that leads to cascading issues.

### 5. Verify the Whole

After all steps are complete:
- Run the full test suite.
- Verify the feature end-to-end.
- Check for regressions in related functionality.

## Example Workflow

Building a user profile page:
1. ✅ Create the route and render an empty page → test → commit
2. ✅ Add the data fetching logic → test → commit
3. ✅ Build the UI layout with static data → test → commit
4. ✅ Connect UI to real data → test → commit
5. ✅ Add error handling and loading states → test → commit
6. ✅ Add form validation for profile editing → test → commit

## Key Rules
- **Small steps over big leaps**: Each step should be independently verifiable.
- **Always test before moving on**: Never assume code works — verify it.
- **Commit working code**: Every commit should leave the project in a functional state.
- **Roll back, don't patch**: If you're stuck, go back to the last working state instead of adding workarounds.
- **Communicate progress**: Tell the user what step you're on and what's next.
