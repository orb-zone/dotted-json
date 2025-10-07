# Specialist AI Agents

This directory contains specialist agent definitions for context-specific development tasks. Each agent is designed with domain expertise and focused constitutional principles.

## Purpose

Specialist agents provide:
- **Focused context**: Domain-specific knowledge without overwhelming token budgets
- **Expert guidance**: Best practices and patterns for specialized areas
- **Consistent quality**: Standardized approaches across different implementation areas

## Available Agents

### Core Development Agents

- **`surrealdb-expert.md`** - SurrealDB integration, schema design, query optimization
- **`architecture-specialist.md`** - Monorepo structure, build tooling, package boundaries
- **`zod-integration-specialist.md`** - Schema validation, type inference, codegen patterns
- **`i18n-specialist.md`** - Variant systems, translation workflows, FileLoader patterns
- **`performance-auditor.md`** - Bundle size optimization, lazy loading, cache strategies
- **`testing-specialist.md`** - TDD workflows, integration tests, contract testing
- **`documentation-curator.md`** - README generation, API docs, migration guides

## Usage

Agents are invoked using the Task tool when working on domain-specific features:

```typescript
// Example: When implementing SurrealDB LIVE queries
Task({
  subagent_type: "surrealdb-expert",
  description: "Implement LIVE query subscriptions",
  prompt: "Design and implement real-time LIVE SELECT query support with automatic reconnection..."
});
```

## Agent Structure

Each agent file follows this template:

1. **Domain Expertise** - Core knowledge areas and responsibilities
2. **Constitutional Alignment** - Relevant principles from main constitution
3. **Best Practices** - Domain-specific patterns and conventions
4. **Common Pitfalls** - What to avoid in this domain
5. **Resources** - Links to documentation and reference implementations

## Creating New Agents

To create a new specialist agent:

1. Identify a distinct domain with specialized knowledge requirements
2. Extract relevant constitutional principles
3. Document domain-specific best practices
4. Include examples and anti-patterns
5. Add agent to this README

## Relationship to Constitution

Specialist agents **MUST NOT** contradict the main [constitution.md](../memory/constitution.md). They provide:
- Additional context for specific domains
- Implementation guidance within constitutional constraints
- Domain-specific patterns that align with core principles

The constitution remains the ultimate authority for all development decisions.

---

**Last Updated**: 2025-10-07
