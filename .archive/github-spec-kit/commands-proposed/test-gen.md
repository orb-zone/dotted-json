---
description: Generate comprehensive test suite for a feature or module
---

Generate tests following TDD principles and project standards.

User input: $ARGUMENTS

Guidelines:
1. Identify the module/feature to test
2. Review existing test patterns in `test/unit/` and `test/integration/`
3. Follow project test conventions:
   - Bun test runner
   - AAA pattern (Arrange, Act, Assert)
   - Descriptive test names
   - Edge cases and error handling
4. Generate test file with:
   - Imports and setup
   - Test suite with describe blocks
   - Individual test cases
   - Cleanup/teardown if needed
5. Place in appropriate directory:
   - `test/unit/` for isolated tests
   - `test/integration/` for database/external deps

Reference `.specify/agents/testing-specialist.md` for testing best practices.
Run `bun test path/to/test.test.ts` to verify tests pass.
