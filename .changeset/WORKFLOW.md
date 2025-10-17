# Changesets Workflow for dotted-json

## Quick Start

```bash
# 1. Make your changes
# 2. Create a changeset
bun run changeset:add

# 3. Commit everything (including .changeset/*.md)
git add .
git commit -m "feat: your feature description"

# 4. Push and create PR
git push
```

## Automated Release Flow

### Step 1: Developer adds changeset
```bash
bun run changeset:add
# Select: minor (for new features), patch (for fixes), major (for breaking changes)
# Describe: User-facing summary of changes
```

### Step 2: PR merged to main
- GitHub Action detects changesets
- Creates/updates "Version Packages" PR automatically
- This PR contains:
  - Bumped `package.json` version
  - Updated `CHANGELOG.md`
  - Removed consumed changesets

### Step 3: Merge "Version Packages" PR
- Triggers JSR publish: `bunx jsr publish`
- Creates GitHub Release with changelog
- Tags commit (e.g., `v0.11.0`)

## Publishing Strategy

**Current (Pre-1.0):**
- ✅ JSR publishing enabled
- ❌ npm publishing disabled (will enable at v1.0.0)

**After 1.0.0:**
- ✅ JSR publishing
- ✅ npm publishing

## Commands Reference

```bash
# Create changeset (interactive)
bun run changeset:add

# Preview version bump
bun run changeset status

# Manual version bump (automated in CI)
bun run changeset:version

# Manual JSR publish (automated in CI)
bun run release:jsr
```

## Semver Guidelines

- **patch** (0.11.0 → 0.11.1): Bug fixes, documentation, refactoring
- **minor** (0.11.0 → 0.12.0): New features, backwards compatible
- **major** (0.11.0 → 1.0.0): Breaking changes

## Example Changesets

### New Feature (minor)
```markdown
---
"@orb-zone/dotted-json": minor
---

Add support for custom resolvers in variant resolution

**New API**: `customResolvers` option in DottedOptions
```

### Bug Fix (patch)
```markdown
---
"@orb-zone/dotted-json": patch
---

Fix cache invalidation in FileLoader when variants change
```

### Breaking Change (major)
```markdown
---
"@orb-zone/dotted-json": major
---

BREAKING: Remove deprecated `withFileSystem` plugin

**Migration**: Use `FileLoader` directly instead:
\`\`\`ts
// Before
import { withFileSystem } from '@orb-zone/dotted-json/plugins/filesystem';

// After
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';
\`\`\`
```

## Troubleshooting

**Issue**: "No changesets present"
**Fix**: Create a changeset with `bun run changeset:add`

**Issue**: JSR publish fails
**Fix**: Check `jsr.json` configuration and workflow permissions

**Issue**: Version PR not created
**Fix**: Verify GITHUB_TOKEN permissions (contents: write, pull-requests: write)

## Manual Release (Emergency)

If GitHub Actions fail:

```bash
# 1. Version locally
bun run changeset:version
git add .
git commit -m "chore: version packages"

# 2. Tag and push
git tag v0.11.0
git push origin main --tags

# 3. Publish manually
bunx jsr publish
```

## Resources

- [Changesets Docs](https://github.com/changesets/changesets)
- [JSR Publishing](https://jsr.io/docs/publishing-packages)
- [Conventional Commits](https://www.conventionalcommits.org/)
