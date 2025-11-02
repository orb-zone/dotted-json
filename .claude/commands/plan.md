---
description: Create design artifacts with specialist consultation before any code is written
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Constitutional Review** (NON-NEGOTIABLE):
   - Read `.specify/memory/constitution.md` in FULL
   - Verify your approach doesn't violate ANY principle
   - Call out potential conflicts IMMEDIATELY

2. **Context Loading**:
   - Check for active session: `.specify/memory/active/current-session.md`
   - If exists, read it to understand ongoing work

3. **Breaking Change Detection**:
   - Will this remove/rename public APIs? → ⛔ BLOCKED without explicit user approval
   - Will this change function signatures? → ⛔ BLOCKED without explicit user approval  
   - Will this change default behavior? → ⛔ BLOCKED without explicit user approval
   - If ANY above are true, ASK USER for explicit approval before proceeding

4. **Specialist Auto-Loading** (based on keywords in user input):
   - "SurrealDB" OR "database" OR "LIVE query" → Load `.specify/agents/surrealdb-expert.md`
   - "Zod" OR "validation" OR "schema validation" → Load `.specify/agents/zod-integration-specialist.md`
   - "i18n" OR "translate" OR "variant" OR "locale" → Load `.specify/agents/i18n-specialist.md`
   - "performance" OR "bundle" OR "optimize" → Load `.specify/agents/performance-auditor.md`
   - "test" OR "TDD" OR "coverage" → Load `.specify/agents/testing-specialist.md`
   - "Vue" OR "composable" OR "Pinia" → Load `.specify/agents/vue3-expert.md`
   - "docs" OR "README" OR "documentation" → Load `.specify/agents/documentation-curator.md`

---

## User Input

$ARGUMENTS

---

## Planning Process

### Step 1: Load All Required Context

1. Read constitution (already done in prerequisites)
2. Load relevant specialist agents (already done in prerequisites)
3. Read related design docs from `.specify/memory/` if this extends existing features

### Step 2: Consult Specialists

For each loaded specialist agent:
- Ask for architectural recommendations
- Identify best practices for this domain
- Note any constraints or gotchas
- Document in `[feature-name]-notes.md`

### Step 3: Create Design Artifacts

Generate these files in `.specify/memory/active/`:

**File 1: `[feature-name]-plan.md`**
```markdown
# [Feature Name]

## Overview
[What this feature does and why]

## Constitutional Compliance
- Bundle size impact: [current] → [estimated] kB ([X]% of 50 kB limit)
- Breaking changes: [YES/NO - if YES, list them]
- TDD approach: [How tests will be written first]
- Security: [Any expression eval or trusted input concerns]

## Architecture Decisions
[Key technical choices with rationale]

## File Structure
[Which files will be created/modified]

## Specialist Recommendations
[Summary of specialist agent guidance]

## Dependencies
[New dependencies required, if any]

## Risks & Mitigations
[What could go wrong and how to prevent it]
```

**File 2: `[feature-name]-tasks.md`**
```markdown
# Implementation Tasks: [Feature Name]

## Phase 1: Tests (TDD)
- [ ] Task 1.1: Write failing test for [scenario]
- [ ] Task 1.2: Write failing test for [scenario]

## Phase 2: Implementation
- [ ] Task 2.1: Implement [core functionality]
- [ ] Task 2.2: Implement [edge cases]

## Phase 3: Integration
- [ ] Task 3.1: Integration tests
- [ ] Task 3.2: Update examples

## Phase 4: Documentation
- [ ] Task 4.1: Update API.md
- [ ] Task 4.2: Update README if needed

## Validation Checkpoints
- [ ] All tests passing (226+ total)
- [ ] Bundle size under 50 kB
- [ ] Lint clean
- [ ] Typecheck clean
```

**File 3: `[feature-name]-notes.md`**
```markdown
# Specialist Consultation Notes: [Feature Name]

## [Specialist Agent Name]
**Recommendations**:
- [Recommendation 1]
- [Recommendation 2]

**Constraints**:
- [Constraint 1]

**Best Practices**:
- [Practice 1]

[Repeat for each specialist consulted]
```

**File 4: `current-session.md`** (create or update)
```markdown
# Current Session: [DATE]

## Active Feature
Feature: [feature-name]
Status: PLANNING
Branch: [suggested-branch-name]

## Constitutional Review
- Bundle size: [impact]
- Breaking changes: [YES/NO]
- TDD: [approach]

## Specialist Consultations
- [specialist-1]: [key takeaway]
- [specialist-2]: [key takeaway]

## Next Steps
1. Review plan artifacts in .specify/memory/active/
2. User approval required
3. Then run: /implement [feature-name]
```

### Step 4: Constitutional Validation

Before finalizing:
- ✅ Estimate bundle size impact (use educated guess based on similar features)
- ✅ Identify ALL breaking changes (if any, require explicit approval)
- ✅ Verify TDD approach is planned (tests before code)
- ✅ Check security implications (especially expression evaluation)

### Step 5: STOP and Report

**DO NOT WRITE ANY CODE**. Output this message:

```
✋ PLAN COMPLETE

Feature: [feature-name]
Artifacts created:
  - .specify/memory/active/[feature-name]-plan.md
  - .specify/memory/active/[feature-name]-tasks.md
  - .specify/memory/active/[feature-name]-notes.md
  - .specify/memory/active/current-session.md

Constitutional review:
  - Bundle: [current] kB → [estimated] kB ([X]% of limit)
  - Breaking: [YES/NO]
  - Security: [any concerns]

Specialists consulted:
  - [specialist-1]: [key recommendation]
  - [specialist-2]: [key recommendation]

⚠️  BLOCKING ISSUES (if any):
  - [Issue 1 requiring explicit approval]

✅ Next step:
  Review artifacts in .specify/memory/active/
  Then run: /implement [feature-name]
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Writing ANY code (src/ or test/)
- Modifying existing files outside .specify/memory/active/
- Making git commits
- Creating PRs
- Proceeding to implementation automatically

✅ **ALLOWED**:
- Reading existing code for context
- Consulting specialist agents
- Creating design documents in .specify/memory/active/
- Estimating impact and identifying risks

---

## Example Usage

```bash
# User requests
/plan Add LRU caching to variant resolution

# Agent process:
1. ✅ Reads constitution.md
2. ✅ Detects keywords: "variant", "caching"
3. ✅ Auto-loads: i18n-specialist.md, performance-auditor.md
4. ✅ Consults specialists
5. ✅ Creates plan/tasks/notes files
6. ✅ Validates against constitution
7. ⏸️  STOPS and waits for human review
```
