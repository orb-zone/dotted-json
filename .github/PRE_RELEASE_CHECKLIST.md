# Pre-Release Checklist

Complete this checklist before publishing to @orbzone organization and public registries.

## ✅ Repository Setup

- [x] **Repository Name**: `dotted-json` (ASCII-friendly, per constitution)
- [x] **Fun Name**: `jsön` (with umlaut, used in branding/docs)
- [x] **Package Name**: `@orbzone/dotted-json`
- [x] **Organization**: `@orbzone`
- [x] **License**: MIT
- [x] **Current Version**: v0.9.2

## ✅ Security & Credentials

- [x] No `.env` files committed
- [x] No API keys or secrets in code
- [x] `.gitignore` includes sensitive patterns
- [x] No credentials in examples or tests
- [x] Security warnings in README
- [x] Trust model documented

## ✅ Package Configuration

### package.json
- [x] Correct repository URL: `https://github.com/orbzone/json.git`
- [x] Homepage URL updated
- [x] Bug tracker URL updated
- [x] `publishConfig.access = "public"`
- [x] All exports properly configured
- [x] Peer dependencies marked as optional
- [x] Bundle size < 20 kB (currently 18.18 kB)
- [x] `prepublishOnly` script runs build + tests

### jsr.json
- [x] Created for JSR publishing
- [x] Exports configured (source .ts files)
- [x] Proper include/exclude patterns

## ✅ Documentation

- [x] README.md with quick start examples
- [x] API reference (docs/API.md)
- [x] Migration guide (docs/migration.md)
- [x] Performance guide (docs/performance.md)
- [x] CHANGELOG.md up to date
- [x] CONTRIBUTING.md with standards
- [x] LICENSE file present
- [x] Examples directory with 3 production examples

## ✅ Git Hooks & Automation

- [x] Lefthook configured (lefthook.yml)
- [x] Pre-commit hooks:
  - [x] Run tests
  - [x] Type checking
  - [x] Build verification
- [x] Commit message validation (Conventional Commits)
- [x] Pre-push hooks:
  - [x] Full test suite
  - [x] Protected branch check
  - [x] Large file check
- [x] Auto-install deps on post-merge

## ✅ CI/CD Workflows

### .github/workflows/ci.yml
- [x] Runs on push to main
- [x] Runs on pull requests
- [x] Executes tests
- [x] Type checking
- [x] Linting
- [x] Build verification
- [x] Bundle size check (< 20 kB)
- [x] Constitution compliance check

### .github/workflows/release.yml
- [x] Triggers on version tags (v*)
- [x] Creates GitHub release with changelog
- [x] Publishes to NPM
- [x] Publishes to JSR

## ✅ Code Quality

- [x] All 226 tests passing
- [x] TypeScript strict mode
- [x] No ESLint errors
- [x] JSDoc comments on public APIs
- [x] No TODO/FIXME in core (only in placeholder files)
- [x] TDD compliance

## ✅ Constitution Compliance

- [x] Core bundle < 20 kB ✓ (18.18 kB)
- [x] No framework dependencies in core
- [x] Plugin architecture maintained
- [x] Cycle detection implemented
- [x] Test-first development followed
- [x] Security through transparency
- [x] Lazy evaluation with caching

## 🔐 GitHub Secrets Required

Before publishing, ensure these secrets are configured in GitHub repository settings:

### For NPM Publishing
- [ ] `NPM_TOKEN` - NPM access token with publish permissions
  - Generate at: https://www.npmjs.com/settings/[username]/tokens
  - Required scope: `Automation` or `Publish`

### For JSR Publishing
- [ ] `JSR_TOKEN` - JSR access token
  - Generate at: https://jsr.io/account/tokens
  - Required scope: `publish`

## 📋 Pre-Publication Steps

1. **Update URLs in package.json** (✅ Already done):
   ```json
   "repository": "git+https://github.com/orbzone/dotted-json.git",
   "homepage": "https://github.com/orbzone/dotted-json#readme",
   "bugs": "https://github.com/orbzone/dotted-json/issues"
   ```

2. **Create GitHub repository**:
   ```bash
   # On GitHub: create new repository "dotted-json" under @orbzone org
   # Settings > General > Make repository public
   ```

3. **Add GitHub secrets** (see above)

4. **Push to GitHub**:
   ```bash
   git remote add origin git@github.com:orbzone/dotted-json.git
   git push -u origin 001-implement-core-library
   git push --tags
   ```

5. **Create Pull Request** to `main` branch

6. **Merge to main** (triggers CI)

7. **Tag a release**:
   ```bash
   git checkout main
   git pull
   git tag v0.9.2
   git push origin v0.9.2
   ```
   This will trigger the release workflow which:
   - Creates GitHub release
   - Publishes to NPM
   - Publishes to JSR

## 🎉 Post-Publication

- [ ] Verify package on NPM: https://www.npmjs.com/package/@orbzone/dotted-json
- [ ] Verify package on JSR: https://jsr.io/@orbzone/dotted-json
- [ ] Test installation: `bun add @orbzone/dotted-json`
- [ ] Test JSR installation: `bun add jsr:@orbzone/dotted-json`
- [ ] Update project README with badges
- [ ] Announce on social media / forums (optional)

## 📊 Health Metrics

Current status (v0.9.2):
- ✅ 226 tests passing (100%)
- ✅ Bundle size: 18.18 kB / 20 kB limit (91%)
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ Zero known security vulnerabilities
- ✅ 3,500+ lines of code
- ✅ 3 production examples
- ✅ Comprehensive documentation

## 🚨 Known Limitations

- TanStack composables (placeholder, not implemented)
- Vue composables (placeholder, not implemented)
- React composables (placeholder, not implemented)

These are marked with TODO comments and documented as future work in ROADMAP.md.

## ✍️ Final Verification Commands

Run these before publishing:

```bash
# Clean build
rm -rf dist node_modules bun.lockb
bun install
bun run build
bun test

# Verify package contents
npm pack --dry-run

# Check for sensitive data
git secrets --scan || echo "No git-secrets installed (optional)"
grep -r "password\|secret\|token\|api_key" src/ --include="*.ts" | grep -v "//\|TODO"

# Verify bundle size
ls -lh dist/index.js

# Test types
bun run typecheck

# Verify git is clean
git status
```

Expected output:
- ✅ All 226 tests pass
- ✅ Bundle < 20 kB
- ✅ No TypeScript errors
- ✅ No sensitive data found
- ✅ Clean git status

## 🎯 Ready for Publication

Once all checkboxes are complete and secrets are configured, the project is ready to:

1. Push to GitHub @orbzone/json
2. Make repository public
3. Tag v0.9.2
4. Automatic publish to NPM & JSR via GitHub Actions

---

**Last Updated**: 2025-10-08
**Prepared By**: Claude Code
**Version**: 0.9.2
