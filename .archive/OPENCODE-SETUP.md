# OpenCode Setup Summary for jsön

## What We Built

A **controlled collaborative workflow** that prevents over-confident AI agents from causing chaos while maintaining the benefits of specialist expertise and planning discipline.

## The Problem We Solved

**Before** (github-spec-kit with over-confident agents):
- ❌ Agents skip planning and jump to code
- ❌ Premature commits and auto-merges
- ❌ Unintended version bumps (v0→v1)
- ❌ Forgotten constitutional constraints
- ❌ Breaking changes without approval

**After** (Controlled Workflow):
- ✅ Mandatory planning before code
- ✅ Human approval at every gate
- ✅ Breaking change protection
- ✅ Constitutional auto-loading
- ✅ Specialist auto-consultation
- ✅ TDD enforcement

## The Three-Gate System

### Gate 1: PLAN (Design First)
```bash
/plan Add feature X
```
**Agent does**:
- Reads constitution.md automatically
- Detects keywords, auto-loads relevant specialists
- Consults specialists for recommendations
- Creates design artifacts in `.specify/memory/active/`
- Estimates bundle size impact
- Identifies breaking changes

**Agent STOPS**: ✋ Review plan before proceeding

**You review**: `.specify/memory/active/feature-x-plan.md`

### Gate 2: IMPLEMENT (Controlled Execution)
```bash
/implement feature-x
```
**Agent does**:
- Loads plan from active memory
- Executes tasks in TDD order (tests first, then code)
- Validates after each step (tests/lint/typecheck/build)
- Monitors bundle size continuously
- Stops if any validation fails

**Agent STOPS**: ✋ Review changes before committing

**You review**: `git diff`

### Gate 3: CHANGESET (Version Control)
```bash
/changeset feature-x
```
**Agent does**:
- Analyzes git diff for changes
- Detects breaking changes
- Blocks MAJOR bumps unless you explicitly approve
- Suggests semantic version bump (patch/minor/major)
- Creates changeset file

**Agent STOPS**: ✋ Review changeset, then commit manually

**You commit**:
```bash
git add .
git commit -m "feat: add feature X"
gh pr create
```

## Key Safety Features

### 1. Constitutional Auto-Loading
Every command automatically reads `.specify/memory/constitution.md` before proceeding.

**Enforces**:
- Bundle size limit (50 kB)
- TDD workflow
- Security warnings
- Plugin architecture
- Framework-agnostic core

### 2. Specialist Auto-Consultation
Commands detect keywords and auto-load relevant experts:

| Keywords | Loads Specialist |
|----------|-----------------|
| "SurrealDB", "database", "LIVE query" | `surrealdb-expert.md` |
| "Zod", "validation", "schema" | `zod-integration-specialist.md` |
| "i18n", "translate", "variant" | `i18n-specialist.md` |
| "performance", "bundle", "optimize" | `performance-auditor.md` |
| "test", "TDD", "coverage" | `testing-specialist.md` |
| "Vue", "Pinia", "composable" | `vue3-expert.md` |
| "docs", "README", "API" | `documentation-curator.md` |

### 3. Breaking Change Protection
**MAJOR version bumps BLOCKED** unless explicit approval:

```
Agent: ⛔ BREAKING CHANGE DETECTED
       Removing public export: variantScore()
       Do you approve MAJOR bump? (yes/no)

You must explicitly say:
- "yes, bump to v1.0"
- "I want a breaking change"
- "This is a major version"
```

### 4. TDD Enforcement
`/implement` enforces RED-GREEN-REFACTOR cycle:
1. Write failing test FIRST
2. Run test, verify failure
3. Write minimal code to pass
4. Run test, verify all pass
5. Refactor (optional)

No shortcuts allowed.

### 5. Session Persistence
`.specify/memory/active/` tracks work in progress:
- `current-session.md` - What you're working on NOW
- `[feature]-plan.md` - Design artifacts
- `[feature]-tasks.md` - Task checklist
- `[feature]-notes.md` - Specialist recommendations

**Benefit**: Resume work across sessions/machines

## Commands Available

### Core Workflow
| Command | Purpose |
|---------|---------|
| `/plan [description]` | Create design artifacts with specialist consultation |
| `/implement [feature]` | Execute plan with TDD and validation |
| `/changeset [feature]` | Create versioned changeset with protection |

### Domain Helpers
| Command | Purpose |
|---------|---------|
| `/surql [description]` | Generate SurrealQL schemas |
| `/zod-from-surql [path]` | Generate Zod from SurrealQL |
| `/docs-audit` | Audit documentation completeness |
| `/test-gen [description]` | Generate test suites |
| `/constitution` | View/update constitution |

## Directory Structure

```
.claude/
├── README.md                    # OpenCode config overview
├── WORKFLOW.md                  # Detailed workflow docs
├── commands-v2/                 # New controlled commands
│   ├── plan.md                 # Gate 1: Planning
│   ├── implement.md            # Gate 2: Implementation
│   └── changeset.md            # Gate 3: Release prep
└── commands-proposed/           # Original simplified commands

.specify/
├── agents/                      # Specialist agent definitions
│   ├── surrealdb-expert.md
│   ├── zod-integration-specialist.md
│   ├── i18n-specialist.md
│   └── [5 more...]
├── memory/
│   ├── constitution.md          # Project principles (auto-loaded)
│   ├── active/                  # Current work in progress
│   │   ├── current-session.md
│   │   └── [feature]-*.md
│   └── [26 design docs...]
└── [scripts, templates...]      # (To be archived)
```

## Example: Full Workflow

```bash
# Start new feature
/plan Add LRU caching to variant resolution

# Agent:
# 1. ✅ Reads constitution.md
# 2. ✅ Detects "variant", "caching"
# 3. ✅ Loads i18n-specialist.md, performance-auditor.md
# 4. ✅ Consults specialists
# 5. ✅ Creates plan/tasks/notes in .specify/memory/active/
# 6. ⏸️  STOPS
#
# ✋ PLAN COMPLETE
# Review: .specify/memory/active/variant-caching-plan.md
# Next: /implement variant-caching

# You review plan, approve

/implement variant-caching

# Agent:
# 1. ✅ Loads variant-caching-plan.md
# 2. ✅ Task 1: Write failing tests → Tests: 226 pass, 3 fail ✓
# 3. ✅ Task 2: Implement caching → Tests: 229/229 pass ✓
# 4. ✅ Task 3: Integration tests → Tests: 232/232 pass ✓
# 5. ✅ Validates: lint ✓, typecheck ✓, build ✓
# 6. ✅ Bundle: 18.2 → 19.1 kB (38% of limit) ✓
# 7. ⏸️  STOPS
#
# ✋ IMPLEMENTATION COMPLETE
# Modified: src/variant-resolver.ts, test/unit/variant-caching.test.ts
# Next: /changeset variant-caching

# You review git diff, approve

/changeset variant-caching

# Agent:
# 1. ✅ Runs quality gates (test/lint/typecheck/build)
# 2. ✅ Analyzes git diff
# 3. ✅ Detects: New optional param, no breaking changes
# 4. ✅ Determines: MINOR bump (v0.12 → v0.13)
# 5. ✅ Creates .changeset/brave-horses-dance.md
# 6. ⏸️  STOPS
#
# ✋ CHANGESET READY
# File: .changeset/brave-horses-dance.md
# Version: minor (v0.12.1 → v0.13.0)
# Breaking: NO

# You review changeset, commit manually
git add .
git commit -m "feat: add variant resolution caching"
gh pr create

# GitHub Actions creates "Version Packages" PR
# You review and merge → Automated publish to JSR
```

## Migration from github-spec-kit

**Old workflow** (heavyweight):
```bash
/specify "Feature description"
/clarify
/plan
/tasks
/implement
/analyze
```

**New workflow** (streamlined):
```bash
/plan Add feature X
/implement feature-x
/changeset feature-x
```

**What's different**:
- 3 commands instead of 6
- No bash scripts required
- Automatic specialist consultation
- Built-in breaking change protection
- Human approval gates

**Migration path**:
1. Start using new `/plan`, `/implement`, `/changeset` commands
2. Old commands still work but will be archived
3. Specialist agents remain in `.specify/agents/` (no change)
4. Design docs remain in `.specify/memory/` (no change)

## What Stays the Same

- ✅ Specialist agents (`.specify/agents/`)
- ✅ Design documents (`.specify/memory/`)
- ✅ Constitution (`.specify/memory/constitution.md`)
- ✅ TDD workflow
- ✅ Changesets for release management
- ✅ JSR publishing automation

## What's New

- ✅ Three-gate workflow (PLAN → IMPLEMENT → CHANGESET)
- ✅ Constitutional auto-loading (every session)
- ✅ Specialist auto-consultation (keyword detection)
- ✅ Breaking change protection (MAJOR bump blocked)
- ✅ Session persistence (`.specify/memory/active/`)
- ✅ Human approval gates (no surprises)

## Philosophy

**"Agents do the WORK. You keep CONTROL."**

- Agents leverage deep expertise
- Agents execute tasks efficiently
- Agents enforce quality standards
- **YOU** approve at every gate
- **YOU** decide when to proceed
- **YOU** commit and merge

## Next Steps

1. **Test the workflow**:
   ```bash
   /plan Add a simple test feature
   # Review artifacts
   /implement test-feature
   # Review changes
   /changeset test-feature
   # Review changeset, commit manually
   ```

2. **Customize if needed**:
   - Edit `.claude/commands-v2/` to adjust gates
   - Add more specialist agents to `.specify/agents/`
   - Update constitution in `.specify/memory/constitution.md`

3. **Archive old commands** (when ready):
   ```bash
   mkdir -p .archive/github-spec-kit
   mv .specify/scripts .archive/github-spec-kit/
   mv .specify/templates .archive/github-spec-kit/
   # Keep active commands in .claude/commands-v2/
   ```

## Documentation

- **`.claude/README.md`** - OpenCode configuration overview
- **`.claude/WORKFLOW.md`** - Detailed workflow documentation
- **`.claude/RESTRUCTURING-PLAN.md`** - Analysis and migration plan
- **`.specify/memory/active/README.md`** - Active memory directory usage
- **`AGENTS.md`** (root) - Agent guidelines and quick reference

## Support

If agents violate gates:
1. Stop the session
2. Point to relevant command file (`.claude/commands-v2/[command].md`)
3. Emphasize mandatory prerequisites section
4. Restart with explicit workflow reminder

The commands are self-documenting and self-enforcing via:
- "MANDATORY PREREQUISITES" sections
- "CONSTRAINTS (Strictly Enforced)" sections
- Explicit STOP points with ✋ emoji

---

**Last updated**: 2025-10-20  
**Workflow version**: 2.0 (Controlled Collaboration)  
**Status**: Ready to use
