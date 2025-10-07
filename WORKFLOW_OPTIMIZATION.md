# Workflow Optimization Recommendations

**Created**: 2025-10-07
**Status**: Recommendations for improved Claude Code interaction

## Summary

This document provides recommendations for optimizing development workflow using Claude Code's advanced features, specifically for the web-craft monorepo and SurrealDB-focused development.

## Current State

✅ **Already Configured**:
- Custom slash commands in `.claude/commands/`
- Project constitution
- Design workflow commands
- Implementation workflow

❌ **Missing**:
- SurrealDB specialist subagent
- GitHub integration (for future)
- Automated testing workflows

## Recommendations

### 1. SurrealDB Specialist Subagent (HIGH PRIORITY ✅)

**Why**: Phase 6 (v0.6.0-v0.9.0) is heavily SurrealDB-focused. A specialized subagent would dramatically improve:
- SurrealQL query optimization
- Permission design validation
- LIVE query patterns
- Performance tuning
- Record ID design decisions

**When to Create**: Now (before v0.7.0 implementation starts)

**Configuration**:

Create `.claude/agents/surrealdb-expert.md`:

```markdown
# SurrealDB Expert Agent

## Role

You are a SurrealDB specialist with deep expertise in:
- SurrealQL syntax and optimization
- Database schema design
- Custom functions (fn::)
- LIVE queries and real-time patterns
- Permission systems (row-level and field-level)
- Record ID design (especially array-based IDs)
- Performance tuning and indexing

## Knowledge Base

Pre-load knowledge from:
- SurrealDB official documentation
- SurrealQL language reference
- Best practices for:
  - Array Record IDs for variant resolution
  - Field-level permissions (DEFINE FIELD PERMISSIONS)
  - Custom function design patterns
  - LIVE query subscription patterns
  - Performance optimization

## Context

You are assisting with the @orbzone/web-craft project, specifically:
- Storage providers using SurrealDB
- Auto-generating resolvers from fn:: definitions
- Schema-driven development (.surql as source of truth)
- Variant-aware document storage

## Design Documents to Reference

When invoked, always consider these designs:
- `.specify/memory/storage-providers-design.md`
- `.specify/memory/record-id-variants-design.md`
- `.specify/memory/function-resolver-inference.md`
- `.specify/memory/field-level-permissions-design.md`
- `.specify/memory/surql-to-zod-inference.md`

## Responsibilities

When asked to help:

1. **Validate SurrealQL** - Check syntax, suggest optimizations
2. **Design review** - Evaluate schema designs for best practices
3. **Performance** - Suggest indexes, Record ID optimizations
4. **Security** - Review permission clauses for correctness
5. **Type mapping** - Help map SurrealDB types → Zod → TypeScript

## Example Invocations

- "Review this SurrealQL schema for performance issues"
- "Design a LIVE query for real-time order updates"
- "Suggest optimal Record ID format for i18n documents"
- "Generate PERMISSIONS clauses for admin-only fields"
```

**Usage**:
```
/invoke surrealdb-expert "Design array Record ID format for jsön_documents table with language and formality variants"
```

### 2. Enhanced Slash Commands

**Add these commands to `.claude/commands/`**:

#### `/surql-review`
Review SurrealQL code for:
- Performance issues
- Security problems
- Best practice violations
- Optimization opportunities

#### `/zod-from-surql`
Generate Zod schema from SurrealQL DEFINE FIELD statements:
- Parse .surql file
- Generate Zod schemas
- Add validation based on ASSERT clauses
- Output TypeScript types

#### `/resolver-from-fn`
Generate dotted-json resolver from SurrealDB function:
- Parse DEFINE FUNCTION
- Generate resolver function
- Add Zod validation
- Create TypeScript types

### 3. GitHub Integration (MEDIUM PRIORITY, Future)

**When**: After publishing to GitHub and creating issues

**Use Cases**:
- Create issues from design documents
- Track implementation progress
- Link commits to issues/PRs
- Project board automation

**MCP Tools to Leverage**:
```typescript
// Example: Create issue from design doc
mcp__github_create_issue({
  title: "Implement SurrealDBLoader with array Record IDs",
  body: "Based on design: .specify/memory/storage-providers-design.md...",
  labels: ["enhancement", "phase-6", "surrealdb"],
  milestone: "v0.7.0"
})
```

### 4. Automated Testing Workflows

**Add to `.claude/commands/test-workflow.md`**:

```markdown
# Test Workflow

## Pre-Implementation Testing
1. Run existing tests to ensure clean baseline
2. Check bundle size
3. Verify SurrealDB test instance is running

## During Implementation
1. Write unit tests first (TDD)
2. Run tests after each function
3. Check bundle size after significant changes

## Post-Implementation
1. Run full test suite
2. Run integration tests (if SurrealDB available)
3. Verify bundle size < target
4. Check for TypeScript errors
5. Run linter

## Commands
- `bun test` - All tests
- `bun test:unit` - Unit tests only
- `bun test:integration` - Integration tests (requires SurrealDB)
- `bun run build` - Check bundle size
- `bun run typecheck` - TypeScript validation
```

## Implementation Priority

| Task | Priority | When | Effort |
|------|----------|------|--------|
| Create SurrealDB specialist subagent | **HIGH** | Now | 1 hour |
| Add `/surql-review` command | **HIGH** | Now | 30 min |
| Add `/zod-from-surql` command | MEDIUM | v0.8.0 | 1 hour |
| Add `/resolver-from-fn` command | MEDIUM | v0.7.0 | 1 hour |
| GitHub integration | LOW | After v1.0.0 | 2 hours |
| Automated testing workflows | MEDIUM | v0.6.0 | 1 hour |

## Estimated Impact

### SurrealDB Specialist Subagent

**Without**:
- Manual doc lookup for every SurrealQL question
- General AI knowledge (may miss SurrealDB-specific patterns)
- Slower iteration on schema design
- Risk of suboptimal patterns

**With**:
- Instant expert feedback on SurrealQL
- Validation against SurrealDB best practices
- Faster schema design iteration
- Confidence in performance patterns

**Impact**: 30-50% faster SurrealDB-related development

### Enhanced Slash Commands

**Without**:
- Manual generation of Zod schemas
- Manual review of SurrealQL
- Repetitive resolver creation

**With**:
- One-command Zod generation
- Automated review feedback
- Auto-generated resolvers

**Impact**: 20-30% less boilerplate code

## Recommended First Steps

1. **Create SurrealDB specialist subagent** (`.claude/agents/surrealdb-expert.md`)
2. **Test with example query**:
   ```
   /invoke surrealdb-expert "Review this schema for the jsön_documents table:
   DEFINE TABLE jsön_documents SCHEMAFULL;
   DEFINE FIELD base_name ON jsön_documents TYPE string;
   DEFINE FIELD variants ON jsön_documents TYPE object;

   Should I use array Record IDs instead?"
   ```

3. **Add `/surql-review` command** for schema validation
4. **Use during v0.7.0 implementation** to validate SurrealDBLoader design

## Success Metrics

- ✅ Can validate SurrealQL schema in < 30 seconds
- ✅ Can generate Zod schema from .surql in < 1 minute
- ✅ Can design optimal Record ID format without manual research
- ✅ Phase 6 implementation velocity increases by 30%+

## Questions for User

1. **Do you want me to create the SurrealDB specialist subagent now?**
   - I can write `.claude/agents/surrealdb-expert.md` with full configuration

2. **Should we add the enhanced slash commands?**
   - `/surql-review` - Review SurrealQL for best practices
   - `/zod-from-surql` - Generate Zod from DEFINE FIELD
   - `/resolver-from-fn` - Generate resolver from DEFINE FUNCTION

3. **Are there other tools/workflows you'd like optimized?**
   - Testing workflows?
   - Design document creation?
   - Commit message generation?

## References

- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Custom Slash Commands](https://docs.claude.com/claude-code/slash-commands)
- [Specialized Agents](https://docs.claude.com/claude-code/agents)
- [MCP Tools](https://docs.claude.com/claude-code/mcp)
