# Active Memory Directory

## Purpose

This directory holds **current session state** for ongoing work. It enables:
- Session resumption after interruptions
- Multi-day feature development
- Context sharing between agents
- Planning artifact organization

## Structure

When working on a feature, you'll see:

```
.specify/memory/active/
├── current-session.md           # Current work status
├── [feature-name]-plan.md       # Design artifacts
├── [feature-name]-tasks.md      # Implementation tasks
└── [feature-name]-notes.md      # Specialist recommendations
```

## File Descriptions

### `current-session.md`
**Created by**: `/plan` command  
**Updated by**: `/implement`, `/changeset` commands  
**Purpose**: Track what you're working on NOW

**Contains**:
- Active feature name
- Current workflow stage (PLANNING / IMPLEMENTING / CHANGESET)
- Suggested branch name
- Constitutional review checklist
- Specialist consultations summary
- Next steps

### `[feature-name]-plan.md`
**Created by**: `/plan` command  
**Purpose**: Architecture and design decisions

**Contains**:
- Feature overview and rationale
- Constitutional compliance (bundle size, breaking changes, TDD, security)
- Architecture decisions with rationale
- File structure (which files will be created/modified)
- Specialist recommendations summary
- Dependencies required
- Risks and mitigations

### `[feature-name]-tasks.md`
**Created by**: `/plan` command  
**Updated by**: `/implement` command (marks tasks complete)  
**Purpose**: Ordered implementation checklist

**Contains**:
- Phase 1: Tests (TDD - write failing tests first)
- Phase 2: Implementation (write code to pass tests)
- Phase 3: Integration (integration tests, examples)
- Phase 4: Documentation (update docs)
- Validation checkpoints

### `[feature-name]-notes.md`
**Created by**: `/plan` command  
**Purpose**: Detailed specialist agent recommendations

**Contains**:
- One section per specialist consulted
- Recommendations from each specialist
- Constraints to be aware of
- Best practices for this domain
- References to relevant `.specify/agents/` files

## Lifecycle

### 1. Planning Phase
```bash
/plan Add feature X
```
Creates:
- `current-session.md` (status: PLANNING)
- `feature-x-plan.md`
- `feature-x-tasks.md`
- `feature-x-notes.md`

### 2. Implementation Phase
```bash
/implement feature-x
```
Updates:
- `current-session.md` (status: IMPLEMENTING)
- `feature-x-tasks.md` (marks tasks complete)

### 3. Changeset Phase
```bash
/changeset feature-x
```
Updates:
- `current-session.md` (status: READY_TO_COMMIT)

### 4. Completion
```bash
# After you manually commit and create PR
# Move artifacts to archive:
mkdir -p .specify/memory/archive/2025-10/
mv .specify/memory/active/feature-x-* .specify/memory/archive/2025-10/
```

## When to Clean Up

**Option 1: After PR merged**
```bash
# Archive the artifacts
mv active/feature-x-* archive/2025-10/
```

**Option 2: Start fresh**
```bash
# If starting entirely new feature
rm active/current-session.md
# Or just run /plan for new feature (it will update current-session.md)
```

## Session Resumption

If you come back after a break:

```bash
# Agent checks this file:
cat .specify/memory/active/current-session.md

# Sees:
# Active Feature: variant-caching
# Status: IMPLEMENTING
# Branch: 013-variant-caching

# Agent can pick up exactly where you left off
```

## Archive Organization

Suggested structure for completed work:

```
.specify/memory/archive/
├── 2025-10/
│   ├── variant-caching-plan.md
│   ├── variant-caching-tasks.md
│   └── variant-caching-notes.md
├── 2025-11/
│   └── [future features]
```

## Git Ignore

**NOT ignored** - These files should be committed so:
- You can resume work across machines
- Team members can see planning artifacts
- Historical context is preserved

Add to `.gitignore` if you prefer local-only:
```
.specify/memory/active/
```

## Example: Full Lifecycle

```bash
# Day 1: Planning
/plan Add LRU caching to variant resolution
# Creates: active/current-session.md, active/variant-caching-*.md

# Review artifacts, approve plan

# Day 2: Implementation  
/implement variant-caching
# Updates: current-session.md (status: IMPLEMENTING)
# Updates: variant-caching-tasks.md (marks tasks complete)

# Day 3: Changeset
/changeset variant-caching
# Updates: current-session.md (status: READY_TO_COMMIT)
# Creates: .changeset/fuzzy-pandas-jump.md

# You commit:
git add .
git commit -m "feat: add variant caching"
gh pr create

# PR merged, archive:
mkdir -p .specify/memory/archive/2025-10
mv active/variant-caching-* archive/2025-10/
```

---

**Last updated**: 2025-10-20  
**Related**: `.claude/WORKFLOW.md`, `.claude/commands-v2/`
