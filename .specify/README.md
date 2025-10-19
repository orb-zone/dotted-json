# Project Specification & Memory

This directory contains design documentation, memory files, and context for understanding the dotted-json (jsön) project.

## Quick Start for New Sessions

This is the **@orb-zone/dotted-json** library - dynamic JSON data expansion using dot-prefixed property keys as expression triggers.

### Current Status (v0.12.1)

- **Version**: 0.12.1 (production-ready)
- **Bundle**: 18.20 kB (within 20 kB constitution limit)
- **Tests**: 226/226 passing (all tests green)
- **Status**: Changesets automation implemented with official action, JSR version syncing active, production-ready

### Recent Work

**v0.12.1** (Current - 2025-10-17):

1. **JSR Version Sync**: Automated jsr.json version syncing with package.json during changesets workflow
2. **Workflow Fix**: Checkout main branch in JSR publish workflow for proper tagging
3. **Quality Metrics**: 226/226 tests passing, 18.20 kB bundle size (91% of limit)

**v0.12.0** (2025-10-17):

1. **Custom Resolvers**: Support for custom resolvers in variant resolution via `customResolvers` option
2. **Changesets v1**: Refactored to use official `changesets/action@v1` for cleaner, more maintainable releases
3. **Workflow Improvements**: Better documentation, resolved org-level GitHub Actions restrictions
4. **Quality**: All workflows now use industry-standard changesets action

**v0.11.0** (2025-10-16):

1. **CLI Rename**: `json-translate` → `dotted-translate` for brand alignment (BREAKING CHANGE)
2. **Example Fixes**: Fixed 5 critical bugs in example files (file-inheritance, basic-usage, feature-flag-manager, etc.)
3. **Changesets Automation**: Implemented automated release workflow with Version Packages PR pattern
4. **Documentation Audit**: Comprehensive review with specialized agents, fixed 5 critical issues

**v0.10.1** (2025-10-15):

1. **JSR Compliance**: Added explicit return types for JSR "fast types" requirement
2. **Type Safety**: Improved IDE performance with explicit function return types

**v0.10.0** (2025-10-15):

1. **JSR Cleanup**: Package structure optimized for JSR registry
2. **TanStack Removal**: Removed TanStack Query integration (moved to separate package)

**v0.9.0-v0.9.7** (2025-10-07-08):

1. **Production Polish**: Connection retry logic, enhanced error messages, performance metrics
2. **Documentation**: i18n Translation Editor example, integration test utilities, performance guide
3. **Feature Flags**: Complete feature flag guide (500+ lines), real-world examples
4. **Getting Started**: 400-line tutorial, README restructure (860→459 lines)
5. **Markdown Linting**: Compliance with MD022/MD031/MD040/MD032, constitutional standards

**v0.8.0** (2025-10-07):

1. **LIVE Queries**: Real-time document synchronization with SurrealDB LIVE SELECT
2. **Cache Invalidation**: Automatic cache updates on LIVE query events
3. **Unified Plugin**: `withSurrealDBPinia` combining SurrealDB + Pinia Colada
4. **Real-time Examples**: Config manager with instant propagation

**v0.7.0** (2025-10-07):

1. **SurrealDBLoader**: High-performance storage provider with array-based Record IDs
2. **Performance**: 10-100x faster queries via range scans vs WHERE clauses
3. **Ion Naming**: Aligned with AEON model architecture
4. **TypeScript Codegen**: `surql-to-ts` CLI tool for generating types from schemas

**v0.6.0** (2025-10-07):

1. **Storage Providers**: Unified `StorageProvider` interface for persistence
2. **FileLoader CRUD**: save(), list(), delete() methods with merge strategies
3. **Zod Validation**: Optional schema validation on save operations
4. **25 New Tests**: Complete CRUD test coverage (209 total tests passing)

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
4. **Translation CLI**: Local Ollama-powered translation tool (`dotted-translate`)

### Essential Reading

If starting a new session, read these files in order:

1. **`memory/constitution.md`** - Project principles, constraints (20 kB bundle limit, TDD, JSöN capitalization)
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
│   └── translate/            # Translation CLI (dotted-translate)
│       ├── index.ts          # CLI entry point
│       ├── providers/ollama.ts # Ollama LLM provider
│       └── utils/file-output.ts # File I/O utilities
├── test/
│   ├── unit/                 # 190 passing tests
│   └── fixtures/             # Test data files
└── examples/                 # 5 working examples

Package exports:
- @orb-zone/dotted-json                     # Core library
- @orb-zone/dotted-json/loaders/file        # File loader (separate to keep core small)
- @orb-zone/dotted-json/plugins/zod         # Zod validation plugin (v0.3.0)
- @orb-zone/dotted-json/plugins/surrealdb   # SurrealDB integration (v0.4.0)
- @orb-zone/dotted-json/plugins/pinia-colada # Pinia Colada data fetching (v0.5.0)

Global CLI:
- dotted-translate               # Translation tool (via npm install -g)
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
- ✅ Translation CLI (`dotted-translate`) with Ollama
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

**Current state**: v0.12.1 - **Production-ready with automated changesets workflow**

**Completed phases** (see [ROADMAP.md](../ROADMAP.md)):

1. ✅ Phase 1 (v0.2.x): Core + i18n - COMPLETE
2. ✅ Phase 2 (v0.3.0): Zod plugin - COMPLETE
3. ✅ Phase 3 (v0.4.0): SurrealDB plugin - COMPLETE
4. ✅ Phase 4 (v0.5.0): Pinia Colada plugin - COMPLETE
5. ✅ Phase 6 (v0.6.0-v0.9.7): Storage providers, SurrealDB, LIVE queries, production polish - COMPLETE
6. ✅ Phase 7 (v0.10.0-v0.12.1): JSR publishing, changesets automation - COMPLETE
7. 🔜 Phase 8 (v1.0.0): Official production release declaration

**Phase 6-7 Achievements** (v0.6.0 → v0.12.1):

- **v0.6.0**: Storage provider foundation (FileLoader CRUD) ✅
- **v0.7.0**: SurrealDBLoader with 10-100x performance boost ✅
- **v0.8.0**: LIVE query integration + real-time sync ✅
- **v0.9.0-v0.9.7**: Production polish + comprehensive docs ✅
- **v0.10.0-v0.10.1**: JSR registry publishing ✅
- **v0.11.0**: Changesets automation, CLI rename ✅
- **v0.12.0-v0.12.1**: Official changesets action, JSR version sync ✅

**Next steps**:

1. 🔜 Polish remaining documentation gaps
2. 📦 Declare v1.0.0 production release
3. 🚀 Publish to npm registry (currently JSR-only)
4. 🌟 Gather production feedback and case studies

**Modern Release Process** (v0.11.0+):

Uses [changesets](https://github.com/changesets/changesets) for automated releases:

```bash
# 1. Create changeset during feature development
bun run changeset:add

# 2. Merge PR with changeset to main
# → GitHub Actions creates "Version Packages" PR automatically

# 3. Review and merge "Version Packages" PR
# → Automatically publishes to JSR registry
# → Creates git tags
# → Updates CHANGELOG.md

# No manual version bumps, no manual publishing!
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
This is the @orb-zone/dotted-json library (JSöN).

Key facts:
- Version: 0.11.0 (pre-release)
- Status: 226/226 tests passing, 18.20 kB bundle
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

**Monorepo Migration**: Planned for v2.0.0 after v1.0.0 stable release. Will restructure as Bun workspace monorepo with @orb-zone/dotted-json (packages/dotted - core engine), @orb-zone/surrounded (packages/surrounded - SurrealDB framework), and @orb-zone/aeonic (packages/aeonic - opinionated AEON schema framework). Strategy: stabilize v1.0 API first, then migrate to monorepo with independent package versioning.
```

### Contributing

See root `CONTRIBUTING.md` for contribution guidelines.

Key principles:
- **TDD**: Write tests first (per constitution)
- **Bundle limit**: Core must stay under 20 kB
- **Memory files**: Document significant design decisions in `.specify/memory/`
- **Changelog**: Update `CHANGELOG.md` for user-facing changes

---

**Last updated**: 2025-10-17 (v0.12.1 - JSR version sync, changesets v1 refactor, documentation update)
