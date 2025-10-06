# Project Specification & Memory

This directory contains design documentation, memory files, and context for understanding the dotted-json (jsön) project.

## Quick Start for New Sessions

This is the **@orbzone/dotted-json** library - dynamic JSON data expansion using dot-prefixed property keys as expression triggers.

### Current Status (v0.2.0)

- **Version**: 0.2.0 (tagged, not published to npm yet)
- **Bundle**: 18.02 kB (within 20 kB constitution limit)
- **Tests**: 190/193 passing (100% production code coverage)
- **Status**: Feature-complete, ready for future npm publish

### Recent Work

Completed in this version:
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

**Deferred features** (documented in memory files):
- URL loader (HTTP/HTTPS file loading)
- Cloud translation providers (AWS, GCP, Azure)
- Translation memory/caching
- Glossary support for terminology
- Batch file translation (glob patterns)

**Why deferred?**
- Not critical for v0.2.0
- Can be added later without breaking changes
- Local-only approach is differentiating feature

### Release Plan

**Current state**: Ready but **not published** to npm yet

To publish (when ready):
```bash
# 1. Ensure tests pass
bun test

# 2. Build
bun run build

# 3. Publish (requires npm credentials)
npm publish --access public

# 4. Push tag
git push origin v0.2.0
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

**Last updated**: 2025-10-06 (v0.2.0 release)
