<!--
Sync Impact Report (Version 1.0.0)
================================================
Version Change: INITIAL → 1.0.0
Ratification Date: 2025-10-05
Last Amendment: 2025-10-05

Modified Principles: N/A (initial version)
Added Sections:
  - Core Principles (7 principles)
  - Security Requirements
  - Development Workflow
  - Governance

Removed Sections: N/A

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section references constitution
  ✅ spec-template.md - No updates needed (implementation-agnostic)
  ✅ tasks-template.md - No updates needed (follows TDD principles)

Follow-up TODOs: None
================================================
-->

# dotted-json Constitution

## Core Principles

### I. Minimal Core, Optional Plugins

The core library MUST remain lightweight and dependency-free (except essential utilities
like dot-prop). All framework integrations (Zod, SurrealDB, TanStack, Pinia Colada,
Vue/React) MUST be implemented as optional peer dependencies that users explicitly
install. The core library MUST NOT exceed 20 kB minified bundle size.

**Core features** (included in bundle limit):
- Expression evaluation with lazy loading
- Variant resolution (localization, gender, custom dimensions)
- Pronoun placeholders for i18n
- Cycle detection and depth limiting
- Error handling and caching

**Rationale**: Users adopting dotted-json should not pay the bundle cost for features
they don't use. A minimal core ensures maximum flexibility and broad adoption across
different tech stacks. The 20 kB limit accommodates essential i18n/variant features
while remaining lightweight.

### II. Security Through Transparency (NON-NEGOTIABLE)

Expression evaluation using `new Function()` or similar dynamic code execution MUST be
explicitly documented as requiring trusted input. The library MUST NOT accept
user-supplied schemas from untrusted sources without explicit warnings. All public
documentation MUST include a security section stating: "Schemas must come from trusted
sources (not user input)."

**Rationale**: The expression evaluator's flexibility comes with security trade-offs.
Users must understand the trust model before using this library in production.

**Required Documentation**:

- README.md MUST contain security warnings in Quick Start section
- Each plugin's documentation MUST inherit core security requirements
- Examples MUST demonstrate trusted schema patterns only

### III. Test-First Development (NON-NEGOTIABLE)

All features MUST follow TDD: write tests → verify tests fail → implement → verify
tests pass. The test suite MUST maintain 100% pass rate before merging any PR.
Performance-critical paths (expression evaluation, cache lookups) MUST have
dedicated performance regression tests.

**Rationale**: Given the library's dynamic nature and expression evaluation complexity,
comprehensive test coverage is essential to prevent subtle bugs and regressions.

**Quality Gates**:

- 100% test pass rate (no skipped tests in main branch)
- New features require test coverage for happy path, edge cases, and error scenarios
- Breaking changes require migration guide with test examples

### IV. Lazy Evaluation with Explicit Caching

Dot-prefixed expressions (`.property`) MUST only evaluate when their paths are
accessed via `get()`, `has()`, or dependency resolution. Results MUST be cached
automatically with cache invalidation controlled through `ignoreCache` option or
`set()` with `triggerDependents`. The caching strategy MUST be documented with
clear examples of cache behavior.

**Rationale**: Lazy evaluation is the core value proposition. Predictable caching
behavior ensures performance while maintaining correctness.

### V. Plugin Architecture with Clear Boundaries

Plugins MUST NOT modify core library behavior or monkey-patch internal methods.
Plugins MUST integrate through documented extension points: resolvers, validation
hooks, error handlers, and default overrides. Each plugin MUST be independently
testable without requiring other plugins.

**Rationale**: A clean plugin architecture prevents ecosystem fragmentation and
ensures plugins remain compatible across core library updates.

**Extension Points**:

- `resolvers`: Custom function registry
- `onValidate`: Pre/post-evaluation hooks (used by Zod plugin)
- `onError`: Error transformation (used for errorDefault handling)
- `default`/`errorDefault`: Hierarchical fallback system

### VI. Cycle Detection and Safeguards

The library MUST detect circular dependencies in expression evaluation chains and
throw clear error messages indicating the cycle path. A maximum evaluation depth
(default: 10) MUST prevent infinite recursion. Users MUST be able to configure
this limit via options.

**Rationale**: Nested expression expansion can create subtle infinite loops. Explicit
safeguards prevent production outages from misconfigured schemas.

**Implementation Requirements**:

- Track evaluation stack during expression resolution
- Throw `CircularDependencyError` with full path chain
- Add `maxEvaluationDepth` to `DottedOptions` interface

### VII. Framework-Agnostic Core with Framework-Specific Composables

The core library (src/dotted-json.ts, src/expression-evaluator.ts) MUST remain
framework-agnostic with zero dependencies on Vue, React, or other UI frameworks.
Framework integrations MUST be implemented as separate entry points
(e.g., `@orb-zone/dotted-json/vue`, `@orb-zone/dotted-json/react`) that wrap the
core API with framework-specific patterns (composables, hooks).

**Rationale**: Server-side usage, CLI tools, and non-framework projects should not
be forced to bundle framework code. Clear separation enables multi-framework support
without bloating the core.

## Security Requirements

### Expression Evaluation Trust Model

1. **Trusted Input Requirement**: Schemas containing dot-prefixed expressions MUST
   originate from trusted sources (application code, configuration files controlled
   by developers). User-supplied JSON MUST NOT be passed to `dotted()` constructor
   without sanitization.

2. **Resolver Function Safety**: Custom resolvers provided via `options.resolvers`
   MUST validate inputs and sanitize outputs. Database query resolvers MUST use
   parameterized queries to prevent injection attacks.

3. **Error Message Sanitization**: Error messages returned from failed expression
   evaluation MUST NOT leak sensitive information (API keys, database credentials,
   internal paths). Use `errorDefault` to provide safe fallback values.

### Audit Requirements

- Security-sensitive changes (expression evaluator modifications, new evaluation
  modes) MUST be reviewed by at least two maintainers
- CHANGELOG.md MUST flag breaking security changes with `[SECURITY]` prefix
- Dependencies MUST be audited monthly via `npm audit` or equivalent

## Development Workflow

### Code Review Standards

1. **Pull Requests**: All changes MUST be submitted via PR with passing CI checks
2. **Review Checklist**:
   - [ ] Tests added for new functionality
   - [ ] Breaking changes documented in CHANGELOG.md
   - [ ] Security implications reviewed (if touching expression evaluator)
   - [ ] Bundle size impact checked (core must stay under 20 kB)
   - [ ] TypeScript types updated (no `any` without justification)

### Release Process

1. **Versioning**: Follow Semantic Versioning 2.0.0
   - MAJOR: Breaking API changes, security model changes
   - MINOR: New plugins, new core features (backward compatible)
   - PATCH: Bug fixes, documentation, performance improvements

2. **Release Checklist**:
   - [ ] All tests passing (100% pass rate)
   - [ ] CHANGELOG.md updated with version section
   - [ ] Bundle size within limits (documented in CHANGELOG)
   - [ ] Security audit clean (no high/critical vulnerabilities)
   - [ ] Documentation examples tested against new version

### Testing Standards

1. **Unit Tests**: Cover individual functions and edge cases
2. **Integration Tests**: Verify plugin interactions with core
3. **Performance Tests**: Ensure no regressions in expression evaluation speed
4. **Contract Tests**: Validate TypeScript type definitions match runtime behavior

### Documentation Requirements

Every public API MUST have:

- JSDoc comments with examples
- Entry in README.md or plugin-specific doc (e.g., ZOD-INTEGRATION.md)
- Migration guide if deprecating existing API

### Naming Conventions

**JSÖN Capitalization** (added 2025-10-06):

- **Titles and headings**: Use uppercase acronym format "JSÖN"
  - ✅ "JSÖN Document Provider"
  - ✅ "SurrealDB JSÖN Storage"
  - ❌ "jsön Document Provider"

- **File extensions**: Use lowercase ".jsön"
  - ✅ `strings.jsön`, `config:prod.jsön`
  - ❌ `strings.JSÖN`

- **Code/variables**: Use lowercase when referring to file extensions
  - ✅ `extensions: ['.jsön', '.json']`
  - ❌ `extensions: ['.JSÖN', '.JSON']`

**Rationale**: Uppercase "JSÖN" in titles emphasizes the library name as a proper acronym/brand. Lowercase ".jsön" in file extensions follows Unix convention for file extensions (e.g., .json, .yaml, .xml).

### Example Organization (added 2025-10-07)

**Official Examples Directory**: All production-ready examples MUST live in `/examples`

- ✅ `examples/basic-usage.ts` - Core functionality demonstrations
- ✅ `examples/with-zod-validation.ts` - Plugin integrations
- ✅ `examples/file-loader-i18n.ts` - Advanced patterns
- ✅ `examples/data/` - Example data files

**Rules**:
1. New examples MUST be added to `/examples` only
2. Examples MUST be runnable without modification
3. Examples MUST include comments explaining key concepts
4. Examples MUST demonstrate production-ready patterns
5. Experimental/WIP code should use branch-specific naming, NOT a DRAFT folder

**Rationale**:
- Single source of truth for examples
- Easier discoverability for users
- Reduces maintenance burden
- Prevents stale draft code accumulation
- Git branches are better for WIP/experimental work

## Governance

### Amendment Procedure

1. **Proposal**: Open GitHub issue with `[Constitution]` prefix describing proposed
   change and rationale
2. **Discussion**: Minimum 7-day discussion period for community feedback
3. **Approval**: Requires consensus from project maintainers (no blocking objections)
4. **Migration**: Breaking principle changes require migration guide and deprecation
   period (minimum 1 major version)

### Compliance Review

1. **Pre-PR Self-Check**: Contributors MUST verify compliance with Core Principles
   before submitting PR
2. **Automated Checks**: CI pipeline MUST enforce:
   - Bundle size limits (core < 15 kB)
   - Test pass rate (100%)
   - TypeScript compilation (zero errors)
3. **Quarterly Review**: Maintainers review constitution relevance and update based
   on ecosystem changes

### Constitution Authority

This constitution supersedes all other development practices. When in doubt, principles
take precedence over convenience. Violations MUST be justified in PR description with
migration path to compliance.

**Runtime Guidance**: Use `.specify/templates/agent-file-template.md` for
agent-specific development guidance (e.g., CLAUDE.md, GEMINI.md). Agent files MUST NOT
contradict constitution principles but MAY provide additional context.

**Version**: 1.0.0 | **Ratified**: 2025-10-05 | **Last Amended**: 2025-10-05
