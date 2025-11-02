# Final Clean Structure for Model-Agnostic Workflow

## The Core Insight

**Problem**: Confusion between `.claude/` (OpenCode-specific) and `.specify/` (project knowledge)

**Solution**: Clear separation of concerns:
- **`.claude/`** → Model-agnostic commands (works with ANY AI tool)
- **`.specify/`** → Project knowledge base (domain docs, specialists, constitution)
- **Root `*.md`** → Human-readable project docs (README, ROADMAP, etc.)

---

## Proposed Clean Structure

```
project-root/
├── .claude/                          # AI COMMANDS (model-agnostic)
│   ├── commands/                     # Slash commands
│   │   ├── plan.md                  # Gate 1: Planning
│   │   ├── implement.md             # Gate 2: Implementation
│   │   ├── changeset.md             # Gate 3: Release
│   │   ├── surql.md                 # Domain helper
│   │   └── zod-from-surql.md        # Domain helper
│   ├── README.md                     # How to use commands
│   └── settings.local.json           # Permissions
│
├── .specify/                         # PROJECT KNOWLEDGE (read by any AI)
│   ├── agents/                       # Specialist definitions
│   │   ├── surrealdb-expert.md
│   │   ├── zod-integration-specialist.md
│   │   └── [7 more...]
│   ├── memory/                       # Design documents
│   │   ├── constitution.md          # PROJECT PRINCIPLES (most important)
│   │   ├── active/                  # Current work
│   │   └── [26 design docs...]
│   └── README.md                     # Knowledge base overview
│
└── *.md                              # HUMAN DOCS (README, ROADMAP, etc.)
```

---

## Directory Purposes (Crystal Clear)

### `.claude/` → AI COMMAND CENTER
**Purpose**: Commands ANY AI agent can execute  
**Audience**: AI agents (OpenCode, Cursor, Aider, etc.)  
**Contains**: Executable slash commands with instructions  
**Model-agnostic**: YES ✅

**Files to keep**:
- `commands/plan.md` (Gate 1)
- `commands/implement.md` (Gate 2)
- `commands/changeset.md` (Gate 3)
- `commands/surql.md` (SurrealDB helper)
- `commands/zod-from-surql.md` (Zod helper)
- `README.md` (command usage guide)
- `settings.local.json` (permissions)

**Files to remove**:
- `commands/` (old github-spec-kit commands)
- `commands-proposed/` (superseded by commands-v2)
- `commands-v2/` (rename to commands/)
- `agents/` (just a redirect, unnecessary)
- `WORKFLOW.md` (move to .specify/memory/)
- `RESTRUCTURING-PLAN.md` (archive)
- `QUICK-START.md` (merge into README.md)

### `.specify/` → PROJECT BRAIN
**Purpose**: Everything an AI needs to KNOW about this project  
**Audience**: ANY AI reading context (not OpenCode-specific)  
**Contains**: Constitution, design docs, specialist agents  
**Model-agnostic**: YES ✅

**Files to keep**:
- `memory/constitution.md` ⭐ MOST IMPORTANT
- `memory/active/` (current work tracking)
- `memory/*.md` (all design docs)
- `agents/*.md` (all specialists)
- `README.md` (knowledge base overview)

**Files to remove/archive**:
- `scripts/` (github-spec-kit bash scripts → archive)
- `templates/` (github-spec-kit templates → archive)
- `AGENT-EXAMPLES.md` (merge into agents/README.md)
- `AGENT-MAINTENANCE.md` (merge into agents/README.md)
- `SLASH-COMMANDS-GUIDE.md` (move to .claude/README.md)

### Root `*.md` → HUMAN REFERENCE
**Purpose**: Documentation for human developers  
**Audience**: Humans browsing GitHub  
**Contains**: README, ROADMAP, CHANGELOG, CONTRIBUTING  
**Model-agnostic**: N/A (for humans)

**Files to keep**:
- `README.md` (project overview)
- `CHANGELOG.md` (version history)
- `ROADMAP.md` (future plans)
- `CONTRIBUTING.md` (contribution guide)
- `SECURITY.md` (security policy)
- `AGENTS.md` (AI collaboration guide) ← SIMPLIFY THIS

**Files to remove/merge**:
- `OPENCODE-SETUP.md` (merge into AGENTS.md)
- `NEXT-STEPS.md` (archive or merge into ROADMAP.md)

---

## Clean Commands Structure

**Final `.claude/commands/` directory**:
```
.claude/commands/
├── plan.md            # Gate 1: Create design artifacts
├── implement.md       # Gate 2: Execute with TDD
├── changeset.md       # Gate 3: Version with protection
├── surql.md           # Generate SurrealQL schemas
└── zod-from-surql.md  # Generate Zod from SurrealQL
```

**That's it. 5 commands total.**

Remove:
- Old github-spec-kit commands (specify, clarify, tasks, analyze, design)
- Duplicate commands in commands-proposed/
- Redundant helpers (constitution → just read the file directly)
- Review commands (merge into plan/implement)

---

## Simplified Root AGENTS.md

**Current**: 300+ lines, duplicates .claude/README.md  
**Proposed**: 100 lines, clear human-readable guide

**New structure**:
```markdown
# AI Collaboration Guide

## Quick Start

Three commands for features:
/plan [description]       → Design with experts
/implement [feature]      → Code with TDD
/changeset [feature]      → Version safely

Simple tasks: Just ask naturally

## Project Knowledge

AI agents should read:
1. .specify/memory/constitution.md (principles)
2. .specify/agents/*.md (domain expertise)
3. .specify/memory/active/ (current work)

## Development Standards

[Quick reference from constitution]
- Bundle limit: 50 kB
- TDD: Tests first, always
- Security: Trusted schemas only
- Changesets: Automated versioning

## Detailed Docs

See .claude/README.md for command details
See .specify/README.md for knowledge base
```

---

## The Cleanup Plan

### Step 1: Consolidate Commands
```bash
# Move commands-v2 to commands (replace old)
rm -rf .claude/commands/
mv .claude/commands-v2/ .claude/commands/

# Remove duplicates
rm -rf .claude/commands-proposed/
rm .claude/agents/README.md  # Just a redirect
```

### Step 2: Archive Old github-spec-kit
```bash
mkdir -p .archive/github-spec-kit
mv .specify/scripts/ .archive/github-spec-kit/
mv .specify/templates/ .archive/github-spec-kit/
```

### Step 3: Consolidate Documentation
```bash
# Merge redundant docs
# AGENTS.md ← OPENCODE-SETUP.md (key parts)
# .claude/README.md ← QUICK-START.md + WORKFLOW.md (relevant parts)
# .specify/agents/README.md ← AGENT-EXAMPLES.md + AGENT-MAINTENANCE.md

# Archive old docs
mv .claude/RESTRUCTURING-PLAN.md .archive/
mv .claude/WORKFLOW.md .specify/memory/workflow-design.md
mv OPENCODE-SETUP.md .archive/
```

### Step 4: Simplify Root
```bash
# Keep only essential human docs:
# README.md, CHANGELOG.md, ROADMAP.md, CONTRIBUTING.md, SECURITY.md
# AGENTS.md (simplified)

# Archive or delete
mv NEXT-STEPS.md .archive/
```

---

## Final File Count

**Before cleanup**:
- `.claude/`: 20+ files (cluttered)
- `.specify/`: 50+ files (good, keep most)
- Root: 8+ markdown files (some redundant)

**After cleanup**:
- `.claude/`: 7 files (clean)
  - `commands/*.md` (5 commands)
  - `README.md` (1 guide)
  - `settings.local.json` (1 config)
- `.specify/`: 40+ files (streamlined)
  - `agents/*.md` (9 specialists)
  - `memory/*.md` (30+ design docs + active/)
  - `README.md` (1 overview)
- Root: 6 markdown files (essential)
  - README, CHANGELOG, ROADMAP, CONTRIBUTING, SECURITY, AGENTS

**Total reduction**: ~30% fewer files, 90% clearer purpose

---

## Model-Agnostic Benefits

### Works with ANY AI tool:

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
# Then: "Execute this plan command with 'Add feature X'"
```

**GitHub Copilot Chat**:
```
@workspace Execute the command in .claude/commands/plan.md for "Add feature X"
```

### Universal Knowledge Access

ANY AI can read:
- `.specify/memory/constitution.md` (principles)
- `.specify/agents/surrealdb-expert.md` (expertise)
- `.specify/memory/active/current-session.md` (context)

No tool-specific syntax required.

---

## The Golden Rule

**ONE PURPOSE PER DIRECTORY**:

| Directory | Purpose | Audience | Changes Often? |
|-----------|---------|----------|----------------|
| `.claude/` | AI Commands | AI agents | Rarely (stable workflow) |
| `.specify/` | Project Knowledge | AI agents | Sometimes (design evolves) |
| Root `*.md` | Human Docs | Humans | Often (releases, guides) |

**No overlap. No confusion.**

---

## Validation Checklist

After cleanup, verify:

- [ ] Can I find commands? → `.claude/commands/`
- [ ] Can I find constitution? → `.specify/memory/constitution.md`
- [ ] Can I find specialists? → `.specify/agents/`
- [ ] Can I find human docs? → Root `*.md` files
- [ ] Are there duplicates? → NO
- [ ] Can ANY AI use this? → YES

If all checkboxes: ✅ Clean structure achieved

---

## Implementation: One Command

```bash
# Execute this cleanup script
cd /path/to/json

# 1. Consolidate commands
rm -rf .claude/commands/
mv .claude/commands-v2/ .claude/commands/

# 2. Archive old stuff
mkdir -p .archive/github-spec-kit
mv .specify/scripts/ .archive/github-spec-kit/
mv .specify/templates/ .archive/github-spec-kit/
mv .claude/commands-proposed/ .archive/github-spec-kit/
mv .claude/RESTRUCTURING-PLAN.md .archive/
mv OPENCODE-SETUP.md .archive/

# 3. Merge workflow doc
mv .claude/WORKFLOW.md .specify/memory/workflow-design.md

# 4. Consolidate guides (manual merge needed)
# TODO: Merge .claude/QUICK-START.md into .claude/README.md
# TODO: Merge OPENCODE-SETUP.md content into AGENTS.md
# TODO: Simplify AGENTS.md to ~100 lines

# 5. Clean up
rm -rf .claude/agents/  # Just a redirect
rm NEXT-STEPS.md  # Outdated

echo "Cleanup complete! Review changes and commit."
```

---

## Next Steps

1. **Review this plan** - Does it make sense?
2. **Execute cleanup** - Run the script above
3. **Merge docs** - Consolidate AGENTS.md, .claude/README.md
4. **Test workflow** - Try `/plan`, `/implement`, `/changeset`
5. **Commit** - Clean structure ready for any AI tool

---

**Key principle**: If you can't explain a directory's purpose in 5 words, it's too complicated.

- `.claude/` → AI commands
- `.specify/` → Project knowledge  
- Root → Human docs

That's it.
