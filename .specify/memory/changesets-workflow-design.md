# Changesets Workflow Design

**Purpose**: Document the design decisions, architecture, and rationale behind our Changesets-based release automation.

**Status**: Implemented (v0.11.0)
**Implementation**: See `.changeset/WORKFLOW.md` for usage guide
**Package**: `@changesets/cli@^2.29.7`

---

## Problem Statement

**Before Changesets (v0.10.1 and earlier):**

Manual release process was error-prone and time-consuming:
- ❌ Manual version bumping in `package.json`
- ❌ Manual CHANGELOG.md updates (easy to forget)
- ❌ Manual git tagging (typos, inconsistent format)
- ❌ No enforcement of semantic versioning
- ❌ Multiple commits could be released without aggregation
- ❌ No review step before publishing
- ❌ Difficult to track what changed in a release

**Real-world pain points:**
- Merged PR but forgot to update changelog
- Typo in manual tag (`v0.10.1` vs `0.10.1`)
- Unclear which commits contributed to a release
- No way to combine multiple PRs into one release

---

## Solution: Changesets

**Core Concept**: Declare versioning intent at PR time, automate the rest.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Developer Workflow                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Make code changes                                       │
│  2. Run: bun run changeset:add                             │
│     └─> Creates .changeset/random-name.md                  │
│  3. Commit changeset WITH code                             │
│  4. Create PR                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions (on merge to main)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  changesets/action detects changesets                      │
│  ├─> Creates/Updates "Version Packages" PR                 │
│  │   ├─> Bump package.json version                        │
│  │   ├─> Update CHANGELOG.md                              │
│  │   └─> Remove consumed changesets                       │
│  │                                                         │
│  OR (if Version Packages PR merged)                        │
│  ├─> Run: bun run release:jsr                             │
│  │   ├─> Build: bun run build                             │
│  │   ├─> Publish: bunx jsr publish                        │
│  │   └─> Tag: git tag v0.11.0                             │
│  └─> Create GitHub Release                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. PR-Based Version Bumps

**Decision**: Version bumps happen via "Version Packages" PR, not direct commits

**Rationale**:
- **Reviewable**: You can see exactly what version/changelog changes before publishing
- **Testable**: CI runs on version bump PR (catch issues before publish)
- **Auditable**: Clear git history of when versions changed
- **Reversible**: Can close PR if not ready to release

**Trade-off**: One extra PR per release (acceptable for quality)

### 2. Changeset Files in Git

**Decision**: Commit `.changeset/*.md` files alongside feature code

**Rationale**:
- **Atomic**: Version intent travels with code
- **Merge-friendly**: Multiple PRs can have changesets, combined automatically
- **Discoverable**: Can grep for changesets to see pending changes
- **Rollback-friendly**: Reverting PR reverts its changeset

**Alternative Rejected**: Conventional commits parsing (brittle, no review)

### 3. JSR-Only Publishing (Pre-v1.0)

**Decision**: Only publish to JSR, defer npm until v1.0

**Rationale**:
- JSR is TypeScript-native (publishes source, not dist)
- OIDC authentication (no secrets to manage)
- Fewer moving parts during stabilization phase
- Can enable npm publishing by updating workflow later

**Future**: Add npm publishing to `release:jsr` script at v1.0

### 4. Interactive Changeset Creation

**Decision**: Use `changeset add` (interactive) instead of CLI args

**Rationale**:
- **Forces thought**: Developer must explicitly choose semver bump
- **Captures context**: Summary is written while code is fresh
- **User-facing**: Forces focus on "what changed for users" vs technical details

**Alternative Rejected**: Automatic inference from commit messages (not accurate enough)

### 5. Aggregate Multiple Changesets

**Decision**: Allow multiple changesets in one release

**Rationale**:
- **Flexibility**: Can merge multiple PRs before releasing
- **Batching**: Reduces release fatigue
- **Semantic Versioning**: Changesets computes highest bump (major > minor > patch)

**Example**:
```
PR #1: .changeset/feat-a.md (minor)
PR #2: .changeset/fix-b.md (patch)
→ Version Packages PR: 0.10.0 → 0.11.0 (minor wins)
```

---

## Configuration Choices

### `.changeset/config.json`

```json
{
  "access": "public",           // JSR requires public
  "baseBranch": "main",         // Release from main
  "commit": false,              // Don't auto-commit (we use PRs)
  "changelog": "@changesets/cli/changelog"  // Default formatter
}
```

**Why `commit: false`?**
- We want PRs for version bumps (reviewable)
- Changesets action handles commits automatically

### Package Scripts

```json
{
  "changeset:add": "changeset add",           // Create changeset
  "changeset:version": "changeset version",   // Bump versions
  "release:jsr": "bun run build && bunx jsr publish"  // Publish
}
```

**Separation of concerns**:
- `changeset:add` - Developer tool (local)
- `changeset:version` - CI tool (auto-called by action)
- `release:jsr` - CI tool (auto-called by action)

---

## GitHub Actions Workflow

### Trigger: Push to Main

```yaml
on:
  push:
    branches: [main]
```

**Why main-only?**
- Feature branches don't need version bumps
- Simplifies workflow (one trigger point)

### Changesets Action

```yaml
- uses: changesets/action@v1
  with:
    version: bun run changeset:version
    publish: bun run release:jsr
```

**Magic**:
- Detects changesets in `.changeset/`
- If found: Creates/updates "Version Packages" PR
- If "Version Packages" PR merged: Runs `publish` command

### OIDC Authentication

```yaml
permissions:
  id-token: write  # JSR OIDC
  contents: write  # Git tagging
  pull-requests: write  # Version Packages PR
```

**No secrets needed!** JSR verifies via GitHub OIDC.

---

## Semantic Versioning Strategy

### Pre-1.0 (Current)

Following semver philosophy for 0.x:
- **0.x.0 (minor)**: New features, may have breaking changes (API unstable)
- **0.x.y (patch)**: Bug fixes, no breaking changes
- **Major bumps**: Reserved for 1.0.0 milestone

### Post-1.0 (Future)

Strict semver:
- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features, backwards compatible (1.0.0 → 1.1.0)
- **Patch**: Bug fixes only (1.0.0 → 1.0.1)

---

## Changeset Anatomy

### Example Changeset File

`.changeset/cli-rename-and-fixes.md`:
```markdown
---
"@orb-zone/dotted-json": minor
---

**CLI Rename & Example Fixes**

- **BREAKING**: Renamed CLI tool from `json-translate` to `dotted-translate`
- **Fixed**: Corrected 5 critical example bugs
- **Docs**: Comprehensive documentation audit

**Migration**: Reinstall CLI globally to get new command name.
```

**Structure**:
1. **Frontmatter**: Package name + bump type
2. **Summary**: User-facing description (goes in CHANGELOG)
3. **Details**: Migration notes, breaking changes, etc.

### Bump Type Selection Guide

**Major** (breaking changes):
- Removed public APIs
- Changed function signatures
- Renamed packages/exports

**Minor** (new features):
- New APIs added
- New functionality (backwards compatible)
- CLI renames (with migration path)

**Patch** (fixes):
- Bug fixes
- Documentation fixes
- Internal refactoring (no API changes)

---

## Comparison to Alternatives

### vs. Manual Tagging

| Aspect | Manual Tags | Changesets |
|--------|-------------|------------|
| Version bumps | Manual (error-prone) | Automatic |
| Changelog | Manual (often forgotten) | Automatic |
| Semver enforcement | None | Enforced by prompt |
| Review before publish | No | Yes (Version Packages PR) |
| Multiple changes | Manual aggregation | Automatic |
| Rollback | Revert + re-tag | Revert PR |

### vs. Conventional Commits

| Aspect | Conventional Commits | Changesets |
|--------|---------------------|------------|
| Version inference | From commit messages | From changeset declarations |
| Accuracy | Depends on discipline | Explicit declarations |
| Changelog quality | Auto-generated (technical) | Human-written (user-facing) |
| Review | Commit time | PR review |
| Aggregation | Commit-by-commit | Multi-PR batching |

**Our choice**: Changesets (more explicit, better for library)

---

## Workflow Examples

### Example 1: Single Feature

```bash
# 1. Create feature branch
git checkout -b 005-add-react-hooks

# 2. Make changes
# ... code code code ...

# 3. Create changeset
bun run changeset:add
# Select: minor
# Summary: "Add React hooks for dotted-json integration"

# 4. Commit everything
git add .changeset/*.md src/
git commit -m "feat: add React hooks"

# 5. Create PR, merge to main
gh pr create --title "feat: add React hooks"

# Result: Version Packages PR created (0.11.0 → 0.12.0)
```

### Example 2: Multiple PRs → One Release

```bash
# PR #1: New feature (minor)
bun run changeset:add  # minor bump
# Summary: "Add PostgreSQL loader"

# PR #2: Bug fix (patch)
bun run changeset:add  # patch bump
# Summary: "Fix cache invalidation bug"

# PR #3: Another feature (minor)
bun run changeset:add  # minor bump
# Summary: "Add Vue 3 composables"

# After all merged: Version Packages PR shows 0.11.0 → 0.12.0
# (minor wins over patch)
# CHANGELOG includes all 3 changes
```

### Example 3: Hotfix

```bash
# 1. Branch from main (urgent!)
git checkout -b hotfix-security

# 2. Fix the issue
# ... patch ...

# 3. Changeset (patch)
bun run changeset:add
# Select: patch
# Summary: "Fix XSS vulnerability in expression evaluator"

# 4. Merge ASAP
gh pr create --title "fix: XSS vulnerability"
# Merge immediately

# 5. Merge Version Packages PR (triggers publish within minutes)
```

---

## Monitoring & Debugging

### Check Pending Changes

```bash
# See what version bump would happen
bun run changeset status

# Output:
# @orb-zone/dotted-json: minor (2 changesets)
#   - Add React hooks
#   - Add Vue composables
```

### Failed Publish

If JSR publish fails:
1. Check GitHub Actions logs
2. Verify OIDC permissions
3. Manual publish: `bunx jsr publish`

### Rollback Published Version

**Can't unpublish from JSR**, but can:
1. Publish patch version with fix
2. Mark version as deprecated (future)

---

## Future Enhancements

### v1.0 Milestone
- [ ] Add npm publishing to workflow
- [ ] Update `release:jsr` → `release` (publish to both)

### Possible Additions
- [ ] Snapshot releases (canary builds)
- [ ] Release notes templates
- [ ] Automatic PR labeling (major/minor/patch)
- [ ] Slack/Discord notifications on publish

---

## Related Files

**Implementation**:
- `.changeset/config.json` - Changesets configuration
- `.changeset/WORKFLOW.md` - Usage guide for developers
- `.github/workflows/changesets-release.yml` - Automation workflow
- `package.json` - Scripts for changeset operations

**Documentation**:
- [Deployment Workflow](./deployment-workflow.md) - High-level strategy
- [Maintenance Log](./maintenance-log.md) - Release history

**External**:
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)

---

## Decision Log

### Why Not semantic-release?
- Too opinionated (enforces conventional commits)
- Less flexible for library development
- Changesets gives more control

### Why Not Lerna?
- Overkill for single-package repo
- Changesets is simpler for our use case
- May revisit at v2.0 monorepo migration

### Why Not Manual Process?
- Error-prone (forgot changelog 3+ times)
- Time-consuming (5-10 min per release)
- Not reviewable (version bump = direct commit)

---

**Last Updated**: 2025-10-16 (v0.11.0)
**Status**: ✅ Production-ready, fully automated
**Next Review**: At v2.0 monorepo migration
