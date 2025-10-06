# Project Specification & Memory

This directory contains design documentation, memory files, and context for understanding the dotted-json (jsön) project.

## Quick Start for New Sessions

This is the **@orbzone/dotted-json** library - dynamic JSON data expansion using dot-prefixed property keys as expression triggers.

### Current Status (v0.3.0)

- **Version**: 0.3.0 (tagged, not published to npm yet)
- **Bundle**: 18.18 kB (within 20 kB constitution limit)
- **Tests**: 198/201 passing (+8 new Zod plugin tests)
- **Status**: Zod validation plugin complete, following ROADMAP Phase 2

### Recent Work

**v0.3.0** (Current):
1. **Zod Plugin**: Runtime type validation with path and resolver schemas
2. **Plugin Architecture**: ValidationOptions interface, core integration
3. **Test Suite**: 8 comprehensive Zod tests, all passing
4. **ROADMAP.md**: Complete product roadmap for plugin ecosystem

**v0.2.0-0.2.1** (Previous):
1. **Core Library**: Expression evaluation, caching, cycle detection
2. **Variant System**: Language, gender, formality variants with automatic resolution
3. **File Loader**: Variant-aware filesystem loading with security
4. **Translation CLI**: Local Ollama-powered translation tool (`json-translate`)

### Essential Reading

If starting a new session, read these files in order:

1. **`memory/constitution.md`** - Project principles, constraints (20 kB bundle limit, TDD)
2. **`CHANGELOG.md`** (root) - Full feature list for v0.2.0
3. **`memory/variant-system-design.md`** - Variant scoring, tiebreaker logic, formality rationale
4. **`memory/translation-cli-design.md`** - Privacy-first design, batch translation, prompting
5. **`memory/variant-aware-file-loading.md`** - File loader architecture, security, caching

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
- @orbzone/dotted-json           # Core library
- @orbzone/dotted-json/loaders/file  # File loader (separate to keep core small)
- @orbzone/dotted-json/plugins/zod   # Zod validation plugin (v0.3.0)

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

### What's NOT Done Yet

**Plugin Ecosystem** (documented in [ROADMAP.md](../ROADMAP.md)):
- **Zod plugin** - Runtime validation (Phase 2, v0.3.0)
- **SurrealDB plugin** - Database integration (Phase 3, v0.4.0)
- **Pinia Colada plugin** - Vue 3 data fetching (Phase 4, v0.5.0)
- **TanStack Query plugin** - Multi-framework React/Vue/Svelte/Solid/Angular (Phase 5, v0.6.0)
- **Framework composables** - Vue/React hooks for reactive queries

**Core deferred features** (documented in memory files):
- URL loader (HTTP/HTTPS file loading)
- Cloud translation providers (AWS, GCP, Azure)
- Translation memory/caching
- Glossary support for terminology
- Batch file translation (glob patterns)

**Why plugin ecosystem is priority:**
- The `__DRAFT__` folder contains fully designed plugin architecture (115 tests, 5 integration guides)
- Enables Vue/React adoption via familiar query libraries
- Database integration is unique differentiator
- See [ROADMAP.md](../ROADMAP.md) for complete plan

### Release Plan

**Current state**: v0.3.0 with Zod plugin, **not published** to npm yet

**Next steps** (see [ROADMAP.md](../ROADMAP.md)):
1. ✅ Phase 2 (v0.3.0): Zod plugin - COMPLETE
2. 🎯 Phase 3 (v0.4.0): SurrealDB plugin - Next
3. 🔜 Phase 4 (v0.5.0): Pinia Colada plugin
4. 🔜 Phase 5 (v0.6.0): TanStack plugin
5. 📦 Publish to npm when ready

To publish (when ready):
```bash
# 1. Ensure tests pass
bun test

# 2. Build
bun run build

# 3. Publish (requires npm credentials)
npm publish --access public

# 4. Push tag
git push origin v0.2.2
```

### Memory Files

This directory contains detailed design documentation:

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
This is the @orbzone/dotted-json library (jsön).

Key facts:
- Version: 0.2.0 (tagged, not published yet)
- Status: 190/193 tests passing, 18.02 kB bundle
- Recent work: Variant system + File loader + Translation CLI

Please read:
- .specify/README.md (this file)
- .specify/memory/constitution.md (project principles)
- .specify/memory/variant-system-design.md (variant scoring)
- .specify/memory/translation-cli-design.md (CLI rationale)
- CHANGELOG.md (what's been built)

Current state: Feature-complete for v0.2.0, ready for future npm publish.
```

### Contributing

See root `CONTRIBUTING.md` for contribution guidelines.

Key principles:
- **TDD**: Write tests first (per constitution)
- **Bundle limit**: Core must stay under 20 kB
- **Memory files**: Document significant design decisions in `.specify/memory/`
- **Changelog**: Update `CHANGELOG.md` for user-facing changes

---

**Last updated**: 2025-10-06 (v0.2.1 - documentation improvements)
