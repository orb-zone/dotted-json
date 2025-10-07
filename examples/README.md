# Examples

Production-ready examples demonstrating @orbzone/dotted-json capabilities.

## Running Examples

All examples use Bun:

```bash
# Core functionality
bun run examples/basic-usage.ts
bun run examples/file-inheritance.ts

# Plugin integrations
bun run examples/with-zod-validation.ts
bun run examples/surrealdb-auto-discovery.ts

# i18n and variants
bun run examples/variants-i18n.ts
bun run examples/file-loader-i18n.ts

# Schema-driven development
bun surql-to-ts --schema examples/schema-example.surql
bun run examples/complete-workflow.ts
```

## Core Examples

### `basic-usage.ts`
**Core dotted-json functionality**
- Expression evaluation with `${}`
- Resolver functions for dynamic data
- Error handling with `errorDefault`

### `file-inheritance.ts`
**File loading patterns**
- Self-reference with `extends()`
- Loading and merging base schemas
- Path resolution with auto-extension

### `variants-i18n.ts`
**Internationalization**
- Language variants (en, es, fr, etc.)
- Formality levels (casual, polite, formal)
- Gender-aware pronouns
- Multi-dimensional variants

### `file-loader-i18n.ts`
**Advanced i18n patterns**
- Variant-aware file loading
- Security with variant whitelisting
- Pre-scanning for performance
- Cache management

## Plugin Examples

### `with-zod-validation.ts`
**Runtime validation** (requires: `bun add zod`)
- Input/output validation with Zod
- Type-safe resolver definitions
- Automatic runtime validation
- Validation modes (strict/loose/off)

### `surrealdb-auto-discovery.ts`
**SurrealDB integration** (requires: `bun add surrealdb`)
- Auto-discover functions from schema
- Auto-generate runtime resolvers
- Full type safety with generated types
- Schema-driven development workflow

## Schema-Driven Development

### `schema-example.surql`
**Complete SurrealDB schema**
- 13 DEFINE FUNCTION examples
- User, order, analytics functions
- Search and notifications
- Namespaced admin functions

### `complete-workflow.ts`
**End-to-end schema-driven workflow**
- Define functions once in .surql
- Auto-generate TypeScript types
- Auto-generate runtime resolvers
- Use in dotted-json with full type safety

**Workflow:**
```bash
# 1. Edit schema
vim examples/schema-example.surql

# 2. Generate types (watch mode)
bun surql-to-ts --schema examples/schema-example.surql --output examples/db.generated.ts --watch

# 3. Use in code with full type safety
bun run examples/complete-workflow.ts
```

## Status

✅ **All examples are production-ready and runnable**

The library has been fully implemented with 184/184 tests passing. Examples demonstrate real-world usage patterns.
