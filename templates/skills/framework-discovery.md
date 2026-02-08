# Framework Discovery

Help users evaluate and choose the right libraries, frameworks, and tools for their needs.

## When

Use this skill when:
- The user needs to implement functionality that may require a new library or framework.
- The user asks: "what should I use for...", "best library for...", "how to implement...".
- A PRD or task mentions functionality that isn't covered by the current tech stack.
- The user is starting a new project and needs to choose their stack.

## How

### 1. Understand the Need

Before recommending anything:
- What specific problem needs to be solved? (e.g., drag-and-drop, authentication, state management)
- What is the existing tech stack? Check `PROJECT.md`, `package.json`, or equivalent.
- Are there constraints? (bundle size, SSR compatibility, license, team familiarity)

### 2. Research Options

Present 2-4 viable options with a structured comparison:

```markdown
| Library | Pros | Cons | Bundle Size | Maintenance |
|---------|------|------|-------------|-------------|
| Option A | ... | ... | ... | Active |
| Option B | ... | ... | ... | Active |
```

For each option, consider:
- **Compatibility** with the existing stack and build tools.
- **Maturity** — is it battle-tested or bleeding-edge?
- **Community** — active maintenance, good docs, large user base?
- **Training data cutoff** — newer libraries may not be in the AI's training data. Flag this explicitly and suggest providing documentation links.

### 3. Verify Compatibility

Before committing to a choice:
- Check that the library works with the project's framework version.
- Verify it doesn't conflict with existing dependencies.
- If unsure about a newer library, ask the user to provide docs or examples.

### 4. Recommend with Rationale

Provide a clear recommendation with reasoning:

```markdown
## Recommendation: [Library Name]

**Why:** [1-2 sentence rationale]
**Trade-off:** [What you give up vs alternatives]
**Install:** `npm install [package]`
**Docs:** [link]
```

### 5. Provide Usage Examples

After the user agrees on a choice:
- Show a minimal working example in the context of their project.
- Reference the library's official docs for advanced usage.
- If the library is newer than your training data, ask the user to share relevant doc pages.

## Key Rules
- **Never assume one-size-fits-all**: Always consider the project's specific context and constraints.
- **Flag knowledge gaps**: If a library is potentially newer than your training data, say so explicitly.
- **Existing stack first**: Check if the current stack already solves the problem before suggesting new dependencies.
- **Minimize dependencies**: Prefer built-in solutions or existing dependencies over adding new ones.
- **Show, don't just tell**: Provide concrete code examples, not just library names.
