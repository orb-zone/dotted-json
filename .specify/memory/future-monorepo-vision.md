# Monorepo Migration Plan: @orb-zone/web-craft

**Status**: Future Planning (v0.10.0+)
**Target**: v0.10.0 (after v0.9.2 publication)
**Created**: 2025-10-06
**Updated**: 2025-10-08

**Note**: This is a future vision document. Current project (v0.9.2) is a single package ready for publication. Monorepo transformation will occur after initial release and user feedback.

## Overview

Convert the current `@orb-zone/dotted-json` single package into a **monorepo workspace** branded as **@orb-zone/web-craft**, containing:

1. **@orb-zone/dotted** - Core expression engine (renamed from dotted-json)
2. **@orb-zone/surrounded** - Full-stack SurrealDB framework for Vue
3. **create-surrounded** - Scaffolding CLI (`npm create surrounded@latest`)

## Naming Philosophy

All packages use **past tense** for cohesion:
- ✅ **dotted** - "The data has been dotted with expressions"
- ✅ **surrounded** - "Your app is surrounded by SurrealDB"
- ❌ ~~surround~~ (imperative, doesn't match)

## Final Structure

```
web-craft/                              # Git repo root
├── .git/
├── package.json                        # @orb-zone/web-craft (private workspace)
├── tsconfig.json                       # Shared TypeScript config
├── README.md                           # "Web-Craft: Full-stack SurrealDB tooling"
├── LICENSE
├── .gitignore
│
├── packages/
│   ├── dotted/                         # Core expression engine
│   │   ├── package.json                # @orb-zone/dotted
│   │   ├── README.md                   # "Dynamic JSON expansion"
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── dotted-json.ts
│   │   │   ├── expression-evaluator.ts
│   │   │   ├── variant-resolver.ts
│   │   │   ├── pronouns.ts
│   │   │   ├── loaders/
│   │   │   │   └── file.ts
│   │   │   └── plugins/
│   │   │       ├── zod.ts
│   │   │       ├── surrealdb.ts
│   │   │       └── pinia-colada.ts
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── plugins/
│   │   ├── examples/
│   │   ├── tools/
│   │   │   └── translate/
│   │   ├── build.ts
│   │   └── tsconfig.json
│   │
│   ├── surrounded/                     # Full-stack framework
│   │   ├── package.json                # @orb-zone/surrounded
│   │   ├── README.md                   # "Full-stack SurrealDB framework"
│   │   ├── src/
│   │   │   ├── index.ts                # Main exports
│   │   │   ├── composables/
│   │   │   │   ├── useSurrounded.ts    # Vue composable
│   │   │   │   ├── useSurroundedQuery.ts
│   │   │   │   └── useSurroundedMutation.ts
│   │   │   ├── loaders/
│   │   │   │   └── surrealdb-enhanced.ts
│   │   │   ├── permissions/
│   │   │   │   ├── manager.ts
│   │   │   │   └── field-detector.ts
│   │   │   ├── codegen/
│   │   │   │   ├── surql-parser.ts
│   │   │   │   ├── zod-generator.ts
│   │   │   │   └── types-generator.ts
│   │   │   ├── cli/
│   │   │   │   ├── index.ts
│   │   │   │   ├── commands/
│   │   │   │   │   ├── generate.ts
│   │   │   │   │   ├── migrate.ts
│   │   │   │   │   └── dev.ts
│   │   │   │   └── templates/
│   │   │   ├── devtools/
│   │   │   │   └── vue-devtools-plugin.ts
│   │   │   └── utils/
│   │   ├── test/
│   │   ├── templates/                  # Project scaffolds
│   │   │   ├── vue-spa/
│   │   │   ├── nuxt/
│   │   │   └── vite/
│   │   ├── build.ts
│   │   └── tsconfig.json
│   │
│   └── create-surrounded/              # Project scaffolding
│       ├── package.json                # create-surrounded
│       ├── README.md
│       ├── src/
│       │   ├── index.ts
│       │   ├── prompts.ts
│       │   └── scaffold.ts
│       ├── templates/                  # Symlink to ../surrounded/templates
│       └── tsconfig.json
│
├── .specify/                           # Design docs (stays at root)
│   ├── README.md
│   └── memory/
│
├── __DRAFT__/                          # Draft examples (stays at root)
│
└── docs/                               # Shared documentation
    ├── README.md
    ├── migration-guide.md
    └── monorepo-structure.md
```

## Package Responsibilities

### @orb-zone/dotted (Core Engine)

**What it includes**:
- ✅ Core dotted-json engine
- ✅ Expression evaluator
- ✅ Variant system
- ✅ File loader
- ✅ Plugins: Zod, SurrealDB, Pinia Colada
- ✅ Pronoun helpers
- ✅ Translation CLI

**What it does NOT include**:
- ❌ Vue-specific composables
- ❌ Code generation tools
- ❌ Project scaffolding
- ❌ Opinionated framework features

**Bundle size**: ~18-50 kB (depending on plugins used)

**package.json**:
```json
{
  "name": "@orb-zone/dotted",
  "version": "1.0.0",
  "description": "Dynamic JSON expansion using dot-prefixed expressions",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./loaders/file": "./dist/loaders/file.js",
    "./plugins/zod": "./dist/plugins/zod.js",
    "./plugins/surrealdb": "./dist/plugins/surrealdb.js",
    "./plugins/pinia-colada": "./dist/plugins/pinia-colada.js"
  },
  "bin": {
    "json-translate": "./tools/translate/index.ts"
  },
  "peerDependencies": {
    "zod": "^3.0.0",
    "surrealdb": "^1.0.0 || ^2.0.0",
    "@pinia/colada": "^0.7.0",
    "pinia": "^2.0.0",
    "vue": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "zod": { "optional": true },
    "surrealdb": { "optional": true },
    "@pinia/colada": { "optional": true },
    "pinia": { "optional": true },
    "vue": { "optional": true }
  }
}
```

### @orb-zone/surrounded (Framework)

**What it includes**:
- ✅ `useSurrounded()` Vue composable
- ✅ Enhanced SurrealDBLoader (with array Record IDs)
- ✅ Permission manager (field-level detection)
- ✅ Code generation (surql → Zod → TypeScript)
- ✅ CLI tools (`surrounded generate`, `surrounded dev`)
- ✅ Vue DevTools integration
- ✅ Project templates
- ✅ SSR/Nuxt support

**What it requires**:
- Depends on `@orb-zone/dotted`
- Always includes: SurrealDB, Vue, Zod, Pinia Colada

**Bundle size**: ~50-80 kB (batteries-included)

**package.json**:
```json
{
  "name": "@orb-zone/surrounded",
  "version": "1.0.0",
  "description": "Full-stack SurrealDB framework for Vue - Your app, surrounded by the database",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./composables": "./dist/composables/index.js",
    "./cli": "./dist/cli/index.js"
  },
  "bin": {
    "surrounded": "./dist/cli/index.js"
  },
  "dependencies": {
    "@orb-zone/dotted": "workspace:*",
    "surrealdb": "^2.0.0",
    "vue": "^3.0.0",
    "@pinia/colada": "^0.7.0",
    "pinia": "^2.0.0",
    "zod": "^3.0.0",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "@orb-zone/dotted": "workspace:*"
  }
}
```

### create-surrounded (Scaffolding)

**What it includes**:
- ✅ Interactive project creation wizard
- ✅ Template selection (Vue SPA, Nuxt, Vite)
- ✅ Dependency installation
- ✅ Git initialization

**Usage**:
```bash
npm create surrounded@latest my-app
bunx create-surrounded my-app
```

**package.json**:
```json
{
  "name": "create-surrounded",
  "version": "1.0.0",
  "description": "Scaffold a new Surrounded app",
  "type": "module",
  "bin": {
    "create-surrounded": "./dist/index.js"
  },
  "dependencies": {
    "prompts": "^2.4.2",
    "kolorist": "^1.8.0",
    "minimist": "^1.2.8"
  }
}
```

## Migration Steps

### Phase 1: Preparation (No Breaking Changes)

**Goal**: Set up workspace structure without moving code

**Steps**:
1. ✅ Create root `package.json` with workspace config
2. ✅ Create `packages/` directory
3. ✅ Update `.gitignore` for monorepo
4. ✅ Create shared `tsconfig.json` at root
5. ✅ Add workspace scripts to root `package.json`

**Commands**:
```bash
# Create workspace structure
mkdir -p packages/dotted packages/surrounded packages/create-surrounded

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "@orb-zone/web-craft",
  "version": "1.0.0",
  "private": true,
  "description": "Full-stack SurrealDB tooling - dotted expressions, surrounded by the database",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "bun run --filter \"@orb-zone/*\" build",
    "test": "bun run --filter \"@orb-zone/*\" test",
    "test:unit": "bun test packages/*/test/unit",
    "test:integration": "bun test packages/*/test/integration",
    "db:start": "surreal start --user root --pass root memory",
    "db:test": "surreal start --user root --pass root --bind 127.0.0.1:9000 memory",
    "dev": "bun run --filter \"@orb-zone/*\" dev",
    "lint": "bun run --filter \"@orb-zone/*\" lint",
    "typecheck": "bun run --filter \"@orb-zone/*\" typecheck"
  },
  "keywords": [
    "surrealdb",
    "vue",
    "dotted-json",
    "expressions",
    "full-stack",
    "framework",
    "monorepo"
  ],
  "author": "orb.zone",
  "license": "MIT"
}
EOF
```

### Phase 2: Move @orb-zone/dotted (Preserve Git History)

**Goal**: Move existing code to `packages/dotted/` with git history intact

**Commands**:
```bash
# Move files (preserves git history)
git mv src packages/dotted/src
git mv test packages/dotted/test
git mv examples packages/dotted/examples
git mv tools packages/dotted/tools
git mv build.ts packages/dotted/build.ts
git mv tsconfig.json packages/dotted/tsconfig.json

# Copy shared files
cp package.json packages/dotted/package.json
cp README.md packages/dotted/README.md
cp LICENSE packages/dotted/LICENSE

# Update package.json
cat > packages/dotted/package.json << 'EOF'
{
  "name": "@orb-zone/dotted",
  "version": "1.0.0",
  "description": "Dynamic JSON expansion using dot-prefixed expressions",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./loaders/file": {
      "import": "./dist/loaders/file.js",
      "types": "./dist/loaders/file.d.ts"
    },
    "./plugins/zod": {
      "import": "./dist/plugins/zod.js",
      "types": "./dist/plugins/zod.d.ts"
    },
    "./plugins/surrealdb": {
      "import": "./dist/plugins/surrealdb.js",
      "types": "./dist/plugins/surrealdb.d.ts"
    },
    "./plugins/pinia-colada": {
      "import": "./dist/plugins/pinia-colada.js",
      "types": "./dist/plugins/pinia-colada.d.ts"
    }
  },
  "bin": {
    "json-translate": "./tools/translate/index.ts"
  },
  "files": [
    "dist",
    "tools",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build.ts",
    "test": "bun test",
    "test:unit": "bun test test/unit",
    "test:integration": "bun test test/integration",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "lint": "eslint . --ext .js,.ts,.tsx --fix",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "zod": "^3.0.0",
    "surrealdb": "^1.0.0 || ^2.0.0",
    "@pinia/colada": "^0.7.0",
    "pinia": "^2.0.0",
    "vue": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "zod": { "optional": true },
    "surrealdb": { "optional": true },
    "@pinia/colada": { "optional": true },
    "pinia": { "optional": true },
    "vue": { "optional": true }
  },
  "dependencies": {
    "dot-prop": "^8.0.2"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
EOF

# Commit
git add -A
git commit -m "refactor: move core to packages/dotted (preserve history)"
```

### Phase 3: Create @orb-zone/surrounded Package

**Goal**: Create new framework package

**Commands**:
```bash
# Create directory structure
mkdir -p packages/surrounded/src/{composables,loaders,permissions,codegen,cli/commands,devtools,utils}
mkdir -p packages/surrounded/test/{unit,integration}
mkdir -p packages/surrounded/templates/{vue-spa,nuxt,vite}

# Create package.json
cat > packages/surrounded/package.json << 'EOF'
{
  "name": "@orb-zone/surrounded",
  "version": "1.0.0",
  "description": "Full-stack SurrealDB framework for Vue - Your app, surrounded by the database",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./composables": {
      "import": "./dist/composables/index.js",
      "types": "./dist/composables/index.d.ts"
    }
  },
  "bin": {
    "surrounded": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "templates",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build.ts",
    "test": "bun test",
    "lint": "eslint . --ext .js,.ts,.tsx --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@orb-zone/dotted": "workspace:*",
    "surrealdb": "^2.0.0",
    "vue": "^3.0.0",
    "@pinia/colada": "^0.7.0",
    "pinia": "^2.0.0",
    "zod": "^3.0.0",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.6.0"
  }
}
EOF

# Create initial index.ts
cat > packages/surrounded/src/index.ts << 'EOF'
/**
 * @orb-zone/surrounded
 *
 * Full-stack SurrealDB framework for Vue
 * Your app, surrounded by the database
 */

export { useSurrounded } from './composables/useSurrounded.js';
export { useSurroundedQuery } from './composables/useSurroundedQuery.js';
export { useSurroundedMutation } from './composables/useSurroundedMutation.js';

export type {
  SurroundedOptions,
  SurroundedInstance,
  SurroundedQuery,
  SurroundedMutation
} from './types.js';
EOF

# Create README
cat > packages/surrounded/README.md << 'EOF'
# @orb-zone/surrounded

Full-stack SurrealDB framework for Vue.

**Your app, surrounded by the database.**

## Features

- 🚀 **Zero-config** - Define schema once, auto-generate everything
- 🎯 **Type-safe** - Full TypeScript support via Zod inference
- ⚡ **Real-time** - LIVE queries built-in
- 🔒 **Secure** - Field-level permissions from SurrealDB
- 🎨 **Vue 3** - Composables for reactive data
- 📦 **Batteries-included** - Storage, validation, permissions out of the box

## Installation

```bash
npm install @orb-zone/surrounded
```

## Quick Start

```typescript
import { useSurrounded } from '@orb-zone/surrounded';

const { data, loader, permissions } = await useSurrounded({
  userId: 'user:alice',
  '.profile': 'db.getProfile(${userId})',
  '.orders': 'db.getActiveOrders(${userId})'
}, {
  schema: './schema.surql',
  url: 'ws://localhost:8000/rpc',
  namespace: 'my_app',
  database: 'main'
});

// Everything is type-safe and validated!
const profile = await data.get('.profile');
```

## Documentation

See [docs](../../docs) for full documentation.

## License

MIT
EOF

# Commit
git add packages/surrounded
git commit -m "feat: add @orb-zone/surrounded framework package"
```

### Phase 4: Create create-surrounded Package

**Goal**: Add project scaffolding tool

**Commands**:
```bash
# Create structure
mkdir -p packages/create-surrounded/src

# Create package.json
cat > packages/create-surrounded/package.json << 'EOF'
{
  "name": "create-surrounded",
  "version": "1.0.0",
  "description": "Scaffold a new Surrounded app",
  "type": "module",
  "bin": {
    "create-surrounded": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target node",
    "dev": "bun run --watch src/index.ts"
  },
  "dependencies": {
    "prompts": "^2.4.2",
    "kolorist": "^1.8.0",
    "minimist": "^1.2.8"
  }
}
EOF

# Create README
cat > packages/create-surrounded/README.md << 'EOF'
# create-surrounded

Scaffold a new Surrounded app.

## Usage

```bash
npm create surrounded@latest my-app
# or
bunx create-surrounded my-app
```

## Templates

- Vue 3 SPA
- Nuxt 3
- Vite + Vue 3

All templates include:
- SurrealDB connection
- Sample schema.surql
- useSurrounded() setup
- TypeScript configuration
- Dev server ready to go
EOF

# Commit
git add packages/create-surrounded
git commit -m "feat: add create-surrounded scaffolding tool"
```

### Phase 5: Update Root-Level Files

**Goal**: Clean up root and update documentation

**Commands**:
```bash
# Update root README
cat > README.md << 'EOF'
# Web-Craft

**Full-stack SurrealDB tooling for Vue**

Dotted expressions, surrounded by the database.

## Packages

This monorepo contains:

- **[@orb-zone/dotted](packages/dotted)** - Core expression engine for dynamic JSON expansion
- **[@orb-zone/surrounded](packages/surrounded)** - Full-stack SurrealDB framework for Vue
- **[create-surrounded](packages/create-surrounded)** - Project scaffolding tool

## Quick Start

### Create a new app

```bash
npm create surrounded@latest my-app
cd my-app
npm install
npm run dev
```

### Use in existing project

```bash
npm install @orb-zone/surrounded
```

```typescript
import { useSurrounded } from '@orb-zone/surrounded';

const app = await useSurrounded({
  userId: 'user:alice',
  '.profile': 'db.getProfile(${userId})'
}, {
  schema: './schema.surql',
  url: 'ws://localhost:8000/rpc',
  namespace: 'my_app',
  database: 'main'
});
```

## Development

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Build all packages
bun run build

# Start dev server
bun run dev
```

## Documentation

See [docs/](docs/) for detailed documentation.

## License

MIT © orb.zone
EOF

# Create docs directory
mkdir -p docs

cat > docs/README.md << 'EOF'
# Web-Craft Documentation

Welcome to Web-Craft documentation!

## Getting Started

- [Quick Start](getting-started.md)
- [Installation](installation.md)
- [Your First App](first-app.md)

## Core Concepts

- [Dotted Expressions](core/dotted-expressions.md)
- [Schema-Driven Development](core/schema-driven.md)
- [Variant System](core/variants.md)

## Framework

- [useSurrounded() API](api/use-surrounded.md)
- [Storage Providers](api/storage-providers.md)
- [Permissions](api/permissions.md)

## Guides

- [Migration from REST](guides/migration-rest.md)
- [Migration from GraphQL](guides/migration-graphql.md)
- [Monorepo Structure](guides/monorepo.md)
EOF

# Commit
git add README.md docs/
git commit -m "docs: update for monorepo structure"
```

### Phase 6: Update CHANGELOG & Version

**Goal**: Document the migration

**Commands**:
```bash
# Create CHANGELOG for workspace
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - TBD

### Changed

- **BREAKING**: Restructured as monorepo (@orb-zone/web-craft)
- **BREAKING**: Renamed `@orb-zone/dotted-json` → `@orb-zone/dotted`
- Added `@orb-zone/surrounded` - Full-stack SurrealDB framework
- Added `create-surrounded` - Project scaffolding tool

### Migration Guide

See [docs/migration-guide.md](docs/migration-guide.md) for details.

#### Before (single package)
```bash
npm install @orb-zone/dotted-json
```

#### After (monorepo)
```bash
# For library users
npm install @orb-zone/dotted

# For framework users
npm install @orb-zone/surrounded
```

### Added

- Monorepo structure with Bun workspaces
- `useSurrounded()` Vue composable
- Enhanced SurrealDBLoader with array Record IDs
- Permission manager with field-level detection
- Code generation: surql → Zod → TypeScript
- CLI tools (`surrounded generate`, `surrounded dev`)

For older changelog, see [packages/dotted/CHANGELOG.md](packages/dotted/CHANGELOG.md)
EOF

# Commit
git add CHANGELOG.md
git commit -m "docs: add monorepo changelog and migration guide"
```

### Phase 7: Verify & Test

**Goal**: Ensure everything works

**Commands**:
```bash
# Install all dependencies
bun install

# Build all packages
bun run build

# Run all tests
bun test

# Verify workspace links
ls -la packages/surrounded/node_modules/@orb-zone/dotted
# Should be symlink to ../../dotted

# Test package imports
cd packages/surrounded
bun run build
cd ../..

# Verify builds
ls -la packages/*/dist
```

### Phase 8: Publish (When Ready)

**Commands**:
```bash
# Build all packages
bun run build

# Test all packages
bun test

# Publish dotted first (surrounded depends on it)
cd packages/dotted
npm publish --access public

# Publish surrounded
cd ../surrounded
npm publish --access public

# Publish create-surrounded
cd ../create-surrounded
npm publish --access public

# Tag release
git tag v1.0.0
git push origin v1.0.0
```

## Breaking Changes & Migration

### For Library Users

**Before** (v0.x.x):
```typescript
import { dotted } from '@orb-zone/dotted-json';
import { withZod } from '@orb-zone/dotted-json/plugins/zod';
```

**After** (v1.0.0):
```typescript
import { dotted } from '@orb-zone/dotted';
import { withZod } from '@orb-zone/dotted/plugins/zod';
```

**Migration**: Global find/replace `@orb-zone/dotted-json` → `@orb-zone/dotted`

### For Framework Users

**Before** (v0.x.x):
```typescript
// Didn't exist yet
```

**After** (v1.0.0):
```typescript
import { useSurrounded } from '@orb-zone/surrounded';
```

**Migration**: Install new package, use new composable

## Timeline

| Version | Date | Status | Description |
|---------|------|--------|-------------|
| v0.6.0 | 2025-10-07 | ✅ Complete | Storage providers, FileLoader CRUD |
| v0.7.0 | 2025-10-07 | ✅ Complete | SurrealDBLoader + array Record IDs |
| v0.8.0 | 2025-10-07 | ✅ Complete | LIVE queries + real-time integration |
| v0.9.0 | 2025-10-07 | ✅ Complete | Production polish (retry, metrics) |
| v0.9.1 | 2025-10-07 | ✅ Complete | Documentation + examples |
| v0.9.2 | 2025-10-08 | ✅ Complete | API docs + migration guides |
| v0.10.0 | TBD | 🔜 Planned | **Monorepo migration** (after publication) |
| v1.0.0 | TBD | 🔜 Planned | Production release of framework |

## Benefits of Monorepo

1. ✅ **Clear separation**: Core engine vs. opinionated framework
2. ✅ **Independent versioning**: `dotted@1.x.x`, `surrounded@1.x.x`
3. ✅ **Shared development**: Both packages in one repo
4. ✅ **Easy testing**: Test cross-package integration
5. ✅ **Better positioning**: "dotted = library, surrounded = framework"
6. ✅ **Faster iteration**: No need to publish intermediate versions

## Open Questions

1. **Git History**: Should we keep all history in monorepo or split?
   - **Recommendation**: Keep all history, use `git mv` to preserve

2. **Versioning**: Sync versions or independent?
   - **Recommendation**: Independent (dotted can be stable while surrounded evolves)

3. **CI/CD**: How to handle publishing?
   - **Recommendation**: Use changesets or lerna for coordinated releases

4. **NPM Scope**: Keep @orb-zone or create new?
   - **Recommendation**: Keep @orb-zone (already established)

## Success Metrics

- ✅ All existing tests pass in new structure
- ✅ Both packages can be published independently
- ✅ Workspace links work (`surrounded` can import `dotted`)
- ✅ Build times stay reasonable (<10s for all packages)
- ✅ Clear documentation for monorepo structure

## References

- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Lerna Monorepo](https://lerna.js.org/)
- [Turborepo](https://turbo.build/repo/docs)

## Changelog

- **2025-10-06**: Initial migration plan created
