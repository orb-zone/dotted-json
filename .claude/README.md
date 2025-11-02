# AI Commands for jsön

## Philosophy

**Model-Agnostic Workflow**: These commands work with ANY AI tool (OpenCode, Cursor, Aider, GitHub Copilot, etc.)

**Three-Gate System**: Controlled collaboration with human approval at each gate

**"Agents do the WORK. You keep CONTROL."**

---

## Quick Start

### Three Core Commands

```
/plan [description]        → Gate 1: Design with specialists
/implement [feature-name]  → Gate 2: Code with TDD + validation
/changeset [feature-name]  → Gate 3: Version with protection
```

### Example Workflow

```bash
# Gate 1: Planning
/plan Add LRU caching to variant resolution
# ✋ STOP → Review .specify/memory/active/variant-caching-plan.md

# Gate 2: Implementation  
/implement variant-caching
# ✋ STOP → Review git diff

# Gate 3: Release
/changeset variant-caching
# ✋ STOP → Review .changeset/*.md, then commit manually

git add .
git commit -m "feat: add variant caching"
gh pr create
```

---

## The Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                       Gate 1: PLAN                          │
├─────────────────────────────────────────────────────────────┤
│  /plan Add feature X                                        │
│                                                              │
│  Agent:                                                      │
│  • Reads constitution.md automatically                       │
│  • Detects keywords → loads specialist agents                │
│  • Consults experts (SurrealDB, Zod, i18n, etc.)            │
│  • Creates design artifacts in .specify/memory/active/       │
│  • Estimates bundle size impact                              │
│  • Detects breaking changes                                 │
│  • ✋ STOPS                                                  │
│                                                              │
│  You:                                                        │
│  • Review .specify/memory/active/feature-x-plan.md          │
│  • Approve or request changes                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Gate 2: IMPLEMENT                        │
├─────────────────────────────────────────────────────────────┤
│  /implement feature-x                                       │
│                                                              │
│  Agent:                                                      │
│  • Loads plan from active memory                            │
│  • RED: Writes failing test                                 │
│  • Verifies test fails                                      │
│  • GREEN: Implements minimal code                           │
│  • Verifies all tests pass                                  │
│  • Runs lint, typecheck, build                              │
│  • Checks bundle size                                       │
│  • ✋ STOPS (NO commits)                                    │
│                                                              │
│  You:                                                        │
│  • Review git diff                                          │
│  • Test manually if needed                                  │
│  • Approve or request changes                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Gate 3: CHANGESET                        │
├─────────────────────────────────────────────────────────────┤
│  /changeset feature-x                                       │
│                                                              │
│  Agent:                                                      │
│  • Analyzes git diff                                        │
│  • Detects breaking changes                                 │
│  • ⛔ BLOCKS MAJOR bump without approval                    │
│  • Suggests version: patch/minor/major                      │
│  • Creates .changeset/*.md file                             │
│  • ✋ STOPS (NO commits)                                    │
│                                                              │
│  You:                                                        │
│  • Review .changeset/*.md                                   │
│  • Manually commit:                                         │
│    git add .                                                │
│    git commit -m "feat: add feature X"                      │
│    gh pr create                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quality & Automation Helpers

Commands to assist with code quality, testing, and automation:

```bash
/review-pr [branch]        # Constitutional PR review
/test-feature [feature]    # Generate comprehensive tests
/doc-api [scope]           # Update API documentation
/validate-i18n [path]      # Check i18n completeness
/plugin-scaffold [name]    # Create plugin boilerplate
```

## Domain Helpers

Optional commands for specific tasks:

```bash
/surql [description]       # Generate SurrealQL schemas
/zod-from-surql [path]     # Generate Zod from SurrealQL
```

---

## Key Safety Features

### 1. Constitutional Auto-Loading
Every command reads `.specify/memory/constitution.md` first.

**Enforces**:
- Bundle limit: 50 kB minified
- TDD: Tests before code, always
- Security: Trusted schemas only
- No breaking changes without approval

### 2. Specialist Auto-Consultation
Keywords trigger specialist loading:

| You mention | Agent loads |
|------------|-------------|
| "SurrealDB", "database" | `.specify/agents/surrealdb-expert.md` |
| "Zod", "validation" | `.specify/agents/zod-integration-specialist.md` |
| "i18n", "variant", "translate" | `.specify/agents/i18n-specialist.md` |
| "performance", "bundle", "optimize" | `.specify/agents/performance-auditor.md` |
| "test", "TDD", "coverage" | `.specify/agents/testing-specialist.md` |
| "Vue", "Pinia", "composable" | `.specify/agents/vue3-expert.md` |
| "docs", "README", "API" | `.specify/agents/documentation-curator.md` |

### 3. Breaking Change Protection
MAJOR version bumps BLOCKED unless you explicitly say:
- "I want a breaking change"
- "Bump to v1.0"
- "This is a major version"

This prevents accidental v0→v1 bumps.

### 4. TDD Enforcement
Tests MUST be written before code. No exceptions.

**Cycle**: RED (write failing test) → GREEN (implement) → REFACTOR (improve)

### 5. Session Persistence
Work tracked in `.specify/memory/active/`:
- `current-session.md` - What you're working on NOW
- `[feature]-plan.md` - Design artifacts
- `[feature]-tasks.md` - Implementation checklist
- `[feature]-notes.md` - Specialist recommendations

**Benefit**: Resume work across sessions/machines

---

## Available Commands

### Core Workflow (3 commands)
| Command | File | Purpose |
|---------|------|---------|
| `/plan` | `commands/plan.md` | Design with specialists |
| `/implement` | `commands/implement.md` | TDD execution with validation |
| `/changeset` | `commands/changeset.md` | Version with protection |

### Quality & Automation (5 commands)
| Command | File | Purpose |
|---------|------|---------|
| `/review-pr` | `commands/review-pr.md` | Constitutional PR review |
| `/test-feature` | `commands/test-feature.md` | Generate comprehensive tests |
| `/doc-api` | `commands/doc-api.md` | Update API documentation |
| `/validate-i18n` | `commands/validate-i18n.md` | Check i18n completeness |
| `/plugin-scaffold` | `commands/plugin-scaffold.md` | Create plugin boilerplate |

### Domain Helpers (2 commands)
| Command | File | Purpose |
|---------|------|---------|
| `/surql` | `commands/surql.md` | Generate SurrealQL |
| `/zod-from-surql` | `commands/zod-from-surql.md` | Generate Zod schemas |

**Total: 10 commands** (3 core workflow + 5 quality/automation + 2 domain helpers)

---

## Command Usage Examples

### Quality & Automation Commands

**`/review-pr`** - Constitutional PR review
```bash
# Review current branch
/review-pr

# Review specific branch
/review-pr feature/variant-caching

# Checks: bundle size, tests, breaking changes, changeset accuracy
```

**`/test-feature`** - Generate comprehensive tests
```bash
# Generate tests for new feature
/test-feature src/helpers/type-coercion.ts

# Generate tests with edge cases
/test-feature variant-resolver

# Follows TDD patterns, includes integration tests
```

**`/doc-api`** - Update API documentation
```bash
# Update all API docs
/doc-api

# Document specific file
/doc-api src/plugins/zod.ts

# Updates docs/API.md, validates examples compile
```

**`/validate-i18n`** - Check i18n completeness
```bash
# Validate specific file
/validate-i18n locales/strings.jsön

# Validate all files in directory
/validate-i18n locales/

# Detects missing translations, type mismatches
```

**`/plugin-scaffold`** - Create plugin boilerplate
```bash
# Scaffold React plugin
/plugin-scaffold react - React hooks for dotted-json

# Scaffold database plugin
/plugin-scaffold kysely - Kysely query builder integration

# Creates implementation, tests, docs, examples
```

---

## When NOT to Use Commands

For simple tasks, just ask naturally:

```
"Fix the typo in README.md line 42"
"Update the example to use the new API"
"Add a type annotation to this function"
```

Use commands for:
- ✅ New features
- ✅ Architectural changes
- ✅ Multi-file refactors
- ✅ Breaking changes
- ✅ Performance optimizations
- ✅ Code quality checks
- ✅ Test generation
- ✅ Documentation updates

---

## Project Knowledge

Agents should read (in this order):

1. **`.specify/memory/constitution.md`** ⭐ Most important (principles)
2. **`.specify/agents/*.md`** - Domain specialists (auto-loaded by keywords)
3. **`.specify/memory/active/`** - Current work state
4. **`.specify/memory/*.md`** - Design documents (as needed)

---

## Model-Agnostic Usage

These commands work with ANY AI tool:

**OpenCode**:
```bash
/plan Add feature X
```

**Cursor / Windsurf / Cline**:
```
Read .claude/commands/plan.md and execute it with "Add feature X"
```

**Aider**:
```bash
aider --read .claude/commands/plan.md
# Then: "Execute this plan with 'Add feature X'"
```

**GitHub Copilot Chat**:
```
@workspace Execute .claude/commands/plan.md for "Add feature X"
```

---

## Troubleshooting

### Agent skips planning
**Fix**: Point to `commands/plan.md` (MANDATORY PREREQUISITES section)

### Agent commits automatically
**Fix**: Remind of constraint: `❌ FORBIDDEN: Making git commits`

### Agent suggests MAJOR bump too easily
**Fix**: Breaking change protection requires explicit approval phrase

### Constitutional constraints forgotten
**Fix**: Commands auto-load constitution - if forgotten, restart session

### Commands don't work
**Fix**: Commands are markdown files with structured instructions. Any AI agent can read and follow them.

---

## Directory Structure

```
.claude/
├── commands/                    # AI-executable commands
│   ├── plan.md                  # Core: Design with specialists
│   ├── implement.md             # Core: TDD execution
│   ├── changeset.md             # Core: Version with protection
│   ├── review-pr.md             # Quality: PR review
│   ├── test-feature.md          # Quality: Test generation
│   ├── doc-api.md               # Quality: API documentation
│   ├── validate-i18n.md         # Quality: i18n validation
│   ├── plugin-scaffold.md       # Quality: Plugin scaffolding
│   ├── surql.md                 # Domain: SurrealQL generation
│   └── zod-from-surql.md        # Domain: Zod schema generation
├── README.md                    # This file
└── settings.local.json          # Permissions (OpenCode-specific)
```

---

## Development Standards

### Quick Reference (from constitution)

**Bundle**: Core < 50 kB minified (currently 18.2 kB, 36%)  
**TDD**: Write tests first, 100% pass rate before merge  
**Security**: Schemas from trusted sources only (documented)  
**Versioning**: Changesets with semantic versioning  
**Plugins**: Optional, peer dependencies, framework-agnostic core

### Quality Gates

Before merging:
- ✅ All tests pass (226+ total)
- ✅ Lint clean (`bun run lint`)
- ✅ Typecheck clean (`bun run typecheck`)
- ✅ Build succeeds (`bun run build`)
- ✅ Bundle size under limit
- ✅ Breaking changes documented (if any)

---

## Further Reading

- **`FINAL-STRUCTURE.md`** - Complete restructuring plan and rationale
- **`.specify/README.md`** - Project knowledge base overview
- **`.specify/memory/workflow-design.md`** - Detailed workflow documentation
- **Root `AGENTS.md`** - Human-readable AI collaboration guide

---

## Philosophy

**"Agents do the WORK. You keep CONTROL."**

- ✅ Agents execute efficiently with domain expertise
- ✅ Mandatory human approval at critical gates
- ✅ Constitutional constraints auto-loaded
- ✅ Breaking changes blocked without approval
- ❌ No surprise commits or merges
- ❌ No accidental version bumps

---

**Last updated**: 2025-11-02
**Commands**: 10 total (3 core + 5 quality/automation + 2 domain helpers)
**Model-agnostic**: ✅ Works with any AI tool
