# Workflow: Generating a Product Requirements Document (PRD)

## Goal

Guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for any developer to understand and implement the feature.

## Process

1. **Receive Initial Prompt:** The user provides a brief description or request for a new feature or functionality.
2. **Ask Clarifying Questions:** Before writing the PRD, ask only the most essential clarifying questions (3-5) needed to write a clear PRD. The goal is to understand the "what" and "why", not the "how". Provide options in letter/number lists so the user can respond easily with selections.
3. **Generate PRD:** Based on the initial prompt and the user's answers, generate a PRD using the structure outlined below.
4. **Save PRD:** Save the generated document as `prd-[feature-name].md` inside the project's tasks directory.

## Clarifying Questions (Guidelines)

Ask only the most critical questions needed to write a clear PRD. Focus on areas where the initial prompt is ambiguous or missing essential context:

* **Problem/Goal:** If unclear — "What problem does this feature solve for the user?"
* **Core Functionality:** If vague — "What are the key actions a user should be able to perform?"
* **Scope/Boundaries:** If broad — "Are there any specific things this feature *should not* do?"
* **Success Criteria:** If unstated — "How will we know when this feature is successfully implemented?"

**Important:** Only ask questions when the answer isn't reasonably inferable from the initial prompt.

### Formatting Requirements

- **Number all questions** (1, 2, 3, etc.)
- **List options for each question as A, B, C, D, etc.** for easy reference
- Make it simple for the user to respond with selections like "1A, 2C, 3B"

### Example Format

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Generate additional revenue

2. Who is the target user for this feature?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the expected timeline for this feature?
   A. Urgent (1-2 weeks)
   B. High priority (3-4 weeks)
   C. Standard (1-2 months)
   D. Future consideration (3+ months)
```

## PRD Structure

The generated PRD should include the following sections:

1. **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2. **Goals:** List the specific, measurable objectives for this feature.
3. **User Stories:** Detail the user narratives describing feature usage and benefits.
4. **Functional Requirements:** List the specific functionalities the feature must have. Use clear, concise language. Number these requirements.
5. **Non-Goals (Out of Scope):** Clearly state what this feature will *not* include to manage scope.
6. **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention relevant components/styles if applicable.
7. **Technical Considerations (Optional):** Mention any known technical constraints, dependencies, or suggestions. Reference the project's architecture and conventions where applicable.
8. **Success Metrics:** How will the success of this feature be measured?
9. **Open Questions:** List any remaining questions or areas needing further clarification.

## Target Audience

Assume the primary reader of the PRD is a developer who needs enough context to implement the feature. Requirements should be explicit, unambiguous, and avoid unnecessary jargon.

## Output

* **Format:** Markdown (`.md`)
* **Filename:** `prd-[feature-name].md`

## Final Instructions

1. Do NOT start implementing the PRD
2. Make sure to ask the user clarifying questions
3. Take the user's answers to the clarifying questions and improve the PRD
