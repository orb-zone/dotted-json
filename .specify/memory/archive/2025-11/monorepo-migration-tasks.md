# Implementation Tasks: Monorepo Migration

**Target**: ~/Code/@OZ/web-craft (NEW REPO)  
**Source**: ~/Code/@OZ/jsön (REFERENCE ONLY)

## Phase 1: Workspace Initialization

- [ ] 1.1: Initialize Bun workspace in web-craft
  - `cd ~/Code/@OZ/web-craft`
  - `bun init` (if needed)
  - Create `package.json` with workspaces config
  - Create `bunfig.toml`
  - Create root `tsconfig.json`

- [ ] 1.2: Setup directory structure
  - `mkdir -p packages/dotted packages/surrounded`
  - Create `.gitignore` (node_modules, dist, .bun-cache)
  - Verify LICENSE exists (Apache2)

- [ ] 1.3: Copy AI infrastructure
  - Copy `.claude/` from jsön to web-craft
  - Copy `.specify/` from jsön to web-craft (selective)
  - Update paths in files if needed

## Phase 2: Package - @orb-zone/dotted (Core)

### Setup

- [ ] 2.1: Create package.json for packages/dotted
  - Name: `@orb-zone/dotted`
  - Version: `2.0.0`
  - Dependencies: dot-prop
  - Peer: zod (optional)
  - Exports: proper entry points

- [ ] 2.2: Create tsconfig.json for packages/dotted
  - Extends root config
  - Proper paths for build

- [ ] 2.3: Create build.ts for packages/dotted
  - Bun build script
  - Output to dist/
  - ESM format

### Core Files Migration

- [ ] 2.4: Migrate core engine
  - Copy `src/dotted-json.ts` → `packages/dotted/src/`
  - Copy `src/expression-evaluator.ts`
  - Copy `src/types.ts`
  - Update imports (no workspace: prefix needed within package)

- [ ] 2.5: Migrate variant system
  - Copy `src/variant-resolver.ts`
  - Copy `src/pronouns.ts`

- [ ] 2.6: Migrate FileLoader
  - Copy `src/loaders/file.ts` → `packages/dotted/src/loaders/`

- [ ] 2.7: Migrate Zod plugin
  - Copy `src/plugins/zod.ts` → `packages/dotted/src/plugins/`

- [ ] 2.8: Migrate helpers
  - Copy `src/helpers/type-coercion.ts` → `packages/dotted/src/helpers/`

- [ ] 2.9: Create index.ts
  - Export all public APIs
  - Re-export from modules
  - Document exports

### Tests Migration

- [ ] 2.10: Migrate unit tests
  - Copy `test/unit/dotted-json.test.ts`
  - Copy `test/unit/variants.test.ts`
  - Copy `test/unit/pronouns.test.ts`
  - Copy `test/unit/hierarchical-context.test.ts`
  - Copy `test/unit/parent-references.test.ts`
  - Copy `test/unit/file-loader.test.ts`
  - Copy `test/unit/file-loader-crud.test.ts`
  - Update imports

- [ ] 2.11: Migrate plugin tests
  - Copy `test/plugins/zod.test.ts`
  - Update imports

- [ ] 2.12: Run tests
  - `cd packages/dotted && bun test`
  - Verify all pass

### Tools & Examples

- [ ] 2.13: Migrate translation CLI
  - Copy `tools/translate/` → `packages/dotted/tools/translate/`
  - Update package.json bin entry
  - Test CLI: `bun packages/dotted/tools/translate/index.ts`

- [ ] 2.14: Migrate core examples
  - Copy & adapt `examples/basic-usage.ts`
  - Copy & adapt `examples/file-loader-i18n.ts`
  - Copy & adapt `examples/with-zod-validation.ts`
  - Update imports to use `@orb-zone/dotted`

### Documentation

- [ ] 2.15: Create README.md
  - Package overview
  - Installation instructions
  - Basic usage examples
  - Migration guide from v1.x

## Phase 3: Package - @orb-zone/surrounded (Framework)

### Setup

- [ ] 3.1: Create package.json for packages/surrounded
  - Name: `@orb-zone/surrounded`
  - Version: `1.0.0`
  - Dependency: `@orb-zone/dotted@workspace:^2.0.0`
  - Peers: surrealdb, vue, pinia, @pinia/colada

- [ ] 3.2: Create tsconfig.json for packages/surrounded
  - Extends root config
  - References dotted package

- [ ] 3.3: Create build.ts for packages/surrounded

### SurrealDB Files Migration

- [ ] 3.4: Migrate SurrealDBLoader
  - Copy `src/loaders/surrealdb.ts` → `packages/surrounded/src/loaders/`
  - Update imports to use `@orb-zone/dotted`

- [ ] 3.5: Migrate SurrealDB plugins
  - Copy `src/plugins/surrealdb.ts` → `packages/surrounded/src/plugins/`
  - Copy `src/plugins/pinia-colada.ts`
  - Copy `src/plugins/surrealdb-pinia.ts`
  - Update imports

- [ ] 3.6: Migrate storage types
  - Copy `src/types/storage.ts` → `packages/surrounded/src/types/`

### Vue Composables (NEW)

- [ ] 3.7: Create useSurrounded composable
  - Basic reactive SurrealDB integration
  - Wraps SurrealDBLoader
  - Vue 3 Composition API

- [ ] 3.8: Create query/mutation composables (optional)
  - useSurroundedQuery
  - useSurroundedMutation
  - Wrapper around Pinia Colada

- [ ] 3.9: Create index.ts
  - Export all composables
  - Export plugins
  - Export loader

### Tests Migration

- [ ] 3.10: Migrate SurrealDB tests
  - Copy `test/unit/surrealdb-*.test.ts`
  - Copy `test/integration/surrealdb-loader.test.ts`
  - Copy `test/integration/schema-driven-workflow.test.ts`
  - Update imports

- [ ] 3.11: Migrate plugin tests
  - Copy `test/unit/surrealdb-pinia-plugin.test.ts`
  - Copy `test/plugins/pinia-colada.test.ts`
  - Update imports

- [ ] 3.12: Run tests
  - `cd packages/surrounded && bun test`
  - Verify all pass

### Tools & Examples

- [ ] 3.13: Migrate surql-to-ts CLI
  - Copy `tools/surql-to-ts/` → `packages/surrounded/tools/surql-to-ts/`
  - Update package.json bin entry

- [ ] 3.14: Migrate SurrealDB examples
  - Copy `examples/surrealdb-auto-discovery.ts`
  - Copy `examples/realtime-config-manager.ts`
  - Copy `examples/complete-workflow.ts`
  - Copy `examples/i18n-translation-editor.ts`
  - Update imports

### Documentation

- [ ] 3.15: Create README.md
  - Package overview
  - SurrealDB integration guide
  - Vue composables documentation
  - Examples

## Phase 4: Workspace Integration

- [ ] 4.1: Verify workspace dependencies
  - `cd ~/Code/@OZ/web-craft && bun install`
  - Check that packages link correctly
  - Verify workspace: protocol works

- [ ] 4.2: Test inter-package imports
  - Import dotted in surrounded
  - Verify types resolve
  - No circular dependencies

- [ ] 4.3: Run all tests from root
  - `bun test` (workspace-level)
  - Verify both packages pass

- [ ] 4.4: Build all packages
  - `bun run build` (workspace script)
  - Check dist/ output in each package
  - Verify bundle sizes

## Phase 5: Quality Assurance

- [ ] 5.1: Bundle size verification
  - dotted: < 25 kB ✅
  - surrounded: < 75 kB total ✅

- [ ] 5.2: Lint all packages
  - Setup ESLint config
  - `bun run lint`
  - Fix any issues

- [ ] 5.3: Typecheck all packages
  - `bun run typecheck`
  - Zero TypeScript errors

- [ ] 5.4: Feature parity check
  - Compare with jsön v1.x
  - Verify no features lost
  - Document any changes

## Phase 6: Release Preparation

- [ ] 6.1: Setup Changesets
  - `bunx @changesets/cli init`
  - Configure changesets for workspace
  - Create initial changesets:
    - dotted@2.0.0 (major - breaking rename)
    - surrounded@1.0.0 (major - new package)

- [ ] 6.2: Write migration guide
  - Create `MIGRATION-v1-to-v2.md`
  - Document all breaking changes
  - Provide code examples
  - Include troubleshooting

- [ ] 6.3: Update root README
  - Monorepo overview
  - Package descriptions
  - Installation instructions
  - Link to package READMEs

- [ ] 6.4: Setup CI/CD
  - GitHub Actions workflow
  - Test both packages
  - Build verification
  - Bundle size checks

## Phase 7: Documentation

- [ ] 7.1: Update .specify/memory/
  - Mark monorepo-vision as "Implemented"
  - Update constitution if needed
  - Add monorepo-migration-complete.md

- [ ] 7.2: Create CHANGELOG entries
  - dotted CHANGELOG.md
  - surrounded CHANGELOG.md
  - Root CHANGELOG.md (monorepo)

- [ ] 7.3: JSR preparation
  - jsr.json for dotted
  - jsr.json for surrounded
  - Verify package configs

## Validation Checkpoints

After each phase:
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Documentation updated
- [ ] Git committed

## Final Checklist

Before marking complete:
- [ ] Feature parity verified
- [ ] Migration guide complete
- [ ] All tests passing (dotted + surrounded)
- [ ] Bundle sizes within limits
- [ ] Documentation complete
- [ ] Changesets created
- [ ] CI/CD functional
- [ ] Ready for v2.0.0 release

---

**Execution Context**: Run in ~/Code/@OZ/web-craft with ~/Code/@OZ/jsön as reference
