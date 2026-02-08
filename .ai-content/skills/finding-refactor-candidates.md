# Finding Refactor Candidates

Analyze the project and identify files or patterns that are candidates for refactoring based on code quality metrics and project conventions.

## When

Use this skill when:

- The user asks to find "technical debt" or "refactor candidates".
- A new feature is planned and we want to clean up surrounding code first.
- You see patterns that deviate from project standards (e.g., large files or duplication).

## How

### 1. Static Analysis (Scanning)

Use the following commands to find outliers:

- **Size**: `find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | sort -rn | head -20`
- **Any-types**: `grep -r ": any" src/ --include="*.ts" --include="*.tsx"`
- **Hardcoded values**: `grep -r "#[0-9a-fA-F]\{6\}" src/ | grep -v "theme" | grep -v "tailwind"` (loose hex codes)
- **Complexity (Nesting)**: `grep -r "^\s\{16,\}" src/ --include="*.ts" --include="*.tsx"` (deeply nested code > 4 levels)
- **TODOs**: `grep -r -i "TODO\|FIXME" src/`
- **Missing tests**: Look for modules without corresponding test files.

Adapt the `src` path and file extensions to match the project's structure.

### 2. Applying Metrics

Evaluate candidates against these thresholds:

- **Components/Views**: > 350 lines (High), 200-350 lines (Medium).
- **Hooks/Composables**: > 200 lines (High), 100-200 lines (Medium).
- **Services/Modules**: > 300 lines (Medium).

### 3. Architectural Check

- **Module separation**: Are modules properly isolated with clear boundaries?
- **SSOT compliance**:
  - Are types defined in dedicated type files?
  - Are constants centralized?
  - Is data access separated from UI logic?
- **Layering**: Is there UI logic in data layers or data logic in UI components?
- **Test coverage**: Do critical modules have tests?

### 4. Priority Scoring

Rank candidates using a weighted score across four dimensions:

1. **Technical Debt (40%)**: File size, `any` types, hardcoded values, TODOs.
2. **Impact (30%)**: Number of dependent modules (how many things break if this file is bad).
3. **Risk (20%)**: Critical paths (auth, database, payments) and missing tests.
4. **Complexity (10%)**: Nesting depth and cyclomatic complexity.

### 5. Generate Candidates List

After running the analysis, create the candidates list:

1. Run the static analysis commands from step 1
2. Apply the metrics from step 2
3. Check architectural compliance from step 3
4. Calculate priority scores from step 4
5. Generate the candidates list in the format below

## Output Format

```markdown
# Refactor Candidates

> Generated: [DATE]

## Priority Matrix

| #   | File             | Lines | Tech Debt | Impact | Risk | Complexity | Score | Priority | Status |
| --- | ---------------- | ----- | --------- | ------ | ---- | ---------- | ----- | -------- | ------ |
| 1   | path/to/file.tsx | 500   | 5         | 4      | 3    | 4          | 16    | CRITICAL | ⬜     |

## Architectural Violations

| File             | Issue                           | Severity |
| ---------------- | ------------------------------- | -------- |
| path/to/file.tsx | Data access mixed with UI logic | HIGH     |

## Missing Test Coverage

### Modules Without Tests

- moduleName (location)

## Statistics

- Total Source Files: X
- Any-type Occurrences: X
- Architectural Violations: X
- Files > 300 lines: X

## Phase 1 Recommendations

1. **filename.tsx** — Brief description of refactor strategy
2. ...
```

## What to Deliver

The candidates list must include:

- **Priority Matrix**: Table with scores for Debt, Impact, Risk, and Complexity.
- **Top 5 Phase 1**: The most critical candidates for immediate action.
- **Architectural Violations**: List of files violating separation of concerns or SSOT.
- **Missing Tests**: Modules without test coverage.
- **Statistics**: Overview of codebase health.

## Next Steps (Per-File Refactor Pipeline)

**IMPORTANT:** Do NOT start refactoring in this chat session. Each refactor must happen in a **separate, fresh chat** using the `start-refactor` workflow. This keeps context clean and prevents the AI from handling too many files at once.

### After presenting the candidates list

1. Save the candidates list to `docs/REFACTOR_CANDIDATES.md`.
2. Generate **copy-paste prompts** for each candidate, ordered by priority score (highest first).
3. Present them to the user so they can start a new chat per file.

### Output format for prompts

After the candidates list, output the following section:

```markdown
## Ready-to-use prompts

Copy-paste one of these into a **new chat** to start that refactor:

### 1. `[filename]` (Score: [score] | Priority: [priority])

> Refactor `[full/path/to/file]` using the start-refactor workflow.
> Score: [score] | Issues: [brief summary of issues from the matrix].

### 2. `[filename]` (Score: [score] | Priority: [priority])

> Refactor `[full/path/to/file]` using the start-refactor workflow.
> Score: [score] | Issues: [brief summary of issues from the matrix].

(etc.)
```

### Interaction Flow

After presenting the candidates list and prompts, say:

> "I have identified [N] refactor candidates. The list is saved in `docs/REFACTOR_CANDIDATES.md`. To start refactoring, copy one of the prompts above into a **new chat**. Work through them in order of priority — one file per chat."

**Do NOT offer to start refactoring in this chat. Do NOT ask "Shall I start with the first file?".**

## Managing Progress

Update the Status column in the Priority Matrix as refactors progress:

- **⬜** = Not started
- **🔄** = PRD/tasks generated, implementation in progress
- **✅** = Refactor completed and verified

## Key Rules

- **One file at a time**: Never refactor multiple files simultaneously. Complete the full pipeline for one file before moving to the next.
- **Isolated changes**: Each refactor should be self-contained and not introduce regressions in other files.
- **Context-aware**: Look beyond just lines; understand the impact on the rest of the system.
- **SSOT Focus**: Prioritize fixing duplication and scattered source of truth.
