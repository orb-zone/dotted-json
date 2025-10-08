# Storage Providers Design: JSöN Document Persistence

**Created**: 2025-10-06
**Status**: Design Phase
**Target**: v0.6.0+ (alongside real-time integration)

---

## Overview

This document designs a **unified storage provider system** for dotted-json that enables:

1. **Loading** JSöN documents from various backends (filesystem, SurrealDB, remote APIs)
2. **Saving** JSöN documents back to storage for persistence
3. **Variant-aware** loading (like existing FileLoader)
4. **Cache management** across storage layers

The goal is to treat JSöN documents as **first-class data** that can be stored, versioned, and synchronized across systems.

---

## Use Cases

### 1. Configuration Management

**Scenario**: Application config stored in SurrealDB, editable via admin panel

```typescript
const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'config',
  table: 'jsön_documents'
});

// Load config document
const config = await loader.load('app-settings', { env: 'production' });

// Modify and save back
config.features.newFeature = true;
await loader.save('app-settings', config, { env: 'production' });
```

### 2. i18n Translation Management

**Scenario**: Translations stored in SurrealDB, editable by translators in real-time

```typescript
const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  table: 'translations'
});

// Load translation document
const strings = await loader.load('ui-strings', { lang: 'es' });

// Translator updates a string
strings.welcomeMessage = '¡Bienvenido!';
await loader.save('ui-strings', strings, { lang: 'es' });

// All connected clients receive LIVE update via SurrealDB
```

### 3. User Preferences / State

**Scenario**: Per-user JSöN documents for preferences, dashboards, etc.

```typescript
const loader = new SurrealDBLoader({
  table: 'user_documents',
  userScoped: true // Automatic filtering by $auth.id
});

// Load user's dashboard config
const dashboard = await loader.load('dashboard', { userId: 'user:alice' });

// User rearranges widgets
dashboard.layout = newLayout;
await loader.save('dashboard', dashboard, { userId: 'user:alice' });
```

### 4. CMS Content

**Scenario**: Blog posts, pages, etc. stored as JSöN with expressions

```typescript
const post = {
  title: 'My Post',
  author: 'user:alice',
  '.authorName': 'db.user.select(${author}).name',
  '.publishedDate': 'fmt.date(${createdAt}, "long")',
  content: '...'
};

await loader.save('blog-posts', post, { slug: 'my-post' });

// Later: Load and expand
const expanded = dotted(
  await loader.load('blog-posts', { slug: 'my-post' }),
  { resolvers }
);
```

---

## Architecture

### Provider Interface

All storage providers implement a common interface:

```typescript
/**
 * Storage provider for JSöN documents
 */
interface StorageProvider {
  /**
   * Initialize provider (connect, authenticate, etc.)
   */
  init(): Promise<void>;

  /**
   * Load JSöN document with variant resolution
   *
   * @param baseName - Document identifier (e.g., 'app-settings', 'strings')
   * @param variants - Variant context for resolution (lang, env, userId, etc.)
   * @returns Parsed JSöN document
   */
  load(baseName: string, variants?: VariantContext): Promise<any>;

  /**
   * Save JSöN document
   *
   * @param baseName - Document identifier
   * @param data - JSöN document to save
   * @param variants - Variant context for storage
   * @param options - Provider-specific save options
   */
  save(baseName: string, data: any, variants?: VariantContext, options?: SaveOptions): Promise<void>;

  /**
   * List available documents (optional)
   *
   * @param filter - Filter criteria (e.g., { base: 'strings' })
   * @returns Array of document identifiers with variants
   */
  list?(filter?: ListFilter): Promise<DocumentInfo[]>;

  /**
   * Delete document (optional)
   *
   * @param baseName - Document identifier
   * @param variants - Variant context
   */
  delete?(baseName: string, variants?: VariantContext): Promise<void>;

  /**
   * Subscribe to document changes (optional, for real-time providers)
   *
   * @param baseName - Document identifier
   * @param callback - Called when document changes
   * @returns Unsubscribe function
   */
  subscribe?(baseName: string, callback: (data: any) => void): Promise<() => void>;

  /**
   * Cleanup resources
   */
  close(): Promise<void>;
}

interface SaveOptions {
  /**
   * Create if doesn't exist, update if exists
   * @default true
   */
  upsert?: boolean;

  /**
   * Validate document before saving (with Zod schema)
   */
  schema?: ZodType;

  /**
   * Merge with existing document or replace entirely
   * @default 'replace'
   */
  strategy?: 'replace' | 'merge' | 'deep-merge';

  /**
   * Provider-specific metadata
   */
  metadata?: Record<string, any>;
}

interface DocumentInfo {
  baseName: string;
  variants: VariantContext;
  fullName: string; // e.g., 'strings:es:formal'
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
    author?: string;
  };
}

interface ListFilter {
  baseName?: string;
  variants?: Partial<VariantContext>;
  metadata?: Record<string, any>;
}
```

---

## Implementation: SurrealDBLoader

### Database Schema

```sql
-- Table for JSöN documents
DEFINE TABLE jsön_documents SCHEMAFULL;

-- Core fields
DEFINE FIELD base_name ON jsön_documents TYPE string ASSERT $value != NONE;
DEFINE FIELD variants ON jsön_documents TYPE object DEFAULT {};
DEFINE FIELD data ON jsön_documents TYPE object ASSERT $value != NONE;

-- Metadata
DEFINE FIELD created_at ON jsön_documents TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON jsön_documents TYPE datetime DEFAULT time::now();
DEFINE FIELD created_by ON jsön_documents TYPE option<record<user>>;
DEFINE FIELD version ON jsön_documents TYPE int DEFAULT 1;

-- Indexes for fast lookup
DEFINE INDEX idx_base_name ON jsön_documents FIELDS base_name;
DEFINE INDEX idx_variants ON jsön_documents FIELDS variants;

-- Permissions (example: user-scoped documents)
DEFINE TABLE jsön_documents PERMISSIONS
  FOR select WHERE created_by = $auth.id OR $auth.role = 'admin'
  FOR create WHERE created_by = $auth.id
  FOR update WHERE created_by = $auth.id OR $auth.role = 'admin'
  FOR delete WHERE created_by = $auth.id OR $auth.role = 'admin';

-- Custom functions
DEFINE FUNCTION fn::listDocuments($baseName: string) {
  RETURN SELECT * FROM jsön_documents WHERE base_name = $baseName;
};

DEFINE FUNCTION fn::loadDocument($baseName: string, $variants: object) {
  -- Find best matching document based on variants
  LET $candidates = SELECT * FROM jsön_documents WHERE base_name = $baseName;

  -- Score each candidate (variant matching logic)
  -- For now: simple exact match, later: scoring algorithm
  RETURN $candidates[WHERE variants = $variants][0];
};
```

### SurrealDBLoader Implementation

```typescript
import { Surreal } from 'surrealdb';
import type { VariantContext } from '../types.js';
import { resolveVariantPath, parseVariantPath } from '../variant-resolver.js';

export interface SurrealDBLoaderOptions {
  /**
   * SurrealDB connection URL
   */
  url: string;

  /**
   * Namespace and database
   */
  namespace: string;
  database: string;

  /**
   * Authentication
   */
  auth?: {
    type: 'root' | 'namespace' | 'database' | 'scope';
    username?: string;
    password?: string;
    access?: string;
    variables?: Record<string, any>;
  };

  /**
   * Table to store JSöN documents
   * @default 'jsön_documents'
   */
  table?: string;

  /**
   * Cache loaded documents in memory
   * @default true
   */
  cache?: boolean;

  /**
   * User-scoped documents (filter by $auth.id automatically)
   * @default false
   */
  userScoped?: boolean;

  /**
   * Enable LIVE queries for real-time updates
   * @default false
   */
  live?: boolean;
}

export class SurrealDBLoader implements StorageProvider {
  private db: Surreal;
  private options: Required<SurrealDBLoaderOptions>;
  private cache = new Map<string, any>();
  private liveQueryIds = new Map<string, string>();
  private initialized = false;

  constructor(options: SurrealDBLoaderOptions) {
    this.db = new Surreal();
    this.options = {
      table: 'jsön_documents',
      cache: true,
      userScoped: false,
      live: false,
      ...options
    };
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await this.db.connect(this.options.url);
    await this.db.use({
      namespace: this.options.namespace,
      database: this.options.database
    });

    if (this.options.auth) {
      await this.authenticate();
    }

    this.initialized = true;
  }

  private async authenticate(): Promise<void> {
    const { auth } = this.options;
    if (!auth) return;

    switch (auth.type) {
      case 'root':
      case 'namespace':
      case 'database':
        await this.db.signin({
          username: auth.username!,
          password: auth.password!
        });
        break;
      case 'scope':
        await this.db.signin({
          namespace: this.options.namespace,
          database: this.options.database,
          access: auth.access!,
          variables: auth.variables
        });
        break;
    }
  }

  /**
   * Load JSöN document with variant resolution
   */
  async load(baseName: string, variants: VariantContext = {}): Promise<any> {
    if (!this.initialized) {
      await this.init();
    }

    // Check cache
    const cacheKey = this.getCacheKey(baseName, variants);
    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Query for all documents matching base_name
    const query = `
      SELECT * FROM ${this.options.table}
      WHERE base_name = $baseName
      ${this.options.userScoped ? 'AND created_by = $auth.id' : ''}
      ORDER BY updated_at DESC
    `;

    const [result] = await this.db.query(query, { baseName });
    const candidates = result as any[];

    if (candidates.length === 0) {
      throw new Error(`Document not found: ${baseName}`);
    }

    // Resolve best matching variant
    const bestMatch = this.resolveBestVariant(candidates, variants);

    // Cache result
    if (this.options.cache) {
      this.cache.set(cacheKey, bestMatch.data);
    }

    // Set up LIVE query if enabled
    if (this.options.live && !this.liveQueryIds.has(cacheKey)) {
      await this.setupLiveQuery(baseName, variants, cacheKey);
    }

    return bestMatch.data;
  }

  /**
   * Resolve best matching document based on variant scoring
   */
  private resolveBestVariant(candidates: any[], variants: VariantContext): any {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Build variant paths for scoring
    const candidatePaths = candidates.map(doc => {
      const variantStr = Object.entries(doc.variants || {})
        .map(([k, v]) => `${k}:${v}`)
        .join(':');
      return {
        path: doc.base_name + (variantStr ? ':' + variantStr : ''),
        doc
      };
    });

    // Use variant resolver to score
    const paths = candidatePaths.map(c => c.path);
    const bestPath = resolveVariantPath(candidates[0].base_name, variants, paths);

    // Find matching document
    const match = candidatePaths.find(c => c.path === bestPath);
    return match?.doc || candidates[0]; // Fallback to first
  }

  /**
   * Save JSöN document
   */
  async save(
    baseName: string,
    data: any,
    variants: VariantContext = {},
    options: SaveOptions = {}
  ): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const {
      upsert = true,
      schema,
      strategy = 'replace',
      metadata = {}
    } = options;

    // Validate with Zod if schema provided
    if (schema) {
      schema.parse(data);
    }

    // Build document record
    const record: any = {
      base_name: baseName,
      variants,
      data,
      updated_at: new Date().toISOString(),
      ...metadata
    };

    if (upsert) {
      // Try to find existing document
      const existing = await this.findExisting(baseName, variants);

      if (existing) {
        // Update existing
        if (strategy === 'merge') {
          record.data = { ...existing.data, ...data };
        } else if (strategy === 'deep-merge') {
          record.data = this.deepMerge(existing.data, data);
        }
        record.version = (existing.version || 0) + 1;

        await this.db.update(existing.id, record);
      } else {
        // Create new
        record.created_at = new Date().toISOString();
        record.version = 1;

        await this.db.create(this.options.table, record);
      }
    } else {
      // Create only (will fail if exists)
      record.created_at = new Date().toISOString();
      record.version = 1;

      await this.db.create(this.options.table, record);
    }

    // Invalidate cache
    const cacheKey = this.getCacheKey(baseName, variants);
    this.cache.delete(cacheKey);
  }

  /**
   * Find existing document matching base_name and variants
   */
  private async findExisting(baseName: string, variants: VariantContext): Promise<any | null> {
    const query = `
      SELECT * FROM ${this.options.table}
      WHERE base_name = $baseName
      AND variants = $variants
      ${this.options.userScoped ? 'AND created_by = $auth.id' : ''}
      LIMIT 1
    `;

    const [result] = await this.db.query(query, { baseName, variants });
    return result?.[0] || null;
  }

  /**
   * List available documents
   */
  async list(filter: ListFilter = {}): Promise<DocumentInfo[]> {
    if (!this.initialized) {
      await this.init();
    }

    let query = `SELECT * FROM ${this.options.table}`;
    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (filter.baseName) {
      conditions.push('base_name = $baseName');
      params.baseName = filter.baseName;
    }

    if (filter.variants) {
      // Partial variant matching
      for (const [key, value] of Object.entries(filter.variants)) {
        conditions.push(`variants.${key} = $variant_${key}`);
        params[`variant_${key}`] = value;
      }
    }

    if (this.options.userScoped) {
      conditions.push('created_by = $auth.id');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY base_name, updated_at DESC';

    const [result] = await this.db.query(query, params);
    const documents = result as any[];

    return documents.map(doc => ({
      baseName: doc.base_name,
      variants: doc.variants,
      fullName: this.buildFullName(doc.base_name, doc.variants),
      metadata: {
        createdAt: doc.created_at ? new Date(doc.created_at) : undefined,
        updatedAt: doc.updated_at ? new Date(doc.updated_at) : undefined,
        version: doc.version,
        author: doc.created_by
      }
    }));
  }

  /**
   * Delete document
   */
  async delete(baseName: string, variants: VariantContext = {}): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const existing = await this.findExisting(baseName, variants);
    if (existing) {
      await this.db.delete(existing.id);

      // Invalidate cache
      const cacheKey = this.getCacheKey(baseName, variants);
      this.cache.delete(cacheKey);
    }
  }

  /**
   * Subscribe to document changes (LIVE query)
   */
  async subscribe(
    baseName: string,
    callback: (data: any) => void,
    variants: VariantContext = {}
  ): Promise<() => void> {
    if (!this.initialized) {
      await this.init();
    }

    const query = `
      LIVE SELECT * FROM ${this.options.table}
      WHERE base_name = $baseName
      ${this.options.userScoped ? 'AND created_by = $auth.id' : ''}
    `;

    const [result] = await this.db.query(query, { baseName });
    const liveQueryId = result as string;

    await this.db.subscribeLive(liveQueryId, (action, doc) => {
      if (action === 'UPDATE' || action === 'CREATE') {
        // Check if variant matches
        const matchesVariant = this.variantsMatch(doc.variants, variants);
        if (matchesVariant) {
          callback(doc.data);

          // Update cache
          const cacheKey = this.getCacheKey(baseName, variants);
          if (this.options.cache) {
            this.cache.set(cacheKey, doc.data);
          }
        }
      }
    });

    // Return unsubscribe function
    return async () => {
      await this.db.kill(liveQueryId);
    };
  }

  /**
   * Set up automatic LIVE query for cache invalidation
   */
  private async setupLiveQuery(baseName: string, variants: VariantContext, cacheKey: string): Promise<void> {
    const unsubscribe = await this.subscribe(baseName, (data) => {
      // Auto-update cache on changes
      this.cache.set(cacheKey, data);
    }, variants);

    this.liveQueryIds.set(cacheKey, 'subscribed'); // Track subscription
  }

  /**
   * Check if document variants match requested variants
   */
  private variantsMatch(docVariants: VariantContext, requestedVariants: VariantContext): boolean {
    // If no requested variants, match any
    if (Object.keys(requestedVariants).length === 0) {
      return true;
    }

    // All requested variant keys must match
    for (const [key, value] of Object.entries(requestedVariants)) {
      if (docVariants[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Build full document name from base + variants
   */
  private buildFullName(baseName: string, variants: VariantContext): string {
    const variantStr = Object.entries(variants)
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    return variantStr ? `${baseName}:${variantStr}` : baseName;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(baseName: string, variants: VariantContext): string {
    return JSON.stringify({ baseName, variants });
  }

  /**
   * Cleanup
   */
  async close(): Promise<void> {
    // Kill all LIVE queries
    for (const queryId of this.liveQueryIds.keys()) {
      // Already unsubscribed via unsubscribe functions
    }

    await this.db.close();
    this.initialized = false;
  }
}
```

---

## Implementation: FileSystemLoader (Enhanced)

Enhance existing FileLoader with save capabilities:

```typescript
export interface FileLoaderSaveOptions extends SaveOptions {
  /**
   * Create parent directories if they don't exist
   * @default true
   */
  createDirs?: boolean;

  /**
   * Prettify JSON output
   * @default true
   */
  pretty?: boolean;

  /**
   * Extension to use when saving
   * @default '.jsön'
   */
  extension?: string;
}

export class FileLoader implements StorageProvider {
  // ... existing implementation ...

  /**
   * Save JSöN document to filesystem
   */
  async save(
    baseName: string,
    data: any,
    variants: VariantContext = {},
    options: FileLoaderSaveOptions = {}
  ): Promise<void> {
    const {
      upsert = true,
      schema,
      createDirs = true,
      pretty = true,
      extension = '.jsön'
    } = options;

    // Validate with Zod if schema provided
    if (schema) {
      schema.parse(data);
    }

    // Build filename with variants
    const filename = this.buildFilename(baseName, variants, extension);
    const fullPath = resolve(this.options.baseDir, filename);

    // Check if exists (for upsert logic)
    const { existsSync } = require('fs');
    if (!upsert && existsSync(fullPath)) {
      throw new Error(`File already exists: ${filename}`);
    }

    // Create parent directories if needed
    if (createDirs) {
      const { mkdir } = await import('fs/promises');
      const { dirname } = await import('path');
      await mkdir(dirname(fullPath), { recursive: true });
    }

    // Write file
    const { writeFile } = await import('fs/promises');
    const content = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await writeFile(fullPath, content, this.options.encoding);

    // Update available files cache
    this.availableFiles.add(this.removeExtension(filename)!);

    // Invalidate cache
    const cacheKey = this.getCacheKey(baseName, variants);
    this.fileCache.delete(cacheKey);
  }

  /**
   * Build filename from base + variants
   */
  private buildFilename(baseName: string, variants: VariantContext, extension: string): string {
    const variantStr = Object.entries(variants)
      .filter(([key, value]) => value != null)
      .map(([key, value]) => `${value}`)
      .join(':');

    return variantStr
      ? `${baseName}:${variantStr}${extension}`
      : `${baseName}${extension}`;
  }

  /**
   * List available files
   */
  async list(filter: ListFilter = {}): Promise<DocumentInfo[]> {
    if (this.availableFiles.size === 0) {
      await this.init();
    }

    let files = Array.from(this.availableFiles);

    // Filter by baseName
    if (filter.baseName) {
      files = files.filter(file => {
        const parsed = parseVariantPath(file);
        return parsed.base === filter.baseName;
      });
    }

    // Filter by variants
    if (filter.variants) {
      files = files.filter(file => {
        const parsed = parseVariantPath(file);
        return Object.entries(filter.variants!).every(
          ([key, value]) => parsed.variants[key] === value
        );
      });
    }

    return files.map(file => {
      const parsed = parseVariantPath(file);
      return {
        baseName: parsed.base,
        variants: parsed.variants,
        fullName: file,
        metadata: {} // Could read file stats here
      };
    });
  }

  /**
   * Delete file
   */
  async delete(baseName: string, variants: VariantContext = {}): Promise<void> {
    const filename = this.buildFilename(baseName, variants, this.options.extensions[0]);
    const fullPath = resolve(this.options.baseDir, filename);

    const { unlink } = await import('fs/promises');
    await unlink(fullPath);

    // Remove from cache
    const nameWithoutExt = this.removeExtension(filename);
    if (nameWithoutExt) {
      this.availableFiles.delete(nameWithoutExt);
    }

    const cacheKey = this.getCacheKey(baseName, variants);
    this.fileCache.delete(cacheKey);
  }

  async close(): Promise<void> {
    // No cleanup needed for filesystem
  }
}
```

---

## Integration with Dotted-JSON

### Usage Pattern 1: Load-Only (Current Behavior)

```typescript
import { FileLoader } from '@orbzone/dotted-json/loaders/file';
import { dotted } from '@orbzone/dotted-json';

const loader = new FileLoader({ baseDir: './i18n' });
await loader.init();

// Load as resolver
const data = dotted({
  lang: 'es',
  '.strings': 'file:strings'
}, {
  resolvers: {
    'file': (path: string, context: any) => {
      return loader.load(path, { lang: context.lang });
    }
  }
});

await data.strings; // Loads strings:es.jsön
```

### Usage Pattern 2: Load + Save

```typescript
import { SurrealDBLoader } from '@orbzone/dotted-json/loaders/surrealdb';

const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'config',
  live: true // Enable LIVE queries
});

await loader.init();

// Load config
const config = await loader.load('app-settings', { env: 'production' });

// Modify
config.features.darkMode = true;

// Save back
await loader.save('app-settings', config, { env: 'production' });

// Other clients automatically receive update via LIVE query
```

### Usage Pattern 3: Subscribe to Changes

```typescript
// Subscribe to document changes
const unsubscribe = await loader.subscribe('app-settings', (newConfig) => {
  console.log('Config updated:', newConfig);

  // Update reactive state
  pinia.setConfig(newConfig);
}, { env: 'production' });

// Later: unsubscribe
await unsubscribe();
```

### Usage Pattern 4: CMS / Admin Panel

```typescript
// Admin panel: List all translation files
const docs = await loader.list({ baseName: 'strings' });
// → [
//     { baseName: 'strings', variants: { lang: 'en' }, fullName: 'strings:en' },
//     { baseName: 'strings', variants: { lang: 'es' }, fullName: 'strings:es' },
//     { baseName: 'strings', variants: { lang: 'ja' }, fullName: 'strings:ja' }
//   ]

// Load for editing
const esStrings = await loader.load('strings', { lang: 'es' });

// Edit
esStrings.welcomeMessage = '¡Bienvenido, ${userName}!';

// Save
await loader.save('strings', esStrings, { lang: 'es' });
```

---

## Roadmap Integration

### Phase 6: Real-Time + Storage (v0.6.0 - v0.8.0)

**v0.6.0 - Storage Providers Foundation**
- [ ] Define `StorageProvider` interface
- [ ] Enhance `FileLoader` with `save()`, `list()`, `delete()`
- [ ] Add `FileLoader` tests for save functionality
- [ ] Document filesystem storage patterns

**v0.7.0 - SurrealDB Storage Provider**
- [ ] Implement `SurrealDBLoader` class
- [ ] Design database schema for JSöN documents
- [ ] Add variant resolution for DB queries
- [ ] Implement save with upsert/merge strategies
- [ ] Add `list()` and `delete()` operations
- [ ] Write comprehensive tests

**v0.8.0 - Real-Time Integration**
- [ ] Implement LIVE query support in `SurrealDBLoader`
- [ ] Add `subscribe()` for document changes
- [ ] Auto-cache invalidation on LIVE updates
- [ ] Integration with Pinia Colada cache
- [ ] Document real-time sync patterns
- [ ] Production examples (CMS, i18n editor, config manager)

---

## Benefits

### Developer Experience

**Before** (filesystem only):
```typescript
// Load from file
const strings = await loadFile('./i18n/strings:es.jsön');

// Edit
strings.welcomeMessage = '¡Hola!';

// Save manually
await writeFile('./i18n/strings:es.jsön', JSON.stringify(strings));

// No real-time sync
// No variant resolution
// No permissions
```

**After** (unified storage):
```typescript
// Works with filesystem, SurrealDB, or any provider
const loader = new SurrealDBLoader({ /* ... */ });

// Load with variant resolution
const strings = await loader.load('strings', { lang: 'es' });

// Edit
strings.welcomeMessage = '¡Hola!';

// Save with validation
await loader.save('strings', strings, { lang: 'es' }, {
  schema: StringsSchema // Zod validation
});

// Real-time sync to all clients (LIVE queries)
// Row-level permissions (SurrealDB)
// Version tracking (metadata)
```

### Use Case Unlocked

1. **Admin Panels**: Edit config/translations in UI, save to DB
2. **CMS**: Store pages/posts as JSöN with expressions
3. **Multi-Tenant**: Per-user documents with isolation
4. **Collaboration**: Multiple users editing, real-time sync
5. **Version Control**: Track document versions in metadata
6. **Hybrid Storage**: Some docs in files, some in DB

---

## Advanced Features

### Permission Detection

See [permissions-and-zod-integration.md](./permissions-and-zod-integration.md) for comprehensive design on:
- **Pre-flight permission checks** - Detect user capabilities before operations
- **Permission caching** - Fast checks (~1ms) with configurable TTL
- **UI hints** - Show/hide buttons based on permissions
- **Clear errors** - `PermissionError` vs `ValidationError` distinction

**Quick Example**:
```typescript
// Check permissions before showing UI
const permissions = await loader.getPermissions();

if (permissions.canUpdate) {
  showEditButton();
} else {
  showReadOnlyMode();
}

// Per-operation checks
if (await loader.can('delete', 'blogPost', { slug: 'my-post' })) {
  showDeleteButton();
}
```

### Zod Integration for Type Safety

See [permissions-and-zod-integration.md](./permissions-and-zod-integration.md) for full design on:
- **Single source of truth** - Define schemas once, infer TypeScript types
- **Automatic validation** - On load and save
- **Zero type drift** - Impossible for types to diverge from schemas
- **Clear error messages** - Formatted validation errors

**Quick Example**:
```typescript
// Define schema once
const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  apiTimeout: z.number().positive().max(30000)
});

// Infer TypeScript type
type Settings = z.infer<typeof SettingsSchema>;

// Create loader with schemas
const loader = new SurrealDBLoader({
  url, namespace, database,
  schemas: {
    appSettings: SettingsSchema
  }
});

// Load with automatic validation + type inference
const settings = await loader.load('appSettings');
settings.theme; // Type: 'light' | 'dark' | 'auto' ✅
settings.invalidProp; // TypeScript error ❌

// Save with automatic validation
await loader.save('appSettings', settings); // Validated by Zod
```

---

## Open Questions

### 1. Versioning Strategy

**Question**: Should we track full document history or just version numbers?

**Options**:
- **A**: Version number only (simple, minimal storage)
- **B**: Full history in separate table (audit trail, rollback capability)
- **C**: Diff-based history (efficient storage, complex queries)

**Recommendation**: Start with **A**, add **B** as optional feature later.

### 2. Conflict Resolution

**Question**: What happens if two users save simultaneously?

**Options**:
- **A**: Last-write-wins (simple, data loss possible)
- **B**: Version-based optimistic locking (detect conflicts, manual resolution)
- **C**: CRDT-based merge (automatic merge, complex)

**Recommendation**: **A** for v0.7.0, **B** as optional feature in v0.8.0.

### 3. Large Documents

**Question**: How to handle large JSöN documents (>100KB)?

**Options**:
- **A**: Store as-is (simple, may hit DB limits)
- **B**: Compress before storing (smaller, needs decompression)
- **C**: Split into chunks (complex, enables partial loading)

**Recommendation**: **A** for v0.7.0, add size warnings, document limits.

### 4. Migration Path

**Question**: How to migrate from FileLoader to SurrealDBLoader?

**Solution**: Migration tool:

```typescript
async function migrateToDatabase(
  fileLoader: FileLoader,
  dbLoader: SurrealDBLoader
) {
  const docs = await fileLoader.list();

  for (const doc of docs) {
    const data = await fileLoader.load(doc.baseName, doc.variants);
    await dbLoader.save(doc.baseName, data, doc.variants);
  }

  console.log(`Migrated ${docs.length} documents`);
}
```

### 5. Provider Ecosystem

**Question**: Should we support other storage backends?

**Potential Providers**:
- [ ] `HTTPLoader` - Load from REST API
- [ ] `S3Loader` - AWS S3 / R2 / MinIO
- [ ] `GitLoader` - Git repository as storage
- [ ] `RedisLoader` - Redis for high-speed cache
- [ ] `SupabaseLoader` - Supabase backend
- [ ] `FirebaseLoader` - Firebase Firestore

**Recommendation**: SurrealDB + Filesystem for v0.7.0-v0.8.0, community providers later.

---

## Success Metrics

- [ ] Zero-config save to filesystem (existing FileLoader)
- [ ] Zero-config save to SurrealDB (new SurrealDBLoader)
- [ ] Variant resolution works for load + save
- [ ] Real-time sync via LIVE queries
- [ ] < 5 kB bundle size for storage providers
- [ ] Production examples for 3+ use cases

---

## Next Steps

1. **Review this design** - Get feedback on API, features, priorities
2. **Implement FileLoader save** (v0.6.0) - Low-hanging fruit, tests filesystem save
3. **Implement SurrealDBLoader** (v0.7.0) - Core storage provider
4. **Add LIVE query support** (v0.8.0) - Real-time integration
5. **Document patterns** - CMS, i18n editor, config manager examples

---

**Document Status**: ✅ Complete (pending review)
**Last Updated**: 2025-10-06
**Next Review**: After user feedback
