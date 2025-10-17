# Slash Commands Quick Reference

**Purpose**: Guide for using `.claude/commands/` slash commands in your dotted-json workflow.

**When to use**: Complex features requiring specification, planning, or multi-step implementation.

---

## Available Slash Commands

You have these commands set up in `.claude/commands/`:

### Project Management Commands

#### `/specify`
**Purpose**: Create or update feature specification from natural language

**When to use**:
- Starting a new complex feature (e.g., "Add React hooks integration")
- Defining requirements for multi-file changes
- Need structured spec before implementation

**Example**:
```
/specify Add variant system showcase to Getting Started guide with
interactive examples demonstrating language, gender, and formality variants
```

**Output**: Creates/updates `spec.md` with structured requirements

---

#### `/plan`
**Purpose**: Execute implementation planning workflow using plan template

**When to use**:
- After `/specify` to create design artifacts
- Need architecture decisions documented
- Breaking down complex implementation

**Example**:
```
/plan
```

**Output**: Creates `plan.md` with:
- Architecture decisions
- File structure
- Implementation approach
- Testing strategy

---

#### `/clarify`
**Purpose**: Identify underspecified areas by asking targeted questions

**When to use**:
- Spec is vague in places
- Need to resolve ambiguities before implementation
- User requirements unclear

**Example**:
```
/clarify
```

**Output**: Asks up to 5 targeted questions, updates spec with answers

---

#### `/tasks`
**Purpose**: Generate actionable, dependency-ordered tasks from design artifacts

**When to use**:
- After `/plan` is complete
- Ready to start implementation
- Need clear task breakdown

**Example**:
```
/tasks
```

**Output**: Creates `tasks.md` with:
- Ordered list of implementation tasks
- Dependencies clearly marked
- Acceptance criteria per task

---

#### `/analyze`
**Purpose**: Cross-artifact consistency analysis (spec.md, plan.md, tasks.md)

**When to use**:
- After generating all artifacts
- Before starting implementation
- Sanity check for coherence

**Example**:
```
/analyze
```

**Output**: Report on consistency issues, gaps, or conflicts

---

#### `/implement`
**Purpose**: Execute implementation plan by processing all tasks

**When to use**:
- After `/tasks` is generated and reviewed
- Ready for Claude to write code
- Have clear acceptance criteria

**Example**:
```
/implement
```

**Output**: Implements all tasks in `tasks.md`, marks them complete

---

### Specialized Commands

#### `/constitution`
**Purpose**: Create or update project constitution

**When to use**:
- Establishing project principles
- Updating core architectural rules
- Rarely - constitution should be stable

---

## Workflow Examples

### Example 1: Adding Variant Showcase to Getting Started

**Scenario**: Documentation audit found "CRITICAL: Missing variant system showcase"

**Workflow**:
```bash
# 1. Specify the feature
/specify Add comprehensive variant system showcase to Getting Started guide.
Should include:
- Multi-dimensional variants (lang + gender + form)
- Real-world example (e.g., Japanese keigo)
- Progressive complexity (simple → advanced)
- Code snippets users can copy-paste

# 2. Review spec.md, then plan
/plan

# 3. Review plan.md, generate tasks
/tasks

# 4. Review tasks.md, then implement
/implement

# 5. Create changeset
bun run changeset:add
# Select: patch (documentation improvement)

# 6. Commit & PR
git add .
git commit -m "docs: add variant system showcase to Getting Started"
gh pr create
```

---

### Example 2: Adding Missing API Documentation

**Scenario**: 12 MINOR API documentation gaps identified

**Workflow**:
```bash
# 1. Specify in detail
/specify Update API.md to include missing methods:
- FileLoader.clearCache()
- FileLoader.getCacheStats()
- ExpressionResolver type export
- ResolverContext type export
... (list all 12)

Include examples and type signatures for each.

# 2. Since this is straightforward, you might skip /plan and /tasks
# Just implement directly or use /tasks for tracking

/tasks

# 3. Implement
/implement

# 4. Changeset
bun run changeset:add
# Select: patch (documentation)

# 5. PR
git commit -m "docs: add missing API documentation (12 items)"
gh pr create
```

---

### Example 3: New Feature (React Hooks)

**Scenario**: Want to add React integration

**Workflow**:
```bash
# 1. Specify high-level
/specify Add React hooks for dotted-json integration:
- useDotted() - Main hook for reactive data
- useDottedQuery() - Async expression evaluation
- useDottedVariants() - Variant context management
Follow existing plugin architecture (Principle V in constitution)

# 2. Clarify ambiguities
/clarify
# Agent asks questions:
# - Should useDotted() use Context API or prop drilling?
# - TypeScript generics strategy?
# - How to handle SSR?
# Answer questions, spec updated

# 3. Create implementation plan
/plan
# Review plan.md:
# - File structure (src/plugins/react.ts, test/plugins/react.test.ts)
# - Architecture decisions (Context API chosen)
# - Testing approach (React Testing Library)

# 4. Generate tasks
/tasks
# Review tasks.md:
# [ ] Create src/plugins/react.ts with useDotted hook
# [ ] Add TypeScript types
# [ ] Write tests
# [ ] Update package.json peer dependencies
# [ ] Update API.md documentation
# [ ] Add example to examples/react-hooks.tsx

# 5. Implement all tasks
/implement

# 6. Changeset (minor - new feature)
bun run changeset:add
# Select: minor
# Summary: "Add React hooks for dotted-json integration"

# 7. PR
git commit -m "feat: add React hooks (useDotted, useDottedQuery, useDottedVariants)"
gh pr create
```

---

## When NOT to Use Slash Commands

**Don't use slash commands for:**

1. **Simple fixes** (typos, single-line changes)
   - Just fix directly

2. **Obvious implementations** (renaming, refactoring)
   - Standard git workflow sufficient

3. **Documentation tweaks** (updating examples)
   - Edit directly unless large-scale

4. **Tactical work** (like v0.11.0 CLI rename)
   - We didn't need slash commands for that!

**Use slash commands for:**

1. **Complex features** (React hooks, new loaders)
2. **Multi-file changes** (architectural shifts)
3. **Ambiguous requirements** (need `/clarify`)
4. **Large refactors** (need planning)

---

## Slash Command Cheat Sheet

| Command | Input | Output | Next Step |
|---------|-------|--------|-----------|
| `/specify` | Natural language feature description | `spec.md` | Review, then `/plan` |
| `/clarify` | (reads current spec) | Updated `spec.md` | `/plan` |
| `/plan` | (reads spec.md) | `plan.md` | Review, then `/tasks` |
| `/tasks` | (reads plan.md) | `tasks.md` | Review, then `/implement` |
| `/analyze` | (reads all artifacts) | Consistency report | Fix issues |
| `/implement` | (reads tasks.md) | Working code | Create changeset |

---

## Integration with Changesets

**Standard workflow**:
```
/specify → /plan → /tasks → /implement → changeset:add → PR
```

**Changeset comes AFTER implementation**, not during planning.

Why? The changeset describes what changed (past tense), while slash commands plan what will change (future tense).

---

## Real-World Scenarios

### Scenario: "Add Missing Features from Audit"

**From v0.11.0 audit findings:**
- CRITICAL: Variant system showcase (Getting Started)
- IMPORTANT: Path access pattern clarification
- 12 MINOR: API documentation gaps

**Recommended approach**:
```bash
# Break into separate PRs

# PR 1: Variant showcase (high impact)
/specify [detailed requirements]
/plan
/tasks
/implement
bun run changeset:add  # minor (major doc improvement)

# PR 2: Path access clarification (medium impact)
# Might not need slash commands - just edit docs

# PR 3: API gaps (batch all 12)
/specify [list all 12 items]
/tasks  # Skip /plan for straightforward docs
/implement
bun run changeset:add  # patch
```

---

## Tips & Tricks

### 1. Use `/specify` for Complex, Skip for Simple

**Complex** (use `/specify`):
- Multi-file features
- New plugin integrations
- Architectural changes

**Simple** (skip slash commands):
- Documentation fixes
- Example updates
- Refactoring within one file

### 2. Review Before Next Step

Always review output before proceeding:
- `/specify` → Read `spec.md` → Then `/plan`
- `/plan` → Read `plan.md` → Then `/tasks`
- `/tasks` → Read `tasks.md` → Then `/implement`

### 3. Iterate if Needed

You can rerun commands:
```bash
/specify  # First draft
# Review, provide feedback
/specify  # Refined version
```

### 4. Combine with Git Workflow

Slash commands don't replace git:
```bash
git checkout -b 005-feature-name
/specify
/plan
/tasks
/implement
bun run changeset:add
git add .
git commit -m "feat: description"
gh pr create
```

---

## Advanced: Custom Slash Commands

You can create your own in `.claude/commands/`:

**Example**: Create `/audit-examples`
```bash
# .claude/commands/audit-examples.md
Review all files in examples/ directory and report:
1. Broken imports
2. Incorrect property access patterns
3. Outdated API usage
4. Missing error handling

Create a report with severity levels and suggested fixes.
```

**Usage**:
```bash
/audit-examples
```

---

## Summary

**Use slash commands when:**
- ✅ Feature is complex (multi-file, multi-step)
- ✅ Need structured planning
- ✅ Requirements are ambiguous
- ✅ Want documented decision trail

**Skip slash commands when:**
- ❌ Change is simple (1-2 files)
- ❌ Requirements are obvious
- ❌ Just fixing bugs
- ❌ Quick documentation updates

**Remember**: Slash commands are tools for **complex work**. For v0.11.0, we didn't need them because the work was tactical (rename, fix, automate). For future features like React hooks or variant showcase, slash commands will be invaluable.

---

**Last Updated**: 2025-10-16
**Related**: `.claude/commands/` directory for command implementations
