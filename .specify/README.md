# Project Specification & Memory

This directory contains design documentation, memory files, and context for understanding the dotted-json (jsön) project.

## Quick Start for New Sessions

This is the **@orbzone/dotted-json** library - dynamic JSON data expansion using dot-prefixed property keys as expression triggers.

### Current Status (v0.6.0-design)

- **Version**: 0.6.0-design (design phase complete)
- **Bundle**: 18.18 kB (within 20 kB constitution limit)
- **Tests**: 210/210 passing (all tests green)
- **Status**: Phase 6 design complete - Storage providers & advanced permissions architecture ready for implementation

### Recent Work

**v0.6.0-design** (Current - Design Phase):

1. **Storage Provider System Design**: Unified `StorageProvider` interface for JSÖN document persistence
2. **SurrealDBLoader Design**: Load/save JSÖN documents from SurrealDB with variant resolution
3. **Permission Detection Design**: Table-level and field-level permission pre-flight checks
4. **Zod Integration Design**: Single source of truth with `z.infer<>` for TypeScript type inference
5. **SurrealQL to Zod Generator Design**: Auto-generate Zod schemas from `.surql` schema files
6. **Design Documents**: Created 6 comprehensive design documents (~4,000+ lines total)
7. **Constitution Update**: Added JSÖN capitalization rules (uppercase in titles, lowercase in extensions)

**v0.5.0**:

1. **Pinia Colada Plugin**: Vue 3 data fetching with intelligent caching, mutations, lifecycle hooks
2. **12 Tests**: Complete test coverage for caching, staleTime, invalidation, mutations
3. **Plugin Ecosystem**: Three production-ready plugins (Zod, SurrealDB, Pinia Colada)
4. **ROADMAP.md**: Updated to reflect completed phases and deferred TanStack plugin

**v0.4.0**:

1. **SurrealDB Plugin**: Zero-boilerplate database integration with auto-generated CRUD resolvers
2. **Auth Support**: All auth types (root, namespace, database, scope)
3. **Custom Functions**: Zod-validated function resolvers

**v0.3.0**:

1. **Zod Plugin**: Runtime type validation with path and resolver schemas
2. **Plugin Architecture**: ValidationOptions interface, core integration
3. **8 Tests**: Comprehensive Zod validation tests, all passing

**v0.2.0-0.2.1**:

1. **Core Library**: Expression evaluation, caching, cycle detection
2. **Variant System**: Language, gender, formality variants with automatic resolution
3. **File Loader**: Variant-aware filesystem loading with security
4. **Translation CLI**: Local Ollama-powered translation tool (`json-translate`)

### Essential Reading

If starting a new session, read these files in order:

1. **`memory/constitution.md`** - Project principles, constraints (20 kB bundle limit, TDD, JSÖN capitalization)
2. **`CHANGELOG.md`** (root) - Full version history including v0.6.0-design
3. **`ROADMAP.md`** (root) - Current phase (v0.6.0-design) and implementation plan

**Phase 6 Design Documents** (v0.6.0-design):
- **`memory/storage-providers-design.md`** - StorageProvider interface, SurrealDBLoader, FileLoader enhancements (1,200+ lines)
- **`memory/permissions-and-zod-integration.md`** - Table-level permissions, Zod integration (900+ lines)
- **`memory/field-level-permissions-design.md`** - Granular per-field permissions (1,000+ lines)
- **`memory/surql-to-zod-inference.md`** - Auto-generate Zod from .surql schemas (800+ lines)
- **`memory/surrealdb-vue-vision.md`** - Grand vision for SurrealDB + Vue integration (450+ lines)
- **`memory/integration-patterns.md`** - 30+ production-ready patterns (450+ lines)

**Earlier Design Documents**:
- **`memory/variant-system-design.md`** - Variant scoring, tiebreaker logic, formality rationale
- **`memory/translation-cli-design.md`** - Privacy-first design, batch translation, prompting
- **`memory/variant-aware-file-loading.md`** - File loader architecture, security, caching

### Architecture Overview

```
dotted-json/
├── src/
│   ├── index.ts              # Main entry (dotted() function)
│   ├── dotted-json.ts        # Core DottedJson class
│   ├── expression-evaluator.ts # Expression evaluation engine
│   ├── variant-resolver.ts   # Variant scoring & resolution
│   ├── pronouns.ts           # Gender-aware pronoun helpers
│   └── loaders/
│       └── file.ts           # FileLoader with variant resolution
├── tools/
│   └── translate/            # Translation CLI (json-translate)
│       ├── index.ts          # CLI entry point
│       ├── providers/ollama.ts # Ollama LLM provider
│       └── utils/file-output.ts # File I/O utilities
├── test/
│   ├── unit/                 # 190 passing tests
│   └── fixtures/             # Test data files
└── examples/                 # 5 working examples

Package exports:
- @orbzone/dotted-json                     # Core library
- @orbzone/dotted-json/loaders/file        # File loader (separate to keep core small)
- @orbzone/dotted-json/plugins/zod         # Zod validation plugin (v0.3.0)
- @orbzone/dotted-json/plugins/surrealdb   # SurrealDB integration (v0.4.0)
- @orbzone/dotted-json/plugins/pinia-colada # Pinia Colada data fetching (v0.5.0)

Global CLI:
- json-translate                 # Translation tool (via npm install -g)
```

### Key Design Decisions

#### Variant System

**Well-known variants** with priority scoring:
- `lang` (1000 points) - Language/locale (e.g., `es`, `ja`)
- `gender` (100 points) - Pronoun gender (`m`/`f`/`x`)
- `form` (50 points) - Formality level (casual → honorific)
- Custom (10 points) - User-defined dimensions

**Tiebreaker**: When scores equal, prefer paths with fewer "extra variants" (variants in path but not in context).

**File naming**: `strings:es:formal.jsön` (colon-separated, order-independent)

#### Translation CLI

**Why Ollama instead of cloud APIs?**
- Privacy-first (no data leaves machine)
- Zero API costs
- GDPR-friendly
- Offline capable

**Batch translation**: All strings in one API call (faster, better LLM context)

**Formality support**: Language-specific guidance (Japanese keigo, Korean jondaemal, German Sie/du)

### Common Tasks

**Run tests:**
```bash
bun test
```

**Build library:**
```bash
bun run build
# Verifies bundle size < 20 kB per constitution
```

**Translate a file:**
```bash
bun tools/translate/index.ts strings.jsön --to es --form formal
# Creates: strings:es:formal.jsön
```

**Run examples:**
```bash
bun examples/file-loader-i18n.ts
```

### What's Complete ✅

**Core Library** (v0.2.0-v0.2.1):

- ✅ Expression evaluation with caching and cycle detection
- ✅ Variant system (language, gender, formality)
- ✅ File loader with variant-aware resolution
- ✅ Translation CLI (`json-translate`) with Ollama
- ✅ Pronoun helpers for i18n

**Plugin Ecosystem** (v0.3.0-v0.5.0):

- ✅ **Zod plugin** - Runtime validation (Phase 2, v0.3.0)
- ✅ **SurrealDB plugin** - Database integration (Phase 3, v0.4.0)
- ✅ **Pinia Colada plugin** - Vue 3 data fetching (Phase 4, v0.5.0)

### Deferred Features 🔜

**Future Plugins** (see [ROADMAP.md](../ROADMAP.md)):

- **TanStack Query plugin** - Multi-framework React/Vue/Svelte/Solid/Angular (deferred, implementation available in `__DRAFT__`)
- **Framework composables** - Vue/React hooks for reactive queries

**Core Features**:

- URL loader (HTTP/HTTPS file loading)
- Cloud translation providers (AWS, GCP, Azure)
- Translation memory/caching
- Glossary support for terminology
- Batch file translation (glob patterns)

### Release Plan

**Current state**: v0.6.0-design - **Design phase complete, ready for Phase 6 implementation**

**Completed phases** (see [ROADMAP.md](../ROADMAP.md)):

1. ✅ Phase 1 (v0.2.x): Core + i18n - COMPLETE
2. ✅ Phase 2 (v0.3.0): Zod plugin - COMPLETE
3. ✅ Phase 3 (v0.4.0): SurrealDB plugin - COMPLETE
4. ✅ Phase 4 (v0.5.0): Pinia Colada plugin - COMPLETE
5. ✅ Phase 6 (v0.6.0-design): Storage providers & permissions design - COMPLETE
6. 🔜 Phase 6 (v0.6.0-v1.0.0): Implementation in 5 sub-phases

**Phase 6 Implementation Roadmap** (v0.6.0 → v1.0.0):

- **v0.6.0**: Storage provider foundation (FileLoader save/list/delete)
- **v0.7.0**: SurrealDBLoader + permission detection (table-level)
- **v0.8.0**: LIVE query integration + real-time sync
- **v0.9.0**: Field-level permissions + `surql-to-zod` CLI tool
- **v1.0.0**: Vue composables + production examples

**Next steps**:

1. 🏗️ Implement v0.6.0 (FileLoader enhancements)
2. 🏗️ Implement v0.7.0 (SurrealDBLoader + permissions)
3. 🏗️ Implement v0.8.0 (LIVE queries)
4. 🏗️ Implement v0.9.0 (Field permissions + CLI)
5. 📦 Release v1.0.0 to npm

To publish v1.0.0 (when implementation complete):

```bash
# 1. Ensure tests pass
bun test  # Should show all tests passing

# 2. Build and verify bundle size
bun run build  # Core should be ~18-20 kB

# 3. Update version to 1.0.0
# Edit package.json version field

# 4. Publish (requires npm credentials)
npm publish --access public

# 5. Create and push tag
git tag v1.0.0
git push origin v1.0.0
```

### Memory Files

This directory contains detailed design documentation:

**Phase 6 Design Documents** (v0.6.0-design):
- `surrealdb-vue-vision.md` - Grand vision for SurrealDB + Vue integration
- `integration-patterns.md` - 30+ production-ready integration patterns
- `storage-providers-design.md` - StorageProvider interface, SurrealDBLoader, FileLoader
- `permissions-and-zod-integration.md` - Table-level permissions, Zod integration
- `field-level-permissions-design.md` - Granular field-level permission detection
- `surql-to-zod-inference.md` - Auto-generate Zod schemas from .surql files

**Core Design Documents**:
- `constitution.md` - Project principles and constraints
- `variant-system-design.md` - Variant resolution algorithm
- `translation-cli-design.md` - CLI architecture and rationale
- `variant-aware-file-loading.md` - File loader implementation
- `filesystem-plugin-design.md` - Original plugin concept
- `path-resolution-design.md` - Path resolution patterns
- `self-reference-core-feature.md` - Self-reference handling

These files capture **why** decisions were made, not just **what** was implemented.

### Context for AI Sessions

When starting a new AI session, provide this context:

```
This is the @orbzone/dotted-json library (JSÖN).

Key facts:
- Version: 0.6.0-design (design phase complete)
- Status: 210/210 tests passing, 18.18 kB bundle
- Recent work: Phase 6 design complete - Storage providers & advanced permissions (6 design docs, ~4,000+ lines)

Please read:
- .specify/README.md (this file)
- .specify/memory/constitution.md (project principles)
- ROADMAP.md (current phase: v0.6.0-design, implementation plan for v0.6.0-v1.0.0)
- CHANGELOG.md (full version history including v0.6.0-design)

Phase 6 Design Documents (read for implementation):
- storage-providers-design.md - StorageProvider interface, SurrealDBLoader
- permissions-and-zod-integration.md - Permission detection, Zod integration
- field-level-permissions-design.md - Field-level permission granularity
- surql-to-zod-inference.md - Auto-generate Zod from .surql schemas
- surrealdb-vue-vision.md - Grand vision
- integration-patterns.md - 30+ production patterns

Current state: Design phase complete, ready to begin v0.6.0 implementation (FileLoader enhancements).

**Monorepo Migration**: Planned for v2.0.0 after v1.0.0 stable release. Will restructure as Bun workspace monorepo with @orbzone/dotted-json (packages/dotted - core engine), @orbzone/surrounded (packages/surrounded - SurrealDB framework), and @orbzone/aeonic (packages/aeonic - opinionated AEON schema framework). Strategy: stabilize v1.0 API first, then migrate to monorepo with independent package versioning.
```

### Contributing

See root `CONTRIBUTING.md` for contribution guidelines.

Key principles:
- **TDD**: Write tests first (per constitution)
- **Bundle limit**: Core must stay under 20 kB
- **Memory files**: Document significant design decisions in `.specify/memory/`
- **Changelog**: Update `CHANGELOG.md` for user-facing changes

---

**Last updated**: 2025-10-06 (v0.6.0-design - Phase 6 design complete, 6 comprehensive design documents created)
