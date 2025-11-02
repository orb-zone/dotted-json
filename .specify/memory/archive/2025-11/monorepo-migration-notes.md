# Specialist Consultation Notes: Monorepo Migration

## Architecture Specialist

**Source**: `.specify/agents/architecture-specialist.md`

### Package Boundaries

**Recommendation**: Clear separation between core and framework
- Core (`dotted`): Expression engine, variants, i18n, basic file loading
- Framework (`surrounded`): SurrealDB integration, Vue composables, LIVE queries

**Rationale**: 
- Users who only need JSON expansion don't pay for SurrealDB
- Clear upgrade path: use dotted alone, add surrounded when needed
- Independent versioning allows framework evolution

### Bundle Size Strategy

| Package | Target | Constitutional Limit |
|---------|--------|---------------------|
| dotted | 18-25 kB | 25 kB |
| surrounded | +30-50 kB | 75 kB total |

**Monitoring**: 
- Automated bundle size checks in CI
- Per-package measurement
- Tree-shaking verification

### Workspace Configuration

**Bun workspaces** recommended over npm/yarn:
- Faster installation
- Native TypeScript support
- Better monorepo performance
- Simpler configuration

**workspace:** protocol for internal dependencies:
```json
{
  "dependencies": {
    "@orb-zone/dotted": "workspace:^2.0.0"
  }
}
```

### Migration Risks

**Risk**: Circular dependencies between packages
**Mitigation**: 
- One-way dependency: surrounded → dotted only
- Never dotted → surrounded
- Enforce with linting/tests

**Risk**: Breaking changes slip through
**Mitigation**:
- Explicit v2.0.0 release
- Comprehensive migration guide
- Side-by-side version support (keep v1.x alive)

### Best Practices

1. **Independent builds**: Each package builds separately
2. **Shared dev deps**: ESLint, TypeScript at root
3. **Package READMEs**: Document each package independently
4. **Changesets**: Use for workspace-aware versioning
5. **No hoisting surprises**: Pin peer dependency versions

### Testing Strategy

**Unit tests**: Colocated with each package
**Integration tests**: In the package that integrates features
**Workspace tests**: Run all from root with single command

```bash
# Root level
bun test  # Runs tests in all packages

# Per package
cd packages/dotted && bun test  # Just core tests
cd packages/surrounded && bun test  # Just framework tests
```

### Common Pitfalls to Avoid

❌ **Don't**: Copy everything blindly
✅ **Do**: Selective migration with purpose

❌ **Don't**: Create circular dependencies  
✅ **Do**: One-way dependency graph

❌ **Don't**: Ignore bundle sizes per package
✅ **Do**: Monitor each package independently

❌ **Don't**: Forget to update imports
✅ **Do**: Test imports after migration

❌ **Don't**: Mix core and framework concerns
✅ **Do**: Maintain clear boundaries

### Tool Recommendations

**Build**: 
- Bun's native bundler (fast, TypeScript-native)
- Alternative: tsup if more control needed

**Testing**:
- Bun test (built-in, fast)
- Keep existing test structure

**Linting**:
- Shared ESLint config at root
- Package-specific overrides if needed

**CI/CD**:
- GitHub Actions with Bun setup
- Cache .bun-cache directory
- Parallel package testing

### File Organization

**Recommended structure**:
```
packages/dotted/
├── src/          # Source code
├── test/         # Tests (mirrors src/)
├── tools/        # CLI tools
├── examples/     # Usage examples
├── dist/         # Build output (gitignored)
└── package.json
```

**NOT recommended**:
```
packages/dotted/
├── lib/          # Confusing vs src/
├── __tests__/    # Separate from code
├── dist/         # Checked into git
└── package.json
```

### Versioning Strategy

**dotted**: Semantic versioning from v2.0.0
- MAJOR: Breaking API changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

**surrounded**: Independent versioning from v1.0.0
- Can evolve independently
- Depends on dotted's stable API

**Changesets workflow**:
1. Create changeset during development
2. Changesets creates Version Packages PR
3. Review and merge
4. Automated publish to JSR

### Documentation Structure

**Root README.md**:
- Monorepo overview
- Quick start for each package
- Links to package READMEs

**packages/dotted/README.md**:
- Core library documentation
- Expression syntax
- Variant system
- Migration guide from v1.x

**packages/surrounded/README.md**:
- SurrealDB integration
- Vue composables
- LIVE queries
- Framework-specific examples

### Future Considerations

**Package 3: create-surrounded**:
- CLI scaffolding tool
- `npm create surrounded@latest`
- Project templates
- Plan for v2.1.0 or later

**Shared utilities**:
- If needed, create `packages/shared-internal`
- Mark as private (not published)
- Use for truly shared code

**Monorepo tools**:
- Consider Turborepo for caching (later)
- Nx for advanced orchestration (if needed)
- Keep simple initially - Bun workspaces sufficient

---

**Key Takeaway**: Start simple, add complexity only when needed. Bun workspaces + clear boundaries = success.
