# Agent Usage Examples

This file provides practical examples of when and how to use specialist agents in the dotted-json project.

## Quick Decision Guide

| Scenario | Complexity | Use Specialist Agent? | Recommended Agent |
|----------|------------|----------------------|-------------------|
| Fix typo in README | Low | ❌ No | Edit directly |
| Add new test case | Low | ❌ No | Edit directly |
| Implement React hooks | High | ✅ Yes | `vue3-expert` (adapt for React) |
| Optimize bundle size | Medium | ✅ Yes | `performance-auditor` |
| Design SurrealDB schema | High | ✅ Yes | `surrealdb-expert` |
| Plan monorepo migration | High | ✅ Yes | `architecture-specialist` |
| Add Zod validation | Medium | ✅ Yes | `zod-integration-specialist` |
| Update API documentation | Low | ❌ No | Edit directly |
| Implement LIVE queries | High | ✅ Yes | `surrealdb-expert` |

## Real-World Examples

### Example 1: Adding SurrealDB LIVE Queries

**Scenario**: You need to implement real-time subscriptions for document changes.

**Workflow**:
```bash
# 1. Plan the feature (architecture specialist helps with structure)
/specify Add real-time LIVE query subscriptions to SurrealDB plugin
/plan

# 2. Design database schema (SurrealDB expert)
Task({
  subagent_type: "surrealdb-expert",
  description: "Design LIVE query schema",
  prompt: "Design SurrealDB schema for real-time document subscriptions with permission checking..."
});

# 3. Implement with testing (testing specialist ensures quality)
Task({
  subagent_type: "testing-specialist",
  description: "Design LIVE query test strategy",
  prompt: "Create comprehensive test suite for LIVE query subscriptions including edge cases..."
});

# 4. Execute implementation
/implement

# 5. Performance review (performance auditor)
Task({
  subagent_type: "performance-auditor",
  description: "Review LIVE query performance",
  prompt: "Analyze LIVE query implementation for bundle size impact and runtime performance..."
});
```

### Example 2: Bundle Size Optimization

**Scenario**: Bundle size is approaching the 20 kB limit (currently at 18.2 kB).

**Direct Agent Usage**:
```typescript
Task({
  subagent_type: "performance-auditor",
  description: "Optimize bundle size under 20 kB",
  prompt: `
    Current bundle: 18.2 kB (91% of 20 kB limit)
    Recent additions: Zod plugin, variant resolver improvements
    
    Analyze the current bundle and suggest:
    1. Tree-shaking improvements
    2. Code splitting opportunities  
    3. Lazy loading strategies
    4. Unused code elimination
    5. Alternative implementations
    
    Provide specific code changes with measurable impact estimates.
  `
});
```

### Example 3: Complex Feature - React Integration

**Scenario**: Users want React hooks for dotted-json integration.

**Multi-Agent Workflow**:
```bash
# 1. Initial specification
/specify Add React hooks integration for dotted-json
- useDotted() - Main hook for reactive data
- useDottedQuery() - Async expression evaluation  
- useDottedVariants() - Variant context management
- Follow existing plugin architecture

# 2. Architecture planning (architecture specialist)
Task({
  subagent_type: "architecture-specialist",
  description: "Plan React plugin architecture",
  prompt: "Design React plugin structure that maintains framework-agnostic core and follows plugin boundaries..."
});

# 3. Implementation patterns (vue3-expert, adapted for React)
Task({
  subagent_type: "vue3-expert",
  description: "Adapt Vue patterns for React",
  prompt: "Convert Vue 3 composable patterns to React hooks, maintaining reactivity and performance characteristics..."
});

# 4. Testing strategy (testing specialist)
Task({
  subagent_type: "testing-specialist", 
  description: "Design React hooks test suite",
  prompt: "Create comprehensive test suite for React hooks using React Testing Library, including component integration tests..."
});

# 5. Type safety (zod-integration-specialist)
Task({
  subagent_type: "zod-integration-specialist",
  description: "Ensure TypeScript type safety",
  prompt: "Design TypeScript types for React hooks that integrate with Zod validation and provide excellent IDE experience..."
});
```

### Example 4: Performance Regression Investigation

**Scenario**: Tests are running slowly after recent changes.

**Direct Investigation**:
```typescript
Task({
  subagent_type: "performance-auditor",
  description: "Investigate test performance regression",
  prompt: `
    Test suite slowed from 2s to 8s after variant resolver changes.
    
    Investigate:
    1. Identify performance bottlenecks in variant resolution
    2. Analyze caching effectiveness
    3. Check for memory leaks in test setup
    4. Benchmark critical paths
    5. Suggest optimizations with measurable improvements
    
    Focus on variant-resolver.ts and expression-evaluator.ts
  `
});
```

### Example 5: Database Schema Design

**Scenario**: Need to design user management system with permissions.

**Domain Expert Usage**:
```typescript
Task({
  subagent_type: "surrealdb-expert",
  description: "Design user management schema",
  prompt: `
    Design SurrealDB schema for user management with:
    - User accounts with authentication
    - Role-based permissions (admin, editor, viewer)
    - Field-level permissions for sensitive data
    - Audit trail for user actions
    - Performance optimization for large user base
    
    Include:
    1. Table definitions (SCHEMAFULL)
    2. Permission clauses for each role
    3. Indexes for performance
    4. Custom functions for common operations
    5. Migration strategy from existing system
    
    Follow AEON naming conventions and security best practices.
  `
});
```

### Example 6: Documentation Overhaul

**Scenario**: API documentation is incomplete and outdated.

**Documentation Specialist Usage**:
```typescript
Task({
  subagent_type: "documentation-curator",
  description: "Overhaul API documentation",
  prompt: `
    Review and update API.md based on current implementation:
    
    Current issues:
    - Missing 12 method documentations
    - Outdated examples for v0.8.0 LIVE queries
    - No migration guide for v0.11.0 CLI rename
    - Type signatures not included
    
    Tasks:
    1. Audit all public APIs in src/index.ts
    2. Add missing method documentation with examples
    3. Update examples for current version
    4. Add migration guide section
    5. Include TypeScript type signatures
    6. Verify all examples work with current version
    
    Follow documentation standards from AGENTS.md
  `
});
```

## Agent Coordination Patterns

### Sequential Agent Usage

For complex features, use agents sequentially:

```bash
# Architecture → Implementation → Testing → Performance
Task({ subagent_type: "architecture-specialist", ... })  # Plan structure
Task({ subagent_type: "surrealdb-expert", ... })         # Domain implementation  
Task({ subagent_type: "testing-specialist", ... })       # Test strategy
Task({ subagent_type: "performance-auditor", ... })      # Optimization
```

### Parallel Agent Usage

For independent aspects:

```bash
# Can run in parallel for different concerns
Task({ subagent_type: "zod-integration-specialist", ... })  # Type safety
Task({ subagent_type: "performance-auditor", ... })         # Performance
Task({ subagent_type: "documentation-curator", ... })       # Docs
```

### Agent Handoff Patterns

When agents need to coordinate:

```typescript
// Agent 1: Architecture specialist creates plan
Task({
  subagent_type: "architecture-specialist",
  description: "Design plugin structure",
  prompt: "Create plugin architecture for new feature..."
});

// Agent 2: Domain expert implements within that structure
Task({
  subagent_type: "surrealdb-expert", 
  description: "Implement within plugin structure",
  prompt: "Implement SurrealDB integration following the architecture from previous plan..."
});
```

## Common Anti-Patterns

### ❌ Over-Engineering Simple Tasks

```bash
# BAD: Using specialist agent for typo fix
Task({
  subagent_type: "documentation-curator",
  description: "Fix typo in README",
  prompt: "Fix 'recieve' → 'receive' in line 42..."
});

# GOOD: Edit directly
# Just fix the typo in the README file
```

### ❌ Ignoring Agent Expertise

```bash
# BAD: Implementing database schema without expert knowledge
# Just writing SQL without understanding SurrealDB patterns

# GOOD: Using SurrealDB expert
Task({
  subagent_type: "surrealdb-expert",
  description: "Design optimal schema",
  prompt: "Design schema following SurrealDB best practices..."
});
```

### ❌ Agent Scope Creep

```bash
# BAD: Asking performance auditor about database design
Task({
  subagent_type: "performance-auditor",
  description: "Design database schema",  # Wrong agent
  prompt: "Design user management schema..."
});

# GOOD: Using correct domain expert
Task({
  subagent_type: "surrealdb-expert",
  description: "Design database schema",  # Right agent
  prompt: "Design user management schema..."
});
```

## Measuring Agent Effectiveness

### Success Indicators

✅ **Successful agent usage**:
- Implementation follows constitutional principles
- Code passes all tests and quality gates
- Bundle size within limits
- Documentation is complete and accurate
- Performance meets or exceeds benchmarks

❌ **Unsuccessful agent usage**:
- Requires significant manual correction
- Violates constitutional principles
- Introduces security vulnerabilities
- Creates bundle size regressions
- Produces broken or untested code

### Feedback Loop

1. **Before using agent**: Review agent's domain expertise
2. **During implementation**: Monitor for constitutional compliance
3. **After implementation**: Verify quality gates and performance
4. **Long-term**: Track agent effectiveness and update as needed

---

**Last Updated**: 2025-10-19  
**Related**: [AGENTS.md](../../AGENTS.md) | [Specialist Agents](./README.md) | [Constitution](../memory/constitution.md)