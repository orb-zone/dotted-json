# Specialist AI Agents

This directory contains specialist agent definitions for context-specific development tasks. Each agent is designed with domain expertise and focused constitutional principles.

## Integration with Root-Level AGENTS.md

This directory works in tandem with the root-level [`AGENTS.md`](../../AGENTS.md) file:

- **Root AGENTS.md**: General development guidelines, quick reference, and workflow standards
- **Specialist agents**: Deep domain expertise with constitutional alignment and implementation patterns

**Usage Flow**:
1. Check root `AGENTS.md` for general guidelines and commands
2. Use specialist agents for domain-specific complex features
3. Follow constitutional principles from both levels

## Purpose

Specialist agents provide:
- **Focused context**: Domain-specific knowledge without overwhelming token budgets
- **Expert guidance**: Best practices and patterns for specialized areas
- **Constitutional alignment**: Deep integration with project principles
- **Implementation patterns**: Ready-to-use code examples and architectures

## Available Agents

### Core Development Agents

- **[`surrealdb-expert.md`](./surrealdb-expert.md)** - SurrealDB integration, schema design, LIVE queries, permissions
- **[`architecture-specialist.md`](./architecture-specialist.md)** - Monorepo structure, build tooling, package boundaries
- **[`zod-integration-specialist.md`](./zod-integration-specialist.md)** - Schema validation, type inference, codegen patterns
- **[`testing-specialist.md`](./testing-specialist.md)** - TDD workflows, integration tests, contract testing

### Specialized Domain Agents

- **[`i18n-specialist.md`](./i18n-specialist.md)** - Variant systems, translation workflows, FileLoader patterns
- **[`performance-auditor.md`](./performance-auditor.md)** - Bundle size optimization, lazy loading, cache strategies
- **[`documentation-curator.md`](./documentation-curator.md)** - README generation, API docs, migration guides
- **[`vue3-expert.md`](./vue3-expert.md)** - Vue 3 composables, reactivity patterns, Pinia integration

## Usage Patterns

### When to Use Specialist Agents

**Complex Features** (Use specialist agents):
- Multi-file architectural changes
- Database schema design and optimization
- Performance-critical implementations
- Framework integrations (Vue, React, etc.)
- Advanced testing strategies

**Simple Tasks** (Use root guidelines only):
- Single-file bug fixes
- Documentation updates
- Test additions to existing suites
- Obvious refactoring

### Agent Invocation Examples

```typescript
// SurrealDB integration with LIVE queries
Task({
  subagent_type: "surrealdb-expert",
  description: "Implement LIVE query subscriptions",
  prompt: "Design real-time LIVE SELECT subscription system with auto-cache invalidation..."
});

// Monorepo migration planning
Task({
  subagent_type: "architecture-specialist",
  description: "Plan monorepo migration",
  prompt: "Create detailed migration plan from single package to monorepo workspace..."
});

// Performance optimization
Task({
  subagent_type: "performance-auditor",
  description: "Optimize bundle size",
  prompt: "Analyze current bundle and suggest optimizations to stay under 20 kB limit..."
});
```

### Integration with Slash Commands

Specialist agents work seamlessly with `.claude/commands/`:

```bash
# Complex feature requiring domain expertise
/specify Add React hooks integration with SurrealDB LIVE queries
/plan      # Architecture specialist helps with structure
/tasks     # Testing specialist helps with test strategy
/implement # Domain specialists execute their areas
```

## Agent Structure

Each specialist agent follows this standardized structure:

### 1. Domain Expertise
- Core knowledge areas and responsibilities
- Current implementation status in the project
- Future roadmap items related to domain

### 2. Constitutional Alignment
- Relevant principles from [constitution.md](../memory/constitution.md)
- Domain-specific interpretations of core principles
- Quality gates and compliance requirements

### 3. Implementation Patterns
- Ready-to-use code examples
- Architecture patterns and best practices
- Integration patterns with other domains

### 4. Common Pitfalls
- Frequent mistakes in this domain
- Performance anti-patterns
- Security considerations

### 5. Testing Strategies
- Domain-specific testing approaches
- Integration test patterns
- Performance benchmarking

### 6. Resources
- Links to design documents in `../memory/`
- Reference implementations in the codebase
- External documentation and tools

## Constitutional Compliance

### Non-Negotiable Principles

All specialist agents MUST adhere to:

**I. Minimal Core, Optional Plugins**
- Domain-specific code belongs in plugins, not core
- Bundle size limits strictly enforced
- Framework-agnostic core preserved

**II. Security Through Transparency**
- Security implications clearly documented
- Trust model explicitly stated
- Error handling prevents information leakage

**III. Test-First Development**
- TDD workflows mandated for all implementations
- 100% test pass rate before merge
- Performance regression tests included

**V. Plugin Architecture with Clear Boundaries**
- No modifications to core library behavior
- Clean integration through documented extension points
- Independent testability

### Domain-Specific Interpretations

Each specialist agent interprets these principles for their domain:
- **SurrealDB expert**: Security through permissions, performance through query optimization
- **Architecture specialist**: Boundaries through package structure, minimal core through bundle analysis
- **Testing specialist**: Quality through comprehensive test strategies, TDD enforcement

## Agent Maintenance

### Regular Updates

Specialist agents require regular maintenance:
- **Quarterly reviews**: Update with new project patterns
- **Constitution amendments**: Sync with constitutional changes
- **Implementation changes**: Update examples when code changes
- **New tools**: Incorporate new development tools and practices

### Version Tracking

Each agent includes:
- **Last updated** timestamp
- **Version compatibility** (e.g., "Compatible with v0.12.1+")
- **Related design documents** with status
- **Implementation references** to current code

## Creating New Specialist Agents

### Agent Creation Process

1. **Domain Identification**
   - Identify distinct domain with specialized knowledge
   - Verify no existing agent covers this area
   - Assess complexity level (warrants specialist agent?)

2. **Constitutional Analysis**
   - Extract relevant constitutional principles
   - Identify domain-specific interpretations
   - Document compliance requirements

3. **Knowledge Documentation**
   - Document current implementation patterns
   - Include best practices and anti-patterns
   - Provide working code examples

4. **Integration Planning**
   - Define relationship with other agents
   - Plan coordination with slash commands
   - Establish maintenance schedule

5. **Review and Approval**
   - Constitutional compliance review
   - Technical accuracy validation
   - Integration testing with workflow

### Agent Template

Use [`.specify/templates/agent-file-template.md`](../templates/agent-file-template.md) as starting point.

### Registration

After creating agent:
1. Add to this README with description
2. Update root `AGENTS.md` specialist agent list
3. Create examples in `.specify/memory/` if needed
4. Add to slash command integration patterns

## Quality Assurance

### Agent Quality Standards

- **Accuracy**: All code examples must work with current version
- **Completeness**: Cover major use cases and edge cases
- **Clarity**: Clear explanations and actionable guidance
- **Maintenance**: Regular updates to stay current

### Review Process

1. **Technical review**: Verify code examples and patterns
2. **Constitutional review**: Ensure compliance with principles
3. **Integration review**: Test with actual development workflow
4. **Documentation review**: Check clarity and completeness

---

**Last Updated**: 2025-10-19  
**Related**: [Root AGENTS.md](../../AGENTS.md) | [Constitution](../memory/constitution.md) | [Slash Commands Guide](../SLASH-COMMANDS-GUIDE.md)
