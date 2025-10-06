# dotted-json (jsön) - Product Roadmap

**Current Version**: v0.2.1
**Last Updated**: 2025-10-06
**Status**: Core library feature-complete, plugin ecosystem in progress

---

## 📍 Current State (v0.2.1)

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

#### Developer Experience
- [x] **190 passing tests** (100% core functionality)
- [x] **18.02 kB bundle** (within 20 kB target)
- [x] **Comprehensive documentation** (README, CHANGELOG)
- [x] **Tagged v0.2.1** (ready for npm publish)

### 🔴 Missing Features (Designed but Not Implemented)

#### Plugin Ecosystem
- [ ] **Zod plugin** - Runtime validation with Zod schemas
- [ ] **SurrealDB plugin** - Zero-boilerplate database integration
- [ ] **Pinia Colada plugin** - Vue 3 data fetching with caching
- [ ] **TanStack Query plugin** - Multi-framework data fetching

#### Framework Integration
- [ ] **Vue composables** - `useDottedJSON()` for Vue 3
- [ ] **React hooks** - `useTanstackDottedJSON()` for React
- [ ] **Svelte stores** - Reactive stores integration
- [ ] **Solid primitives** - Reactive primitives integration
- [ ] **Angular signals** - Signals integration

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

### Phase 1: Core Stabilization (v0.2.x) ✅ CURRENT

**Goal**: Production-ready core library with i18n/localization features

- [x] v0.2.0 - Variant resolver + pronouns + file loader + translation CLI
- [x] v0.2.1 - Documentation improvements + design memory
- [ ] v0.2.2 - Bug fixes, npm publication

**Deliverables**:
- [x] 190/190 tests passing
- [x] < 20 kB bundle size
- [x] Comprehensive README
- [x] Translation CLI tool
- [ ] Published to npm

---

### Phase 2: Validation Layer (v0.3.0)

**Goal**: Runtime type safety with Zod integration

**Effort**: 3-5 days
**Priority**: High (foundation for other plugins)
**Reference**: `__DRAFT__/ZOD-INTEGRATION.md`

#### Features
- [ ] Core plugin: `src/plugins/zod.ts`
- [ ] `withZod()` plugin factory
- [ ] Path-based schema validation
- [ ] Resolver input/output validation
- [ ] Multiple validation modes (strict/loose/off)
- [ ] Enhanced error messages
- [ ] TypeScript inference from Zod schemas

#### Implementation Checklist
- [ ] Port `__DRAFT__/src/plugins/zod.ts` to refactored codebase
- [ ] Write test suite (target: 28 tests like draft)
- [ ] Create example: `examples/zod-validation.ts`
- [ ] Document in README "Plugins" section
- [ ] Add peer dependency config
- [ ] Verify bundle size impact (< 2 kB)

#### Success Metrics
- [ ] All tests passing (28+ tests)
- [ ] Zero breaking changes to core
- [ ] Works with existing schemas
- [ ] TypeScript types inferred correctly

**Use Cases**:
- ✅ API response validation (prevent broken external APIs)
- ✅ Gaming state validation (prevent HP < 0 bugs)
- ✅ Database ORM contracts
- ✅ Form validation integration

---

### Phase 3: Database Integration (v0.4.0)

**Goal**: Zero-boilerplate SurrealDB integration

**Effort**: 4-6 days
**Priority**: High (unique differentiator)
**Reference**: `__DRAFT__/SURREALDB-INTEGRATION.md`

#### Features
- [ ] Core plugin: `src/plugins/surrealdb.ts`
- [ ] `withSurrealDB()` async plugin factory
- [ ] Auto-generated CRUD resolvers
- [ ] Custom resolver support (string queries + functions)
- [ ] Live query support (real-time updates)
- [ ] Connection management with retry logic
- [ ] All authentication types (root, namespace, database, scope)
- [ ] SurrealDB custom functions (`fn::`)

#### Implementation Checklist
- [ ] Port `__DRAFT__/src/plugins/surrealdb.ts`
- [ ] Write test suite (target: 27+ tests)
- [ ] Create examples:
  - [ ] `examples/surrealdb-crud.ts` - Basic CRUD
  - [ ] `examples/surrealdb-functions.ts` - Custom functions
  - [ ] `examples/surrealdb-live.ts` - Live queries
- [ ] Create migration script: `examples/surrealdb-schema.surql`
- [ ] Document in README
- [ ] Add peer dependency config (`surrealdb ^1.0.0`)
- [ ] Verify bundle size (< 7 kB)

#### Advanced Features
- [ ] Zod validation integration (validate DB responses)
- [ ] Transaction support
- [ ] Batch operations
- [ ] Connection pooling
- [ ] Schema introspection from `DEFINE FUNCTION`

#### Success Metrics
- [ ] All tests passing (27+ tests)
- [ ] Works with SurrealDB v1.x and v2.x
- [ ] Live queries work in browser and Node.js
- [ ] < 7 kB bundle size

**Use Cases**:
- ✅ Real-time dashboards
- ✅ Gaming backends
- ✅ Admin panels with CRUD
- ✅ Type-safe database layer

---

### Phase 4: Vue Data Fetching (v0.5.0)

**Goal**: Vue 3 composables with Pinia Colada caching

**Effort**: 5-7 days
**Priority**: High (Vue market penetration)
**Reference**: `__DRAFT__/PINIA-COLADA-INTEGRATION.md`, `__DRAFT__/VUE-INTEGRATION.md`

#### Features
- [ ] Core plugin: `src/plugins/pinia-colada.ts`
- [ ] `withPiniaColada()` plugin factory
- [ ] Auto-generated query resolvers
- [ ] Auto-generated mutation resolvers
- [ ] Cache invalidation patterns
- [ ] Request deduplication
- [ ] Vue composable: `src/composables/useDottedJSON.ts`
- [ ] SSR support (Nuxt compatibility)

#### Implementation Checklist
- [ ] Port `__DRAFT__/src/plugins/pinia-colada.ts`
- [ ] Port `__DRAFT__/src/composables/useDottedJSON.ts`
- [ ] Write test suite (target: 14+ tests for plugin, 10+ for composable)
- [ ] Create examples:
  - [ ] `examples/vue-dashboard.vue` - Admin dashboard
  - [ ] `examples/vue-gaming.vue` - Real-time game state
  - [ ] `examples/vue-ecommerce.vue` - Product catalog
- [ ] Document in README "Vue Integration" section
- [ ] Add peer dependencies:
  - [ ] `@pinia/colada ^0.7.0` (optional)
  - [ ] `pinia ^2.0.0` (optional)
  - [ ] `vue ^3.0.0` (optional)
- [ ] Verify bundle size (< 3 kB)

#### Advanced Features
- [ ] `useDottedQuery()` - Reactive query composable
- [ ] `useDottedMutation()` - Reactive mutation composable
- [ ] Infinite query support
- [ ] WebSocket/SSE streaming
- [ ] Vue Router data loader integration
- [ ] Nuxt module

#### Success Metrics
- [ ] All tests passing (24+ tests)
- [ ] Works with Pinia DevTools
- [ ] Nuxt 3 compatible
- [ ] < 3 kB bundle size

**Use Cases**:
- ✅ Vue dashboards with caching
- ✅ Real-time applications
- ✅ Admin panels
- ✅ E-commerce product pages

---

### Phase 5: Multi-Framework Data Fetching (v0.6.0)

**Goal**: React, Svelte, Solid, Angular support via TanStack Query

**Effort**: 7-10 days
**Priority**: Medium (React market penetration)
**Reference**: `__DRAFT__/TANSTACK-INTEGRATION.md`

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

### v1.0.0 - Stable Release
**Goal**: Production-ready with full plugin ecosystem

**Criteria**:
- [ ] All plugins implemented and tested
- [ ] 100% documentation coverage
- [ ] Published to npm with stable API
- [ ] Migration guides for all plugins
- [ ] Performance benchmarks vs alternatives
- [ ] Security audit completed

**Deliverables**:
- [ ] Core + 4 plugins (Zod, SurrealDB, Pinia Colada, TanStack)
- [ ] 5 framework integrations (React, Vue, Svelte, Solid, Angular)
- [ ] Comprehensive examples for all use cases
- [ ] Production case studies

---

### Future Enhancements (v1.1+)

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

### Phase-by-Phase Approach

#### ✅ Phase 1: Foundation (DONE)
- Core library refactored
- i18n/localization features
- Translation tooling
- Comprehensive tests

#### 🎯 Phase 2-5: Plugin Ecosystem (IN PROGRESS)
**Strategy**: Port from `__DRAFT__` following TDD

**Process for Each Plugin**:
1. **Analyze Draft** - Review `__DRAFT__/src/plugins/*.ts` and docs
2. **Write Tests First** - Port/adapt test suite from `__DRAFT__/test/`
3. **Implement Plugin** - Port implementation with improvements
4. **Create Examples** - Port/create production examples
5. **Document** - Update README with plugin section
6. **Verify** - Bundle size, TypeScript, peer dependencies

**Key Principles**:
- ✅ **TDD first** - Tests before implementation
- ✅ **Zero breaking changes** - All plugins are opt-in
- ✅ **Bundle optimization** - Each plugin < 7 kB
- ✅ **Peer dependencies** - All optional, install what you need
- ✅ **TypeScript-first** - Full type safety and inference

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

### Immediate (This Week)
1. ✅ **Create ROADMAP.md** - This document
2. [ ] **Remove __DRAFT__ folder** - Archive externally, clean repo
3. [ ] **Publish v0.2.2 to npm** - Make core library public
4. [ ] **Start Phase 2** - Begin Zod plugin implementation

### Short-Term (Next 2 Weeks)
1. [ ] **Implement Zod plugin** (v0.3.0)
2. [ ] **Implement SurrealDB plugin** (v0.4.0)
3. [ ] **Create integration examples**
4. [ ] **Update documentation**

### Medium-Term (Next Month)
1. [ ] **Implement Pinia Colada plugin** (v0.5.0)
2. [ ] **Implement TanStack plugin** (v0.6.0)
3. [ ] **Framework-specific examples** for all 5 frameworks
4. [ ] **Performance benchmarks**

### Long-Term (Next Quarter)
1. [ ] **Stable v1.0.0 release**
2. [ ] **Production case studies**
3. [ ] **Community plugins**
4. [ ] **Advanced features** (middleware, streaming, etc.)

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

## 📚 Resources

### Internal Documentation
- `README.md` - Main package documentation
- `CHANGELOG.md` - Version history
- `.specify/README.md` - Current session context
- `__DRAFT__/NEXT-STEPS.md` - Original roadmap (archived)

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

*Last Reviewed: 2025-10-06*
