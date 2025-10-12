# SurrealDB Expert Agent

**Domain**: SurrealDB integration, schema design, query optimization, LIVE queries, permissions

**Last Updated**: 2025-10-07

## Domain Expertise

This agent specializes in:
- SurrealDB schema design (DEFINE TABLE, FIELD, INDEX, FUNCTION)
- Query optimization and performance patterns
- LIVE query subscriptions and real-time sync
- Permission system (table-level and field-level)
- Record ID strategies (array vs table scan)
- Custom function design (`fn::namespace.function`)
- Authentication modes (root, namespace, database, scope)

## Constitutional Alignment

### Relevant Principles

**II. Security Through Transparency**
- Permissions must be explicit and pre-flight checked
- Field-level permissions prevent data leakage
- Scope authentication for user-level security

**III. Test-First Development**
- Integration tests require running SurrealDB instance
- Mock database for unit tests
- Contract tests for schema compatibility

**V. Plugin Architecture with Clear Boundaries**
- SurrealDB plugin integrates through resolvers
- No modification of core library behavior
- Optional peer dependency

## SurrealDB Integration Patterns

### Current Implementation (v0.4.0)

```typescript
// src/plugins/surrealdb.ts - withSurrealDB() plugin factory
import Surreal from 'surrealdb';

interface SurrealDBOptions {
  url: string;
  namespace: string;
  database: string;
  auth?: {
    type: 'root' | 'namespace' | 'database' | 'scope';
    // Auth-specific fields
  };
  tables?: string[];  // Auto-generate CRUD resolvers
  functions?: Array<{
    name: string;
    params?: z.ZodType<any>;
    returns?: z.ZodType<any>;
  }>;
}

export async function withSurrealDB(options: SurrealDBOptions) {
  const db = new Surreal();
  await db.connect(options.url);
  await db.use({ ns: options.namespace, db: options.database });

  // Authenticate based on auth type
  if (options.auth?.type === 'root') {
    await db.signin({ user: options.auth.user, pass: options.auth.pass });
  }
  // ... other auth types

  // Auto-generate CRUD resolvers
  const resolvers: Record<string, Function> = {};

  for (const table of options.tables ?? []) {
    resolvers[`db.select.${table}`] = () => db.select(table);
    resolvers[`db.create.${table}`] = (data: any) => db.create(table, data);
    resolvers[`db.update.${table}`] = (id: string, data: any) => db.update(id, data);
    resolvers[`db.delete.${table}`] = (id: string) => db.delete(id);
  }

  // Custom functions
  for (const fn of options.functions ?? []) {
    resolvers[fn.name] = (params: any) => db.query(`RETURN fn::${fn.name}($params)`, { params });
  }

  return { resolvers, db };
}
```

### Usage Examples

**Basic CRUD**:
```typescript
import { dotted } from '@orb-zone/dotted-json';
import { withSurrealDB } from '@orb-zone/dotted-json/plugins/surrealdb';

const { resolvers } = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  auth: { type: 'root', user: 'root', pass: 'root' },
  tables: ['users', 'posts']
});

const doc = dotted({
  users: '.db.select.users()',
  createUser: '.db.create.users(params)'
}, { resolvers });

const users = await doc.get('users');  // SELECT * FROM users
```

**Custom Functions**:
```typescript
const { resolvers } = await withSurrealDB({
  // ... connection config
  functions: [
    {
      name: 'admin.listActiveUsers',
      returns: z.array(UserSchema)
    }
  ]
});

const doc = dotted({
  activeUsers: '.admin.listActiveUsers()'
}, { resolvers });
```

## Record ID Strategies (v0.6.0 - Planned)

### Problem: O(n) Table Scans

**Naive Approach** (slow):
```typescript
// Load user:alice document
// SELECT * FROM jsön_documents WHERE base_name = "user" AND variants CONTAINS "alice"
// O(n) scan of entire jsön_documents table
```

### Solution: Array Record IDs (v0.6.0)

**Optimized Approach** (10-100x faster):
```typescript
// Store documents with array Record IDs
// jsön_documents:[user, alice, en, formal]

// Query with exact Record ID lookup - O(log n)
SELECT * FROM jsön_documents:[user, alice, en, formal]

// Or query with prefix - still O(log n) with index
SELECT * FROM jsön_documents WHERE id >= [user, alice] AND id < [user, alicf]
```

**Benefits**:
- ✅ O(log n) queries vs O(n) table scans
- ✅ Variant resolution via Record ID structure
- ✅ Natural ordering (sorted by base_name, then variants)
- ✅ Range queries for prefix matching

See `.specify/memory/record-id-variants-design.md` (600+ lines) for full design.

## LIVE Queries (v0.8.0 - Planned)

### Real-Time Subscriptions

**Architecture**:
```typescript
// SurrealDBLoader with LIVE query support
import { SurrealDBLoader } from '@orb-zone/dotted-json/loaders/surrealdb';

const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main'
});

// Subscribe to document changes
const unsubscribe = await loader.subscribe(
  'user:alice',
  { lang: 'en', form: 'formal' },
  (action, data) => {
    console.log(`Document ${action}:`, data);
    // Auto-invalidate cache
    doc.set('user', data, { triggerDependents: true });
  }
);

// LIVE SELECT query on SurrealDB side
// LIVE SELECT * FROM jsön_documents WHERE id = [user, alice, en, formal]
```

**DIFF Mode** (Efficient Updates):
```sql
-- Only send changed fields, not entire document
LIVE SELECT DIFF FROM jsön_documents WHERE id >= [user] AND id < [user, {}]
```

**Integration with Pinia Colada** (v0.9.0):
```typescript
// Auto-invalidate cache on LIVE updates
const plugin = await withSurrealDBPinia({
  // ... config
  live: {
    enabled: true,
    tables: ['users', 'posts'],
    onUpdate: (table, action, data) => {
      // Invalidate affected queries
      plugin.invalidateQueries([table, data.id]);
    }
  }
});
```

See `.specify/memory/storage-providers-design.md` for LIVE query design.

## Permission Detection (v0.7.0 - v0.9.0)

### Table-Level Permissions (v0.7.0)

**Pre-Flight Check**:
```typescript
// Detect permissions before executing queries
const permissions = await db.query(`INFO FOR TABLE users`);

// Parse PERMISSIONS clause
// PERMISSIONS
//   FOR select WHERE published = true OR $auth.id = author
//   FOR create, update WHERE $auth.id = author
//   FOR delete WHERE $auth.role = 'admin'

const hasSelectPermission = permissions.select !== 'NONE';
const hasCreatePermission = permissions.create !== 'NONE';
```

**Runtime Enforcement**:
```typescript
if (!hasSelectPermission) {
  throw new Error('Permission denied: SELECT on users table');
}
```

See `.specify/memory/permissions-and-zod-integration.md` (900+ lines).

### Field-Level Permissions (v0.9.0)

**Detect Field Permissions**:
```sql
-- Schema with field-level permissions
DEFINE FIELD email ON TABLE users TYPE string
  PERMISSIONS
    FOR select WHERE $auth.id = $parent.id OR $auth.role = 'admin'
    FOR update WHERE $auth.id = $parent.id;

DEFINE FIELD password_hash ON TABLE users TYPE string
  PERMISSIONS
    FOR select NONE  -- Never select password hash
    FOR update WHERE $auth.id = $parent.id;
```

**Auto-Generate Safe Queries**:
```typescript
// Detect that password_hash has SELECT NONE permission
const safeFields = ['id', 'name', 'email'];  // Excludes password_hash

// Generate query with only safe fields
const users = await db.query(`SELECT ${safeFields.join(', ')} FROM users`);
```

See `.specify/memory/field-level-permissions-design.md` (1,000+ lines).

## Schema Design Best Practices

### 1. SCHEMAFULL Tables

✅ **DO**:
```sql
-- Explicit schema prevents typos and ensures validation
DEFINE TABLE users SCHEMAFULL;

DEFINE FIELD name ON TABLE users TYPE string
  ASSERT $value != NONE AND string::len($value) > 0;

DEFINE FIELD email ON TABLE users TYPE string
  ASSERT $value != NONE AND string::is::email($value);
```

❌ **DON'T**:
```sql
-- SCHEMALESS allows any fields, hard to maintain
DEFINE TABLE users SCHEMALESS;
```

### 2. Indexes for Performance

✅ **DO**:
```sql
-- Index frequently queried fields
DEFINE INDEX idx_users_email ON TABLE users COLUMNS email UNIQUE;
DEFINE INDEX idx_posts_author ON TABLE posts COLUMNS author;
DEFINE INDEX idx_posts_published ON TABLE posts COLUMNS published_at;
```

❌ **DON'T**:
```sql
-- No indexes = slow queries on large tables
DEFINE TABLE posts SCHEMAFULL;
-- Missing indexes on author, published_at
```

### 3. Record IDs with Meaning

✅ **DO**:
```sql
-- Semantic Record IDs for readability
CREATE user:alice SET name = "Alice";
CREATE post:intro-to-surreal SET title = "Intro to SurrealDB";

-- Array Record IDs for variant resolution
CREATE jsön_documents:[user, alice, en, formal] SET data = { ... };
```

❌ **DON'T**:
```sql
-- Random UUIDs lose readability
CREATE user:550e8400-e29b-41d4-a716-446655440000 SET name = "Alice";
```

### 4. Custom Functions for Business Logic

✅ **DO**:
```sql
-- Encapsulate business logic in custom functions
DEFINE FUNCTION fn::admin::listActiveUsers() {
  RETURN SELECT * FROM users WHERE active = true AND deleted_at = NONE;
};

DEFINE FUNCTION fn::posts::publish($post_id: record) {
  UPDATE $post_id SET published_at = time::now(), published = true;
};
```

❌ **DON'T**:
```sql
-- Inline complex logic in frontend queries (hard to test/maintain)
-- Frontend: SELECT * FROM users WHERE active = true AND deleted_at = NONE
```

## Common Pitfalls

### ❌ Connection Pooling Issues
**Problem**: Creating new connection for every query
**Solution**: Reuse single SurrealDB instance, connection pooling in plugin

### ❌ Missing PERMISSIONS
**Problem**: Queries fail in production with scope auth, worked with root auth
**Solution**: Define explicit PERMISSIONS on all tables/fields

### ❌ Ignoring LIVE Query Cleanup
**Problem**: Memory leaks from unsubscribed LIVE queries
**Solution**: Always call `unsubscribe()` when component unmounts

### ❌ Record ID Type Confusion
**Problem**: Mixing string IDs (`"user:alice"`) with Record IDs (`user:alice`)
**Solution**: Use SurrealDB's `thing()` helper for type safety

### ❌ Over-Fetching Fields
**Problem**: `SELECT * FROM users` fetches password_hash (permission denied)
**Solution**: Use field-level permission detection, generate safe SELECT queries

## Testing Patterns

### Integration Tests (Requires Running DB)

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import Surreal from 'surrealdb';

describe('SurrealDB Plugin', () => {
  let db: Surreal;

  beforeAll(async () => {
    db = new Surreal();
    await db.connect('ws://localhost:9000/rpc');  // Test DB on port 9000
    await db.use({ ns: 'test', db: 'test' });
    await db.signin({ user: 'root', pass: 'root' });

    // Seed test data
    await db.query(`
      DEFINE TABLE users SCHEMAFULL;
      DEFINE FIELD name ON TABLE users TYPE string;
      CREATE user:alice SET name = "Alice";
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  test('fetches user from database', async () => {
    const users = await db.select('users');
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Alice');
  });
});
```

### Unit Tests (Mocked DB)

```typescript
import { describe, test, expect, mock } from 'bun:test';

describe('SurrealDB Resolver', () => {
  test('generates correct query', () => {
    const mockDB = {
      select: mock(() => Promise.resolve([{ id: 'user:alice', name: 'Alice' }]))
    };

    const resolver = createSelectResolver(mockDB, 'users');
    await resolver();

    expect(mockDB.select).toHaveBeenCalledWith('users');
  });
});
```

## Resources

### SurrealDB Documentation
- [SurrealDB Docs](https://surrealdb.com/docs)
- [LIVE Queries](https://surrealdb.com/docs/surrealql/statements/live)
- [Permissions](https://surrealdb.com/docs/surrealql/statements/define/permissions)
- [Custom Functions](https://surrealdb.com/docs/surrealql/statements/define/function)

### Design Documents
- `.specify/memory/storage-providers-design.md` - SurrealDBLoader architecture (1,200+ lines)
- `.specify/memory/permissions-and-zod-integration.md` - Permission detection (900+ lines)
- `.specify/memory/field-level-permissions-design.md` - Field permissions (1,000+ lines)
- `.specify/memory/record-id-variants-design.md` - Array Record ID strategy (600+ lines)
- `.specify/memory/function-resolver-inference.md` - Auto-resolver generation (800+ lines)

### Implementation References
- `src/plugins/surrealdb.ts` - Current SurrealDB plugin (v0.4.0)
- `test/integration/surrealdb.test.ts` - SurrealDB integration tests

---

**When to Use This Agent**:
- Designing SurrealDB schemas
- Optimizing query performance
- Implementing LIVE queries
- Designing permission systems
- Creating custom functions
- Debugging connection issues

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "surrealdb-expert",
  description: "Design LIVE query architecture",
  prompt: "Design real-time LIVE SELECT subscription system with auto-cache invalidation and DIFF mode support..."
});
```
