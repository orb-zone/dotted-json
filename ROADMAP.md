# dotted-json (jsön) - Product Roadmap

**Current Version**: v0.8.0
**Last Updated**: 2025-10-07
**Status**: Phase 6C complete - Real-time LIVE queries with Pinia Colada integration

---

## 📍 Current State (v0.8.0)

### ✅ AEON/ION Architecture Design Complete

#### Design Documents (2 comprehensive specs)
- [x] **aeon-entity-hierarchy.md** - Complete A-H layer taxonomy (935 lines)
  - Layer definitions (ION, ART, BIO, COG, DOT, ECO, FAD, GEN, HUB)
  - Graph edge patterns and reusability
  - Subdomain architecture (DNS → entity mapping)
  - Inheritance queries and anti-patterns
  - Multi-tenant SaaS use cases

- [x] **aeonic-vision.md** - Framework vision and ecosystem (830 lines)
  - AEON/ION nomenclature and core concepts
  - Web-craft ecosystem (dotted-json → surrounded → aeonic)
  - Full-stack ION flow examples
  - Package relationship diagrams
  - Design principles across all layers

**Status**: Foundation design complete, ready for v2.0.0 monorepo implementation

---

### ✅ Phase 6 Implementation Complete (v0.6.0 - v0.8.0)

#### Storage & Persistence (v0.6.0) ✅
- [x] **StorageProvider Interface** - Unified API for JSÖN document storage
- [x] **FileLoader.save/list/delete** - Full CRUD for filesystem storage
- [x] **Merge Strategies** - Replace, shallow merge, deep merge
- [x] **Zod Validation** - Optional schema validation on save
- [x] **Cache management** - TTL-based caching with auto-invalidation

#### SurrealDB Storage (v0.7.0) ✅
- [x] **SurrealDBLoader** - Full CRUD with array Record IDs (10-100x faster)
- [x] **Array Record ID Strategy** - O(log n) queries vs O(n) table scans
- [x] **Variant-aware resolution** - Load correct i18n document by context
- [x] **All auth types** - Root, namespace, database, scope
- [x] **Ion naming convention** - Aligned with AEON model

#### Real-time Integration (v0.8.0) ✅
- [x] **LIVE SELECT queries** - WebSocket subscriptions with DIFF mode
- [x] **subscribe() method** - Watch ion changes in real-time
- [x] **Automatic cache invalidation** - Instant updates on LIVE events
- [x] **onLiveUpdate callback** - Global change notifications
- [x] **Unified withSurrealDBPinia plugin** - SurrealDB + Pinia Colada
- [x] **Auto-generated resolvers** - db.loadIon(baseName, variants)
- [x] **Production example** - Real-time config manager

#### TypeScript Codegen (v0.7.0) ✅
- [x] **surql-to-ts CLI** - Generate types from schemas
- [x] **Type Mapping** - SurrealDB → TypeScript conversion
- [x] **Parameter Interfaces** - Typed function params
- [x] **Return Types** - Typed function returns
- [x] **Resolver Interface** - Fully typed DBResolvers
- [x] **Zod Schema Generation** - Optional runtime validation
- [x] **Watch Mode** - Auto-regenerate on schema changes

#### Design Documents (12 total)
- [x] `storage-providers-design.md` - 1,200+ lines
- [x] `function-resolver-inference.md` - 800+ lines
- [x] `record-id-variants-design.md` - 600+ lines
- [x] `schema-driven-complete-workflow.md` - 700+ lines
- [x] `permissions-and-zod-integration.md` - 900+ lines
- [x] `field-level-permissions-design.md` - 1,000+ lines
- [x] `surql-to-zod-inference.md` - 800+ lines
- [x] `surrealdb-vue-vision.md` - 450+ lines

#### Implementation Stats
- **Lines of Code**: 3,500+ (loaders, plugins, LIVE queries, type generation)
- **Test Coverage**: 226/226 tests passing ✅
- **Bundle Size**: 18.18 kB / 20.00 kB (within limit) ✅
- **CLI Tools**: 2 (json-translate, surql-to-ts)
- **Examples**: Real-time config manager with LIVE queries

---

## 📍 Implemented Features (v0.5.0)

### ✅ Completed Features

#### Core Library
- [x] **Dynamic JSON expansion** with dot-prefixed expression keys (`.property`)
- [x] **Template literal interpolation** (`${path}`) in expressions
- [x] **Lazy evaluation** with automatic result caching
- [x] **Nested expression expansion** (expressions can return more expressions)
- [x] **Hierarchical defaults** (`.default` and `.errorDefault` system)
- [x] **Async resolver support** with full Promise handling
- [x] **Error context injection** (`${error}`, `${path}` in error handlers)
- [x] **Full TypeScript support** with comprehensive type definitions

#### Advanced Features (v0.2.0+)
- [x] **Variant resolver** - i18n/localization with context-aware variants
- [x] **Pronouns system** - Gender-aware pronoun resolution (7 forms)
- [x] **File loader** - Load JSON/JSÖN files from filesystem
- [x] **Translation CLI** - Command-line tool for locale file management

#### Plugin Ecosystem (v0.3.0 - v0.5.0)
- [x] **Zod plugin** - Runtime validation (v0.3.0)
- [x] **SurrealDB plugin** - Database integration (v0.4.0)
- [x] **Pinia Colada plugin** - Vue 3 data fetching (v0.5.0)

#### Developer Experience
- [x] **210 passing tests** (100% core + plugins)
- [x] **18.18 kB bundle** (within 20 kB target)
- [x] **Comprehensive documentation** (README, CHANGELOG, ROADMAP)
- [x] **Tagged v0.5.0** (ready for npm publish)

### 🟡 Deferred Features (Designed but Deferred)

#### Future Plugins (Optional)
- [ ] **TanStack Query plugin** - Multi-framework data fetching (React, Svelte, Solid, Angular)
  - Design complete in `__DRAFT__/TANSTACK-INTEGRATION.md`
  - 606 lines of implementation ready to port if needed
  - Supports 5 frameworks with unified API
  - **Status**: Deferred - Not needed for current use cases

#### Framework Integration (Future)
- [ ] **Vue composables** - `useDottedJSON()` for reactive queries (optional enhancement)
- [ ] **React hooks** - `useTanstackDottedJSON()` (only if TanStack plugin added)
- [ ] **Svelte stores** - Reactive stores integration (only if TanStack plugin added)
- [ ] **Solid primitives** - Reactive primitives integration (only if TanStack plugin added)
- [ ] **Angular signals** - Signals integration (only if TanStack plugin added)

---

## 🎯 Vision & Goals

### Design Philosophy (from __DRAFT__)

The `__DRAFT__` folder contains a **fully designed plugin architecture** (v1.0-v1.5) with:
- ✅ Complete implementation of 4 major plugins
- ✅ 115 passing tests across all features
- ✅ Comprehensive documentation (5 integration guides)
- ✅ Production-ready examples
- ✅ Multi-framework support (React, Vue, Svelte, Solid, Angular)

**Goal**: Port this proven design into the refactored v0.2.1 codebase following TDD principles.

### Success Criteria

#### Technical Excellence
- [ ] **100% test coverage** for all plugins
- [ ] **Bundle size** < 25 kB (core + all plugins)
- [ ] **Zero breaking changes** from v0.2.1
- [ ] **TypeScript-first** with full type inference

#### Developer Experience
- [ ] **Plugin installation** as simple as `bun add @orbzone/dotted-json`
- [ ] **Optional peer dependencies** (install only what you need)
- [ ] **Clear migration paths** between plugins (Pinia Colada ↔ TanStack)
- [ ] **Production examples** for all frameworks

#### Market Positioning
- [ ] **Vue adoption** via Pinia Colada integration
- [ ] **React adoption** via TanStack Query integration
- [ ] **Multi-framework** support for monorepo teams
- [ ] **Database-first** developers via SurrealDB integration

---

## 📅 Release Plan

### Phase 1: Core Stabilization (v0.2.x) ✅ COMPLETE

**Goal**: Production-ready core library with i18n/localization features

- [x] v0.2.0 - Variant resolver + pronouns + file loader + translation CLI
- [x] v0.2.1 - Documentation improvements + design memory

**Deliverables**:
- [x] 190/190 tests passing
- [x] < 20 kB bundle size
- [x] Comprehensive README
- [x] Translation CLI tool

---

### Phase 2: Validation Layer (v0.3.0) ✅ COMPLETE

**Goal**: Runtime type safety with Zod integration

**Completed**: 2025-10-06
**Reference**: `__DRAFT__/ZOD-INTEGRATION.md`

#### Features
- [x] Core plugin: `src/plugins/zod.ts`
- [ ] `withZod()` plugin factory
- [ ] Path-based schema validation
- [ ] Resolver input/output validation
- [ ] Multiple validation modes (strict/loose/off)
- [ ] Enhanced error messages
- [ ] TypeScript inference from Zod schemas

#### Implementation Results
- [x] Ported to `src/plugins/zod.ts` (285 lines)
- [x] Test suite created (8 tests passing)
- [x] Documented in CHANGELOG
- [x] Peer dependency configured (zod ^3.0.0, optional)
- [x] Bundle size verified (18.18 kB, +160 bytes)

#### Success Metrics
- [x] All tests passing (8 tests)
- [x] Zero breaking changes to core
- [x] Works with existing schemas
- [x] TypeScript types working correctly

**Use Cases**:
- ✅ API response validation (prevent broken external APIs)
- ✅ Gaming state validation (prevent HP < 0 bugs)
- ✅ Database ORM contracts
- ✅ Form validation integration

---

### Phase 3: Database Integration (v0.4.0) ✅ COMPLETE

**Goal**: Zero-boilerplate SurrealDB integration

**Completed**: 2025-10-06
**Reference**: `__DRAFT__/SURREALDB-INTEGRATION.md`

#### Features
- [x] Core plugin: `src/plugins/surrealdb.ts`
- [ ] `withSurrealDB()` async plugin factory
- [ ] Auto-generated CRUD resolvers
- [ ] Custom resolver support (string queries + functions)
- [ ] Live query support (real-time updates)
- [ ] Connection management with retry logic
- [ ] All authentication types (root, namespace, database, scope)
- [ ] SurrealDB custom functions (`fn::`)

#### Implementation Results
- [x] Ported to `src/plugins/surrealdb.ts` (518 lines)
- [x] Full CRUD resolvers implemented
- [x] Custom function support with Zod validation
- [x] All auth types supported (root, namespace, database, scope)
- [x] Documented in CHANGELOG
- [x] Peer dependency configured (surrealdb ^1.0.0 || ^2.0.0, optional)
- [x] Bundle size verified (18.18 kB unchanged)

#### Deferred Features (Future)
- [ ] Live queries (requires running database for testing)
- [ ] Transaction support
- [ ] Batch operations
- [ ] Connection pooling
- [ ] Schema introspection from `DEFINE FUNCTION`

#### Success Metrics
- [x] Core functionality implemented
- [x] Works with SurrealDB v1.x and v2.x
- [x] Zero breaking changes
- [x] Bundle size target met

**Use Cases**:
- ✅ Real-time dashboards
- ✅ Gaming backends
- ✅ Admin panels with CRUD
- ✅ Type-safe database layer

---

### Phase 4: Vue Data Fetching (v0.5.0) ✅ COMPLETE

**Goal**: Vue 3 composables with Pinia Colada caching

**Completed**: 2025-10-06
**Reference**: `__DRAFT__/PINIA-COLADA-INTEGRATION.md`

#### Features
- [x] Core plugin: `src/plugins/pinia-colada.ts`
- [ ] `withPiniaColada()` plugin factory
- [ ] Auto-generated query resolvers
- [ ] Auto-generated mutation resolvers
- [ ] Cache invalidation patterns
- [ ] Request deduplication
- [ ] Vue composable: `src/composables/useDottedJSON.ts`
- [ ] SSR support (Nuxt compatibility)

#### Implementation Results
- [x] Ported to `src/plugins/pinia-colada.ts` (451 lines)
- [x] Test suite created (12 tests passing)
- [x] Query resolvers with intelligent caching
- [x] Mutation resolvers with lifecycle hooks
- [x] Cache management (clearCache, invalidateQueries)
- [x] Documented in CHANGELOG
- [x] Peer dependencies configured (@pinia/colada, pinia, vue, all optional)
- [x] Bundle size verified (18.18 kB unchanged)

#### Deferred Features (Future)
- [ ] Vue composables (`useDottedJSON`, `useDottedQuery`, `useDottedMutation`)
- [ ] Infinite query support
- [ ] WebSocket/SSE streaming
- [ ] Vue Router data loader integration
- [ ] Nuxt module

#### Success Metrics
- [x] All tests passing (12 tests)
- [x] Works standalone and with Pinia Colada
- [x] Zero breaking changes
- [x] Bundle size target met

**Use Cases**:
- ✅ Vue dashboards with caching
- ✅ Real-time applications
- ✅ Admin panels
- ✅ E-commerce product pages

---

### Phase 5: Multi-Framework Data Fetching (v0.6.0+) 🟡 DEFERRED

**Goal**: React, Svelte, Solid, Angular support via TanStack Query

**Status**: Deferred - Design complete, implementation available in `__DRAFT__` if needed
**Priority**: Low (not needed for current use cases)
**Reference**: `__DRAFT__/TANSTACK-INTEGRATION.md`

**Decision**: Focusing on Vue 3 ecosystem (Pinia Colada) for personal projects. TanStack plugin can be added later if multi-framework support is needed.

#### Features
- [ ] Core plugin: `src/plugins/tanstack.ts`
- [ ] `withTanstack()` plugin factory with framework detection
- [ ] React hooks: `src/react/useTanstackDottedJSON.ts`
- [ ] Vue composables: `src/vue/useTanstackDottedJSON.ts`
- [ ] Svelte stores: `src/svelte/stores.ts`
- [ ] Solid primitives: `src/solid/primitives.ts`
- [ ] Angular signals: `src/angular/inject.ts`
- [ ] Unified API across all frameworks

#### Implementation Checklist
- [ ] Port `__DRAFT__/src/plugins/tanstack.ts`
- [ ] Port framework adapters:
  - [ ] `__DRAFT__/src/react/useTanstackDottedJSON.ts`
  - [ ] `__DRAFT__/src/vue/useTanstackDottedJSON.ts`
- [ ] Implement Svelte/Solid/Angular adapters
- [ ] Write test suites:
  - [ ] Core plugin tests (20+ tests)
  - [ ] React integration tests (15+ tests)
  - [ ] Vue integration tests (15+ tests)
  - [ ] Cross-framework compatibility tests
- [ ] Create examples:
  - [ ] `examples/tanstack-react.tsx`
  - [ ] `examples/tanstack-vue.vue`
  - [ ] `examples/tanstack-svelte.svelte`
  - [ ] `examples/tanstack-solid.tsx`
  - [ ] `examples/tanstack-angular.ts`
- [ ] Document in README "Framework Integration" section
- [ ] Add peer dependencies (all optional):
  - [ ] `@tanstack/react-query ^5.0.0`
  - [ ] `@tanstack/vue-query ^5.0.0`
  - [ ] `@tanstack/svelte-query ^5.0.0`
  - [ ] `@tanstack/solid-query ^5.0.0`
  - [ ] `@tanstack/angular-query-experimental ^5.0.0`
- [ ] Verify bundle size (< 7 kB)

#### Advanced Features
- [ ] React Suspense support
- [ ] Server Components support (Next.js App Router)
- [ ] Infinite queries
- [ ] Optimistic updates
- [ ] Devtools integration
- [ ] Migration guide from Pinia Colada

#### Success Metrics
- [ ] All tests passing (50+ tests across all frameworks)
- [ ] Works with all 5 frameworks
- [ ] API consistency across frameworks
- [ ] < 7 kB bundle size

**Plugin Selection Guide** (to document):
- **Pinia Colada**: Vue 3 only, lighter (~2kb), Vue-optimized
- **TanStack Query**: Multi-framework, React/Svelte/Solid/Angular, larger (~5-7kb)
- **Recommendation**: Pinia Colada for Vue-only apps, TanStack for multi-framework teams

**Use Cases**:
- ✅ React applications
- ✅ Multi-framework monorepos
- ✅ Framework migration paths
- ✅ Cross-platform consistency

---

## 🗺️ Long-Term Vision (v1.0+)

### v1.0.0 - Stable Release ✅ READY

**Goal**: Production-ready with core plugin ecosystem

**Current Status (v0.5.0)**: Ready for v1.0.0 release!

**Criteria**:
- [x] Core plugins implemented (Zod, SurrealDB, Pinia Colada)
- [x] 210 tests passing
- [x] Documentation complete (README, CHANGELOG, ROADMAP)
- [x] Migration guides in CHANGELOG
- [ ] Published to npm
- [ ] Security audit (optional, can be done after publish)

**Deliverables**:
- [x] Core + 3 plugins (Zod, SurrealDB, Pinia Colada)
- [x] Vue 3 integration (Pinia Colada)
- [x] Comprehensive documentation
- [ ] Production case studies (after publish)

**What's Included in v1.0.0**:
- Core library with i18n/localization (v0.2.x)
- Zod validation plugin (v0.3.0)
- SurrealDB database plugin (v0.4.0)
- Pinia Colada Vue 3 plugin (v0.5.0)

**What's NOT Included** (Future enhancements):
- TanStack Query plugin (deferred)
- React/Svelte/Solid/Angular integrations (deferred)
- Vue composables (optional future enhancement)

---

### Phase 6: Storage Providers & Real-time Integration (v0.6.0 - v0.8.0) ✅ COMPLETE

**Goal**: SurrealDB as single source of truth with real-time LIVE queries

**Started**: 2025-10-06
**Completed**: 2025-10-07
**Status**: All features implemented and tested (226 tests passing)

**References**:
- `.specify/memory/storage-providers-design.md` (1,200+ lines)
- `.specify/memory/function-resolver-inference.md` (Auto-generate resolvers)
- `.specify/memory/record-id-variants-design.md` (10-100x faster queries)
- `.specify/memory/surql-to-zod-inference.md` (800+ lines)
- `.specify/memory/field-level-permissions-design.md` (1,000+ lines)
- `.specify/memory/schema-driven-complete-workflow.md` (Complete end-to-end)
- `.specify/memory/surrealdb-vue-vision.md` (Grand vision)
- `.specify/memory/integration-patterns.md` (30+ patterns)
- `.specify/memory/permissions-and-zod-integration.md` (900+ lines)

**Vision**: Define schema once in `.surql`, auto-generate everything else:
- ✅ Zod schemas (validation)
- ✅ TypeScript types (type safety)
- ✅ Resolvers (runtime execution)
- ✅ Permissions (field-level detection)
- ✅ Storage (variant-aware JSÖN documents)

**Result**: 90% less code, zero type drift, full type safety end-to-end

#### Completed Features

- [x] **Storage Providers Foundation** (v0.6.0)
  - [x] Define `StorageProvider` interface for unified API
  - [x] Enhance `FileLoader` with save capabilities
    - [x] `save()` - Write JSÖN documents to filesystem
    - [x] `list()` - List available documents with variants
    - [x] `delete()` - Remove documents from filesystem
  - [x] Support merge strategies (replace, merge, deep-merge)
  - [x] Optional Zod validation on save
  - [x] Write tests for filesystem save/list/delete
  - [x] Document filesystem storage patterns

- [x] **SurrealDB Storage Provider** (v0.7.0)
  - [x] Implement `SurrealDBLoader` class
  - [x] Design database schema with array Record IDs
    - [x] `ion` table with array-based IDs: `ion:['baseName', 'lang', 'form']`
    - [x] Metadata fields (created_at, updated_at, version)
    - [x] 10-100x faster queries via Record ID ranges
    - [x] Row-level permissions support
  - [x] Implement variant resolution for database queries
  - [x] `load()` - Load documents with variant scoring
  - [x] `save()` - Upsert documents with versioning
  - [x] `list()` - Query documents with filtering
  - [x] `delete()` - Remove documents with permissions check
  - [x] Write comprehensive tests
  - [x] Document SurrealDB storage patterns

- [x] **Real-Time Storage Integration** (v0.8.0)
  - [x] Add LIVE query support to `SurrealDBLoader`
  - [x] `subscribe()` - Listen to document changes
  - [x] Auto-cache invalidation on LIVE updates
  - [x] Integration with Pinia Colada cache
  - [x] Support DIFF mode for efficient updates
  - [x] Document real-time sync patterns
  - [x] Production examples (Real-time config manager)

- [x] **Unified Plugin** (v0.8.0)
  - [x] Core plugin: `src/plugins/surrealdb-pinia.ts`
  - [x] `withSurrealDBPinia()` plugin factory
  - [x] Auto-generate query resolvers from `ions` config
  - [x] `db.loadIon(baseName, variants)` resolver API
  - [x] Smart cache invalidation from LIVE queries
  - [x] Single configuration for database + cache behavior

#### Future Enhancements (v0.9.0+)

- [ ] **Field-Level Permissions** (v0.9.0)
  - [ ] Detect PERMISSIONS clauses in SurrealDB schemas
  - [ ] Generate permission metadata for TypeScript
  - [ ] Runtime permission checks in resolvers

- [ ] **Vue Composables** (v1.0.0)
  - [ ] Create `src/composables/useSurrealQuery.ts`
  - [ ] Create `src/composables/useSurrealMutation.ts`
  - [ ] Integrate with Vue lifecycle (auto cleanup)
  - [ ] Add SSR support (Nuxt compatibility)
  - [ ] Write Vue-specific tests

#### Example API (Unified Plugin)

```typescript
const plugin = await withSurrealDBPinia({
  // SurrealDB connection
  surrealdb: {
    url: 'ws://localhost:8000/rpc',
    namespace: 'app',
    database: 'main',
    auth: { type: 'scope', access: 'user', variables: { /* ... */ } }
  },

  // Auto-generate Pinia Colada queries from tables
  tables: {
    user: { staleTime: 60_000 },
    orders: { staleTime: 30_000 }
  },

  // Custom functions become cached queries/mutations
  functions: [
    {
      name: 'getActiveOrders',
      params: UserIdSchema,
      returns: OrdersSchema,
      cache: { key: (params) => ['active-orders', params.userId], staleTime: 30_000 }
    },
    {
      name: 'cancelOrder',
      mutation: true,
      invalidates: [['active-orders']]
    }
  ],

  // Real-time LIVE queries
  live: {
    enabled: true,
    tables: ['orders', 'notifications'],
    onUpdate: (table, action, data) => {
      // Auto-invalidate cache
      plugin.invalidateQueries([table]);
    }
  }
});
```

#### Implementation Roadmap

**Phase 6A - Storage Providers** (v0.6.0):
1. Define `StorageProvider` interface with standard API
2. Enhance `FileLoader` with save/list/delete methods
3. Add merge strategies and Zod validation
4. Write filesystem storage tests
5. Document storage patterns and use cases

**Phase 6B - SurrealDB Storage** (v0.7.0):
1. Implement `SurrealDBLoader` class
2. Design database schema (`jsön_documents` table)
3. Add variant resolution for DB queries
4. Implement load/save/list/delete operations
5. Write comprehensive tests
6. Document SurrealDB storage patterns

**Phase 6C - Real-Time Integration** (v0.8.0):
1. Add LIVE query support to `SurrealDBLoader`
2. Implement `subscribe()` for document changes
3. Auto-cache invalidation on updates
4. Integration with Pinia Colada
5. Production examples (CMS, i18n editor)

**Phase 6D - Unified Plugin** (v0.9.0):
1. Create `src/plugins/surrealdb-pinia.ts`
2. Auto-generate resolvers from config
3. Implement smart cache management
4. Migration guide from separate plugins
5. Comprehensive integration tests

**Phase 6E - Vue Composables** (v1.0.0):
1. Create Vue-specific composables
2. Add SSR support for Nuxt
3. Write Vue component tests
4. Document composable patterns
5. Production-ready examples

#### Success Metrics
- [ ] Zero-config save to filesystem (FileLoader)
- [ ] Zero-config save to SurrealDB (SurrealDBLoader)
- [ ] Variant resolution works for load + save
- [ ] Real-time sync via LIVE queries
- [ ] Type-safe storage with Zod validation
- [ ] < 5 kB bundle size for storage providers
- [ ] < 5 minutes from install to working storage integration
- [ ] Production examples for 3+ use cases (CMS, i18n, config)

#### Design Documentation

**Storage Providers**:
- See [.specify/memory/storage-providers-design.md](.specify/memory/storage-providers-design.md) for:
  - `StorageProvider` interface specification
  - `SurrealDBLoader` implementation design
  - `FileLoader` save/list/delete enhancements
  - Database schema for JSÖN documents
  - Use cases (CMS, i18n editor, config management, user preferences)
  - Migration patterns from filesystem to database
  - Conflict resolution strategies

**Integration Patterns**:
- See [.specify/memory/integration-patterns.md](.specify/memory/integration-patterns.md) for:
  - Real-time sync patterns (LIVE queries + cache invalidation)
  - Business logic patterns (`fn::` functions + Zod validation)
  - Graph relations patterns (FETCH, edge traversal)
  - Permission model patterns (row-level security, RBAC)
  - Caching strategies (stale-while-revalidate, optimistic updates)
  - Error handling patterns (hierarchical defaults, custom errors)
  - Multi-tenancy patterns (namespace isolation, row filtering)

#### Architecture Benefits

**Traditional Stack**:
```
Frontend → REST API → Business Logic → ORM → Database
```

**SurrealDB + Pinia Stack**:
```
Frontend → SurrealDB (business logic in fn::)
```

**Benefits**:
- ✅ No custom backend needed
- ✅ Type safety end-to-end (Zod + TypeScript)
- ✅ Real-time by default (LIVE queries)
- ✅ Intelligent caching (Pinia Colada)
- ✅ Security at DB level (permissions)
- ✅ ~120-170 kB bundle savings vs traditional stack

**Use Cases**:
- ✅ Real-time dashboards (live data sync)
- ✅ Admin panels with CRUD operations
- ✅ Gaming backends (leaderboards, player state)
- ✅ Collaborative apps (multi-client sync)
- ✅ E-commerce (product catalogs, cart state)
- ✅ CMS / Content Management (save/edit JSÖN documents)
- ✅ i18n Translation Editor (edit translations in real-time)
- ✅ Configuration Management (app settings, feature flags)
- ✅ User Preferences (per-user stored documents)

---

### Future Enhancements (v1.1+)

#### Framework Integrations (Deferred)
- [ ] **TanStack Query plugin** - Multi-framework support (React, Svelte, Solid, Angular)
  - Implementation ready in `__DRAFT__/src/plugins/tanstack.ts` (606 lines)
  - Documentation ready in `__DRAFT__/TANSTACK-INTEGRATION.md`
  - Can be added when multi-framework support is needed

#### Plugin Ecosystem Expansion
- [ ] **GraphQL plugin** - GraphQL query integration
- [ ] **tRPC plugin** - Type-safe RPC integration
- [ ] **Prisma plugin** - ORM integration
- [ ] **Supabase plugin** - Supabase backend integration
- [ ] **Firebase plugin** - Firebase integration

#### Advanced Features
- [ ] **Middleware system** - Transform/intercept resolvers
- [ ] **Cache strategies** - LRU, TTL, custom eviction
- [ ] **WebSocket streaming** - Real-time data streams
- [ ] **Batch operations** - Batch multiple expressions
- [ ] **Parallel execution** - Evaluate independent expressions in parallel

#### Developer Tools
- [ ] **VSCode extension** - Syntax highlighting for `.property` keys
- [ ] **Visual schema editor** - GUI for building schemas
- [ ] **Debug mode** - Trace expression evaluation
- [ ] **DevTools integration** - Browser devtools panel

#### Performance
- [ ] **Performance benchmarks** vs lodash/get, JSONPath, etc.
- [ ] **Bundle size optimization** - Tree-shaking improvements
- [ ] **Browser compatibility** - IE11 polyfills (if needed)
- [ ] **CDN builds** - UMD builds for <script> tags

#### Framework Support
- [ ] **Vue 2 backport** - Via @vue/composition-api
- [ ] **Nuxt module** - First-class Nuxt support
- [ ] **Next.js plugin** - App Router integration
- [ ] **SvelteKit integration** - Load functions
- [ ] **Remix integration** - Loader functions

#### Integrations
- [ ] **React Hook Form** - Form validation
- [ ] **Formik** - Form state management
- [ ] **VeeValidate** - Vue form validation
- [ ] **Vue Router** - Data preloading
- [ ] **React Router** - Loader functions

---

## 📋 Implementation Strategy

### Phase-by-Phase Approach ✅ COMPLETE

#### ✅ Phase 1: Foundation (v0.2.x) - DONE
- Core library refactored
- i18n/localization features
- Translation tooling
- Comprehensive tests

#### ✅ Phase 2-4: Plugin Ecosystem (v0.3.0 - v0.5.0) - DONE
**Strategy Used**: Ported from `__DRAFT__` following best practices

**Results**:
1. ✅ **Zod Plugin** (v0.3.0) - 285 lines, 8 tests
2. ✅ **SurrealDB Plugin** (v0.4.0) - 518 lines
3. ✅ **Pinia Colada Plugin** (v0.5.0) - 451 lines, 12 tests

**Total**: 1,254 lines of production code, 20 new tests

**Key Principles Applied**:
- ✅ **Zero breaking changes** - All plugins are opt-in
- ✅ **Bundle optimization** - Core stays at 18.18 kB
- ✅ **Peer dependencies** - All optional, install what you need
- ✅ **TypeScript-first** - Full type safety and inference

#### 🟡 Phase 5: Multi-Framework (v0.6.0+) - DEFERRED
**Decision**: TanStack plugin deferred to focus on Vue 3 ecosystem
**Status**: Design and implementation available in `__DRAFT__` if needed later

---

## 🎓 Learning from __DRAFT__

### What Worked Well ✅

1. **Plugin Architecture** - Clean separation of concerns
2. **Comprehensive Docs** - Each plugin has detailed integration guide
3. **Real Examples** - Production-ready code samples
4. **Multi-Framework** - Consistent API across frameworks
5. **TDD Approach** - Tests drove the design

### What to Improve 🔄

1. **Bundle Size** - Draft hit ~8.57 kB core, target < 20 kB total
2. **Monorepo Overhead** - Draft had workspace dependencies, refactor removed
3. **Test Organization** - Separate unit tests from integration tests
4. **Documentation** - Consolidate into main README vs separate MD files

### Design Decisions to Preserve 🔒

1. **Lazy Evaluation** - Only evaluate expressions when accessed
2. **Caching Strategy** - Dot-prefixed keys preserved, plain keys for cache
3. **Template Literals** - `${path}` syntax is intuitive
4. **Resolver Pattern** - Clean function registry
5. **Error Handling** - Hierarchical `.errorDefault` system

---

## 📊 Success Metrics

### Technical Metrics
- [ ] **Test Coverage**: > 95% across all packages
- [ ] **Bundle Size**: < 25 kB (core + all plugins gzipped)
- [ ] **TypeScript**: 100% type coverage, no `any` types
- [ ] **Performance**: < 1ms for simple expression evaluation
- [ ] **Dependencies**: Zero runtime dependencies (except dot-prop)

### Adoption Metrics
- [ ] **npm Downloads**: 1000+ weekly downloads by v1.0
- [ ] **GitHub Stars**: 500+ stars
- [ ] **Community**: 10+ production case studies
- [ ] **Ecosystem**: 5+ community plugins

### Developer Experience
- [ ] **Time to First Query**: < 5 minutes
- [ ] **Documentation**: 100% API coverage
- [ ] **Examples**: 20+ production examples
- [ ] **Support**: Active Discord/GitHub discussions

---

## 🚀 Next Steps

### Immediate
1. ✅ **Create ROADMAP.md** - DONE
2. ✅ **Implement Zod plugin** (v0.3.0) - DONE
3. ✅ **Implement SurrealDB plugin** (v0.4.0) - DONE
4. ✅ **Implement Pinia Colada plugin** (v0.5.0) - DONE
5. [ ] **Archive __DRAFT__ folder** - Keep externally, remove from repo
6. [ ] **Publish v1.0.0 to npm** - Make package public

### Short-Term (Optional)
1. [ ] Create production examples
2. [ ] Performance benchmarks
3. [ ] Security audit
4. [ ] Community feedback

### Medium-Term (Phase 6 - Storage + Real-Time Integration)
1. [ ] Storage provider interface + FileLoader save (v0.6.0)
2. [ ] SurrealDB storage provider (SurrealDBLoader) (v0.7.0)
3. [ ] Real-time LIVE query integration (v0.8.0)
4. [ ] Unified `withSurrealDBPinia` plugin (v0.9.0)
5. [ ] Vue composables for SurrealDB queries (v1.0.0)

### Long-Term (Future Enhancements)
1. [ ] TanStack plugin (if multi-framework support needed)
2. [ ] Additional plugins (GraphQL, tRPC, Prisma, etc.)
3. [ ] Advanced features (middleware, streaming, etc.)
4. [ ] Nuxt module for first-class SSR support

**Current Focus**: Production use of existing plugins (Zod, SurrealDB, Pinia Colada)
**Next Focus**: Real-time integration (Phase 6)

---

## 📞 Questions to Resolve

### Before Phase 2 (Zod Plugin)
- [ ] Should we merge Zod types with existing TypeScript types?
- [ ] How should validation errors be surfaced? (throw vs errorDefault)
- [ ] Should we support schema inference for entire dotted objects?

### Before Phase 3 (SurrealDB Plugin)
- [ ] Which SurrealDB version(s) to support? (v1.x, v2.x, both?)
- [ ] Should we bundle surrealdb.js or make it a peer dependency?
- [ ] How to handle connection lifecycle in server vs browser?

### Before Phase 4 (Pinia Colada Plugin)
- [ ] Should we auto-detect Pinia instance or require explicit config?
- [ ] How to handle SSR hydration in Nuxt?
- [ ] Should we provide Nuxt module or just Vue composables?

### Before Phase 5 (TanStack Plugin)
- [ ] Auto-detect framework or require explicit `framework: 'react'`?
- [ ] Should we provide unified `useDottedJSON()` hook or framework-specific?
- [ ] How to handle Server Components in React?

---

## 🎯 Definition of Done

### For Each Plugin Release
- [ ] ✅ All tests passing (> 95% coverage)
- [ ] ✅ TypeScript types exported and documented
- [ ] ✅ Peer dependencies configured correctly
- [ ] ✅ Bundle size verified (< target)
- [ ] ✅ README updated with plugin section
- [ ] ✅ Examples created and tested
- [ ] ✅ CHANGELOG.md updated
- [ ] ✅ Version tagged in git
- [ ] ✅ Published to npm
- [ ] ✅ Documentation site updated (if applicable)

### For v1.0.0 Release
- [ ] ✅ All Phase 2-5 plugins complete
- [ ] ✅ Security audit passed
- [ ] ✅ Performance benchmarks published
- [ ] ✅ Migration guides written
- [ ] ✅ Breaking changes documented
- [ ] ✅ Community feedback incorporated
- [ ] ✅ Production case studies (3+ published)
- [ ] ✅ API stability guaranteed

---

### Phase 10: Monorepo Migration (v2.0.0) 🏗️ PLANNED

**Goal**: Restructure as monorepo workspace with separate packages for different abstraction layers

**Planned**: After v1.0.0 stable release (when Phase 6 features are production-ready)
**Status**: Architecture defined - Will be executed post-1.0

#### Package Structure

Transform single package into Bun workspace monorepo:

```
packages/
├── dotted/              # @orbzone/dotted-json (core engine)
├── surrounded/          # @orbzone/surrounded (SurrealDB framework wrapper)
└── aeonic/              # @orbzone/aeonic (opinionated schema framework)
```

**Package Descriptions**:

1. **@orbzone/dotted-json** (`packages/dotted/`)
   - Core "dotted" expression engine (current codebase)
   - Maintains backward compatibility with v1.x API
   - Bundle: 18-25 kB (minimal core + plugins)
   - Focus: General-purpose JSON expansion with variants, i18n, lazy evaluation

2. **@orbzone/surrounded** (`packages/surrounded/`)
   - "Surrounded" SurrealDB-focused framework layer
   - Wraps dotted-json with opinionated SurrealDB integrations
   - Storage providers, LIVE queries, permission detection, Zod integration
   - Bundle: +30-50 kB (framework overhead)
   - Focus: Zero-config SurrealDB + Vue fullstack development

3. **@orbzone/aeonic** (`packages/aeonic/`)
   - "Aeonic" opinionated framework with schema conventions
   - **AEON** = **A**daptive **E**ntity **O**bjective **N**etwork
   - Built on top of `surrounded` with predefined patterns
   - Opinionated database schema model (users, roles, permissions, audit)
   - Bundle: +20-40 kB (schema templates + conventions)
   - Focus: Rapid fullstack app scaffolding with best practices baked in

#### Migration Strategy

**v1.0.0 Milestone First**:
- ✅ Complete Phase 6 implementation (v0.6.0-v0.9.0)
- ✅ Release stable v1.0.0 of `@orbzone/dotted-json`
- ✅ Gather production feedback and stabilize API
- ✅ Ensure 100% backward compatibility guarantee

**v2.0.0 Monorepo Migration** (Breaking Changes):

```typescript
// v1.x.x (current single package)
import { dotted } from '@orbzone/dotted-json';
import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';

// v2.0.0+ (monorepo packages)
// Core users (minimal footprint)
import { dotted } from '@orbzone/dotted-json';

// SurrealDB framework users
import { useSurrounded } from '@orbzone/surrounded';

// Opinionated fullstack users
import { createAeonicApp } from '@orbzone/aeonic';
```

**Package Independence**:
- Each package can be used standalone
- `surrounded` depends on `dotted-json`
- `aeonic` depends on `surrounded` (and transitively `dotted-json`)
- Users install only what they need

#### Benefits

- ✅ **Clear abstraction layers**: Core → Framework → Opinionated
- ✅ **Independent versioning**: dotted-json v2.x, surrounded v1.x, aeonic v0.x
- ✅ **Market segmentation**:
  - Library users get minimal core
  - SurrealDB users get framework layer
  - Rapid dev users get opinionated scaffold
- ✅ **Shared monorepo**: Unified development, cross-package testing
- ✅ **Bundle optimization**: Tree-shake unused layers

#### Aeonic Framework Vision

**AEON Principles** (**A**daptive **E**ntity **O**bjective **N**etwork):
- Predefined entity schemas (User, Role, Permission, Team, Audit)
- Opinionated relationship patterns (RBAC, multi-tenancy, audit trails)
- Built-in permission templates (admin, editor, viewer roles)
- Convention-over-configuration approach
- CLI scaffolding: `bun create aeonic my-app`

**Future Definition**: See `.specify/memory/aeonic-vision.md` (to be created)

#### Package Structure (v2.0.0+)

```
packages/
├── dotted/              @orbzone/dotted-json
├── surrounded/          @orbzone/surrounded
├── aeonic/              @orbzone/aeonic
└── flow/                @orbzone/flow (Flöw app layer)
```

**Flöw** (`@orbzone/flow-app`, `apps/flow`):
- User-facing application layer built on AEON/ION architecture
- Multi-tenant SaaS reference implementation
- Showcases full stack: dotted-json → surrounded → aeonic → flow
- Real-world example of A-H entity hierarchy in production
- **Status**: Future development (v2.1+)

#### Timeline

| Version | Phase | Description |
|---------|-------|-------------|
| v0.6.0-v0.7.0 | Phase 6 Implementation | ✅ Storage, ION naming, AEON design |
| v0.8.0-v0.9.0 | Polish & Examples | Real-world examples, performance benchmarks |
| v1.0.0 | Stable Release | Production-ready dotted-json single package |
| v1.x.x | Stabilization | Production feedback, API refinement, backward compat guarantee |
| v2.0.0 | Monorepo Migration | Restructure into packages/dotted, packages/surrounded, packages/aeonic |
| v2.1.0+ | Ecosystem Growth | Expand aeonic framework, build Flöw reference app |

**Rationale**:
- Preserve v1.0 API stability before breaking changes
- Allow dotted-json to mature as standalone library
- Build surrounded/aeonic on proven foundation
- Flöw demonstrates AEON/ION in real application
- Avoid premature abstraction

---

## 📚 Resources

### Internal Documentation
- `README.md` - Main package documentation
- `CHANGELOG.md` - Version history
- `.specify/README.md` - Current session context
- `__DRAFT__/NEXT-STEPS.md` - Original roadmap (archived)

### Design Documentation (.specify/memory/)
- `constitution.md` - Project principles and constraints
- `surrealdb-vue-vision.md` - Grand vision for SurrealDB + Vue integration
- `storage-providers-design.md` - Storage provider interface, SurrealDBLoader, FileLoader save
- `integration-patterns.md` - Concrete patterns for real-time sync, caching, permissions
- `variant-system-design.md` - Variant resolution algorithm
- `translation-cli-design.md` - CLI architecture and rationale

### Draft Plugin Documentation (Reference)
- `__DRAFT__/ZOD-INTEGRATION.md` - Zod plugin design
- `__DRAFT__/SURREALDB-INTEGRATION.md` - SurrealDB plugin design
- `__DRAFT__/PINIA-COLADA-INTEGRATION.md` - Pinia Colada plugin design
- `__DRAFT__/TANSTACK-INTEGRATION.md` - TanStack plugin design
- `__DRAFT__/VUE-INTEGRATION.md` - Vue composables design

### External Resources
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Pinia Colada Docs](https://pinia-colada.esm.dev/)
- [Zod Documentation](https://zod.dev/)
- [SurrealDB Docs](https://surrealdb.com/docs)

---

**Maintained by**: @OZ
**Repository**: https://github.com/orbzone/dotted-json
**Status**: 🚧 In Active Development

*Last Reviewed: 2025-10-07*
