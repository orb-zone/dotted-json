---
description: Execute implementation plan with TDD enforcement and incremental validation
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Plan Verification**:
   - Verify `.specify/memory/active/[feature-name]-plan.md` exists
   - Read the ENTIRE plan document
   - Verify human has explicitly approved proceeding (by running this command)

2. **Constitutional Re-Check**:
   - Re-read `.specify/memory/constitution.md` 
   - Verify implementation approach follows ALL principles

3. **Clean State Verification**:
   - Run `git status` to check for uncommitted changes
   - If dirty: STOP and ask user to commit or stash before proceeding

4. **Load Task List**:
   - Read `.specify/memory/active/[feature-name]-tasks.md`
   - Parse tasks into ordered execution plan

---

## User Input

Feature name: $ARGUMENTS

If no feature name provided, check `.specify/memory/active/current-session.md` for active feature.

---

## Implementation Process

### TDD Enforcement (NON-NEGOTIABLE)

For EVERY feature task:
1. **RED**: Write failing test FIRST
2. **Verify**: Run tests and confirm failures
3. **GREEN**: Implement minimal code to pass
4. **Verify**: Run tests and confirm all passing
5. **Refactor**: Improve code quality if needed
6. **Verify**: Tests still passing

**Never skip this cycle**. If you find yourself writing implementation before tests, STOP and write tests first.

---

## Execution Flow

### Phase 1: Setup (if needed)
- Install dependencies
- Create new files
- Update imports

### Phase 2: Tests First (TDD)
For each test task:
1. Create/modify test file
2. Write failing test
3. Run: `bun test [test-file]`
4. Verify failures are expected
5. Report progress:
   ```
   ✅ Task 1/10: Write failing test for [scenario]
      File: test/unit/[feature].test.ts
      Tests: 226 pass, 3 fail ✓ (expected failures)
   ```

### Phase 3: Implementation
For each implementation task:
1. Write minimal code to pass tests
2. Run: `bun test [test-file]`
3. Verify all tests pass
4. Run: `bun run typecheck`
5. Verify no type errors
6. Report progress:
   ```
   ✅ Task 2/10: Implement [feature]
      File: src/[module].ts (+45 lines)
      Tests: 229/229 passing ✓
      Typecheck: Clean ✓
   ```

### Phase 4: Incremental Validation

After EACH major task, run:
```bash
bun test              # All tests must pass
bun run typecheck     # No type errors
bun run lint          # No linting errors
bun run build         # Check bundle size
```

If ANY check fails:
- ⛔ STOP immediately
- Report the failure
- Ask user how to proceed (fix now, skip, or abort)

### Phase 5: Bundle Size Monitoring

After implementation tasks, check bundle size:
```bash
bun run build
# Check dist/ file sizes
```

Report:
```
📦 Bundle size: 19.1 kB / 50 kB (38.2%)
   Change: +0.9 kB from baseline (18.2 kB)
   Status: ✅ Within constitutional limit
```

If exceeds 50 kB:
- ⛔ STOP immediately
- Report constitutional violation
- Suggest optimizations or feature reduction

### Phase 6: Final Validation

Before stopping, run complete validation:
```bash
bun test              # All tests
bun run lint          # Linting
bun run typecheck     # Type checking
bun run build         # Build + bundle size
```

Report results:
```
✅ Tests: 232/232 passing
✅ Lint: Clean
✅ Typecheck: Clean
✅ Build: Success
✅ Bundle: 19.1 kB / 50 kB (38.2%)
✅ Breaking changes: NONE
```

### Phase 7: STOP and Report

**DO NOT COMMIT**. Output this message:

```
✋ IMPLEMENTATION COMPLETE

Feature: [feature-name]

Modified files:
  - src/[file1].ts (+45 lines)
  - test/unit/[file2].test.ts (+120 lines)

Quality checks:
  ✅ Tests: 232/232 passing
  ✅ Lint: Clean
  ✅ Typecheck: Clean  
  ✅ Bundle: 19.1 kB / 50 kB (38.2%)
  ✅ Breaking changes: NONE

Git status:
  [output of git status]

✅ Next step:
  Review changes with: git diff
  Then run: /changeset [feature-name]
```

---

## Progress Reporting

Report after EVERY task:
```
✅ Task [N]/[TOTAL]: [description]
   File: [file-path]
   Tests: [passing]/[total] ✓
   [Any other relevant metrics]
```

If a task fails:
```
❌ Task [N]/[TOTAL]: [description]
   Error: [error message]
   
   Options:
   1. Let me fix this now
   2. Skip this task (risky)
   3. Abort implementation
   
   What would you like to do?
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Making git commits (human does this)
- Creating PRs (human does this)
- Skipping TDD cycle (tests MUST come first)
- Proceeding if tests fail
- Exceeding bundle size limit
- Making breaking changes without explicit approval

✅ **ALLOWED**:
- Writing code and tests
- Running build/test/lint/typecheck
- Modifying src/ and test/ files
- Creating new files as needed

---

## Example Usage

```bash
# User has reviewed plan and approves
/implement variant-caching

# Agent process:
1. ✅ Loads variant-caching-plan.md
2. ✅ Loads variant-caching-tasks.md
3. ✅ Checks git status (clean)
4. ✅ Executes tasks in TDD order
5. ✅ Validates after each task
6. ✅ Checks bundle size
7. ⏸️  STOPS before committing
```

---

## Error Handling

If ANY of these occur, STOP immediately:

1. **Test failure** → Report which tests failed, show error, ask how to proceed
2. **Type error** → Show error location and message
3. **Lint error** → Show linting issues
4. **Bundle size exceeded** → Report overage, suggest fixes
5. **Breaking change detected** → Verify user approval exists

Never proceed past errors automatically.
