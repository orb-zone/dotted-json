## Description

<!-- Provide a clear description of what this PR does -->

Fixes #<!-- issue number -->

## Changes

<!-- List the main changes in this PR -->

-
-
-

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Test coverage improvement

## Constitution Compliance Checklist

### Core Principles

- [ ] **Tests First (TDD)**: Tests written before implementation
- [ ] **All Tests Pass**: `bun test` shows 100% pass rate
- [ ] **Type Check**: `bun run typecheck` passes with no errors
- [ ] **Lint Clean**: `bun run lint` passes
- [ ] **Build Success**: `bun run build` completes successfully
- [ ] **Bundle Size**: Core remains under 15 kB (check build output)

### Security (if applicable)

- [ ] No user input passed to `dotted()` without sanitization
- [ ] Resolvers validate inputs and sanitize outputs
- [ ] Security implications documented (if touching expression evaluator)
- [ ] No secrets or credentials in code

### Code Quality

- [ ] No `any` types without justification
- [ ] JSDoc comments added for public APIs
- [ ] Breaking changes documented in CHANGELOG.md
- [ ] README updated (if user-facing changes)

### Plugin Architecture (if adding/modifying plugins)

- [ ] Plugin uses documented extension points only
- [ ] No monkey-patching of core methods
- [ ] Plugin is independently testable
- [ ] Plugin is optional peer dependency (not in core dependencies)

### Framework-Agnostic (if touching core)

- [ ] Core library has zero framework dependencies
- [ ] Framework integrations in separate entry points
- [ ] Server-side and CLI usage possible

## Testing

<!-- Describe how you tested these changes -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] Manual testing performed

### Test Results

```bash
# Paste output of: bun test
```

## Documentation

- [ ] Code is self-documenting with clear variable names
- [ ] Complex logic has explanatory comments
- [ ] Public API changes documented in README
- [ ] CHANGELOG.md updated under [Unreleased]

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Notes

<!-- Any additional context, concerns, or discussion points -->

## Checklist Before Merge

- [ ] PR title follows convention: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- [ ] All CI checks passing
- [ ] Code reviewed by at least one maintainer
- [ ] No merge conflicts
- [ ] Branch is up to date with main

---

By submitting this PR, I confirm that my contribution is made under the terms of the MIT License.
