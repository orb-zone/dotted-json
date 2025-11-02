---
description: Create changeset file with semantic version detection and breaking change protection
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Implementation Verification**:
   - Verify implementation is complete
   - All tests must be passing
   - Build must be successful

2. **Quality Gates**:
   ```bash
   bun test          # Must pass
   bun run lint      # Must be clean
   bun run typecheck # Must be clean
   bun run build     # Must succeed
   ```

3. **Git Diff Analysis**:
   - Run `git diff` to see all changes
   - Analyze what was modified/added/removed

4. **Breaking Change Detection** (CRITICAL):
   - Check for removed exports
   - Check for renamed functions/types
   - Check for signature changes
   - Check for behavior changes
   - If ANY found: Verify user explicitly approved MAJOR bump

---

## User Input

Feature name: $ARGUMENTS

---

## Version Detection Rules (STRICT)

### MAJOR (v0→v1, v1→v2): Breaking Changes

**Triggers**:
- Removed public exports
- Renamed public APIs
- Changed function signatures
- Changed default behavior
- Removed options/parameters

**Protection**:
```
⛔ MAJOR BUMP BLOCKED

Breaking changes detected:
- [List of breaking changes]

User MUST explicitly approve with one of:
- "I want a breaking change"
- "Bump to v1.0"
- "This is a major version"

Do you approve this MAJOR version bump? (yes/no)
```

**If user says NO**:
- STOP and suggest non-breaking alternatives
- Do NOT create changeset

**If user says YES**:
- Proceed with major changeset
- Include migration guide in changeset

### MINOR (v0.12→v0.13): New Features

**Triggers**:
- New public exports
- New optional parameters
- New features (non-breaking)
- Performance improvements (measurable)

**Auto-approve**: Safe to proceed

### PATCH (v0.12.0→v0.12.1): Bug Fixes

**Triggers**:
- Bug fixes
- Documentation updates
- Internal refactors (no API changes)
- Dependency updates

**Auto-approve**: Safe to proceed

---

## Changeset Creation Process

### Step 1: Analyze Changes

Run and parse:
```bash
git diff --cached  # Staged changes
git diff           # Unstaged changes
```

Create mental model:
- What files changed?
- What exports were added/removed?
- What signatures changed?
- What behavior changed?

### Step 2: Determine Version Bump

Apply rules above. If MAJOR, get user approval.

### Step 3: Draft Changeset Description

**Format**:
```markdown
---
"@orb-zone/dotted-json": [patch|minor|major]
---

[One-line summary of change]

[Detailed description with bullets]

[If MAJOR: Migration guide]
```

**Examples**:

**PATCH**:
```markdown
---
"@orb-zone/dotted-json": patch
---

Fix variant resolution cache invalidation on nested updates.

- Cache now properly invalidates when nested properties change
- Fixes issue where stale variant scores were returned
- No API changes
```

**MINOR**:
```markdown
---
"@orb-zone/dotted-json": minor
---

Add LRU caching to variant resolution for improved i18n performance.

- New `maxVariantCacheSize` option (default: 1000)
- 20% faster resolution for multi-variant lookups
- Automatic LRU eviction for memory efficiency
- Backward compatible (caching is automatic)
```

**MAJOR** (with user approval):
```markdown
---
"@orb-zone/dotted-json": major
---

Refactor variant resolution API for better composability.

- BREAKING: `resolveVariant()` now returns `VariantResult` object instead of string
- BREAKING: Removed deprecated `variantScore()` function
- New `createVariantResolver()` factory for custom resolvers

**Migration Guide**:

Before (v0.x):
\`\`\`typescript
const variant = resolveVariant(context, candidates);
\`\`\`

After (v1.0):
\`\`\`typescript
const { variant, score } = resolveVariant(context, candidates);
// Or just destructure what you need:
const { variant } = resolveVariant(context, candidates);
\`\`\`
```

### Step 4: Create Changeset File

Run:
```bash
bunx changeset add
```

**Interactive prompts**:
1. Package to update: `@orb-zone/dotted-json`
2. Version bump: `[patch|minor|major]`
3. Summary: [Paste drafted description]

This creates: `.changeset/[random-words].md`

### Step 5: Verify Changeset

Read the created file and verify:
- Correct version bump type
- Accurate description
- Migration guide if MAJOR

### Step 6: STOP and Report

**DO NOT COMMIT**. Output this message:

```
✋ CHANGESET CREATED

File: .changeset/[random-words].md
Version: [patch|minor|major]
Current: v0.12.1
Next: v0.12.2 (or v0.13.0, or v1.0.0)

Breaking changes: [YES/NO]

Summary:
[Show first 2 lines of changeset]

Git status:
[Show git status]

✅ Next steps:
  1. Review changeset: cat .changeset/[random-words].md
  2. If satisfied:
     git add .
     git commit -m "[type]: [description]"
     gh pr create
  3. If not satisfied:
     Edit .changeset/[random-words].md manually
     Then commit when ready
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Creating git commits (human does this)
- Auto-selecting MAJOR without user approval
- Creating PRs automatically
- Merging PRs automatically
- Publishing packages directly

✅ **ALLOWED**:
- Running `bunx changeset add` interactively
- Analyzing git diff
- Suggesting version bump type
- Drafting changeset description

---

## Breaking Change Examples

### ⛔ These Require MAJOR Bump

```typescript
// Before
export function dotted(data: any): any

// After - signature changed
export function dotted(data: any, options?: Options): DottedJson
// → MAJOR: Return type changed
```

```typescript
// Before
export { resolveVariant, variantScore }

// After
export { resolveVariant }  // variantScore removed
// → MAJOR: Export removed
```

```typescript
// Before
dotted({ ... }, { cache: true })  // cache on by default

// After  
dotted({ ... }, { cache: false }) // cache off by default
// → MAJOR: Default behavior changed
```

### ✅ These Are MINOR (Safe)

```typescript
// Before
export function dotted(data: any): any

// After - new optional parameter
export function dotted(data: any, options?: Options): any
// → MINOR: Added optional parameter
```

```typescript
// Before
export { dotted }

// After
export { dotted, expand }  // New function added
// → MINOR: New export
```

### ✅ These Are PATCH (Safe)

```typescript
// Bug fix in internal logic, no API change
// → PATCH

// Documentation update
// → PATCH

// Refactor without API changes
// → PATCH
```

---

## Example Usage

```bash
# User has reviewed implementation
/changeset variant-caching

# Agent process:
1. ✅ Runs quality gates (test/lint/typecheck/build)
2. ✅ Analyzes git diff
3. ✅ Detects: New export, no breaking changes
4. ✅ Determines: MINOR bump
5. ✅ Drafts changeset description
6. ✅ Runs bunx changeset add (interactive)
7. ⏸️  STOPS before committing
```

---

## User Approval Required For

1. **MAJOR version bumps** → Always require explicit "yes"
2. **Breaking changes** → Always require explicit "yes"
3. **v0→v1 transition** → Always require explicit "yes"

Never assume user wants breaking changes, even if technically correct.
