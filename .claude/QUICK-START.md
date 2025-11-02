# OpenCode Quick Start for jsön

## The Problem This Solves

❌ **Over-confident agents** that:
- Skip planning and jump to code
- Auto-commit without review
- Accidentally bump v0 → v1
- Forget constitutional constraints

## The Solution

✅ **Three mandatory gates** with human approval:
1. **PLAN** → Agent designs, you approve
2. **IMPLEMENT** → Agent codes, you review
3. **CHANGESET** → Agent prepares, you commit

## The Workflow (3 Commands)

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
│  • Estimates bundle size                                     │
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

## Key Features

### 1. Constitutional Auto-Loading
Every command reads `.specify/memory/constitution.md` first.

**Enforces**:
- Bundle limit (50 kB)
- TDD workflow
- Security warnings
- No breaking changes without approval

### 2. Specialist Auto-Consultation
Keywords trigger specialist loading:

| You mention | Agent loads |
|------------|-------------|
| "SurrealDB" | `surrealdb-expert.md` |
| "Zod" | `zod-integration-specialist.md` |
| "i18n" / "variant" | `i18n-specialist.md` |
| "performance" | `performance-auditor.md` |
| "test" / "TDD" | `testing-specialist.md` |

### 3. Breaking Change Protection
MAJOR bumps BLOCKED unless you say:
- "I want a breaking change"
- "Bump to v1.0"
- "This is a major version"

### 4. TDD Enforcement
Tests MUST be written before code. No exceptions.

### 5. Session Persistence
Work tracked in `.specify/memory/active/`:
- `current-session.md` - What you're working on
- `[feature]-plan.md` - Design
- `[feature]-tasks.md` - Checklist
- `[feature]-notes.md` - Expert advice

## Example Session

```bash
# You type:
/plan Add LRU caching to variant resolution

# Agent responds:
✋ PLAN COMPLETE

Feature: variant-caching
Artifacts:
  - .specify/memory/active/variant-caching-plan.md
  - .specify/memory/active/variant-caching-tasks.md
  - .specify/memory/active/variant-caching-notes.md

Constitutional review:
  - Bundle: 18.2 → 19.1 kB (38% of 50 kB limit) ✅
  - Breaking: NO ✅
  - TDD: Tests planned before code ✅

Specialists consulted:
  - i18n-specialist: Use LRU with max 1000 entries
  - performance-auditor: Benchmark with 10K variants

Next: Review plan, then run /implement variant-caching

# You review, approve

/implement variant-caching

# Agent responds:
✅ Task 1/5: Write failing tests
   Tests: 226 pass, 3 fail ✓ (expected)

✅ Task 2/5: Implement LRU cache
   Tests: 229/229 pass ✓
   Bundle: 18.9 kB ✓

✅ Task 3/5: Integration tests
   Tests: 232/232 pass ✓

✋ IMPLEMENTATION COMPLETE

Modified files:
  - src/variant-resolver.ts (+45 lines)
  - test/unit/variant-caching.test.ts (+120 lines)

Quality checks:
  ✅ Tests: 232/232 passing
  ✅ Lint: Clean
  ✅ Typecheck: Clean
  ✅ Bundle: 19.1 kB / 50 kB (38%)

Next: Review changes, then run /changeset variant-caching

# You review git diff, approve

/changeset variant-caching

# Agent responds:
✋ CHANGESET CREATED

File: .changeset/brave-horses-dance.md
Version: minor (v0.12.1 → v0.13.0)
Breaking: NO

Summary:
Add LRU caching to variant resolution for 20% faster lookups

Next steps:
  1. Review .changeset/brave-horses-dance.md
  2. git add . && git commit -m "feat: add variant caching"
  3. gh pr create

# You commit manually
git add .
git commit -m "feat: add variant resolution caching"
gh pr create

# Done! GitHub Actions handles the rest
```

## Commands Reference

### Core Workflow
```bash
/plan [description]        # Gate 1: Design with experts
/implement [feature-name]  # Gate 2: Code with TDD
/changeset [feature-name]  # Gate 3: Version with protection
```

### Domain Helpers
```bash
/surql [description]       # Generate SurrealQL
/zod-from-surql [path]     # Generate Zod schemas
/docs-audit                # Audit documentation
/test-gen [description]    # Generate tests
/constitution              # View/update constitution
```

## When NOT to Use Slash Commands

For simple tasks, just ask naturally:
```
"Fix the typo in README.md line 42"
"Update the example to use the new API"
"Add a type annotation to this function"
```

Use slash commands for:
- ✅ New features
- ✅ Architectural changes
- ✅ Multi-file refactors
- ✅ Breaking changes
- ✅ Performance optimizations

## Troubleshooting

### Agent skips planning
Point to: `.claude/commands-v2/plan.md` (MANDATORY PREREQUISITES section)

### Agent commits automatically
Remind: Commands have `❌ FORBIDDEN: Making git commits` constraint

### Agent suggests MAJOR bump too easily
Remind: Breaking change protection requires explicit approval

### Constitutional constraints forgotten
All commands auto-load constitution - if forgotten, restart session

## Documentation

- **`.claude/README.md`** - Full configuration overview
- **`.claude/WORKFLOW.md`** - Detailed workflow documentation
- **`OPENCODE-SETUP.md`** - This file's parent (complete summary)
- **`.specify/memory/active/README.md`** - Active memory usage

## Philosophy

**"Agents do the WORK. You keep CONTROL."**

Agents are powerful assistants, not autonomous decision-makers.

---

**Quick start**: Try `/plan Add a simple test feature`
