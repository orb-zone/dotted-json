# Deployment Strategy & Decisions

**Purpose**: Document deployment strategy, design decisions, and the rationale behind our release workflow.

**Status**: Automated with Changesets (v0.11.0)
**Implementation**: See `.github/workflows/changesets-release.yml` and `.changeset/WORKFLOW.md`
**Repository**: https://github.com/orb-zone/dotted-json

---

## Philosophy

**Single Source of Truth**: The `.github/workflows/*.yml` files define what actually runs.

**This document explains**:
- Why we chose certain approaches
- Strategic decisions for AI agents to understand
- High-level workflow concepts (details live in YAML)

```
Feature Branch → PR (with changeset) → main → Auto "Version Packages" PR → JSR Publish
```

---

## Key Decisions

### 1. JSR-First Publishing Strategy

**Decision**: Publish to JSR.io, defer NPM until v1.0

**Rationale**:
- JSR is designed for TypeScript-first packages
- We publish source TypeScript (not transpiled dist)
- OIDC authentication = zero secrets to manage
- Better alignment with modern JS ecosystem

**When NPM?**: Re-enable after v1.0 when API is stable

### 2. OIDC Authentication for JSR

**Decision**: Use GitHub OIDC instead of manual tokens

**Rationale**:
- No secrets to rotate or leak
- Automatic when package linked to GitHub repo
- Simpler workflow maintenance
- Industry best practice (2024+)

**Requirement**: Package must be linked on JSR.io to GitHub repository

### 3. PR-Only Workflow with Branch Protection

**Decision**: Block direct pushes to `main` via Lefthook pre-push hooks

**Rationale**:
- Forces code review for all changes
- CI runs on every PR before merge
- Prevents accidental breaking changes
- Maintains audit trail

**Enforcement**: `lefthook.yml` pre-push hook + GitHub branch protection (recommended)

### 4. Changesets-Based Releases (v0.11.0+)

**Decision**: Use Changesets for automated versioning and releases

**Rationale**:
- Automatic version bumping based on changeset declarations
- Automatic CHANGELOG generation from changeset summaries
- PR-based workflow for version bumps (review before release)
- Multiple changesets can be combined in one release
- Enforces semantic versioning discipline
- Zero manual steps for version/changelog management

**Workflow**: See `.github/workflows/changesets-release.yml` and `.changeset/WORKFLOW.md`

**Migration Note**: Manual tagging (pre-v0.11.0) is now deprecated. Use changesets instead.

**Historical Note**: v0.11.2-v0.12.0 used a manual bash implementation due to org-level GitHub Actions restrictions. Now resolved - using official `changesets/action@v1` (v0.12.0+).

### 5. Bun Runtime

**Decision**: Use Bun for CI/CD (not Node.js/npm)

**Rationale**:
- Faster dependency installation
- Native TypeScript support
- Modern tooling alignment
- Single runtime for dev and CI

**Version**: Bun v2 (setup-bun@v2)

---

## Release Process (Quick Reference)

**For agents**: Follow Changesets workflow. Key commands:

```bash
# 1. Feature work on branch (NOT main)
git checkout -b 004-feature-name

# 2. Create a changeset (describes changes + semver bump)
bun run changeset:add
# Interactive prompts:
#   - Select bump type: patch/minor/major
#   - Write user-facing summary
# This creates .changeset/random-name.md

# 3. Commit changeset WITH your feature code
git add .changeset/*.md
git commit -m "feat: your feature"

# 4. Create PR
gh pr create --base main --head 004-feature-name

# 5. After PR merge to main, workflow automatically:
#    - Creates "Version Packages" PR
#    - Updates package.json version
#    - Updates CHANGELOG.md
#    - Consumes changesets

# 6. Review & merge "Version Packages" PR
#    - Triggers JSR publish
#    - Creates GitHub release
#    - Tags commit automatically
```

**Implementation details**: See `.changeset/WORKFLOW.md` for complete guide.

---

## JSR Publishing Notes

**One-time setup**:
- Link package `@orb-zone/dotted-json` on JSR.io to GitHub repo
- OIDC authentication is automatic (no secrets needed)

**Configuration**: `jsr.json` defines package metadata and publish settings

**Key insight**: JSR publishes TypeScript source, not transpiled JavaScript. This aligns with our TypeScript-first philosophy.

---

## For AI Agents: Standard Operations

### Creating a Release (Changesets Workflow)

1. **Create changeset during development**: `bun run changeset:add`
2. **Commit changeset with feature code**: Changeset lives in `.changeset/*.md`
3. **Merge PR to main**: CI validates, changesets detected
4. **Review "Version Packages" PR**: Auto-created by Changesets action
5. **Merge "Version Packages" PR**: Triggers JSR publish automatically

**Key Insight**: Version bumps happen via PR (reviewable), not direct commits.

### Handling CI Failures

- Lint errors: `bun run lint --fix`
- Type errors: `bun run typecheck`
- Test failures: `bun test`
- Build issues: `bun run build`

**Always run locally before pushing** to catch issues early.

### Emergency Procedures

**Hotfix**: Branch from main, create changeset (patch), merge PR, merge Version Packages PR
**Rollback**: Revert PR on main, create changeset for patch version
**Failed release**: Re-run workflow from GitHub Actions UI or manually: `bunx jsr publish`

---

## Strategic Roadmap

### v1.0 Milestone
- [ ] Re-enable NPM publishing alongside JSR (update changesets workflow)
- [x] Automated changelog generation (✅ via Changesets)
- [x] Automated versioning (✅ via Changesets)
- [ ] Bundle size monitoring in CI

### Future Considerations
- Multi-runtime testing (Node.js, Deno, Bun)
- Canary releases for early adopters
- Performance regression tracking

---

## Related Files

**Implementation** (source of truth):
- `.github/workflows/ci.yml` - CI workflow
- `.github/workflows/changesets-release.yml` - Changesets automation (v0.11.0+)
- `.github/workflows/release.yml` - Legacy manual releases (deprecated)
- `.changeset/WORKFLOW.md` - Complete Changesets guide
- `lefthook.yml` - Git hooks
- `jsr.json` - JSR package config

**Context**:
- [Changesets Workflow Design](./changesets-workflow-design.md) - Detailed design decisions
- [Maintenance Log](./maintenance-log.md) - Quality checklists
- [Constitution](./constitution.md) - Project principles

---

**Last Updated**: 2025-10-16 (v0.11.0 - Changesets automation)
**Philosophy**: YAML configs are truth, this doc explains "why"
