# API Reference

Complete API documentation for `@orbzone/dotted-json` (JSöN).

---

## Table of Contents

- [Core API](#core-api)
  - [dotted()](#dotted)
  - [DottedJSON](#dottedjson)
- [Storage Providers](#storage-providers)
  - [FileLoader](#fileloader)
  - [SurrealDBLoader](#surrealdbloader)
- [Plugins](#plugins)
  - [withZod()](#withzod)
  - [withSurrealDB()](#withsurrealdb)
  - [withPiniaColada()](#withpiniacolada)
  - [withSurrealDBPinia()](#withsurrealdbpinia)
- [Type Definitions](#type-definitions)
- [Variant System](#variant-system)
- [Pronoun Helpers](#pronoun-helpers)

---

## Core API

### dotted()

Create a "dotted" JSON object with lazy expression evaluation.

```typescript
function dotted(
  schema: Record<string, any>,
  options?: DottedOptions
): DottedJson
```

#### Parameters

- **schema** `Record<string, any>` - JSON object with optional dot-prefixed expression keys
- **options** `DottedOptions` (optional) - Configuration options

#### Returns

`DottedJson` - Proxy object for lazy evaluation

#### Example

```typescript
import { dotted } from '@orbzone/dotted-json';

const data = dotted({
  user: {
    id: '123',
    name: 'Alice',
    '.greeting': 'Hello, ${user.name}!'
  }
});

await data.get('user.greeting'); // "Hello, Alice!"
```

---

### DottedJson

Proxy class for lazy expression evaluation and variant resolution.

#### Methods

##### `get(path: string, options?: GetOptions): Promise<any>`

Get a value by path, evaluating expressions if needed.

```typescript
const value = await data.get('user.profile');
const withVariants = await data.get('strings.welcome', {
  variants: { lang: 'es', form: 'formal' }
});
```

**Parameters:**

- `path` `string` - Dot-notation path (e.g., `'user.profile.email'`)
- `options` `GetOptions` (optional)
  - `variants` `VariantContext` - Variant context for resolution
  - `errorDefault` `any` - Default value on error

**Returns:** `Promise<any>` - Resolved value

---

##### `set(path: string, value: any, options?: SetOptions): void`

Set a value at the specified path.

```typescript
data.set('user.name', 'Bob');
data.set('user.age', 30);
```

**Parameters:**

- `path` `string` - Dot-notation path
- `value` `any` - Value to set
- `options` `SetOptions` (optional)

---

##### `has(path: string, options?: HasOptions): boolean`

Check if a path exists in the schema.

```typescript
if (data.has('user.profile')) {
  // ...
}
```

**Parameters:**

- `path` `string` - Dot-notation path
- `options` `HasOptions` (optional)

**Returns:** `boolean` - True if path exists

---

##### `toJSON(): any`

Export the entire schema as plain JSON (expressions remain unevaluated).

```typescript
const plain = data.toJSON();
console.log(JSON.stringify(plain, null, 2));
```

**Returns:** `any` - Plain JSON object

---

## Storage Providers

### FileLoader

Load JSöN documents from the filesystem with variant resolution.

```typescript
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({
  baseDir: './data',
  extensions: ['.jsön', '.json'],
  cache: true,
  cacheTTL: 60000
});
```

#### Constructor Options

```typescript
interface FileLoaderOptions {
  baseDir: string;              // Base directory for files
  extensions?: string[];        // File extensions (default: ['.jsön', '.json'])
  cache?: boolean;              // Enable caching (default: true)
  cacheTTL?: number;           // Cache TTL in ms (default: 60000)
  permissive?: boolean;         // Allow custom variants (default: false)
  allowedVariants?: string[]; // Allowed custom variants
}
```

#### Methods

##### `init(): Promise<void>`

Initialize the loader (scans directory).

```typescript
await loader.init();
```

---

##### `load(baseName: string, variants?: VariantContext): Promise<any>`

Load a document with variant resolution.

```typescript
// Loads best match: strings:es:formal.jsön
const strings = await loader.load('strings', {
  lang: 'es',
  form: 'formal'
});
```

**Parameters:**

- `baseName` `string` - Document name without variants/extension
- `variants` `VariantContext` (optional) - Variant context

**Returns:** `Promise<any>` - Parsed document

---

##### `save(baseName: string, data: any, variants?: VariantContext, options?: SaveOptions): Promise<void>`

Save a document with variants.

```typescript
await loader.save('config', { theme: 'dark' }, { env: 'prod' });
// Saves to: config:prod.jsön
```

**Parameters:**

- `baseName` `string` - Document name
- `data` `any` - Data to save
- `variants` `VariantContext` (optional)
- `options` `SaveOptions` (optional)
  - `upsert` `boolean` - Create if missing (default: true)
  - `strategy` `'replace' | 'merge' | 'deep-merge'` - Merge strategy
  - `schema` `ZodType` - Validation schema
  - `pretty` `boolean` - Pretty-print JSON (default: true)

---

##### `list(filter?: ListFilter): Promise<DocumentInfo[]>`

List available documents.

```typescript
const docs = await loader.list({ baseName: 'strings' });
// [{ baseName: 'strings', variants: { lang: 'es' }, ... }]
```

**Parameters:**

- `filter` `ListFilter` (optional)
  - `baseName` `string` - Filter by base name
  - `variants` `Partial<VariantContext>` - Filter by variants

**Returns:** `Promise<DocumentInfo[]>` - Array of document info

---

##### `delete(baseName: string, variants?: VariantContext): Promise<void>`

Delete a document.

```typescript
await loader.delete('config', { env: 'dev' });
```

---

##### `close(): Promise<void>`

Cleanup resources (clear caches).

```typescript
await loader.close();
```

---

### SurrealDBLoader

Load/Save JSöN documents from SurrealDB with variant resolution and real-time updates.

```typescript
import { SurrealDBLoader } from '@orbzone/dotted-json/loaders/surrealdb';

const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  auth: {
    type: 'root',
    username: 'root',
    password: 'root'
  }
});
```

#### Constructor Options

```typescript
interface SurrealDBLoaderOptions {
  url: string;                  // WebSocket URL
  namespace: string;            // SurrealDB namespace
  database: string;             // SurrealDB database
  table?: string;              // Table name (default: 'ion')
  auth?: SurrealDBAuth;        // Authentication
  cache?: boolean;             // Enable caching (default: true)
  cacheTTL?: number;          // Cache TTL in ms (default: 60000)
  metrics?: boolean;           // Collect metrics (default: false)
  onMetrics?: (m: PerformanceMetrics) => void; // Metrics callback
  retry?: RetryConfig;         // Connection retry config
  onLiveUpdate?: (e: LiveUpdateEvent) => void; // LIVE query callback
}
```

#### Methods

##### `init(): Promise<void>`

Initialize connection with retry logic.

```typescript
await loader.init();
```

---

##### `load(baseName: string, variants?: VariantContext): Promise<any>`

Load ion from database with variant resolution.

```typescript
const config = await loader.load('config', { env: 'prod' });
```

**Uses array-based Record IDs for 10-100x faster queries:**

```
ion:['config', 'env', 'prod']  // O(log n) range scan
```

---

##### `save(baseName: string, data: any, variants?: VariantContext, options?: SaveOptions): Promise<void>`

Save ion to database.

```typescript
await loader.save('flags', flagsData, { env: 'prod' });
```

---

##### `subscribe(baseName: string, variants: VariantContext | undefined, callback: (data: any) => void): Promise<() => void>`

Subscribe to real-time document updates.

```typescript
const unsubscribe = await loader.subscribe(
  'config',
  { env: 'prod' },
  (data) => {
    console.log('Config updated:', data);
  }
);

// Later: stop listening
await unsubscribe();
```

**Parameters:**

- `baseName` `string` - Ion name
- `variants` `VariantContext | undefined` - Variant filter
- `callback` `(data: any) => void` - Update handler

**Returns:** `Promise<() => void>` - Unsubscribe function

**Features:**

- Uses SurrealDB LIVE queries with DIFF mode
- Automatic cache invalidation on updates
- WebSocket-based real-time streaming

---

##### `list(filter?: ListFilter): Promise<DocumentInfo[]>`

List available ions.

```typescript
const ions = await loader.list({ baseName: 'config' });
```

---

##### `delete(baseName: string, variants?: VariantContext): Promise<void>`

Delete an ion.

```typescript
await loader.delete('config', { env: 'dev' });
```

---

##### `close(): Promise<void>`

Disconnect and cleanup (kills all LIVE queries).

```typescript
await loader.close();
```

---

## Plugins

### withZod()

Runtime validation plugin using Zod schemas.

```typescript
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

const validation = withZod({
  schemas: {
    paths: {
      'user.profile': z.object({
        email: z.string().email(),
        name: z.string()
      })
    },
    resolvers: {
      'api.getUser': {
        input: z.string(),
        output: UserSchema
      }
    }
  },
  mode: 'strict',  // 'strict' | 'loose' | 'off'
  onError: (error) => {
    console.error('Validation failed:', error);
  }
});

const data = dotted(schema, { ...validation, resolvers });
```

#### Options

```typescript
interface WithZodOptions {
  schemas: {
    paths?: Record<string, ZodType>;      // Path validation
    resolvers?: Record<string, {          // Resolver validation
      input?: ZodType;
      output?: ZodType;
    }>;
  };
  mode?: 'strict' | 'loose' | 'off';     // Validation mode
  onError?: (error: ValidationError) => void; // Error handler
}
```

**Modes:**

- `strict` - Throw on validation error
- `loose` - Log error and continue
- `off` - Disable validation

---

### withSurrealDB()

Zero-boilerplate SurrealDB integration.

```typescript
import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';

const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  auth: {
    type: 'root',
    username: 'root',
    password: 'root'
  },
  tables: ['user', 'post'],
  functions: [
    {
      name: 'getProfile',
      params: z.object({ userId: z.string() }),
      returns: ProfileSchema
    }
  ],
  resolvers: {
    'custom.getStats': async () => {
      return { total: 100 };
    }
  }
});

const data = dotted({
  user: {
    id: 'user:123',
    '.profile': 'db.user.select(${user.id})',
    '.stats': 'custom.getStats()'
  }
}, { resolvers: plugin.resolvers });

// Cleanup
await plugin.disconnect();
```

#### Auto-generated Resolvers

For each table, generates:

- `db.{table}.select(id)` - Fetch record by ID
- `db.{table}.create(data)` - Create new record
- `db.{table}.update(id, data)` - Update record
- `db.{table}.delete(id)` - Delete record

For each function:

- `fn.{name}(params)` - Call SurrealDB function with validation

---

### withPiniaColada()

Vue 3 data fetching with intelligent caching.

```typescript
import { withPiniaColada } from '@orbzone/dotted-json/plugins/pinia-colada';

const plugin = withPiniaColada({
  queries: {
    'api.getUser': {
      key: (id: string) => ['user', id],
      query: async (id: string) => {
        const res = await fetch(`/api/users/${id}`);
        return res.json();
      },
      staleTime: 60000,  // 1 minute
      gcTime: 300000,    // 5 minutes
      retry: 3
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
      ],
      onSuccess: (result, id, data) => {
        console.log('Updated user:', id);
      }
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

// Cache management
plugin.clearCache();
plugin.invalidateQueries([['user', '123']]);
```

#### Query Options

```typescript
interface QueryConfig {
  key: (...args: any[]) => any[];      // Cache key generator
  query: (...args: any[]) => Promise<any>; // Query function
  staleTime?: number;                  // Fresh time (ms)
  gcTime?: number;                     // Garbage collection time (ms)
  retry?: number | false;              // Retry count
}
```

#### Mutation Options

```typescript
interface MutationConfig {
  mutation: (...args: any[]) => Promise<any>; // Mutation function
  invalidates?: Array<any[] | ((...args: any[]) => any[])>; // Cache keys to invalidate
  onMutate?: (...args: any[]) => void;        // Before mutation
  onSuccess?: (result: any, ...args: any[]) => void; // After success
  onError?: (error: Error, ...args: any[]) => void;  // On error
  onSettled?: (result: any, error: Error | null, ...args: any[]) => void; // Always
}
```

---

### withSurrealDBPinia()

Unified SurrealDB + Pinia Colada integration.

```typescript
import { withSurrealDBPinia } from '@orbzone/dotted-json/plugins/surrealdb-pinia';

const plugin = await withSurrealDBPinia({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  auth: {
    type: 'root',
    username: 'root',
    password: 'root'
  },
  ions: {
    'config': {
      staleTime: 60_000,   // 1 minute
      gcTime: 300_000      // 5 minutes
    },
    'strings': {
      staleTime: 300_000   // 5 minutes
    }
  },
  live: {
    enabled: true,
    ions: ['config'],      // Real-time sync for these ions
    onUpdate: (event) => {
      console.log(`${event.action}: ${event.baseName}`);
    }
  },
  metrics: true,
  onMetrics: (metrics) => {
    console.log(`${metrics.operation}: ${metrics.duration}ms`);
  }
});

const data = dotted({
  '.config': 'db.loadIon("config", { env: "prod" })',
  '.strings': 'db.loadIon("strings", { lang: "es", form: "formal" })'
}, { resolvers: plugin.resolvers });

// Automatic cache invalidation via LIVE queries!
const config = await data.get('config');

// Cleanup
await plugin.close();
```

#### Auto-generated Resolver

- `db.loadIon(baseName, variants)` - Load ion with caching and real-time updates

#### Configuration

```typescript
interface SurrealDBPiniaConfig {
  url: string;
  namespace: string;
  database: string;
  auth?: SurrealDBAuth;
  ions: Record<string, IonConfig>;   // Ion cache config
  live?: LiveConfig;                  // Real-time updates
  metrics?: boolean;
  onMetrics?: (m: PerformanceMetrics) => void;
}

interface IonConfig {
  staleTime?: number;   // Fresh time (ms)
  gcTime?: number;      // GC time (ms)
  retry?: number;       // Retry count
}

interface LiveConfig {
  enabled: boolean;
  ions: string[];       // Ions to watch
  onUpdate?: (event: LiveUpdateEvent) => void;
}
```

---

## Type Definitions

### VariantContext

Context for variant resolution.

```typescript
interface VariantContext {
  lang?: string;        // Language (e.g., 'en', 'es', 'ja')
  gender?: 'm' | 'f' | 'x';  // Gender
  form?: 'casual' | 'informal' | 'neutral' | 'polite' | 'formal' | 'honorific';
  [key: string]: any;   // Custom variants
}
```

---

### DottedOptions

Configuration for dotted JSON creation.

```typescript
interface DottedOptions {
  resolvers?: Record<string, any>;        // Custom resolvers
  extends?: string;                       // Base document to extend
  maxEvaluationDepth?: number;           // Max depth (default: 100)
  validation?: ValidationOptions;         // Zod validation
  variants?: VariantContext;             // Default variants
}
```

---

### PerformanceMetrics

Performance metrics for operations.

```typescript
interface PerformanceMetrics {
  operation: 'init' | 'load' | 'save' | 'delete' | 'list' | 'subscribe';
  duration: number;         // Milliseconds
  cacheHit?: boolean;       // Cache hit/miss
  candidateCount?: number;  // Variant candidates evaluated
  timestamp: number;        // Unix timestamp
}
```

---

### LiveUpdateEvent

Real-time update event from LIVE queries.

```typescript
type LiveAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface LiveUpdateEvent {
  action: LiveAction;
  baseName: string;
  variants: VariantContext;
  data: any;
  recordId: string;
}
```

---

## Variant System

### Variant Resolution

Variants are resolved using a priority-based scoring system:

| Variant | Priority | Example |
|---------|----------|---------|
| `lang` | 1000 | `'en'`, `'es'`, `'ja'` |
| `gender` | 100 | `'m'`, `'f'`, `'x'` |
| `form` | 50 | `'casual'`, `'formal'`, `'polite'` |
| Custom | 10 | `'region'`, `'platform'`, etc. |

### Formality Levels

- **casual** - Very informal (slang, abbreviations)
- **informal** - Relaxed but complete
- **neutral** - Standard, professional (default)
- **polite** - Respectful, considerate
- **formal** - Business, official contexts
- **honorific** - Maximum respect (Japanese keigo, Korean jondaemal)

### Language-specific Formality

**Japanese (keigo 敬語):**

```typescript
{ lang: 'ja', form: 'casual' }    // Plain form (普通形)
{ lang: 'ja', form: 'polite' }    // Teineigo (丁寧語)
{ lang: 'ja', form: 'honorific' } // Keigo (敬語)
```

**Korean (jondaemal 존댓말):**

```typescript
{ lang: 'ko', form: 'casual' }    // Banmal (반말)
{ lang: 'ko', form: 'polite' }    // Jondaemal (존댓말)
{ lang: 'ko', form: 'honorific' } // Nopimmal (높임말)
```

**German (Sie/du):**

```typescript
{ lang: 'de', form: 'informal' }  // Du
{ lang: 'de', form: 'formal' }    // Sie
```

**Spanish (tú/usted):**

```typescript
{ lang: 'es', form: 'informal' }  // Tú
{ lang: 'es', form: 'formal' }    // Usted
```

---

## Pronoun Helpers

Gender-aware pronoun resolution.

### Syntax

```typescript
'${:subject}'      // he/she/they
'${:object}'       // him/her/them
'${:possessive}'   // his/her/their
'${:reflexive}'    // himself/herself/themself
```

### Example

```typescript
const data = dotted({
  user: {
    name: 'Alice',
    gender: 'f',
    '.message': '${:subject} completed ${:possessive} task'
  }
});

await data.get('user.message', {
  variants: { gender: 'f' }
});
// "she completed her task"
```

### Supported Forms

| Form | Male (m) | Female (f) | Non-binary (x) |
|------|----------|------------|----------------|
| subject | he | she | they |
| object | him | her | them |
| possessive | his | her | their |
| reflexive | himself | herself | themself |

---

## Best Practices

### 1. Cache Configuration

```typescript
// Short-lived data (user session)
{ staleTime: 30_000, gcTime: 60_000 }

// Medium-lived data (config, feature flags)
{ staleTime: 60_000, gcTime: 300_000 }

// Long-lived data (translations, static content)
{ staleTime: 300_000, gcTime: 3_600_000 }
```

### 2. Error Handling

```typescript
const data = dotted({
  '.profile': 'api.getUser(${userId})'
}, {
  resolvers,
  validation: withZod({
    schemas: {
      paths: { 'profile': UserSchema }
    },
    mode: 'loose',
    onError: (error) => {
      Sentry.captureException(error);
    }
  })
});

const profile = await data.get('profile', {
  errorDefault: { name: 'Guest', email: '' }
});
```

### 3. Real-time Updates

```typescript
// Setup real-time sync
const plugin = await withSurrealDBPinia({
  // ... config
  live: {
    enabled: true,
    ions: ['config', 'feature_flags'],
    onUpdate: (event) => {
      // React to changes
      if (event.action === 'UPDATE') {
        console.log(`${event.baseName} updated`);
      }
    }
  }
});

// Automatic cache invalidation happens behind the scenes
```

### 4. Variant Best Practices

```typescript
// Use well-known variants for better caching
const data = dotted({
  '.strings': 'db.loadIon("strings", ${variants})'
}, { resolvers });

// Good: cache key is deterministic
await data.get('strings', {
  variants: { lang: 'es', form: 'formal' }
});

// Avoid: custom variants should be allowed
await data.get('strings', {
  variants: { customVariant: 'value' }  // May cause cache misses
});
```

---

## Migration Guides

See [MIGRATION.md](./MIGRATION.md) for detailed migration guides from:

- i18next
- react-intl
- vue-i18n
- LaunchDarkly (feature flags)
- Unleash (feature flags)

---

## Performance Tips

See [PERFORMANCE.md](./PERFORMANCE.md) for:

- Cache optimization strategies
- Variant resolution performance
- Bundle size management
- SurrealDB query optimization
- Benchmarking guidelines

---

## Further Reading

- [README.md](../README.md) - Getting started guide
- [ROADMAP.md](../ROADMAP.md) - Feature roadmap
- [CHANGELOG.md](../CHANGELOG.md) - Release history
- [Examples](../examples/) - Production-ready examples
