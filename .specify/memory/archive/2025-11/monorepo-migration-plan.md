# Monorepo Migration Plan

## Overview

Refactor single package `@orb-zone/dotted-json` (v0.12.1) into a Bun workspace monorepo with multiple packages in a **fresh new repository**.

**Source**: `~/Code/@OZ/jsön` (keep as-is for reference)  
**Target**: `~/Code/@OZ/web-craft` (fresh repo, only LICENSE currently)  
**Branch**: main (current)

## Constitutional Compliance

### Bundle Size Impact
- **@orb-zone/dotted** (core): Target 18-25 kB (under 25 kB limit)
- **@orb-zone/surrounded** (framework): +30-50 kB (75 kB total)
- Each package independently measured

### Breaking Changes: YES ✅
**This is a v2.0.0 MAJOR release**

**Breaking changes**:
1. Package name: `@orb-zone/dotted-json` → `@orb-zone/dotted`
2. Import paths may change for plugins
3. New workspace structure
4. Potential API reorganization

**Migration required**: Provide v1→v2 migration guide

### TDD Approach
- Migrate tests WITH code
- Run tests in each package independently
- Maintain 100% pass rate during migration
- Add new tests for workspace-specific functionality

### Security
- Same trust model as v1.x
- No new expression evaluation patterns
- Maintain schema validation requirements

## Architecture Decisions

### 1. Repository Structure

**Chosen**: Bun workspace monorepo with conventional packages/ directory

**Rationale**:
- Bun workspaces are fast, native TypeScript support
- Conventional structure (packages/) familiar to ecosystem
- Enables independent package versioning
- Allows gradual feature migration

**Structure**:
```
web-craft/
├── packages/
│   ├── dotted/              # Core expression engine
│   ├── surrounded/          # SurrealDB framework
│   └── create-surrounded/   # CLI scaffolding (future)
├── .claude/                 # AI commands
├── .specify/                # Project knowledge
├── package.json             # Workspace root (private)
├── bunfig.toml             # Bun configuration
└── tsconfig.json            # Shared TypeScript config
```

### 2. Package Naming

**Core package**: `@orb-zone/dotted` (was `@orb-zone/dotted-json`)

**Rationale**:
- Shorter, cleaner name
- "JSON" is implied (it's a JSON manipulation library)
- Aligns with "dotted" as adjective philosophy
- v2.0.0 allows this breaking rename

### 3. Package Boundaries

**Package 1: @orb-zone/dotted (v2.0.0)**

**Includes**:
- Core expression engine (src/dotted-json.ts, expression-evaluator.ts)
- Variant resolution system (variant-resolver.ts, pronouns.ts)
- FileLoader (loaders/file.ts)
- Zod plugin (plugins/zod.ts)
- Translation CLI (tools/translate/)

**Excludes** (moves to surrounded):
- SurrealDBLoader (loaders/surrealdb.ts)
- SurrealDB plugin (plugins/surrealdb.ts)
- Pinia Colada plugin (plugins/pinia-colada.ts)
- SurrealDB-specific tools (tools/surql-to-ts/)

**Bundle target**: 18-25 kB

**Package 2: @orb-zone/surrounded (v1.0.0)**

**Includes**:
- SurrealDBLoader from dotted-json
- SurrealDB plugin
- Pinia Colada integration
- Vue composables (NEW)
- LIVE query support
- surql-to-ts CLI tool
- SurrealDB-specific utilities

**Dependencies**:
- `@orb-zone/dotted@^2.0.0` (workspace)
- `surrealdb` (peer)
- `vue` (peer)
- `pinia` (peer)
- `@pinia/colada` (peer)

**Bundle target**: +30-50 kB (50-75 kB total with dotted)

**Package 3: create-surrounded (v0.1.0)** - Future

**Purpose**: `npm create surrounded@latest` scaffolding

**Status**: Not in initial v2.0.0, plan for later

### 4. Workspace Configuration

**bunfig.toml** (root):
```toml
[install]
peer = true

[install.cache]
dir = ".bun-cache"
```

**package.json** (root):
```json
{
  "name": "@orb-zone/web-craft",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun test",
    "lint": "bun run --filter '*' lint",
    "typecheck": "bun run --filter '*' typecheck"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

### 5. Migration Strategy

**Phase 1**: Core package setup
1. Initialize web-craft repo with Bun workspace
2. Create packages/dotted/ structure
3. Copy core files from jsön (selective)
4. Update imports, package.json
5. Run tests, verify bundle size

**Phase 2**: Surrounded package
1. Create packages/surrounded/ structure
2. Move SurrealDB-related code
3. Add Vue composables (NEW)
4. Update dependencies
5. Run tests

**Phase 3**: Integration
1. Test inter-package dependencies
2. Update examples
3. Write migration guide
4. Update documentation

**Phase 4**: Release
1. Create changesets for both packages
2. Publish @orb-zone/dotted@2.0.0
3. Publish @orb-zone/surrounded@1.0.0

### 6. What to Migrate vs. Recreate

**Migrate as-is**:
- Core engine files (dotted-json.ts, expression-evaluator.ts)
- Variant system (variant-resolver.ts, pronouns.ts)
- Tests (all test files)
- Type definitions
- Constitutional documents (.specify/memory/constitution.md)
- Specialist agents (.specify/agents/)

**Adapt during migration**:
- package.json (new structure, dependencies split)
- Import paths (update for workspace structure)
- Build configuration (separate per package)
- Examples (split by package)

**Recreate from scratch**:
- Workspace root package.json
- bunfig.toml
- Root tsconfig.json (shared config)
- Root README.md (monorepo overview)

**Leave in jsön** (not migrating):
- Old examples that don't fit new structure
- Experimental/draft code
- Old design docs marked "deprecated"

## File Structure

### packages/dotted/

```
packages/dotted/
├── src/
│   ├── index.ts                    # Main exports
│   ├── dotted-json.ts              # Core class [MIGRATE]
│   ├── expression-evaluator.ts     # Expression engine [MIGRATE]
│   ├── variant-resolver.ts         # Variant system [MIGRATE]
│   ├── pronouns.ts                 # i18n helpers [MIGRATE]
│   ├── types.ts                    # Type definitions [MIGRATE]
│   ├── loaders/
│   │   └── file.ts                 # FileLoader [MIGRATE]
│   ├── plugins/
│   │   └── zod.ts                  # Zod plugin [MIGRATE]
│   └── helpers/
│       └── type-coercion.ts        # Helpers [MIGRATE]
├── test/
│   ├── unit/                       # [MIGRATE all]
│   ├── integration/                # [MIGRATE relevant]
│   └── plugins/
│       └── zod.test.ts             # [MIGRATE]
├── tools/
│   └── translate/                  # Translation CLI [MIGRATE]
├── examples/
│   ├── basic-usage.ts              # [ADAPT]
│   ├── file-loader-i18n.ts         # [ADAPT]
│   └── with-zod-validation.ts      # [ADAPT]
├── package.json                    # [CREATE NEW]
├── tsconfig.json                   # [CREATE NEW]
├── build.ts                        # [CREATE NEW]
└── README.md                       # [ADAPT]
```

### packages/surrounded/

```
packages/surrounded/
├── src/
│   ├── index.ts                    # Main exports [CREATE]
│   ├── loaders/
│   │   └── surrealdb.ts            # SurrealDBLoader [MIGRATE]
│   ├── plugins/
│   │   ├── surrealdb.ts            # SurrealDB plugin [MIGRATE]
│   │   ├── pinia-colada.ts         # Pinia integration [MIGRATE]
│   │   └── surrealdb-pinia.ts      # Combined plugin [MIGRATE]
│   ├── composables/                # Vue composables [CREATE NEW]
│   │   ├── useSurrounded.ts        # Main composable
│   │   ├── useSurroundedQuery.ts   # Query wrapper
│   │   └── useSurroundedMutation.ts # Mutation wrapper
│   └── types/
│       └── storage.ts              # Storage types [MIGRATE]
├── test/
│   ├── unit/
│   │   └── surrealdb-*.test.ts     # [MIGRATE]
│   └── integration/
│       └── surrealdb-loader.test.ts # [MIGRATE]
├── tools/
│   └── surql-to-ts/                # Type gen CLI [MIGRATE]
├── examples/
│   ├── surrealdb-auto-discovery.ts # [MIGRATE]
│   ├── realtime-config-manager.ts  # [MIGRATE]
│   └── complete-workflow.ts        # [MIGRATE]
├── package.json                    # [CREATE NEW]
├── tsconfig.json                   # [CREATE NEW]
└── README.md                       # [CREATE NEW]
```

### Root-level files

```
web-craft/
├── .claude/                        # [COPY from jsön]
│   ├── commands/
│   │   ├── plan.md
│   │   ├── implement.md
│   │   └── changeset.md
│   └── README.md
├── .specify/                       # [SELECTIVE COPY]
│   ├── agents/                     # [COPY all]
│   ├── memory/
│   │   ├── constitution.md         # [COPY]
│   │   ├── active/                 # [EMPTY - new sessions]
│   │   └── *.md                    # [COPY relevant design docs]
│   └── README.md                   # [ADAPT]
├── package.json                    # [CREATE - workspace root]
├── bunfig.toml                     # [CREATE]
├── tsconfig.json                   # [CREATE - shared]
├── README.md                       # [CREATE - monorepo overview]
├── LICENSE                         # [KEEP - Apache2 from GitHub]
└── .gitignore                      # [CREATE]
```

## Specialist Recommendations

### From architecture-specialist.md

**Workspace structure**:
- Use packages/ convention (standard)
- Private workspace root
- Independent versioning per package
- Workspace protocol for internal deps

**Bundle optimization**:
- Each package builds independently
- Tree-shaking at package level
- Shared dev dependencies at root
- Peer dependencies for optional features

**Testing strategy**:
- Tests colocated with package
- Workspace-level test script
- Each package can run tests independently

**Best practices**:
- No circular dependencies
- Clear import boundaries
- Document package purposes in README
- Maintain API stability in dotted (v2.x minor releases)

## Dependencies

### Root workspace

```json
{
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0",
    "@changesets/cli": "^2.27.0"
  }
}
```

### @orb-zone/dotted

```json
{
  "dependencies": {
    "dot-prop": "^8.0.2"
  },
  "peerDependencies": {
    "zod": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "zod": { "optional": true }
  }
}
```

### @orb-zone/surrounded

```json
{
  "dependencies": {
    "@orb-zone/dotted": "workspace:^2.0.0"
  },
  "peerDependencies": {
    "surrealdb": "^1.0.0 || ^2.0.0",
    "@pinia/colada": "^0.7.0",
    "pinia": "^2.0.0",
    "vue": "^3.0.0",
    "zod": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "zod": { "optional": true },
    "@pinia/colada": { "optional": true }
  }
}
```

## Risks & Mitigations

### Risk 1: Breaking existing users

**Impact**: HIGH  
**Likelihood**: CERTAIN

**Mitigation**:
- Clear migration guide (v1→v2)
- Maintain v1.x branch for critical fixes
- Document all breaking changes
- Provide codemods if possible
- Gradual deprecation warnings in v1.x

### Risk 2: Bundle size inflation

**Impact**: MEDIUM  
**Likelihood**: MEDIUM

**Mitigation**:
- Monitor bundle size per package
- Automated checks in CI
- Tree-shaking verification
- Regular audits

### Risk 3: Workspace complexity

**Impact**: LOW  
**Likelihood**: LOW

**Mitigation**:
- Clear documentation
- Standard Bun workspace patterns
- Automated scripts for common tasks
- Good error messages in build scripts

### Risk 4: Test migration issues

**Impact**: MEDIUM  
**Likelihood**: MEDIUM

**Mitigation**:
- Migrate tests WITH code
- Run full test suite per package
- Verify no tests dropped
- Test inter-package integration

### Risk 5: Lost features during migration

**Impact**: HIGH  
**Likelihood**: LOW

**Mitigation**:
- Checklist of all current features
- Feature parity verification
- Regression testing against v1.x
- User acceptance testing

## Success Criteria

### Package: @orb-zone/dotted

- [ ] Bundle size < 25 kB
- [ ] All core tests passing (190+ tests)
- [ ] Zero TypeScript errors
- [ ] Clean lint
- [ ] Published to JSR
- [ ] Migration guide complete

### Package: @orb-zone/surrounded

- [ ] Bundle size < 75 kB (total with dotted)
- [ ] All SurrealDB tests passing (35+ tests)
- [ ] Vue composables functional
- [ ] Examples working
- [ ] Published to JSR

### Workspace

- [ ] Bun workspace functional
- [ ] Workspace scripts working
- [ ] Changeset automation configured
- [ ] CI/CD pipeline operational
- [ ] Documentation complete

### Migration

- [ ] Feature parity with v1.x
- [ ] Migration guide tested
- [ ] Breaking changes documented
- [ ] v1→v2 upgrade path clear
- [ ] Community communication plan

---

**Next step**: Review this plan, then execute in ~/Code/@OZ/web-craft

**Execution note**: Open new OpenCode session in web-craft directory to implement this plan
