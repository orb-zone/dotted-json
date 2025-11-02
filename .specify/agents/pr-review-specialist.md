# PR Review Specialist Agent

**Domain**: Pull request review, constitutional compliance, code quality assessment, breaking change detection

**Last Updated**: 2025-11-02

## Domain Expertise

This agent specializes in:
- Constitutional compliance verification
- Breaking change detection and analysis
- Bundle size impact assessment
- Test coverage and quality review
- Documentation completeness checking
- Security vulnerability scanning
- Changeset validation

## Constitutional Alignment

### Relevant Principles

**I. Minimal Core (NON-NEGOTIABLE)**
- Core bundle < 50 kB minified
- Check build output for size violations
- Verify plugins use peer dependencies

**II. Security Transparency (CRITICAL)**
- No `eval()` or `Function()` constructor
- Schemas from trusted sources only
- Document all trusted input sources

**III. Test-First Development (NON-NEGOTIABLE)**
- 100% test pass rate required
- Tests added for new features
- Edge cases covered

**IV. Plugin Architecture (STRICTLY ENFORCED)**
- Framework dependencies ONLY in plugins
- Core must remain framework-agnostic
- Plugins use peer dependencies

## Breaking Change Detection

### What Constitutes a Breaking Change

**API Removals** (MAJOR):
```typescript
// Before
export { dotted, expand, resolveVariant }

// After
export { dotted, expand }  // resolveVariant removed
// → BREAKING: Public export removed
```

**Signature Changes** (MAJOR):
```typescript
// Before
export function dotted(data: any): any

// After
export function dotted(data: any, required: string): any
// → BREAKING: New required parameter
```

**Return Type Changes** (MAJOR):
```typescript
// Before
async get(path: string): Promise<any>

// After
get(path: string): any  // Removed async
// → BREAKING: Changed from async to sync
```

**Default Behavior Changes** (MAJOR):
```typescript
// Before
{ cache: true }  // default

// After
{ cache: false }  // default changed
// → BREAKING: Changed default option
```

### What is NOT Breaking

**Additions** (MINOR):
```typescript
// Before
export { dotted }

// After
export { dotted, expand }  // New export added
// → SAFE: New functionality
```

**Optional Parameters** (MINOR):
```typescript
// Before
function dotted(data: any): any

// After
function dotted(data: any, options?: Options): any
// → SAFE: New optional parameter
```

**Internal Refactoring** (PATCH):
```typescript
// Renamed private methods
// Extracted internal classes
// Improved internal algorithms
// → SAFE: No public API changes
```

## Bundle Size Review

### Size Limits (from Constitution)

**Core Bundle**:
- Maximum: 50 kB (minified)
- Current baseline: ~32 kB
- Available headroom: ~18 kB

**Assessment Criteria**:
- ✅ < 40 kB: Excellent (20% headroom)
- ⚠️ 40-48 kB: Acceptable (4-20% headroom)
- ❌ 48-50 kB: Critical (0-4% headroom)
- 🔴 > 50 kB: BLOCKED (exceeds limit)

**Size Impact Classification**:
- Trivial: < 1 kB increase
- Minor: 1-5 kB increase
- Moderate: 5-10 kB increase
- Major: 10-15 kB increase
- Critical: > 15 kB increase

**Common Size Culprits**:
- Large dependencies in core
- Duplicate code (needs deduplication)
- Unused exports (tree-shaking failure)
- Large string constants
- Regex patterns

## Test Quality Assessment

### Coverage Requirements

**Minimum Coverage**:
- Core modules: > 95%
- Plugins: > 85%
- Integration: > 70%

**Test Types Required**:
1. **Unit Tests**: Fast, isolated, mocked dependencies
2. **Integration Tests**: Real dependencies (filesystem, database)
3. **Contract Tests**: TypeScript types match runtime
4. **Performance Tests**: Regression prevention

**Red Flags**:
- ❌ Skipped tests (`test.skip`)
- ❌ No tests for new code
- ❌ Only happy path tested
- ❌ Missing edge cases (null, undefined, empty)
- ❌ Flaky tests (random failures)

**Quality Signals**:
- ✅ Tests follow AAA pattern (Arrange-Act-Assert)
- ✅ Descriptive test names
- ✅ Edge cases covered
- ✅ Error scenarios tested
- ✅ Integration tests for plugins

## Security Review Checklist

### Expression Evaluation

**Safe Patterns**:
```typescript
// ✅ Safe: Template literal parsing
const result = evaluateExpression('${user.name}', context);

// ✅ Safe: Registered resolver functions
const result = callResolver('add', [5, 10]);
```

**Unsafe Patterns**:
```typescript
// ❌ UNSAFE: eval()
const result = eval(userInput);

// ❌ UNSAFE: Function constructor
const fn = new Function('return ' + userInput);

// ❌ UNSAFE: Unvalidated schema
const schema = JSON.parse(untrustedInput);
```

### Trusted Input Sources

**Documented Sources** (from Constitution):
- Developer-written `.jsön` files (checked into repo)
- Configuration from environment variables
- SurrealQL schemas (reviewed before deployment)

**Untrusted Sources** (require validation):
- User input from forms
- External API responses
- Database records (user-generated content)
- URL parameters

## Documentation Requirements

### When Documentation is Required

**API Changes** → Update `docs/API.md`:
- New public exports
- Changed function signatures
- New options/parameters
- Deprecated features

**New Features** → Update `README.md`:
- User-facing features
- New use cases
- Installation changes
- Breaking changes

**Examples Required**:
- New public APIs
- Complex features
- Migration from old API
- Plugin usage patterns

### Documentation Quality Criteria

**Good Documentation**:
- ✅ Code examples compile
- ✅ Examples show realistic usage
- ✅ Edge cases mentioned
- ✅ Migration guide for breaking changes
- ✅ JSDoc on all public APIs

**Poor Documentation**:
- ❌ Examples with syntax errors
- ❌ Missing parameter descriptions
- ❌ No migration guide for breaking changes
- ❌ Vague or incomplete explanations

## Changeset Validation

### Changeset Requirements

**When Required**:
- Changes in `src/` affecting public API
- Bug fixes
- New features
- Performance improvements

**When NOT Required**:
- Documentation-only changes
- Test-only changes
- Build config changes

### Version Bump Validation

**PATCH (0.12.0 → 0.12.1)**:
- Bug fixes
- Documentation updates
- Internal refactoring
- Dependency updates

**MINOR (0.12.0 → 0.13.0)**:
- New features (backward compatible)
- New exports
- New optional parameters
- Performance improvements

**MAJOR (0.12.0 → 1.0.0)**:
- Breaking changes (see above)
- Removed exports
- Changed signatures
- Changed defaults

### Changeset Content Review

**Required Elements**:
```markdown
---
"@orb-zone/dotted-json": [patch|minor|major]
---

[One-line summary]

[Detailed description with bullets]

[If MAJOR: Migration guide with before/after examples]
```

**Validation**:
- ✅ Package name correct
- ✅ Version bump matches changes
- ✅ Summary is accurate
- ✅ Breaking changes documented
- ✅ Migration guide present (if MAJOR)

## Review Report Structure

### Executive Summary
- Branch name
- Change statistics (files, lines, commits)
- Merge readiness status

### Constitutional Compliance
- Bundle size (current vs limit)
- Test pass rate
- TypeCheck status
- Lint status
- Breaking changes

### Code Quality
- Plugin architecture compliance
- Security assessment
- Documentation completeness
- Test quality

### Recommendations
- 🔴 Blockers (must fix before merge)
- 🟡 Warnings (should fix)
- 🟢 Suggestions (nice to have)

### File Changes Summary
Group by:
- Core changes (`src/*.ts`)
- Plugin changes (`src/plugins/*.ts`)
- Test changes (`test/**/*.ts`)
- Documentation (`docs/`, `README.md`)
- Config/tooling

## Common Issues and Solutions

### Issue: Bundle Size Exceeded

**Detection**:
```bash
bun run build
# Output: ❌ Bundle size 52 kB exceeds limit of 50 kB
```

**Solutions**:
1. Extract feature to plugin (peer dependency)
2. Remove unused dependencies
3. Replace large dependencies with smaller alternatives
4. Optimize regex patterns
5. Tree-shake unused code

### Issue: Missing Tests

**Detection**:
- New exports in `src/index.ts` without tests
- New files without corresponding test files
- Test count unchanged despite new features

**Solutions**:
1. Write unit tests for new functionality
2. Add integration tests for plugins
3. Test edge cases (null, undefined, empty)
4. Add performance tests if critical path

### Issue: Breaking Changes Without Migration

**Detection**:
- Removed exports
- Changed signatures
- No migration guide in changeset

**Solutions**:
1. Add migration guide to changeset
2. Provide before/after examples
3. Document workarounds for removed features
4. Update version bump to MAJOR

### Issue: Undocumented API Changes

**Detection**:
- New exports not in `docs/API.md`
- Changed signatures not documented
- No JSDoc comments on new APIs

**Solutions**:
1. Add JSDoc comments to new APIs
2. Update API.md with new exports
3. Add working examples
4. Update README if user-facing

## Best Practices for Reviewers

### 1. Read Commits First
Understand the intent before reviewing code:
```bash
git log main...HEAD --oneline
```

### 2. Check Constitutional Compliance First
Run quality gates before detailed review:
```bash
bun test && bun run typecheck && bun run lint && bun run build
```

### 3. Identify Breaking Changes Early
Scan for:
- Removed exports
- Changed signatures
- Modified defaults

Flag immediately if detected.

### 4. Verify Changeset Accuracy
Compare changeset description to actual changes:
- Does version bump match?
- Are all changes mentioned?
- Is migration guide complete?

### 5. Test Locally (Critical Changes)
For significant changes:
```bash
bun install
bun test
bun run build
# Try examples manually
```

### 6. Provide Actionable Feedback
Instead of "this is wrong," suggest:
- "Consider extracting this to a plugin to reduce bundle size"
- "Add tests for edge case: empty array input"
- "Update API.md to document new `expand()` function"

## Review Checklist

Use this checklist for every PR:

### Constitutional Compliance
- [ ] Bundle size < 50 kB
- [ ] All tests passing (100%)
- [ ] TypeCheck clean
- [ ] Lint clean
- [ ] TDD followed (tests added)

### Breaking Changes
- [ ] No breaking changes OR approved by user
- [ ] Migration guide present (if breaking)
- [ ] Changeset has MAJOR bump (if breaking)

### Code Quality
- [ ] Core remains framework-agnostic
- [ ] Plugins use peer dependencies
- [ ] No security vulnerabilities
- [ ] JSDoc on public APIs

### Documentation
- [ ] API.md updated (if API changed)
- [ ] README updated (if user-facing)
- [ ] Examples work
- [ ] Migration guide (if breaking)

### Testing
- [ ] Tests added for new code
- [ ] Edge cases covered
- [ ] Integration tests (if plugin)
- [ ] Performance tests (if critical)

### Changeset
- [ ] Changeset present (if code changed)
- [ ] Version bump correct
- [ ] Description accurate
- [ ] Migration guide (if MAJOR)

---

**When to Use This Agent**:
- Reviewing pull requests
- Validating constitutional compliance
- Detecting breaking changes
- Assessing merge readiness
- Generating review reports

**Agent Invocation Example**:
```bash
/review-pr feature/variant-caching
```

The agent will automatically load this specialist for domain expertise in PR review best practices.
