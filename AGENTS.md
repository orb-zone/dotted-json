# Agent Guidelines for dotted-json (jsön)

## Overview

This project uses a dual-layer agent system:
- **Root-level agents** (this file) - General development guidelines and quick reference
- **Specialist agents** (`.specify/agents/`) - Domain-specific expertise with deep constitutional alignment

## Quick Reference Commands

### Development
- **Build**: `bun run build`
- **Lint**: `bun run lint` (ESLint with auto-fix)
- **Typecheck**: `bun run typecheck`
- **Test**: `bun test` (all tests)
- **Single test**: `bun test path/to/test.test.ts`
- **Unit tests**: `bun test test/unit`
- **Integration tests**: `bun test test/integration`
- **Watch tests**: `bun test --watch`
- **Coverage**: `bun test --coverage`

### Release Management
- **Add changeset**: `bun run changeset:add`
- **Version packages**: `bun run changeset:version`
- **Release**: Automated via GitHub Actions (manual publish forbidden)

### CLI Tools
- **Translation**: `bun tools/translate/index.ts strings.jsön --to es --form formal`
- **Type generation**: `bun tools/surql-to-ts/index.ts schema.surql`

## Code Style & Standards

### TypeScript Standards
- **Indentation**: 2 spaces (EditorConfig)
- **Strict mode**: Enabled, no implicit any
- **Imports**: Use `.js` extensions for ES modules
- **Naming**: camelCase for variables, PascalCase for types/interfaces
- **Error handling**: Use explicit error types, avoid `any` (warned)
- **Unused vars**: Prefix with `_` to ignore linting
- **File structure**: Export types separately from implementations
- **Comments**: JSDoc style for public APIs

### Constitutional Requirements
- **Bundle limit**: Core library must stay under 20 kB minified
- **Security**: Schemas must come from trusted sources (documented warnings required)
- **TDD**: 100% test pass rate before merge (non-negotiable)
- **Plugin architecture**: Clear boundaries, no core modifications
- **Framework-agnostic**: Zero framework dependencies in core

### Naming Conventions
- **JSöN files**: Use `.jsön` extension (lowercase)
- **Plugin factories**: `with[Thing]` pattern (e.g., `withZod`, `withSurrealDB`)
- **Hooks/composables**: `useDotted[Thing]` pattern
- **SurrealDB fields**: `_type`, `_at`, `meta` (short, underscore prefix for system fields)

## Testing Standards

### Test Organization
- **Unit tests**: `test/unit/` - Fast, isolated, no external dependencies
- **Integration tests**: `test/integration/` - Real dependencies, slower execution
- **Fixtures**: `test/fixtures/` - Test data and schema files
- **Test runner**: Bun test with built-in mocking support

### TDD Workflow
1. **RED**: Write failing test first
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code quality while maintaining test coverage

### Coverage Requirements
- Core modules: > 95% coverage
- Plugins: > 85% coverage
- Integration tests: > 70% coverage
- Performance regression tests for critical paths

## Specialist Agents System

### Available Specialist Agents

Located in `.specify/agents/` with domain expertise:

#### Core Development
- **`surrealdb-expert.md`** - SurrealDB integration, schema design, LIVE queries
- **`architecture-specialist.md`** - Monorepo structure, build tooling, package boundaries
- **`zod-integration-specialist.md`** - Schema validation, type inference, codegen
- **`testing-specialist.md`** - TDD workflows, integration tests, contract testing

#### Specialized Domains
- **`i18n-specialist.md`** - Variant systems, translation workflows, FileLoader patterns
- **`performance-auditor.md`** - Bundle optimization, lazy loading, cache strategies
- **`documentation-curator.md`** - README generation, API docs, migration guides
- **`vue3-expert.md`** - Vue 3 composables, reactivity patterns, Pinia integration

### Agent Usage Patterns

#### When to Use Specialist Agents

**Use specialist agents for:**
- Complex features requiring domain expertise
- Multi-file architectural changes
- Performance optimization tasks
- Integration with external systems
- Documentation generation for complex APIs

**Skip specialist agents for:**
- Simple bug fixes (1-2 files)
- Obvious refactoring
- Documentation tweaks
- Test additions to existing suites

#### Agent Invocation Examples

```typescript
// Using Task tool with specialist agent
Task({
  subagent_type: "surrealdb-expert",
  description: "Implement LIVE query subscriptions",
  prompt: "Design real-time LIVE SELECT subscription system with auto-cache invalidation..."
});

// Architecture planning
Task({
  subagent_type: "architecture-specialist", 
  description: "Plan monorepo migration",
  prompt: "Create detailed migration plan from single package to monorepo workspace..."
});

// Testing strategy
Task({
  subagent_type: "testing-specialist",
  description: "Design integration test suite",
  prompt: "Create comprehensive integration tests for SurrealDBLoader with real database..."
});
```

### Agent Constitutional Alignment

All specialist agents MUST:
- Align with core constitutional principles (see `.specify/memory/constitution.md`)
- Provide domain-specific implementation guidance
- Include best practices and common pitfalls
- Reference relevant design documents
- Maintain clear boundaries from core library

## Development Workflow

### Feature Development Process

1. **Planning Phase** (Complex features only)
   ```bash
   /specify [feature description]    # Create specification
   /plan                            # Generate implementation plan
   /tasks                           # Break down into tasks
   ```

2. **Implementation Phase**
   ```bash
   /implement                       # Execute all tasks
   bun run changeset:add            # Document changes
   ```

3. **Quality Assurance**
   ```bash
   bun test                         # Verify all tests pass
   bun run lint                     # Check code style
   bun run typecheck                # Verify TypeScript
   bun run build                    # Check bundle size
   ```

4. **Release**
   ```bash
   git commit -m "feat: description"
   gh pr create                     # Create pull request
   # Automated: Version Packages PR → Publish to JSR
   ```

### Branch Protection & CI/CD

- **Direct pushes to main**: Forbidden (Lefthook + GitHub protection)
- **Pre-push checks**: Lint, typecheck, tests, build (automated)
- **PR requirements**: All CI checks must pass
- **Emergency releases**: Hotfix branches allowed with fast-track review

## Bundle Size Management

### Current Constraints
- **Core library**: < 20 kB minified (constitutional limit)
- **Current size**: 18.20 kB (91% of limit)
- **Monitoring**: Automated in CI/CD pipeline

### Optimization Strategies
- Tree-shaking friendly exports
- Lazy loading for optional features
- Framework code in separate packages
- Regular bundle audits

## Security Requirements

### Expression Evaluation Trust Model
- **Trusted input only**: Schemas from application code, not user input
- **Resolver validation**: Custom resolvers must validate inputs/outputs
- **Error sanitization**: No sensitive data in error messages
- **Documentation**: Security warnings in all public APIs

### Audit Requirements
- Monthly dependency audits
- Security review for expression evaluator changes
- Breaking security changes flagged in CHANGELOG

## Documentation Standards

### API Documentation Requirements
Every public API must include:
- **Purpose**: One-line description
- **Parameters**: Type and description for each
- **Returns**: Return type and description  
- **Throws**: Error conditions and exception types
- **Example**: Working, copy-paste ready code snippet

### Markdown Standards
- **Blank lines after headings**: Required before lists/paragraphs
- **Code fence languages**: Always specify (```typescript, ```bash)
- **Consistent list markers**: Use `-` for unordered, `1.` for ordered
- **JSöN capitalization**: Use "JSöN" in titles, ".jsön" for file extensions

## Memory & Design Documents

### Key Design Documents (`.specify/memory/`)
- **`constitution.md`** - Project principles and constraints (master document)
- **`storage-providers-design.md`** - StorageProvider interface, SurrealDBLoader
- **`permissions-and-zod-integration.md`** - Permission detection, Zod integration
- **`variant-system-design.md`** - Variant resolution algorithm
- **`surrealdb-vue-vision.md`** - Grand vision for SurrealDB + Vue integration

### When to Update Memory Files
- Significant architectural decisions
- New design patterns or conventions
- Breaking changes with migration requirements
- Performance optimizations with measurable impact

## Agent Maintenance

### Updating Specialist Agents
1. Review agent relevance quarterly
2. Update constitutional references after amendments
3. Add new domain patterns as they emerge
4. Remove deprecated practices
5. Sync with implementation changes

### Creating New Specialist Agents
1. Identify distinct domain with specialized knowledge
2. Extract relevant constitutional principles
3. Document domain-specific best practices
4. Include examples and anti-patterns
5. Add to `.specify/agents/README.md` registry

### Agent Quality Standards
- **Domain expertise**: Clear specialization area
- **Constitutional alignment**: No contradictions with core principles
- **Practical guidance**: Actionable advice with examples
- **Maintenance**: Regular updates to stay current

---

**Last Updated**: 2025-10-19  
**Related Files**: 
- `.specify/agents/` - Specialist agent definitions
- `.specify/memory/constitution.md` - Project constitution
- `.specify/SLASH-COMMANDS-GUIDE.md` - Workflow commands