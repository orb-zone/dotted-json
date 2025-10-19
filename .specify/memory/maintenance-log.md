# Maintenance Log

**Purpose**: Track documentation quality improvements, breaking changes, and pre-release checklists.

---

## October 2025 - Changesets v1 Refactor & JSR Version Sync

**Date**: 2025-10-17
**Branch**: `009-sync-jsr-version`, `005-changesets-v1-refactor`
**Version**: v0.11.0 → v0.12.1
**PRs**: #14 (v0.12.0), #15, #19 (v0.12.1)

### Major Changes

#### 1. Changesets v1 Migration (v0.12.0)

**Change**: Replaced manual bash implementation with official `changesets/action@v1`

**Rationale**:
- Cleaner, more maintainable implementation
- Resolves org-level GitHub Actions restrictions
- Industry-standard action with better error handling
- Reduces workflow YAML from 150+ lines to ~30 lines

**Impact**: Zero user impact, workflow now uses official changesets action

**Files Updated**:
- `.github/workflows/changesets-release.yml` - Migrated to official action
- Removed custom bash scripts for version/publish steps

**Before** (Manual Bash):
```yaml
# Custom bash scripts (~150 lines)
- name: Version packages
  run: |
    # Custom bash implementation...
    bun run changeset:version
    # Manual git operations...
```

**After** (Official Action):
```yaml
# Official action (~30 lines)
- name: Create Release Pull Request or Publish
  uses: changesets/action@v1
  with:
    version: bun run changeset:version
    publish: echo "Published via separate JSR workflow"
```

#### 2. JSR Version Syncing (v0.12.1)

**Change**: Automated `jsr.json` version sync with `package.json` during changesets version step

**Implementation**:
- Added `tools/sync-jsr-version.ts` script
- Integrated into `changeset:version` npm script:
  ```json
  "changeset:version": "changeset version && bun tools/sync-jsr-version.ts && bun install --frozen-lockfile"
  ```

**Rationale**: Prevents version drift between npm and JSR registries

**Impact**:
- ✅ Zero manual steps for version management
- ✅ Both `package.json` and `jsr.json` stay in perfect sync
- ✅ Version Packages PR includes both file updates

**Files Created**:
- `tools/sync-jsr-version.ts` - Automatic version synchronization script

**Testing**: Verified in PR #19 that both files updated correctly

#### 3. Custom Resolvers Feature (v0.12.0)

**Change**: Added `customResolvers` option to `DottedOptions`

**API**: Allows users to provide custom resolvers for variant resolution

**Documented In**: CHANGELOG.md (changesets automation handled documentation)

### Quality Metrics (v0.12.1)

- ✅ **Tests**: 226/226 passing (100%)
- ✅ **Bundle Size**: 18.20 kB / 20 kB limit (91%)
- ✅ **TypeScript**: 0 errors
- ✅ **ESLint**: 0 errors
- ✅ **Changesets**: Fully automated with official action
- ✅ **JSR Publishing**: Automated via GitHub OIDC
- ✅ **Version Sync**: Automated `jsr.json` ↔ `package.json`

### Lessons Learned

1. **Official Actions > Custom Scripts**: Official `changesets/action@v1` is far cleaner than custom bash
2. **Version Sync Automation**: Dual-registry publishing requires automation to prevent drift
3. **Workflow Simplification**: 150 lines of YAML → 30 lines = better maintainability

### Related PRs

- #14: Changesets v1 refactor (v0.12.0)
- #15: Version packages PR (automated)
- #19: JSR version sync implementation (v0.12.1)

---

## October 2025 - Changesets Automation & Documentation Audit (ARCHIVED)

**Date**: 2025-10-16
**Branch**: `004-cli-rename-changesets-automation`
**Version**: v0.10.1 → v0.11.0
**PR**: https://github.com/orb-zone/dotted-json/pull/10

### Major Changes

#### 1. CLI Tool Rebranding
**Change**: `json-translate` → `dotted-translate`
**Rationale**: Better alignment with package name `@orb-zone/dotted-json` and brand identity
**Impact**: **BREAKING** - Users must reinstall global CLI
**Files Updated**: 9 files across documentation and memory

#### 2. Changesets Automation Implemented
**Package**: `@changesets/cli@^2.29.7`
**Workflow**: `.github/workflows/changesets-release.yml`

**Problem Solved**:
- Manual version bumping (error-prone)
- Forgotten CHANGELOG updates
- No review step before publishing
- Difficulty tracking what changed in releases

**Solution**:
- PR-based version bumps (reviewable)
- Automatic CHANGELOG generation
- Semantic versioning enforcement
- Batch multiple PRs into one release

**Architecture**:
```
PR (with changeset) → main → Auto "Version Packages" PR → JSR Publish
```

**Key Scripts Added**:
- `changeset:add` - Create changeset (developer tool)
- `changeset:version` - Bump versions (CI tool)
- `release:jsr` - Publish to JSR (CI tool)

#### 3. Critical Example Fixes (5 bugs)
**Quality Impact**: High - All examples now functional

**Fixed**:
- `file-inheritance.ts` - Replaced non-existent `withFileSystem` import with `FileLoader`
- `basic-usage.ts:89` - Fixed double-dot notation (`stats..engagement` → `stats.engagement`)
- `feature-flag-manager.ts:166` - Fixed property access pattern (`.flags` instead of `flags`)
- `realtime-config-manager.ts:127` - Fixed property access pattern (`.config` instead of `config`)
- `i18n-translation-editor.ts:173` - Fixed property access pattern (`.strings` instead of `strings`)

#### 4. Comprehensive Documentation Audit
**Method**: 3 specialized agents reviewed Getting Started, API Reference, and all 13 examples

**Findings Summary**:
- **Getting Started**: 1 CRITICAL, 3 IMPORTANT, 3 MINOR, 2 INFORMATIONAL
- **API Reference**: 12 MINOR improvements documented (future work)
- **Examples**: 5 CRITICAL bugs fixed, 5 HIGH-severity issues addressed

**Critical Finding**: Missing variant system showcase in Getting Started (noted for future)

#### 5. Security Audit Completed
**Status**: ✅ Passed

**Verified**:
- No .env files or secrets in repository
- Only 1 production dependency (`dot-prop@^8.0.2`)
- Comprehensive `.gitignore` coverage
- Security warnings prominent in README

### Quality Metrics (v0.11.0)
- ✅ **Tests**: 226/226 passing (100%)
- ✅ **Bundle Size**: 18.20 kB / 20 kB limit (91%)
- ✅ **TypeScript**: 0 errors
- ✅ **ESLint**: 0 errors
- ✅ **Examples**: All 13 functional

### Documentation Updates
**New Files**:
- `.changeset/WORKFLOW.md` - Complete Changesets usage guide
- `.specify/memory/changesets-workflow-design.md` - Design decisions and architecture
- `.changeset/cli-rename-and-fixes.md` - First changeset (minor bump)

**Updated Files**:
- `.specify/memory/deployment-workflow.md` - Updated for Changesets
- `CHANGELOG.md` - Added v0.11.0 entry
- All version references updated to v0.11.0

### Migration Notes
**For CLI Users**:
```bash
bun remove -g @orb-zone/dotted-json
bun add -g @orb-zone/dotted-json
dotted-translate strings.jsön --to es
```

**For Contributors**:
- Now use `bun run changeset:add` instead of manual version bumps
- See `.changeset/WORKFLOW.md` for complete guide

### Next Steps
- [ ] Merge PR #10 to trigger Changesets workflow
- [ ] Review & merge auto-created "Version Packages" PR
- [ ] Verify JSR publish succeeds (automated)
- [ ] Add variant system showcase to Getting Started (from audit findings)

---

## October 2025 - Pre-v1.0 Documentation Audit

**Date**: 2025-10-08
**Branch**: `001-implement-core-library`
**Version**: v0.9.6 → v1.0.0 prep

### Documentation Quality Assessment

**Overall Score**: 7.5/10

**Strengths**:
- ✅ Comprehensive coverage (README, API docs, getting-started guide)
- ✅ Excellent real-world examples and use cases
- ✅ Well-organized structure with clear navigation
- ✅ Variant system thoroughly documented
- ✅ Security warnings prominently displayed

**Areas Improved**:
- Fixed unimplemented API documentation (Vue/React hooks)
- Constitutional compliance (replaced "whitelist" terminology)
- Status accuracy (updated "Design" → "Implemented" in memory files)
- API completeness (added missing `withFileSystem()` documentation)

---

## October 2025 - JSR Type Safety Compliance

**Date**: 2025-10-15
**Branch**: `003-jsr-explicit-return-types`
**Version**: v0.10.0 → v0.10.1

### JSR Publication Issue

**Problem**: JSR requires explicit return types for all public API functions to ensure "fast types"

**Files Modified**:
- `src/loaders/file.ts:372` - Added return type to `getCacheStats()`: `{ size: number; keys: string[] }`
- `src/loaders/file.ts:672` - Added return type to `withFileSystem()`: Complete interface with resolver signature

**Rationale**: JSR's "slow types" checker prevents publishing without explicit return types in public APIs. This improves IDE performance and type inference speed for consumers.

**Impact**: None - purely additive type annotations, no behavioral changes

---

## Pre-v1.0 Publication Checklist

Use this checklist before any major release:

### Documentation Accuracy
- [x] All documented APIs are implemented
- [x] All implemented plugins are documented
- [x] Status fields match implementation reality
- [x] No placeholder/stub code advertised as working
- [x] Constitutional compliance verified

### Code Quality
- [x] All tests passing (226/226 ✅)
- [ ] Bundle size targets met (<5KB core, <15KB with plugins)
- [ ] Performance benchmarks run
- [ ] Security audit completed

### Developer Experience
- [x] README examples are copy-paste ready
- [x] API docs include error documentation
- [x] Getting started guide tested by new user
- [ ] Migration guide complete (if breaking changes)

---

## Documentation Maintenance Guidelines

### Status Field Standards

Memory files must use accurate status indicators:

```markdown
**Status**: Design Phase              # Not yet implemented
**Status**: In Progress (v0.10.0)     # Actively coding
**Status**: Implemented (v0.9.6)      # Shipped in version
**Status**: Deprecated (v2.0.0)       # Marked for removal
```

Always include:
- **Implementation**: `src/path/to/file.ts` (if implemented)
- **Tests**: `test/path/to/test.ts` (if implemented)
- **Target**: `vX.Y.Z` (if not yet implemented)

### API Documentation Standards

Every public method must document:

1. **Purpose** - One-line description
2. **Parameters** - Type and description for each
3. **Returns** - Return type and description
4. **Throws** - Error conditions and types
5. **Example** - Working code snippet

### Terminology Standards (Constitutional)

**Approved Terms**:
- "allowed variants" (not "whitelist")
- "variant validation" (not "whitelisting")
- "custom variants" (not "user-defined variants")

**Naming Patterns**:
- Hooks: `useDotted[Thing]` (e.g., `useDottedTanstack`)
- Plugins: `with[Thing]` (e.g., `withZod`, `withFileSystem`)
- "dotted" is an adjective, not a noun

---

## Breaking Changes Log

### v1.0.0 (Planned)

**No breaking changes** - v0.9.6 API is stable

**Additions**:
- Semantic version variants (v1.1.0+)
- Hierarchical context inference (v1.1.0+)

### v0.9.0 → v0.9.6

**Breaking Changes**:
- None (additive releases only)

**Added**:
- File system storage provider
- SurrealDB storage provider
- Zod validation plugin
- Pinia Colada caching plugin
- Pronoun helper system

---

## Known Technical Debt

### Framework Integration (Deferred to v1.1.0)

**Issue**: Vue and React hooks are stubbed but not implemented

**Files**:
- `src/vue/useTanstackDottedJSON.ts` - Throws "Not yet implemented"
- `src/react/useTanstackDottedJSON.ts` - Throws "Not yet implemented"

**Decision**: Keep stubs for API design, document as "Coming Soon"

**Rationale**: Core library must stabilize before framework-specific abstractions

**Timeline**: Target v1.1.0 (Q1 2026)

### Performance Optimizations (Future)

**Opportunities**:
- Lazy initialization for FileLoader (avoid init() call)
- Connection pooling for SurrealDB
- Expression compilation/caching improvements
- Variant resolution memoization

**Priority**: Medium (current performance is acceptable)

---

## Documentation Review Checklist

Run this checklist quarterly or before major releases:

### README.md
- [ ] All examples are tested and working
- [ ] Plugin list matches implemented plugins
- [ ] Installation instructions are current
- [ ] Features list matches capabilities
- [ ] Quick start works for new users

### docs/API.md
- [ ] All public APIs documented
- [ ] No non-existent methods documented
- [ ] Error cases documented for each method
- [ ] Type signatures match implementation
- [ ] Examples use current API

### Memory Files (.specify/memory/)
- [ ] Status fields are accurate
- [ ] Implementation references are correct
- [ ] Cross-references between docs are valid
- [ ] Design rationales are still relevant
- [ ] Decision logs capture "why" not just "what"

### Source Code
- [ ] JSDoc comments match implementation
- [ ] Type definitions are exported properly
- [ ] Terminology follows constitution
- [ ] Error messages are helpful
- [ ] Console warnings use correct severity

---

## Lessons Learned

### October 2025 Audit

**Lesson 1: Status Drift**
Design documents can become stale when implementation proceeds without updating status fields. Solution: Update status in same PR that implements feature.

**Lesson 2: API Documentation Lag**
New plugins were implemented but not added to API docs. Solution: Add "Document in API.md" to PR checklist.

**Lesson 3: Terminology Inconsistency**
"Whitelist" terminology persisted despite constitutional policy. Solution: Add linter rule or pre-commit hook to catch forbidden terms.

**Lesson 4: Framework Integration Clarity**
Documenting unimplemented features creates user frustration. Solution: Use clear "🚧 Coming Soon" warnings or omit from docs until implemented.

---

## Quality Metrics

Track these metrics per release:

| Metric | v0.9.6 | v1.0.0 Target |
|--------|--------|---------------|
| Test Coverage | 95% | 95%+ |
| Bundle Size (Core) | 3.2KB | <5KB |
| Bundle Size (Full) | 12.8KB | <15KB |
| API Docs Completeness | 92% | 100% |
| Memory File Accuracy | 85% | 100% |
| Zero Runtime Errors | ✅ | ✅ |

---

**Last Updated**: 2025-10-08
**Next Review**: 2025-12-08 (or before v1.1.0 release)
