# Code Review

Perform a comprehensive code review covering security, performance, readability, best practices, and architecture.

## When

Use this skill when:
- The user asks for a code review or feedback on code.
- Reviewing a pull request or set of changes.
- Evaluating code quality before merging.
- The user asks: "review", "check this code", "what do you think of this".

## How

### 1. Understand the Context
Before reviewing, gather context:
- What is the purpose of this code/change?
- Which files are affected?
- Are there related tests?

### 2. Review Checklist

#### Security
- [ ] No hardcoded secrets, API keys, or credentials.
- [ ] User input is validated and sanitized.
- [ ] Database queries use parameterized queries (no injection risks).
- [ ] Authentication/authorization checks are in place.
- [ ] Sensitive data is not logged or exposed in errors.

#### Performance
- [ ] No unnecessary re-renders or redundant computations.
- [ ] Database queries are optimized (indexes, no N+1 queries).
- [ ] Large lists use virtualization or pagination where appropriate.
- [ ] Assets are lazy-loaded where appropriate.
- [ ] No memory leaks (cleanup of subscriptions, event listeners, timers).

#### Readability & Maintainability
- [ ] Code is self-documenting (clear naming, small functions).
- [ ] Complex logic has explanatory comments.
- [ ] Consistent formatting and style (follows project conventions).
- [ ] No dead code or commented-out blocks.
- [ ] Imports are organized (External → Shared → Relative).

#### Best Practices
- [ ] No `any` types — uses proper interfaces/types.
- [ ] Follows separation of concerns (data access, state management, UI rendering are separated).
- [ ] Types are defined in dedicated type files (SSOT principle).
- [ ] Error handling is appropriate and consistent.
- [ ] No unnecessary dependencies added.

#### Architecture
- [ ] Code is in the correct location (feature modules vs shared modules).
- [ ] No circular dependencies.
- [ ] Changes align with existing patterns in the codebase.
- [ ] Feature boundaries are respected.

#### Testing
- [ ] New functionality has tests.
- [ ] Edge cases are covered.
- [ ] Tests are meaningful (not just for coverage).

### 3. Provide Feedback

Structure your review as:

```markdown
## Summary
[Brief overall assessment: Approve / Request Changes / Comment]

## Highlights
- [What's done well]

## Issues

### Critical (Must Fix)
- [Security issues, bugs, breaking changes]

### Important (Should Fix)
- [Performance issues, maintainability concerns]

### Minor (Consider)
- [Style suggestions, minor improvements]

## Suggestions
- [Optional improvements, alternative approaches]
```

### 4. Verification
After review, suggest running the project's verification commands:
- Typecheck (type safety)
- Linter (code style)
- Test suite (regressions)

## What

Deliver the following:
- **Structured feedback**: Clear categorization of issues by severity.
- **Actionable items**: Specific suggestions with code examples when helpful.
- **Positive reinforcement**: Acknowledge good patterns and decisions.
- **Learning opportunities**: Explain *why* something is an issue, not just *what*.

## Key Rules
- **Be constructive**: Focus on the code, not the author.
- **Prioritize**: Not everything needs to be fixed — distinguish critical from nice-to-have.
- **Context matters**: Consider deadlines, scope, and trade-offs.
- **SSOT**: Reference project documentation for conventions.
