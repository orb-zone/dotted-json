

**See Also**: [field-level-permissions-design.md](./field-level-permissions-design.md) for comprehensive **field-level permission detection** design leveraging SurrealDB's granular DEFINE FIELD PERMISSIONS capabilities.


# Permissions & Zod Integration Design

**Created**: 2025-10-06
**Status**: Implemented (v0.9.6)
**Target**: v0.7.0 (SurrealDB Storage Provider)

---

## Overview

This document designs **permission-aware storage** with **tight Zod integration** for the SurrealDBLoader, enabling:

1. **Pre-flight permission checks** - Detect if user can insert/update/delete before attempting
2. **TypeScript inference from Zod** - Single source of truth for types and validation
3. **Permission-based UI hints** - Show/hide buttons based on capabilities
4. **Graceful error handling** - Clear permission errors vs validation errors

---

## Problem Statement

### Current Limitations

**Without Permission Detection**:
```typescript
// User tries to save document
try {
  await loader.save('config', data);
} catch (error) {
  // Error thrown AFTER trying to save
  // User sees: "Permission denied" - bad UX
  // Can't disable save button preemptively
}
```

**Without Zod Integration**:
```typescript
// Types defined separately from validation
interface Config {
  apiKey: string;
  timeout: number;
}

const ConfigSchema = z.object({
  apiKey: z.string(),
  timeout: z.number()
});

// Types can drift from schema!
const config: Config = { apiKey: 'key', timeout: '5000' }; // TypeScript happy, runtime fails
```

### Desired Behavior

**With Permission Detection**:
```typescript
// Check permissions BEFORE attempting save
const permissions = await loader.getPermissions('config');

if (permissions.canUpdate) {
  await loader.save('config', data);
} else {
  showMessage('You do not have permission to update config');
}

// In Vue component
<button :disabled="!permissions.canUpdate">Save Config</button>
```

**With Zod Inference**:
```typescript
// Single source of truth
const ConfigSchema = z.object({
  apiKey: z.string(),
  timeout: z.number().positive()
});

// TypeScript types inferred from Zod
type Config = z.infer<typeof ConfigSchema>;

// Impossible for types to drift!
const config: Config = { apiKey: 'key', timeout: '5000' }; // TypeScript error!
```

---

## Design: Permission Detection

### Strategy 1: Test Query Approach

**Concept**: Execute a "dry-run" query to test if operation would succeed.

```typescript
/**
 * Check if current user has permission for specific operation
 */
async function canPerformOperation(
  db: Surreal,
  table: string,
  operation: 'select' | 'create' | 'update' | 'delete',
  recordId?: string
): Promise<boolean> {
  try {
    switch (operation) {
      case 'select':
        // Try to select a non-existent record
        const [selectResult] = await db.query(
          `SELECT * FROM ${table} WHERE id = $testId LIMIT 0`,
          { testId: `${table}:__permission_test__` }
        );
        // If no error, user has SELECT permission
        return true;

      case 'create':
        // Try to create with RETURN NONE (doesn't actually create)
        const [createResult] = await db.query(
          `CREATE ${table} CONTENT {} RETURN NONE`
        );
        return true;

      case 'update':
        // Try to update non-existent record
        if (!recordId) {
          recordId = `${table}:__permission_test__`;
        }
        const [updateResult] = await db.query(
          `UPDATE ${recordId} SET __test__ = true RETURN NONE`
        );
        return true;

      case 'delete':
        // Try to delete non-existent record
        if (!recordId) {
          recordId = `${table}:__permission_test__`;
        }
        const [deleteResult] = await db.query(
          `DELETE ${recordId} RETURN NONE`
        );
        return true;

      default:
        return false;
    }
  } catch (error: any) {
    // Check if error is permission-related
    if (error.message?.includes('permission') || error.message?.includes('denied')) {
      return false;
    }
    // Other errors (syntax, etc.) - assume no permission
    return false;
  }
}
```

**Pros**:
- ✅ Works with any permission model (WHERE clauses, roles, etc.)
- ✅ Reflects actual runtime permissions
- ✅ No special SurrealDB features needed

**Cons**:
- ❌ Extra query overhead (1 query per permission check)
- ❌ May have side effects (though `RETURN NONE` minimizes this)
- ❌ Doesn't work for row-level permissions (WHERE id = $auth.id)

---

### Strategy 2: INFO FOR TABLE + Parse Permissions

**Concept**: Use `INFO FOR TABLE` to retrieve permission clauses, then parse them.

```typescript
/**
 * Get permission clauses for a table
 */
async function getTablePermissions(
  db: Surreal,
  table: string
): Promise<TablePermissions> {
  const [result] = await db.query(`INFO FOR TABLE ${table} STRUCTURE`);

  // Example result:
  // {
  //   permissions: {
  //     select: "WHERE published = true OR author = $auth.id",
  //     create: "WHERE author = $auth.id",
  //     update: "WHERE author = $auth.id",
  //     delete: "NONE"
  //   }
  // }

  return {
    canSelect: result.permissions?.select !== 'NONE',
    canCreate: result.permissions?.create !== 'NONE',
    canUpdate: result.permissions?.update !== 'NONE',
    canDelete: result.permissions?.delete !== 'NONE',
    selectClause: result.permissions?.select,
    createClause: result.permissions?.create,
    updateClause: result.permissions?.update,
    deleteClause: result.permissions?.delete
  };
}

interface TablePermissions {
  canSelect: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  selectClause?: string;
  createClause?: string;
  updateClause?: string;
  deleteClause?: string;
}
```

**Pros**:
- ✅ Single query to get all permissions
- ✅ No side effects
- ✅ Can show permission clauses to user

**Cons**:
- ❌ Only shows permission definitions, not actual user permissions
- ❌ Can't evaluate WHERE clauses client-side (need context like $auth.id)
- ❌ Requires admin/root user to run INFO FOR TABLE

---

### Strategy 3: Hybrid Approach (Recommended)

**Concept**: Combine both strategies for best results.

```typescript
interface PermissionCheck {
  /**
   * Whether operation is theoretically allowed (from table definition)
   */
  isDefined: boolean;

  /**
   * Whether current user can actually perform operation (from test query)
   */
  canPerform: boolean;

  /**
   * Permission clause (if available)
   */
  clause?: string;

  /**
   * Last checked timestamp (for caching)
   */
  checkedAt: Date;
}

class PermissionManager {
  private cache = new Map<string, PermissionCheck>();
  private cacheTTL = 60_000; // 1 minute

  constructor(private db: Surreal) {}

  /**
   * Check if user can perform operation on table
   */
  async check(
    table: string,
    operation: 'select' | 'create' | 'update' | 'delete',
    recordId?: string
  ): Promise<PermissionCheck> {
    const cacheKey = `${table}:${operation}:${recordId || 'table'}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.checkedAt.getTime() < this.cacheTTL) {
      return cached;
    }

    // Step 1: Try test query (actual permission)
    const canPerform = await this.testOperation(table, operation, recordId);

    // Step 2: Try to get permission clause (definition)
    let clause: string | undefined;
    let isDefined = true;

    try {
      const info = await this.getTableInfo(table);
      clause = info.permissions?.[operation];
      isDefined = clause !== 'NONE' && clause !== undefined;
    } catch (error) {
      // INFO FOR TABLE may fail if not admin - that's OK
      // We have canPerform from test query
    }

    const result: PermissionCheck = {
      isDefined,
      canPerform,
      clause,
      checkedAt: new Date()
    };

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Test operation with dry-run query
   */
  private async testOperation(
    table: string,
    operation: 'select' | 'create' | 'update' | 'delete',
    recordId?: string
  ): Promise<boolean> {
    try {
      switch (operation) {
        case 'select':
          await this.db.query(
            `SELECT * FROM ${table} WHERE id = $testId LIMIT 0`,
            { testId: `${table}:__test__` }
          );
          return true;

        case 'create':
          // Use a transaction that rolls back
          await this.db.query(`
            BEGIN TRANSACTION;
            CREATE ${table} CONTENT { __permission_test: true };
            CANCEL TRANSACTION;
          `);
          return true;

        case 'update':
          await this.db.query(
            `UPDATE ${recordId || table + ':__test__'} SET __test__ = true RETURN NONE`
          );
          return true;

        case 'delete':
          await this.db.query(
            `DELETE ${recordId || table + ':__test__'} RETURN NONE`
          );
          return true;

        default:
          return false;
      }
    } catch (error: any) {
      // Permission denied or other error
      return false;
    }
  }

  /**
   * Get table info (requires admin privileges)
   */
  private async getTableInfo(table: string): Promise<any> {
    const [result] = await this.db.query(`INFO FOR TABLE ${table} STRUCTURE`);
    return result;
  }

  /**
   * Clear permission cache
   */
  clearCache(table?: string): void {
    if (table) {
      // Clear only for specific table
      for (const [key] of this.cache) {
        if (key.startsWith(table + ':')) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
  }

  /**
   * Get all permissions for a table
   */
  async getTablePermissions(table: string): Promise<{
    select: PermissionCheck;
    create: PermissionCheck;
    update: PermissionCheck;
    delete: PermissionCheck;
  }> {
    const [select, create, update, deleteOp] = await Promise.all([
      this.check(table, 'select'),
      this.check(table, 'create'),
      this.check(table, 'update'),
      this.check(table, 'delete')
    ]);

    return { select, create, update, delete: deleteOp };
  }
}
```

**Pros**:
- ✅ **Fast**: Cached results, ~1ms after first check
- ✅ **Accurate**: Test queries reflect actual permissions
- ✅ **Informative**: Shows both definition and actual capability
- ✅ **Resilient**: Works even if INFO FOR TABLE fails

**Cons**:
- ⚠️ **Complexity**: More code to maintain
- ⚠️ **Cache invalidation**: Need to clear cache when permissions change

---

## Design: Zod Integration

### Single Source of Truth Pattern

```typescript
import { z } from 'zod';

/**
 * Define schema once, use everywhere
 */
const DocumentSchemas = {
  appSettings: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.string().regex(/^[a-z]{2}$/), // ISO 639-1
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    }),
    apiTimeout: z.number().positive().max(30000)
  }),

  userProfile: z.object({
    id: z.string(),
    username: z.string().min(3).max(20),
    email: z.string().email(),
    avatar: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    preferences: z.lazy(() => DocumentSchemas.appSettings)
  }),

  blogPost: z.object({
    id: z.string(),
    title: z.string().min(1).max(200),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    content: z.string(),
    author: z.string(), // Record ID: user:xxx
    published: z.boolean(),
    tags: z.array(z.string()).max(10),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
};

/**
 * Infer TypeScript types from schemas
 */
export type AppSettings = z.infer<typeof DocumentSchemas.appSettings>;
export type UserProfile = z.infer<typeof DocumentSchemas.userProfile>;
export type BlogPost = z.infer<typeof DocumentSchemas.blogPost>;

// Now types and validation are ALWAYS in sync!
```

### SurrealDBLoader with Zod Integration

```typescript
import { z, ZodType } from 'zod';

export interface SurrealDBLoaderOptions<TSchemas extends Record<string, ZodType>> {
  url: string;
  namespace: string;
  database: string;
  auth?: AuthConfig;
  table?: string;

  /**
   * Zod schemas for document types
   *
   * Keys are document base names, values are Zod schemas
   */
  schemas?: TSchemas;

  /**
   * Validate on load (runtime safety)
   * @default true
   */
  validateOnLoad?: boolean;

  /**
   * Validate on save (prevent invalid data)
   * @default true
   */
  validateOnSave?: boolean;

  /**
   * Enable permission checking
   * @default true
   */
  checkPermissions?: boolean;

  /**
   * Cache permission checks (TTL in ms)
   * @default 60000 (1 minute)
   */
  permissionCacheTTL?: number;
}

export class SurrealDBLoader<
  TSchemas extends Record<string, ZodType> = Record<string, ZodType>
> {
  private permissionManager: PermissionManager;
  private options: Required<SurrealDBLoaderOptions<TSchemas>>;

  constructor(options: SurrealDBLoaderOptions<TSchemas>) {
    this.options = {
      table: 'jsön_documents',
      schemas: {} as TSchemas,
      validateOnLoad: true,
      validateOnSave: true,
      checkPermissions: true,
      permissionCacheTTL: 60_000,
      ...options
    };

    this.permissionManager = new PermissionManager(this.db);
  }

  /**
   * Load document with automatic Zod validation
   */
  async load<K extends keyof TSchemas>(
    baseName: K,
    variants?: VariantContext
  ): Promise<z.infer<TSchemas[K]>> {
    // Check permissions first
    if (this.options.checkPermissions) {
      const permission = await this.permissionManager.check(
        this.options.table,
        'select'
      );

      if (!permission.canPerform) {
        throw new PermissionError(
          `No permission to read documents from ${this.options.table}`,
          'select',
          permission
        );
      }
    }

    // Load document
    const data = await this.loadInternal(baseName as string, variants);

    // Validate with Zod if schema provided
    if (this.options.validateOnLoad && this.options.schemas?.[baseName]) {
      const schema = this.options.schemas[baseName];
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            `Document validation failed for '${String(baseName)}'`,
            error
          );
        }
        throw error;
      }
    }

    return data;
  }

  /**
   * Save document with automatic Zod validation
   */
  async save<K extends keyof TSchemas>(
    baseName: K,
    data: z.infer<TSchemas[K]>,
    variants?: VariantContext,
    options?: SaveOptions
  ): Promise<void> {
    // Validate with Zod if schema provided
    if (this.options.validateOnSave && this.options.schemas?.[baseName]) {
      const schema = this.options.schemas[baseName];
      try {
        schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            `Cannot save invalid document '${String(baseName)}'`,
            error
          );
        }
        throw error;
      }
    }

    // Check if document exists
    const existing = await this.findExisting(baseName as string, variants);
    const operation = existing ? 'update' : 'create';

    // Check permissions
    if (this.options.checkPermissions) {
      const permission = await this.permissionManager.check(
        this.options.table,
        operation,
        existing?.id
      );

      if (!permission.canPerform) {
        throw new PermissionError(
          `No permission to ${operation} document '${String(baseName)}'`,
          operation,
          permission
        );
      }
    }

    // Save document
    await this.saveInternal(baseName as string, data, variants, options);

    // Clear permission cache for this document
    this.permissionManager.clearCache(this.options.table);
  }

  /**
   * Check if user can perform operation
   */
  async can(
    operation: 'select' | 'create' | 'update' | 'delete',
    baseName?: keyof TSchemas,
    variants?: VariantContext
  ): Promise<boolean> {
    if (!this.options.checkPermissions) {
      return true; // Permissions disabled
    }

    // If checking specific document, need record ID
    let recordId: string | undefined;
    if (baseName && (operation === 'update' || operation === 'delete')) {
      const existing = await this.findExisting(baseName as string, variants);
      recordId = existing?.id;
    }

    const permission = await this.permissionManager.check(
      this.options.table,
      operation,
      recordId
    );

    return permission.canPerform;
  }

  /**
   * Get all permissions for the documents table
   */
  async getPermissions(): Promise<{
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }> {
    if (!this.options.checkPermissions) {
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true
      };
    }

    const perms = await this.permissionManager.getTablePermissions(
      this.options.table
    );

    return {
      canRead: perms.select.canPerform,
      canCreate: perms.create.canPerform,
      canUpdate: perms.update.canPerform,
      canDelete: perms.delete.canPerform
    };
  }

  /**
   * Get inferred TypeScript type for a document
   *
   * This is a type-level helper, no runtime behavior
   */
  inferType<K extends keyof TSchemas>(_baseName: K): z.infer<TSchemas[K]> {
    // Type-only helper, throw at runtime
    throw new Error('inferType is a type-level helper, do not call at runtime');
  }
}

/**
 * Custom error for permission issues
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public operation: string,
    public permissionCheck: PermissionCheck
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Custom error for validation issues
 */
export class ValidationError extends Error {
  constructor(message: string, public zodError: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * Get formatted error messages
   */
  getErrors(): Array<{ path: string; message: string }> {
    return this.zodError.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }));
  }
}
```

---

## Usage Examples

### Example 1: Type-Safe Document Loading

```typescript
import { DocumentSchemas } from './schemas';

// Create loader with schemas
const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  schemas: DocumentSchemas
});

await loader.init();

// Load with automatic validation and type inference
const settings = await loader.load('appSettings', { env: 'production' });

// TypeScript knows the exact type!
settings.theme; // Type: 'light' | 'dark' | 'auto'
settings.apiTimeout; // Type: number
settings.notifications.email; // Type: boolean

// TypeScript error: Property doesn't exist
settings.invalidProp; // ❌ Error!

// Runtime validation error if data doesn't match schema
try {
  const invalid = await loader.load('appSettings'); // Data has string for apiTimeout
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:', error.getErrors());
    // → [{ path: 'apiTimeout', message: 'Expected number, received string' }]
  }
}
```

### Example 2: Permission-Aware Save

```typescript
// Check permissions before showing form
const permissions = await loader.getPermissions();

if (!permissions.canUpdate) {
  showMessage('You do not have permission to edit settings');
  disableForm();
} else {
  // User can edit
  const settings = await loader.load('appSettings');

  // Make changes
  settings.theme = 'dark';
  settings.apiTimeout = 15000;

  try {
    // Save with automatic validation
    await loader.save('appSettings', settings);
    showSuccess('Settings saved!');
  } catch (error) {
    if (error instanceof PermissionError) {
      showError('Permission denied: ' + error.message);
    } else if (error instanceof ValidationError) {
      showError('Invalid data: ' + error.getErrors().map(e => e.message).join(', '));
    } else {
      showError('Save failed: ' + error.message);
    }
  }
}
```

### Example 3: Vue Component with Permissions

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loader, DocumentSchemas } from '~/lib/storage';

// Infer types from Zod
type AppSettings = z.infer<typeof DocumentSchemas.appSettings>;

const settings = ref<AppSettings | null>(null);
const permissions = ref({
  canRead: false,
  canUpdate: false
});
const saving = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  // Check permissions
  permissions.value = await loader.getPermissions();

  // Load if allowed
  if (permissions.value.canRead) {
    try {
      settings.value = await loader.load('appSettings');
    } catch (err) {
      if (err instanceof ValidationError) {
        error.value = 'Settings data is corrupted';
      } else {
        error.value = err.message;
      }
    }
  } else {
    error.value = 'You do not have permission to view settings';
  }
});

async function saveSettings() {
  if (!permissions.value.canUpdate) {
    error.value = 'You do not have permission to save settings';
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    await loader.save('appSettings', settings.value!);
    // Success!
  } catch (err) {
    if (err instanceof PermissionError) {
      error.value = 'Permission denied';
    } else if (err instanceof ValidationError) {
      error.value = 'Invalid settings: ' + err.getErrors()[0].message;
    } else {
      error.value = err.message;
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="settings-panel">
    <div v-if="error" class="error">{{ error }}</div>

    <form v-else-if="settings" @submit.prevent="saveSettings">
      <label>
        Theme:
        <select v-model="settings.theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </label>

      <label>
        API Timeout (ms):
        <input v-model.number="settings.apiTimeout" type="number" min="1000" max="30000" />
      </label>

      <button
        type="submit"
        :disabled="!permissions.canUpdate || saving"
      >
        {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </form>

    <div v-else class="loading">Loading settings...</div>
  </div>
</template>
```

### Example 4: Admin Panel with Granular Permissions

```typescript
import { loader } from '~/lib/storage';

// Admin panel: Check permissions for each document type
const documentTypes = ['appSettings', 'userProfile', 'blogPost'] as const;

const capabilities = await Promise.all(
  documentTypes.map(async (docType) => {
    const canRead = await loader.can('select', docType);
    const canCreate = await loader.can('create', docType);
    const canUpdate = await loader.can('update', docType);
    const canDelete = await loader.can('delete', docType);

    return {
      docType,
      canRead,
      canCreate,
      canUpdate,
      canDelete
    };
  })
);

// Render UI based on capabilities
for (const cap of capabilities) {
  console.log(`${cap.docType}:`, {
    'Read': cap.canRead ? '✅' : '❌',
    'Create': cap.canCreate ? '✅' : '❌',
    'Update': cap.canUpdate ? '✅' : '❌',
    'Delete': cap.canDelete ? '✅' : '❌'
  });
}

// Example output:
// appSettings: { Read: ✅, Create: ❌, Update: ✅, Delete: ❌ }
// userProfile: { Read: ✅, Create: ✅, Update: ✅, Delete: ❌ }
// blogPost: { Read: ✅, Create: ✅, Update: ✅, Delete: ✅ }
```

---

## Benefits

### 1. Type Safety End-to-End

**Before**:
```typescript
// Types and validation can drift
interface Settings {
  theme: string;
  timeout: number;
}

const settings: Settings = { theme: 'dark', timeout: '5000' }; // ❌ Runtime error!
```

**After**:
```typescript
// Single source of truth
const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  timeout: z.number()
});

type Settings = z.infer<typeof SettingsSchema>;

const settings: Settings = { theme: 'dark', timeout: '5000' }; // ✅ TypeScript error!
```

### 2. Better UX with Permission Checks

**Before**:
```typescript
// User clicks save
try {
  await save();
} catch (error) {
  // Show error AFTER failed attempt
  showError('Permission denied');
}
```

**After**:
```typescript
// Check permissions BEFORE showing form
const can = await loader.can('update');

if (can) {
  showForm(); // User can edit
} else {
  showReadOnly(); // User can only view
}

// Or disable save button
<button :disabled="!canUpdate">Save</button>
```

### 3. Clear Error Messages

**Before**:
```typescript
catch (error) {
  // Generic error
  console.error(error); // "Error: Query failed"
}
```

**After**:
```typescript
catch (error) {
  if (error instanceof PermissionError) {
    // Permission issue
    console.error('Permission denied:', error.operation);
    console.log('Permission check:', error.permissionCheck);
  } else if (error instanceof ValidationError) {
    // Validation issue
    console.error('Validation errors:', error.getErrors());
    // → [{ path: 'apiTimeout', message: 'Expected number, got string' }]
  } else {
    // Other error
    console.error('Unknown error:', error);
  }
}
```

### 4. Performance Optimization

**Permission caching**:
```typescript
// First call: ~50ms (test query)
await loader.can('update'); // 50ms

// Cached calls: ~1ms
await loader.can('update'); // 1ms (from cache)
await loader.can('update'); // 1ms (from cache)

// Cache expires after 1 minute (configurable)
```

---

## Open Questions

### 1. Permission Cache Invalidation

**Question**: When should permission cache be cleared?

**Options**:
- **A**: TTL only (current approach, 1 minute default)
- **B**: On save/delete operations (assumes permissions might change)
- **C**: Manual invalidation only (user calls `clearCache()`)
- **D**: LIVE query on permission changes (requires SurrealDB 2.x feature)

**Recommendation**: **A + B** - TTL with automatic clear on writes.

### 2. Zod Schema Storage Location

**Question**: Where should Zod schemas be defined?

**Options**:
- **A**: Centralized file (`schemas.ts`) - easy to find, single source
- **B**: Co-located with components - better encapsulation
- **C**: In SurrealDB (as DEFINE FIELD constraints) - database-driven
- **D**: Hybrid (Zod for client, SurrealDB for server)

**Recommendation**: **D** - Define in Zod for client validation + type inference, mirror in SurrealDB DEFINE FIELD for server-side enforcement.

### 3. Permission Check Granularity

**Question**: Should permission checks be per-table or per-document?

**Current**: Per-table (faster, simpler)
**Alternative**: Per-document (more accurate, slower)

**Example**:
```typescript
// Per-table: "Can I update ANY document in this table?"
await loader.can('update'); // Fast, cached

// Per-document: "Can I update THIS SPECIFIC document?"
await loader.can('update', 'blogPost', { slug: 'my-post' }); // Slower, requires lookup
```

**Recommendation**: Support both, default to per-table for performance.

### 4. Zod Transform Handling

**Question**: How to handle Zod transforms (input type ≠ output type)?

**Example**:
```typescript
const DateSchema = z.string().transform(str => new Date(str));

type Input = z.input<typeof DateSchema>; // string
type Output = z.output<typeof DateSchema>; // Date
```

**Options**:
- **A**: Use `z.output<>` for inferred types (transformed data)
- **B**: Use `z.input<>` for inferred types (raw data)
- **C**: Store transformed data in DB (serialize Date → string on save)
- **D**: Disallow transforms in storage schemas

**Recommendation**: **A + C** - Use output types, serialize transforms before storage.

---

## Implementation Checklist

### v0.7.0 - SurrealDB Storage + Permissions

- [ ] Implement `PermissionManager` class
  - [ ] Test query approach for permission checks
  - [ ] Permission caching with configurable TTL
  - [ ] `check()` method for single operation
  - [ ] `getTablePermissions()` for all operations
  - [ ] `clearCache()` for invalidation

- [ ] Enhance `SurrealDBLoader` with permissions
  - [ ] Add `checkPermissions` option (default: true)
  - [ ] Check permissions in `load()`, `save()`, `delete()`
  - [ ] Add `can()` method for pre-flight checks
  - [ ] Add `getPermissions()` for UI hints
  - [ ] Throw `PermissionError` with context

- [ ] Add Zod integration
  - [ ] Accept `schemas` option (typed generics)
  - [ ] Validate on load (with `validateOnLoad` flag)
  - [ ] Validate on save (with `validateOnSave` flag)
  - [ ] Throw `ValidationError` with formatted errors
  - [ ] Type-safe `load()` and `save()` methods

- [ ] Write comprehensive tests
  - [ ] Permission checks with different roles
  - [ ] Zod validation on load/save
  - [ ] Error handling (PermissionError, ValidationError)
  - [ ] Permission caching behavior
  - [ ] Type inference (compile-time tests)

- [ ] Document patterns
  - [ ] Type-safe loading with Zod
  - [ ] Permission-aware UI components
  - [ ] Error handling best practices
  - [ ] Schema design guidelines

---

## Success Metrics

- [ ] Zero type drift (Zod + TypeScript always in sync)
- [ ] Permission checks < 2ms (with caching)
- [ ] Clear error types (PermissionError vs ValidationError)
- [ ] Works with all SurrealDB permission models
- [ ] Production example: Admin panel with granular permissions

---

**Document Status**: ✅ Complete (pending review)
**Last Updated**: 2025-10-06
**Next Steps**: Review design, gather feedback, implement in v0.7.0
