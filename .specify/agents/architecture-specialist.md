# Architecture Specialist Agent

**Domain**: Monorepo structure, build tooling, package boundaries, dependency management

**Last Updated**: 2025-10-07

## Domain Expertise

This agent specializes in:
- Monorepo workspace architecture (Bun workspaces)
- Package boundary enforcement and API design
- Build tooling and bundle optimization
- Dependency management and peer dependency configuration
- Module exports and tree-shaking optimization
- Migration strategies between architectures

## Constitutional Alignment

### Relevant Principles

**I. Minimal Core, Optional Plugins**
- Package boundaries must enforce this principle
- Core package (`@orb-zone/dotted-json`) stays under 20 kB
- Framework packages (`surrounded`, `aeonic`) are optional layers
- Each package independently tree-shakeable

**V. Plugin Architecture with Clear Boundaries**
- Packages communicate through documented interfaces
- No circular dependencies between packages
- Clean separation: `dotted` → `surrounded` → `aeonic`

**VII. Framework-Agnostic Core**
- Core package has zero framework dependencies
- Framework integrations isolated to `surrounded`/`aeonic` packages
- Server-side usage possible with core alone

### Bundle Size Constraints

| Package | Target Bundle | Limit | Rationale |
|---------|---------------|-------|-----------|
| `@orb-zone/dotted-json` | 18-25 kB | 25 kB | Core + essential plugins (Zod, variants, i18n) |
| `@orb-zone/surrounded` | +30-50 kB | 75 kB total | Adds SurrealDB, LIVE queries, storage providers |
| `@orb-zone/aeonic` | +20-40 kB | 115 kB total | Adds schema templates, entity conventions |

**Constitutional Reference**: Constitution line 36 says "core < 15 kB" but Principle I says "< 20 kB". **Resolved**: Core target is 20 kB (allows room for essential features).

## Monorepo Architecture (v2.0.0)

### Current State (v1.x - Single Package)

```
@orb-zone/dotted-json/
├── src/
│   ├── index.ts                          # Core entry
│   ├── loaders/file.ts                   # FileLoader
│   ├── loaders/surrealdb.ts              # SurrealDBLoader
│   ├── plugins/zod.ts                    # Zod plugin
│   ├── plugins/surrealdb.ts              # SurrealDB plugin
│   └── plugins/pinia-colada.ts           # Pinia Colada plugin
├── tools/
│   ├── translate/                        # json-translate CLI
│   └── surql-to-ts/                      # surql-to-ts CLI
└── package.json                          # Single package.json
```

### Future State (v2.0.0 - Monorepo)

```
packages/
├── dotted/
│   ├── src/
│   │   ├── index.ts                      # Core entry (dotted, variants, i18n)
│   │   ├── loaders/file.ts               # FileLoader (basic variant loading)
│   │   └── plugins/zod.ts                # Zod plugin (optional)
│   ├── tools/translate/                  # json-translate CLI
│   └── package.json                      # @orb-zone/dotted-json
│
├── surrounded/
│   ├── src/
│   │   ├── index.ts                      # Main entry (useSurrounded composable)
│   │   ├── loaders/surrealdb.ts          # SurrealDBLoader (storage provider)
│   │   ├── plugins/surrealdb.ts          # SurrealDB plugin (resolvers)
│   │   ├── plugins/pinia-colada.ts       # Pinia Colada integration
│   │   └── plugins/live-queries.ts       # LIVE query subscriptions
│   ├── tools/surql-to-ts/                # surql-to-ts CLI
│   └── package.json                      # @orb-zone/surrounded
│
├── aeonic/
│   ├── src/
│   │   ├── index.ts                      # Main entry (createAeonicApp)
│   │   ├── schemas/                      # Predefined entity schemas
│   │   │   ├── user.surql                # User table definition
│   │   │   ├── role.surql                # Role table definition
│   │   │   └── permission.surql          # Permission table definition
│   │   ├── templates/                    # Code generation templates
│   │   └── conventions.ts                # AEON naming conventions
│   ├── cli/                              # bun create aeonic scaffolding
│   └── package.json                      # @orb-zone/aeonic
│
└── shared/                                # (Optional) Shared utilities
    ├── src/types.ts                      # Common TypeScript types
    └── package.json                      # @orb-zone/shared-internal (private)
```

### Package Dependencies

```json
// packages/dotted/package.json
{
  "name": "@orb-zone/dotted-json",
  "version": "2.0.0",
  "dependencies": {
    "dot-prop": "^8.0.2"
  },
  "peerDependencies": {
    "zod": "^3.0.0"  // Optional
  }
}

// packages/surrounded/package.json
{
  "name": "@orb-zone/surrounded",
  "version": "1.0.0",
  "dependencies": {
    "@orb-zone/dotted-json": "workspace:^2.0.0"
  },
  "peerDependencies": {
    "surrealdb": "^1.0.0 || ^2.0.0",
    "@pinia/colada": "^0.7.0",
    "pinia": "^2.0.0",
    "vue": "^3.0.0",
    "zod": "^3.0.0"
  }
}

// packages/aeonic/package.json
{
  "name": "@orb-zone/aeonic",
  "version": "0.1.0",
  "dependencies": {
    "@orb-zone/surrounded": "workspace:^1.0.0"
  },
  "peerDependencies": {
    // Inherits all from surrounded
  }
}
```

### Workspace Configuration

```json
// Root package.json
{
  "name": "@orb-zone/dotted-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "bun run --filter='./packages/*' build",
    "test": "bun test",
    "test:dotted": "bun --filter=@orb-zone/dotted-json test",
    "test:surrounded": "bun --filter=@orb-zone/surrounded test",
    "test:aeonic": "bun --filter=@orb-zone/aeonic test"
  }
}
```

## Best Practices

### Package Boundary Rules

1. **One-way dependencies only**:
   - ✅ `aeonic` → `surrounded` → `dotted`
   - ❌ No reverse dependencies
   - ❌ No circular imports

2. **Explicit exports**:
   - Each package defines clear `exports` in package.json
   - No internal imports from other packages
   - Use `workspace:*` for monorepo dependencies

3. **Independent versioning**:
   - `dotted-json` follows semver from v2.0.0
   - `surrounded` starts at v1.0.0
   - `aeonic` starts at v0.1.0 (alpha/beta phase)

### Build Tooling

**Current (v1.x)**:
```typescript
// build.ts (single package)
import { build } from 'bun';

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'browser',
  minify: true
});
```

**Future (v2.0.0 - Per Package)**:
```typescript
// packages/dotted/build.ts
import { build } from 'bun';

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'browser',
  minify: true,
  external: ['zod']  // Peer dependency
});

// Verify bundle size < 25 kB
const stats = await Bun.file('dist/index.js').stat();
if (stats.size > 25000) {
  throw new Error(`Bundle too large: ${stats.size} bytes`);
}
```

### Migration Strategy

**Phase 1: Pre-Migration (v1.0.0 - v1.x.x)**
- ✅ Stabilize current API
- ✅ Document public interfaces
- ✅ Identify migration boundaries
- ✅ Create deprecation notices for moved APIs

**Phase 2: Monorepo Setup (v2.0.0-alpha)**
- Create `packages/` structure
- Configure Bun workspaces
- Split code into packages
- Update build tooling per package
- Verify bundle sizes

**Phase 3: API Refinement (v2.0.0-beta)**
- Define package exports
- Create migration guide
- Update all examples
- Test cross-package compatibility

**Phase 4: Release (v2.0.0)**
- Publish all packages simultaneously
- Tag release in git
- Update documentation site
- Announce breaking changes

## Common Pitfalls

### ❌ Premature Monorepo Migration
**Problem**: Migrating before v1.0 API is stable
**Solution**: Wait for v1.x stabilization, gather production feedback first

### ❌ Circular Dependencies
**Problem**: `surrounded` imports from `aeonic`, creating cycle
**Solution**: Enforce one-way dependency graph with tooling

### ❌ Bundle Size Creep
**Problem**: Core package grows beyond 25 kB due to framework code
**Solution**: Strict boundary enforcement, regular bundle audits

### ❌ Inconsistent Versioning
**Problem**: Packages versioned together, losing independent release flexibility
**Solution**: Each package has own version, semver enforced independently

### ❌ Shared Code Duplication
**Problem**: Copying utilities between packages
**Solution**: Create `@orb-zone/shared-internal` for truly shared code (private package)

## Resources

### Bun Workspaces
- [Bun Workspaces Documentation](https://bun.sh/docs/install/workspaces)
- Workspace protocol: `workspace:*` for local dependencies

### Bundle Analysis
- Bun build with `--analyze` flag
- Track bundle size in CI/CD
- Constitution limit enforcement

### Migration References
- See [ROADMAP.md](../../ROADMAP.md) Phase 10 timeline
- Migration happens post-v1.0 stable release
- Breaking changes documented in v2.0.0 CHANGELOG

---

**When to Use This Agent**:
- Planning monorepo migration steps
- Defining package boundaries
- Optimizing bundle sizes
- Resolving dependency conflicts
- Designing build tooling

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "architecture-specialist",
  description: "Design monorepo migration strategy",
  prompt: "Create detailed migration plan from single package to monorepo workspace, ensuring zero bundle size regressions..."
});
```
