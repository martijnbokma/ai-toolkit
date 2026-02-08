# Project Conventions

## Code Style
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Keep functions small and focused

## Error Handling
- Handle errors gracefully
- Never expose sensitive information in error messages
- Consider edge cases: invalid input, empty states, network failures, permission errors

## Testing
- Write tests for new functionality
- Maintain existing test coverage
- Test each change before moving to the next

## Context Management
- Be selective: only include information directly relevant to the current task
- Structure prompts clearly: state the goal first, then provide supporting context
- Start fresh conversations for significantly new features to avoid context pollution
- When providing code context, include only the relevant files and functions — not the entire codebase
- If referencing external libraries, provide documentation links or usage examples

## Incremental Development
- Break work into small, independently verifiable steps
- Test after each step before moving on
- Commit working code frequently — every commit should leave the project functional
- If stuck, roll back to the last working state instead of stacking fixes
