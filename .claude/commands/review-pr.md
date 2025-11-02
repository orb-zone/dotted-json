---
description: Constitutional PR review with bundle size, tests, breaking changes, and changeset validation
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Constitutional Review**:
   - Read `.specify/memory/constitution.md` in FULL
   - Verify review criteria align with constitutional principles

2. **Specialist Auto-Loading**:
   - Load `.specify/agents/pr-review-specialist.md` for review expertise

3. **Git Context**:
   - Get current branch name
   - Get git diff vs base branch (default: main)
   - Get recent commit messages

---

## User Input

PR number or branch name (optional): $ARGUMENTS

If no arguments provided, review current branch.

---

## Review Process

### Step 1: Gather PR Context

Run the following commands in parallel:

```bash
# Get current branch
git branch --show-current

# Get git status
git status

# Get diff stats vs main
git diff main...HEAD --stat

# Get commit messages since divergence
git log main...HEAD --oneline

# Get full diff
git diff main...HEAD
```

Parse the output to understand:
- What files changed
- How many lines added/removed
- What commits are included
- Current branch state

### Step 2: Constitutional Compliance Checks

Run these validation checks in parallel:

**2.1: Bundle Size Check**
```bash
bun run build
```

Parse output for:
- Current bundle size (target: < 50 kB minified)
- Size comparison (if available)
- Whether size limit is exceeded

**2.2: Test Suite**
```bash
bun test
```

Verify:
- All tests pass (100% pass rate required)
- No skipped tests
- Test count increased (if new features added)

**2.3: Type Checking**
```bash
bun run typecheck
```

Verify:
- Zero TypeScript errors
- No type suppressions added (`@ts-ignore`, `@ts-expect-error`)

**2.4: Linting**
```bash
bun run lint
```

Verify:
- Zero lint errors
- Zero lint warnings (if possible)

### Step 3: Breaking Change Detection

Analyze the git diff for breaking changes:

**API Changes** (CRITICAL):
- ❌ Removed exports from `src/index.ts`
- ❌ Renamed public functions/classes/types
- ❌ Changed function signatures (parameters, return types)
- ❌ Changed default option values
- ❌ Removed public properties/methods
- ❌ Changed behavior without backward compatibility

**Safe Changes** (OK):
- ✅ Added new exports
- ✅ Added optional parameters (with defaults)
- ✅ Internal refactoring (no public API changes)
- ✅ Bug fixes that restore documented behavior
- ✅ Documentation updates

**Detection Strategy**:
1. Extract all `export` statements from diff
2. Check for removals or renames
3. Analyze function signature changes
4. Flag default value changes

### Step 4: Changeset Validation

Check for changeset file:

```bash
ls -la .changeset/*.md | grep -v README
```

**Required if**:
- Code changes in `src/` directory
- Changes affect public API
- Bug fixes or new features

**Not required if**:
- Only documentation changes
- Only test changes
- Only tooling/config changes

**If changeset exists**, validate:
- Version bump matches change type (patch/minor/major)
- Description accurately reflects changes
- Breaking changes documented with migration guide
- Package name is correct: `@orb-zone/dotted-json`

**If changeset missing**:
- Determine if one is needed
- Suggest appropriate version bump type
- Draft changeset description

### Step 5: Code Quality Review

**5.1: Plugin Architecture Compliance**
- Plugins in `src/plugins/` use peer dependencies
- No framework dependencies in core (`src/dotted-json.ts`, `src/expression-evaluator.ts`)
- Plugins properly exported from `src/index.ts`

**5.2: Security Review**
- No `eval()` or `Function()` constructor usage
- Schemas from trusted sources only
- Expression evaluation uses safe parser
- No SQL injection vulnerabilities (SurrealDB queries)

**5.3: Documentation**
- JSDoc comments on public APIs
- Examples compile and run
- README updated if user-facing changes
- API.md updated if API changes

**5.4: Test Quality**
- Tests follow TDD pattern (tests likely written first)
- Edge cases covered (null, undefined, empty, large inputs)
- Integration tests for new features
- Performance tests if perf-critical

### Step 6: Generate Review Report

Create a comprehensive review report:

```markdown
# PR Review Report

## Branch
- **Current**: [branch-name]
- **Base**: main
- **Commits**: [count]
- **Files Changed**: [count]
- **Lines**: +[added] -[removed]

## Constitutional Compliance

### ✅ Quality Gates
- [✅/❌] Tests: [pass-count]/[total-count] passing
- [✅/❌] Bundle: [size] kB / 50 kB ([percent]%)
- [✅/❌] TypeCheck: [error-count] errors
- [✅/❌] Lint: [error-count] errors

### ⚠️ Breaking Changes
[If any detected]:
- [List of breaking changes]
- **Requires**: MAJOR version bump
- **Migration guide**: [Present/Missing]

[If none]:
- No breaking changes detected

### 📦 Changeset
[If present]:
- **Version**: [patch/minor/major]
- **Accurate**: [YES/NO]
- **Complete**: [YES/NO]

[If missing and needed]:
- **Recommendation**: [patch/minor/major]
- **Reason**: [explanation]

## Code Quality

### Plugin Architecture
- [✅/❌] Core remains framework-agnostic
- [✅/❌] Plugins use peer dependencies
- [✅/❌] Proper exports maintained

### Security
- [✅/⚠️/❌] Expression evaluation: [assessment]
- [✅/⚠️/❌] Schema sources: [assessment]
- [✅/❌] No unsafe code patterns

### Documentation
- [✅/⚠️/❌] API docs: [status]
- [✅/⚠️/❌] Examples: [status]
- [✅/⚠️/❌] README: [status]

### Test Quality
- **Coverage**: [new/modified] tests for [new/modified] features
- **Edge Cases**: [assessment]
- **Integration**: [assessment]

## File Changes

[Group by category]:

**Core Changes**:
- [file]: [summary]

**Plugin Changes**:
- [file]: [summary]

**Test Changes**:
- [file]: [summary]

**Documentation Changes**:
- [file]: [summary]

## Recommendations

### 🔴 Blockers (Must Fix)
[List of issues that block merge]:
- [blocker-1]

### 🟡 Warnings (Should Fix)
[List of issues that should be addressed]:
- [warning-1]

### 🟢 Suggestions (Nice to Have)
[List of optional improvements]:
- [suggestion-1]

## Summary

[2-3 sentence summary of PR]:
- What it does
- Impact assessment
- Merge readiness

**Merge Status**: [✅ READY / ⚠️ READY WITH CAVEATS / ❌ NOT READY]
```

### Step 7: Output Report

Display the full review report to the user.

**DO NOT**:
- Make any commits
- Approve/merge PRs automatically
- Create GitHub comments
- Modify files

**DO**:
- Provide comprehensive feedback
- Identify blocking issues
- Suggest improvements
- Validate constitutional compliance

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Making git commits
- Approving PRs automatically
- Merging PRs
- Creating GitHub comments
- Modifying code

✅ **ALLOWED**:
- Running quality gates (test, build, lint, typecheck)
- Analyzing git diff
- Reading constitution
- Generating review report
- Suggesting improvements

---

## Example Usage

```bash
# Review current branch
/review-pr

# Review specific branch
/review-pr feature/variant-caching

# Review by PR number (requires gh CLI)
/review-pr 42
```

---

## Integration with Workflow

This command fits in the workflow after implementation:

```
/plan [feature]
  ↓
/implement [feature]
  ↓
/review-pr  ← YOU ARE HERE
  ↓
[Fix issues if any]
  ↓
/changeset [feature]
  ↓
[Commit & create PR]
```

---

## Success Criteria

A successful review identifies:
- ✅ All constitutional compliance issues
- ✅ All breaking changes
- ✅ Bundle size impact
- ✅ Test coverage gaps
- ✅ Documentation needs
- ✅ Security concerns
- ✅ Changeset accuracy

And provides:
- ✅ Clear merge recommendation
- ✅ Actionable feedback
- ✅ Prioritized issues (blockers vs warnings vs suggestions)
