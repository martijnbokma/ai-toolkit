# Workflow: Generating a Refactoring PRD (R-PRD)

## Goal

Guide an AI assistant in creating a detailed Refactoring Product Requirements Document (R-PRD) in Markdown format. This document focuses on improving code quality, maintainability, and scalability without changing functional behavior.

## Modes

### Fast-Track Mode (used by `start-refactor` workflow)

When called from the `start-refactor` workflow, the candidates list already provides scores, issues, and architectural violations. In this mode:

- **Skip clarifying questions** — use the context from `docs/REFACTOR_CANDIDATES.md` and the source files directly.
- **Skip separate task generation pause** — tasks are generated in the same pass as the PRD.
- **Output is embedded** in the combined `docs/refactor-[filename].md` document (not a separate file).
- **Use recommended defaults** for all decisions based on project conventions and best practices.

### Standard Mode (standalone use)

When called directly by the user (not via `start-refactor`), follow the full interactive process below.

## Process (Standard Mode)

1. **Read Project Context First:** **MANDATORY** — Read the project's architecture documentation, conventions, and SSOT before starting. This ensures alignment with the existing codebase structure.
2. **Receive Refactoring Request:** The user identifies a module, component, or pattern that needs cleanup or restructuring.
3. **Ask Clarifying Questions & Provide Advice:** Ask 3-5 critical questions to understand the scope and risks. Provide options in letter/number lists. **MANDATORY:** For each question, indicate which option is "Recommended" based on best practices (DRY, SSOT, modularity) and briefly explain why.
   - _Example: "What is the primary driver? A. Technical debt (Recommended — improves maintainability), B. Performance"_
4. **Generate R-PRD:** Use the structure below, integrating the project's architecture and conventions.
5. **Save R-PRD:** Save as `docs/prd-refactor-[module-name].md` (create the `docs/` directory if it doesn't exist).
6. **Generate Tasks from R-PRD:** **MANDATORY** — Always generate a task list immediately after saving the R-PRD. This step is never optional.
   - Use the `generate-tasks` workflow with the saved R-PRD as input
   - Treat the R-PRD as the "requirements documentation"
   - Follow the two-phase process: first generate parent tasks, wait for user "Go" confirmation, then generate sub-tasks
   - Save the task list as `docs/tasks-refactor-[module-name].md`
7. **Ask to Start First Task:** After the task list is complete, ask the user: "Shall we start with the first task?" Wait for confirmation before proceeding.

## Core Principles

Every R-PRD must evaluate and apply these principles:

### 1. SSOT (Single Source of Truth)

- Types defined once in dedicated type files
- No "convenience copies" of types or interfaces
- Central config files for constants

### 2. DRY (Don't Repeat Yourself)

- If a pattern appears 2+ times → extract to shared utilities
- Normalize naming and structure
- Identify duplicate logic, queries, or UI patterns

### 3. Modular Architecture

- Feature-specific code stays within feature boundaries
- Cross-feature/generic code goes to shared modules
- Separation of Concerns:
  - **Services/Data layer:** Data access, no UI logic
  - **Hooks/State layer:** State management, lifecycle, error handling
  - **Components/UI layer:** Rendering, no complex business logic

## Clarifying Questions (Guidelines)

Focus on:

- **Current Pain Points:** Why refactor now?
- **DRY Violations:** Are there duplicate patterns that should be extracted?
- **SSOT Compliance:** Are types/logic defined in multiple places?
- **Modularity:** Should code move between feature modules and shared modules?
- **Impact Scope:** Which features or shared modules are affected?
- **Verification Strategy:** How will we ensure no regression? (Typecheck, lint, tests)

## Decision Support & Advisory

To reduce user decision stress and ensure architectural consistency, the AI must act as a **Senior Architect**:

1. **Mandatory Recommendations:** Every clarifying question must have a "Recommended" option.
2. **Contextual Rationale:** Explain _why_ an option is recommended using project-specific context.
3. **Trade-off Analysis:** If there are two viable paths, briefly mention the trade-off (e.g., "Option A is cleaner but takes longer than Option B").
4. **"Best for Project" Default:** If the user is unsure, explicitly state: "Based on best practices, I will proceed with Option X unless you object."

## R-PRD Structure

1. **Overview & Rationale:** Why is this refactor necessary? What are the current issues (e.g., DRY violations, mixed concerns)?

2. **Principle Analysis:** Evaluate against core principles:
   - **DRY Check:** Identify duplicate patterns, logic, or UI that should be extracted
   - **SSOT Check:**
     - Are types defined in dedicated type files?
     - Are constants centralized?
     - No "convenience copies" of interfaces?
   - **Modularity Check:**
     - Is separation of concerns correct (Data → State → UI)?
     - Should code be in feature modules or shared modules?
   - **Architecture Check:**
     - Data layer: No UI logic, only data access
     - State layer: State management, lifecycle, error handling
     - UI layer: Rendering, no complex business logic

3. **Refactoring Goals:** Specific technical objectives (e.g., "Extract data access logic to a service", "Consolidate duplicated types into shared types").

4. **Impact Analysis:**
   - **Affected Components/Modules:** List of files/modules to be touched.
   - **Dependencies:** What depends on this code?
   - **Location Decision:** Should this stay in feature modules or move to shared?

5. **Proposed Changes & Rationale:**
   - **Structural Changes:** Moving files, splitting components. Include the "Why".
   - **DRY Improvements:** Extracted utilities, shared hooks, or common patterns.
   - **Logic Refactoring:** Extracting hooks, simplifying complex functions.
   - **Pattern Alignment:** Aligning with project architecture.

6. **Non-Goals:** Explicitly state what _not_ to change (e.g., "No UI changes", "No new features").

7. **Technical Constraints:** Mention any known constraints, dependencies, or framework-specific considerations.

8. **Verification & Quality Checklist:**
   - [ ] Typecheck passes
   - [ ] Linter passes
   - [ ] Relevant tests passing
   - [ ] No new DRY violations introduced
   - [ ] SSOT maintained (no duplicate type definitions)
   - [ ] Performance check (if applicable)

9. **Success Metrics:** (e.g., "Reduced LOC from X to Y", "Extracted N reusable components", "Zero regressions")

## Output

- **Format:** Markdown (`.md`)
- **Filename:** `docs/prd-refactor-[module-name].md`
