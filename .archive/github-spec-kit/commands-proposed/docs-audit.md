---
description: Audit documentation files for completeness and accuracy
---

Perform a comprehensive documentation audit following project standards.

User input (optional scope): $ARGUMENTS

Audit scope (if not specified by user):
1. README.md - Accuracy, clarity, missing examples
2. docs/getting-started.md - Tutorial completeness
3. docs/API.md - Missing methods, outdated examples
4. docs/*.md - All documentation files
5. examples/*.ts - Working code, correct imports

Check for:
- **CRITICAL**: Missing critical concepts or examples
- **IMPORTANT**: Outdated API usage, broken examples
- **MINOR**: Typos, formatting issues, style inconsistencies

Output findings with severity levels and specific file locations.

Reference `.specify/memory/constitution.md` for documentation standards (JSöN capitalization, markdown linting rules).
