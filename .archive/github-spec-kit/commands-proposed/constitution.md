---
description: View or update the project constitution
---

The project constitution defines core principles and constraints.

User input: $ARGUMENTS

If no arguments provided:
- Display the current constitution from `.specify/memory/constitution.md`
- Summarize key principles

If arguments provided (e.g., "Add principle about..."):
1. Read current constitution
2. Propose amendment following constitutional structure:
   - Principle number/name
   - Rationale
   - Implications
3. Show proposed change
4. Ask for confirmation before writing
5. Update `.specify/memory/constitution.md`
6. Suggest creating a changeset to document the change

**WARNING**: Constitution changes are significant. They affect all future development.
