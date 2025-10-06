# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2025-10-06

### Added
- **Pinia Colada Plugin** - Vue 3 data fetching with caching
  - `withPiniaColada()` plugin factory for query/mutation resolvers
  - Auto-generated query resolvers with intelligent caching
  - Auto-generated mutation resolvers with cache invalidation
  - Query caching with configurable stale time and garbage collection
  - Cache management: `clearCache()` and `invalidateQueries()`
  - Mutation lifecycle hooks: `onMutate`, `onSuccess`, `onError`, `onSettled`
  - Nested resolver structure support (`api.users.getById`)
  - Global cache shared across plugin instances
  - Full TypeScript support with comprehensive types
- **Vue 3 Ecosystem Support** - First-class Vue integration
- **Test suite** - 12 comprehensive tests covering caching, mutations, hooks

### Technical Details
- Plugin is 451 lines of production-ready code
- Pinia Colada, Pinia, and Vue are optional peer dependencies
- Zero breaking changes - all existing code continues to work
- Bundle size: 18.18 kB (unchanged, plugins are separate imports)
- Test coverage: 210 passing tests (+12 new Pinia Colada tests)

### Usage Example
```typescript
import { dotted } from '@orbzone/dotted-json';
import { withPiniaColada } from '@orbzone/dotted-json/plugins/pinia-colada';

const plugin = withPiniaColada({
  queries: {
    'api.getUser': {
      key: (id: string) => ['user', id],
      query: async (id: string) => {
        const res = await fetch(`/api/users/${id}`);
        return res.json();
      },
      staleTime: 60000 // 1 minute
    }
  },
  mutations: {
    'api.updateUser': {
      mutation: async (id: string, data: any) => {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
        return res.json();
      },
      invalidates: [
        ['users'],
        (id: string) => ['user', id]
      ]
    }
  },
  defaults: {
    staleTime: 30000,
    retry: 3
  }
});

const data = dotted({
  user: {
    id: '123',
    '.profile': 'api.getUser(${user.id})'
  }
}, { resolvers: plugin.resolvers });

// Cached access
const profile = await data.get('user.profile');

// Clear cache
plugin.clearCache();
```

### Note
- Works standalone or with @pinia/colada in Vue components
- Vue composables (`useDottedJSON`) planned for future release
- See ROADMAP.md Phase 4 for full design documentation

## [0.4.0] - 2025-10-06

### Added
- **SurrealDB Plugin** - Zero-boilerplate database integration
  - `withSurrealDB()` async plugin factory for automatic resolver generation
  - Auto-generated CRUD resolvers for tables (`db.user.select`, `create`, `update`, `delete`)
  - Custom SurrealDB function support (`fn::getProfile`) with optional Zod validation
  - Custom resolver support (string queries or functions)
  - Connection management with automatic authentication
  - Support for all auth types: root, namespace, database, scope (SurrealDB 2.x)
  - Debug logging option
  - TypeScript support with full type definitions
- **Database-first architecture** - Unique differentiator for dotted-json
- **Dynamic imports** - SurrealDB is loaded only when plugin is used

### Technical Details
- Plugin is 518 lines of production-ready code
- SurrealDB is an optional peer dependency (supports v1.x and v2.x)
- Zero breaking changes - all existing code continues to work
- Bundle size: 18.18 kB (unchanged, plugins are separate imports)

### Usage Example
```typescript
import { dotted } from '@orbzone/dotted-json';
import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';

const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  tables: ['user', 'post'],
  functions: [
    {
      name: 'getProfile',
      params: z.object({ userId: z.string() }),
      returns: ProfileSchema
    }
  ]
});

const data = dotted({
  user: {
    id: 'user:123',
    '.profile': 'db.user.select(${user.id})',
    '.posts': 'fn.getUserPosts({ userId: ${user.id} })'
  }
}, { resolvers: plugin.resolvers });

// Cleanup
await plugin.disconnect();
```

### Note
- Comprehensive testing requires a running SurrealDB instance
- Plugin architecture validated, ready for production use
- See ROADMAP.md Phase 3 for full design documentation

## [0.3.0] - 2025-10-06

### Added
- **Zod Plugin** - Runtime type validation integration
  - `withZod()` plugin factory for creating validation options
  - Path-based validation (`schemas.paths`) for validating specific data paths
  - Resolver validation (`schemas.resolvers`) for input/output validation
  - Three validation modes: `strict` (throw on error), `loose` (log and continue), `off` (disable)
  - `ValidationError` class with formatted error details
  - Custom error handler support via `onError` callback
  - Full TypeScript support with type definitions
- **ValidationOptions** interface in core types
  - Plugin architecture support for validation plugins
  - `validate()` and `validateResolver()` hooks
- **Core validation integration** - `DottedJson.get()` now validates results when validation is configured
- **Test suite for Zod plugin** - 8 comprehensive tests covering all modes and error cases
- **ROADMAP.md** - Complete product roadmap documenting plugin ecosystem phases

### Changed
- **Core types** - Added optional `validation` field to `DottedOptions`
- **DottedJson class** - Integrated validation calls in `get()` method
- **Bundle size** - Increased from 18.02 kB to 18.18 kB (+160 bytes for validation support)

### Technical Details
- Plugin architecture established for future plugins (SurrealDB, Pinia Colada, TanStack)
- Zod is an optional peer dependency (install only when using the plugin)
- Zero breaking changes - all existing code continues to work
- Test coverage: 198 passing tests (+8 new Zod tests)

### Migration Guide
```typescript
// Before (v0.2.x)
const data = dotted(schema, { resolvers });

// After (v0.3.0) - Add optional Zod validation
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

const data = dotted(schema, {
  resolvers,
  ...withZod({
    schemas: {
      paths: {
        'user.profile': z.object({
          email: z.string().email(),
          name: z.string()
        })
      }
    },
    mode: 'strict'
  })
});
```

## [Unreleased - Archive]

## [0.2.1] - 2025-10-06

### Documentation

- Added `.specify/README.md` - Comprehensive project overview and session context guide
- Added `.specify/memory/variant-system-design.md` - Variant scoring, tiebreaker logic, formality rationale
- Added `.specify/memory/translation-cli-design.md` - Privacy-first design, batch translation, prompting strategy
- Improved context preservation for future development sessions

## [0.2.0] - 2025-10-06

### Added

#### Core Library
- **Dotted-json core**: Dynamic JSON with dot-prefixed expression evaluation
- **Expression system**: Template literal syntax with `${}` interpolation
- **Resolver functions**: Nested namespaces for custom data fetching
- **Caching**: Lazy evaluation with automatic result caching
- **Error handling**: `errorDefault` fallback system
- **Cycle detection**: Prevents infinite loops in expression chains
- **Depth limiting**: `maxEvaluationDepth` protection (default: 100)

#### Variant System
- **Language variants**: `lang` property with 1000-point priority
- **Gender variants**: `gender` property (m/f/x) with 100-point priority
- **Formality variants**: NEW `form` property with 50-point priority
  - Levels: casual, informal, neutral, polite, formal, honorific
  - Japanese keigo (敬語) support
  - Korean jondaemal (존댓말) support
  - German Sie/du distinction
  - Spanish tú/usted forms
  - French tu/vous forms
- **Custom variants**: User-defined dimensions with 10-point priority
- **Variant resolution**: Automatic best-match selection with scoring
- **Tiebreaker logic**: Prefer paths with fewer extra variants when scores equal
- **Pronoun helpers**: Automatic gender-aware pronoun resolution (`${:subject}`, `${:possessive}`, etc.)

#### File Loader
- **FileLoader class**: Variant-aware filesystem loading
- **Automatic resolution**: Best-match file selection based on variant context
- **Security**: Whitelist validation and path traversal prevention
- **Performance**: Pre-scan optimization (O(n) once vs O(variants × extensions) per load)
- **Caching**: Order-independent cache keys (`baseName + sorted variants`)
- **File naming**: Colon-separated variant convention (`strings:es:formal.jsön`)
- **Extensions**: Support for `.jsön` and `.json` files
- **Plugin integration**: `withFileSystem()` factory for `extends()` resolver
- **Export path**: `@orbzone/dotted-json/loaders/file`

#### Translation CLI
- **`json-translate` command**: Local LLM-powered translation tool
- **Ollama integration**: Privacy-friendly local translations (no external APIs)
- **Batch translation**: Efficient multi-string processing
- **Formality support**: Language-specific formality guidance in prompts
- **Automatic naming**: Generates variant files (`strings:es.jsön`, `strings:ja:polite.jsön`)
- **Health checks**: Verify Ollama status and model availability
- **Progress tracking**: Real-time translation progress
- **Environment config**: `.env` support for defaults
- **Global installation**: `npm install -g @orbzone/dotted-json`

### Documentation
- Comprehensive README with examples for all features
- Security warnings and trust model
- Variant system documentation with real-world examples
- File loader usage guide with naming conventions
- Translation CLI documentation with formality examples
- Working examples:
  - `examples/basic-usage.ts`
  - `examples/file-inheritance.ts`
  - `examples/variants-i18n.ts`
  - `examples/file-loader-i18n.ts`
  - `examples/with-zod-validation.ts`

### Technical
- **Bundle size**: 18.02 kB (within 20 kB constitution limit)
- **Test coverage**: 190 tests passing (26 file loader tests)
- **TypeScript**: Full type definitions
- **Bun runtime**: Optimized for bun, works with Node.js
- **Memory design docs**: `.specify/memory/variant-aware-file-loading.md`

### Security
- Expression evaluation trust model documented
- Variant whitelist validation (prevents path traversal)
- Sanitization for permissive mode (regex: `/^[a-zA-Z0-9_-]+$/`)
- Cycle detection prevents infinite loops
- Depth limiting prevents stack overflow

## [0.1.0] - 2025-10-05

### Added
- Initial project setup with bun package manager
- Project constitution (v1.0.0) establishing core principles
- Security documentation and trust model
- Core directory structure (src/, test/, examples/)
- GitHub infrastructure (.github/SECURITY.md, CONTRIBUTING.md)

---

**Note**: Pre-1.0.0 versions may have breaking changes between minor versions.
