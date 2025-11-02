# Controlled Collaborative Workflow for jsön

## Problem Statement

**Challenge**: AI agents (especially over-confident models like Grok) can:
- Skip planning and jump to implementation
- Commit code prematurely
- Auto-merge PRs without review
- Forget constitutional constraints mid-session
- Cause unintended version bumps (v0→v1)

**Goal**: Establish a **predictable, gated workflow** with mandatory checkpoints where YOU retain control.

---

## The Three-Gate Workflow

### Gate 1: PLAN (Before Code)
### Gate 2: IMPLEMENT (Controlled Execution)  
### Gate 3: RELEASE (Manual Approval)

Each gate has **mandatory prerequisites** and **explicit human approval** before proceeding.

---

## Gate 1: PLAN → Create Design Artifacts

**Trigger**: `/plan [feature description]`

**What happens**:
1. Agent reads constitutional constraints automatically
2. Agent consults specialist agents for domain expertise
3. Agent creates design artifacts in `.specify/memory/active/`
4. Agent STOPS and waits for your review

**Prerequisites** (agent MUST verify):
- [ ] Constitution read: `.specify/memory/constitution.md`
- [ ] Relevant specialist agent consulted (if SurrealDB/Zod/i18n/etc)
- [ ] No breaking changes unless explicitly requested
- [ ] Bundle size impact estimated

**Output artifacts**:
```
.specify/memory/active/
├── [feature-name]-plan.md       # Architecture decisions
├── [feature-name]-tasks.md      # Ordered implementation tasks
└── [feature-name]-notes.md      # Specialist agent recommendations
```

**Human checkpoint**: 
```
✋ PLAN COMPLETE - Review artifacts before proceeding
   To continue: /implement [feature-name]
   To revise: /replan [feature-name] with changes
```

**Agent constraints**:
- ❌ NO code writing during /plan
- ❌ NO file modifications outside .specify/memory/active/
- ❌ NO git commits
- ✅ CAN read existing code for context
- ✅ CAN consult specialist agents
- ✅ CAN estimate impact

---

## Gate 2: IMPLEMENT → Execute Plan with Guardrails

**Trigger**: `/implement [feature-name]`

**What happens**:
1. Agent loads plan from `.specify/memory/active/[feature-name]-plan.md`
2. Agent executes tasks in order (TDD: tests first, then code)
3. Agent runs validation after each major step
4. Agent STOPS before any git operations

**Prerequisites** (agent MUST verify):
- [ ] Plan file exists in active/
- [ ] Human approved proceeding (explicit /implement command)
- [ ] No staged changes (clean working directory)

**Execution rules** (ENFORCED):
1. **TDD mandatory**: Write test → verify fail → implement → verify pass
2. **Constitution checks**: Re-read constitution before breaking changes
3. **Incremental validation**: Run tests + typecheck after each task
4. **Stop on failure**: Halt and report if tests fail
5. **Bundle size monitor**: Check size after core changes

**Progress tracking**:
```
✅ Task 1/5: Write tests for variant resolution
✅ Task 2/5: Implement variant resolution
⏸️  Task 3/5: Add integration tests
   
   Current status: 2/5 tasks complete
   Tests passing: 226/226
   Bundle size: 18.2 kB / 50 kB (36%)
```

**Human checkpoint**:
```
✋ IMPLEMENTATION COMPLETE - Review changes before committing
   Modified files: src/variant-resolver.ts, test/unit/variants.test.ts
   Tests: 228/228 passing
   Bundle: 18.4 kB / 50 kB (36.8%)
   
   To create changeset: /changeset [feature-name]
   To rollback: git restore .
```

**Agent constraints**:
- ❌ NO git commits (human does this)
- ❌ NO PR creation (human does this)
- ❌ NO version bumps (changesets handles this)
- ❌ NO automatic merges
- ✅ CAN write code and tests
- ✅ CAN run build/test/lint
- ✅ CAN create changeset FILES (not commit them)

---

## Gate 3: RELEASE → Prepare Changeset

**Trigger**: `/changeset [feature-name]`

**What happens**:
1. Agent analyzes git diff of staged changes
2. Agent determines semantic version impact (patch/minor/major)
3. Agent drafts changeset description
4. Agent creates `.changeset/[random-id].md` file
5. Agent STOPS and shows you the changeset

**Prerequisites** (agent MUST verify):
- [ ] Implementation complete
- [ ] All tests passing
- [ ] Build successful
- [ ] Linting clean
- [ ] No breaking changes unless explicitly documented

**Version detection rules**:
```typescript
// Agent MUST follow these rules for version bump
const determineVersionBump = (changes: GitDiff) => {
  // MAJOR (v0→v1, v1→v2): Breaking API changes
  if (hasBreakingChanges && userExplicitlyApproved) {
    return 'major';
  }
  
  // MINOR (v0.12→v0.13): New features, new exports
  if (hasNewFeatures || hasNewExports) {
    return 'minor';
  }
  
  // PATCH (v0.12.0→v0.12.1): Bug fixes, docs, internal refactors
  return 'patch';
};

// OVERRIDE: Never suggest major bump unless user explicitly says:
// "I want a breaking change" or "bump to v1.0"
```

**Changeset draft**:
```markdown
---
"@orb-zone/dotted-json": patch
---

Add variant resolution caching for improved i18n performance.

- Cache variant scoring results to avoid redundant calculations
- 20% faster resolution for multi-variant lookups
- No breaking changes to public API
```

**Human checkpoint**:
```
✋ CHANGESET READY - Review before committing
   File: .changeset/fuzzy-pandas-jump.md
   Version: patch (v0.12.1 → v0.12.2)
   Breaking: NO
   
   To commit: git add . && git commit -m "feat: add variant caching"
   To revise: edit .changeset/fuzzy-pandas-jump.md manually
   To cancel: rm .changeset/fuzzy-pandas-jump.md
```

**Agent constraints**:
- ❌ NO commits (you do this manually)
- ❌ NO auto-selecting major version (unless explicit approval)
- ❌ NO PR creation (you do this manually)
- ✅ CAN analyze changes
- ✅ CAN draft changeset
- ✅ CAN suggest version bump

---

## Slash Commands Summary

### Planning Commands
| Command | Purpose | Output | Next Step |
|---------|---------|--------|-----------|
| `/plan [description]` | Create design artifacts | `active/[feature]-plan.md` | Review → `/implement` |
| `/replan [feature]` | Revise existing plan | Updated `plan.md` | Review → `/implement` |

### Implementation Commands
| Command | Purpose | Output | Next Step |
|---------|---------|--------|-----------|
| `/implement [feature]` | Execute plan with TDD | Code + tests | Review → `/changeset` |
| `/test [description]` | Generate tests only | Test files | Review → run tests |

### Release Commands
| Command | Purpose | Output | Next Step |
|---------|---------|--------|-----------|
| `/changeset [feature]` | Create changeset file | `.changeset/*.md` | Review → commit |

### Specialist Commands (No Code)
| Command | Purpose | Output | Next Step |
|---------|---------|--------|-----------|
| `/surql [description]` | Generate SurrealQL | Schema code | Review → save |
| `/zod-from-surql [path]` | Generate Zod schemas | Validation code | Review → save |
| `/docs-audit` | Audit documentation | Issue report | Fix issues |
| `/constitution` | View/update constitution | Constitutional text | Review → update |

---

## Memory Auto-Loading Strategy

### Constitutional Constraints (Auto-load ALWAYS)

Every agent session MUST load:
```
.specify/memory/constitution.md
```

**Enforcement**: Add to every command's preamble:
```markdown
Before proceeding, you MUST:
1. Read `.specify/memory/constitution.md` in full
2. Verify your plan doesn't violate any principles
3. Call out any potential conflicts
```

### Specialist Agents (Conditional Auto-load)

**Trigger patterns** (agent auto-loads relevant specialist):

| Keywords | Load Specialist | Why |
|----------|----------------|-----|
| "SurrealDB", "database", "LIVE query", "schema" | `surrealdb-expert.md` | Database expertise |
| "Zod", "validation", "schema", "types from" | `zod-integration-specialist.md` | Schema validation |
| "i18n", "translate", "variants", "locale" | `i18n-specialist.md` | Internationalization |
| "performance", "bundle", "optimize", "slow" | `performance-auditor.md` | Optimization |
| "test", "TDD", "coverage", "integration test" | `testing-specialist.md` | Testing strategy |
| "Vue", "composable", "Pinia", "reactive" | `vue3-expert.md` | Vue patterns |
| "docs", "README", "API docs", "examples" | `documentation-curator.md` | Documentation |

**Example auto-load**:
```
User: "Add SurrealDB LIVE query support for variants"

Agent internal process:
1. ✅ Load constitution.md (always)
2. ✅ Detect "SurrealDB" + "LIVE query" + "variants"
3. ✅ Auto-load: surrealdb-expert.md, i18n-specialist.md
4. ✅ Proceed with planning
```

---

## Breaking Change Protection

### Rule: NO MAJOR BUMPS without explicit approval

**Protected patterns** (require explicit user approval):
- Removing public exports
- Changing function signatures
- Renaming APIs
- Removing options/parameters
- Changing default behavior

**Approval required**:
```
User must explicitly say:
- "I want a breaking change"
- "Bump to v1.0"
- "This is a major version"

Otherwise, agent MUST find non-breaking solution.
```

**Example protection**:
```
❌ Agent: "I'll rename dotted() to expand() for clarity"
   → BLOCKED: Breaking change without approval

✅ Agent: "I'll add expand() as an alias, deprecate dotted() in v0.13, 
           remove in v1.0. Requires explicit approval for v1.0 timeline."
   → OK: Non-breaking migration path
```

---

## Session Context Persistence

### Active Memory Directory

```
.specify/memory/active/
├── current-session.md          # What we're working on NOW
├── [feature-name]-plan.md      # Design artifacts
├── [feature-name]-tasks.md     # Task list
└── [feature-name]-notes.md     # Specialist recommendations
```

**Session file format**:
```markdown
# Current Session: 2025-10-20

## Active Feature
Feature: Add variant caching
Status: PLANNING
Branch: 013-variant-caching

## Constitutional Review
- ✅ Bundle size: Estimated +0.8 kB (18.2 → 19.0)
- ✅ TDD: Tests planned before implementation
- ✅ Breaking changes: NONE
- ✅ Security: No new expression eval

## Specialist Consultations
- i18n-specialist: Recommended LRU cache with max 1000 entries
- performance-auditor: Suggested benchmarking with 10K variants

## Next Steps
1. Review plan artifacts
2. User approval to proceed with /implement
```

**Benefit**: New agent session can read `current-session.md` and immediately understand context.

---

## Agent Prompt Template (For Commands)

### Standard Preamble (All Commands)

```markdown
---
description: [Command purpose]
---

MANDATORY PREREQUISITES (You MUST complete before proceeding):

1. **Constitutional Review**:
   - Read `.specify/memory/constitution.md` in full
   - Verify your approach doesn't violate any principle
   - Call out any potential conflicts

2. **Context Loading**:
   - Check for active session: `.specify/memory/active/current-session.md`
   - Load relevant specialist agents based on keywords
   - Review related design docs if this extends existing features

3. **Breaking Change Check**:
   - Will this change remove/rename public APIs? → BLOCKED without explicit approval
   - Will this change function signatures? → BLOCKED without explicit approval
   - Will this change default behavior? → BLOCKED without explicit approval

4. **Human Approval Gates**:
   - NO git commits (human does this)
   - NO PR creation (human does this)
   - NO automatic merges
   - STOP and wait for human review before proceeding to next gate

User input: $ARGUMENTS

[Rest of command logic...]
```

### Example: /plan Command

```markdown
---
description: Create design artifacts for a feature with specialist consultation
---

MANDATORY PREREQUISITES (You MUST complete before proceeding):
[... standard preamble ...]

## Planning Process

1. **Load Context**:
   - Read `.specify/memory/constitution.md`
   - Detect keywords in user request
   - Auto-load relevant specialist agents:
     * "SurrealDB" → `surrealdb-expert.md`
     * "Zod" → `zod-integration-specialist.md`
     * "i18n" → `i18n-specialist.md`
     * [etc...]

2. **Consult Specialists**:
   - Ask domain experts for architectural guidance
   - Document recommendations in notes file
   - Identify potential constraints or best practices

3. **Create Design Artifacts**:
   - `.specify/memory/active/[feature-name]-plan.md`
   - `.specify/memory/active/[feature-name]-tasks.md`
   - `.specify/memory/active/[feature-name]-notes.md`
   - `.specify/memory/active/current-session.md` (update)

4. **Constitutional Validation**:
   - Estimate bundle size impact
   - Identify any breaking changes (require explicit approval)
   - Verify TDD approach is planned

5. **STOP and Report**:
   ```
   ✋ PLAN COMPLETE
   
   Feature: [name]
   Artifacts: .specify/memory/active/[feature-name]-*
   Breaking: [YES/NO - if YES, request explicit approval]
   Bundle: [current] → [estimated] kB
   
   Next: Review artifacts, then run /implement [feature-name]
   ```

CONSTRAINTS:
- ❌ NO code writing
- ❌ NO git operations
- ✅ CAN read existing code
- ✅ CAN consult specialists
- ✅ CAN create design docs
```

---

## Implementation Example

### Full Workflow: "Add variant caching"

**Step 1: Planning**
```bash
User: /plan Add LRU caching to variant resolution for better i18n performance

Agent: 
  [Reads constitution.md]
  [Detects "variant", "i18n", "performance"]
  [Auto-loads: i18n-specialist.md, performance-auditor.md]
  [Consults specialists]
  [Creates plan artifacts]
  
  ✋ PLAN COMPLETE
  
  Feature: variant-caching
  Artifacts: .specify/memory/active/variant-caching-*
  Breaking: NO
  Bundle: 18.2 → 19.0 kB (estimated +0.8 kB, 38% of limit)
  
  Specialist recommendations:
  - i18n-specialist: LRU cache with max 1000 entries
  - performance-auditor: Benchmark with 10K variants
  
  Next: Review .specify/memory/active/variant-caching-plan.md
        Then run: /implement variant-caching
```

**Step 2: Human Review**
```bash
User: [Reviews plan.md, approves]
User: /implement variant-caching

Agent:
  [Loads plan from active/variant-caching-plan.md]
  [Executes tasks in TDD order]
  
  ✅ Task 1/5: Write failing test for LRU cache
     → test/unit/variant-caching.test.ts created
     → Tests: 226 pass, 3 fail ✓ (expected failures)
  
  ✅ Task 2/5: Implement LRU cache in variant-resolver
     → src/variant-resolver.ts modified (+45 lines)
     → Tests: 229/229 passing ✓
     → Bundle: 18.9 kB / 50 kB (37.8%)
  
  [... continues through all tasks ...]
  
  ✋ IMPLEMENTATION COMPLETE
  
  Modified files:
  - src/variant-resolver.ts
  - test/unit/variant-caching.test.ts
  
  Quality checks:
  ✅ Tests: 232/232 passing
  ✅ Lint: Clean
  ✅ Typecheck: Clean
  ✅ Bundle: 19.1 kB / 50 kB (38.2%)
  ✅ Breaking changes: NONE
  
  Next: /changeset variant-caching
```

**Step 3: Changeset**
```bash
User: /changeset variant-caching

Agent:
  [Analyzes git diff]
  [Determines: MINOR - new feature, no breaking changes]
  [Drafts changeset]
  
  ✋ CHANGESET READY
  
  File: .changeset/brave-horses-dance.md
  Version: minor (v0.12.1 → v0.13.0)
  Breaking: NO
  
  Summary:
  "Add LRU caching to variant resolution for 20% faster i18n lookups"
  
  Next steps:
  1. Review .changeset/brave-horses-dance.md
  2. git add .
  3. git commit -m "feat: add variant resolution caching"
  4. gh pr create
```

**Step 4: Manual Release**
```bash
User: [Reviews changeset]
User: git add .
User: git commit -m "feat: add variant resolution caching"
User: gh pr create
→ GitHub Actions creates "Version Packages" PR
→ User reviews and merges
→ Automated publish to JSR
```

---

## Quick Reference Card

### Before ANY Code
1. `/plan [description]` → Review artifacts
2. Human: Approve or revise

### During Implementation
1. `/implement [feature]` → Agent writes code (TDD)
2. Human: Review changes

### Before Committing
1. `/changeset [feature]` → Agent creates changeset
2. Human: Review version bump
3. Human: `git commit` and `gh pr create`

### Never Automated
- ❌ git commits
- ❌ PR merges
- ❌ Major version bumps (without explicit approval)
- ❌ Breaking API changes (without explicit approval)

### Always Automated
- ✅ Constitutional review
- ✅ Specialist consultation
- ✅ TDD enforcement
- ✅ Test/lint/typecheck validation
- ✅ Bundle size monitoring

---

## Summary

This workflow gives you:

1. **Predictable gates**: PLAN → IMPLEMENT → CHANGESET
2. **Human control**: Explicit approval at each gate
3. **Constitutional enforcement**: Auto-loaded every session
4. **Specialist expertise**: Auto-consulted based on keywords
5. **Breaking change protection**: Requires explicit approval
6. **Version bump safety**: No surprise major bumps
7. **Session persistence**: `active/` directory tracks state

**The key**: Agents do the WORK, you keep CONTROL.
