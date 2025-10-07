# Field-Level Permissions Design for JSÖN Storage

**Created**: 2025-10-06
**Status**: Design Phase
**Target**: v0.7.0 (SurrealDB Storage Provider)

---

## Overview

This document designs **field-level permission detection and enforcement** for the SurrealDB JSÖN storage provider, leveraging SurrealDB's powerful field-level PERMISSIONS clauses.

**Key Capability**: Detect which fields a user can read/write **before** attempting operations, enabling:
- Conditional UI rendering (hide sensitive fields)
- Partial document updates (only writable fields)
- Clear error messages (field-specific permission denials)
- Secure document schemas (sensitive data protection)

---

## SurrealDB Field-Level Permissions Primer

### Database Schema Example

```sql
-- User profile with field-level permissions
DEFINE TABLE user SCHEMAFULL;

-- Public fields (anyone can read)
DEFINE FIELD username ON user TYPE string
  PERMISSIONS
    FOR select FULL
    FOR create WHERE $auth.id = id
    FOR update WHERE $auth.id = id;

DEFINE FIELD avatar ON user TYPE option<string>
  PERMISSIONS FULL;

-- Private fields (owner only)
DEFINE FIELD email ON user TYPE string
  PERMISSIONS
    FOR select WHERE $auth.id = id OR $auth.role = 'admin'
    FOR create WHERE $auth.id = id
    FOR update WHERE $auth.id = id OR $auth.role = 'admin';

DEFINE FIELD password_hash ON user TYPE string
  PERMISSIONS
    FOR select NONE  -- Never readable
    FOR create WHERE $auth.id = id
    FOR update WHERE $auth.id = id;

-- Admin-only fields
DEFINE FIELD role ON user TYPE string
  PERMISSIONS
    FOR select WHERE $auth.id = id OR $auth.role = 'admin'
    FOR create NONE  -- System only
    FOR update WHERE $auth.role = 'admin';

DEFINE FIELD account_balance ON user TYPE decimal
  PERMISSIONS
    FOR select WHERE $auth.id = id
    FOR create NONE  -- System only
    FOR update NONE; -- System only (read-only for users)

-- Computed fields
DEFINE FIELD full_name ON user TYPE string
  VALUE $this.first_name + ' ' + $this.last_name
  PERMISSIONS FULL;
```

### Permission Behavior

When a user queries `SELECT * FROM user:alice`:
- **Owner (alice)**: Gets all fields (username, email, password_hash, role, account_balance, etc.)
- **Admin**: Gets all fields except password_hash (NONE for select)
- **Other users**: Gets only public fields (username, avatar, full_name)
- **Anonymous**: Permission denied (no $auth.id)

**Key Insight**: SurrealDB automatically filters fields based on permissions. Client never receives fields they can't access.

---

## Problem Statement

### Current Limitation

Without field-level permission detection:

```typescript
// User tries to update their profile
const profile = await loader.load('userProfile', { userId: 'user:alice' });

// User modifies email (allowed) and role (not allowed)
profile.email = 'newemail@example.com';
profile.role = 'admin'; // ❌ Should be blocked!

// Save fails with generic error
await loader.save('userProfile', profile); // Error: Permission denied
```

**Problems**:
1. No way to know which fields are writable before attempting save
2. Can't hide read-only fields in UI
3. Generic error doesn't explain which field failed
4. Wasted network round-trip

### Desired Behavior

With field-level permission detection:

```typescript
// Get field permissions
const fieldPerms = await loader.getFieldPermissions('userProfile');
// → {
//     username: { canRead: true, canWrite: true },
//     email: { canRead: true, canWrite: true },
//     password_hash: { canRead: false, canWrite: true },
//     role: { canRead: true, canWrite: false },
//     account_balance: { canRead: true, canWrite: false }
//   }

// Render form with conditional fields
<input v-model="profile.email" :readonly="!fieldPerms.email.canWrite" />
<input v-model="profile.role" :readonly="!fieldPerms.role.canWrite" />

// Or hide entirely
<div v-if="fieldPerms.password_hash.canWrite">
  <input type="password" v-model="newPassword" />
</div>

// Validate before save
const writableFields = Object.keys(profile).filter(
  field => fieldPerms[field]?.canWrite
);

const dataToSave = pick(profile, writableFields);
await loader.save('userProfile', dataToSave); // Only writable fields
```

---

## Design: Field Permission Detection

### Strategy 1: INFO FOR TABLE STRUCTURE

**Concept**: Use `INFO FOR TABLE ... STRUCTURE` to get field permission definitions.

```typescript
interface FieldPermissionInfo {
  type: string;
  kind: 'normal' | 'computed' | 'flexible';
  readonly: boolean;
  permissions: {
    select?: string;  // Permission clause or 'FULL' or 'NONE'
    create?: string;
    update?: string;
  };
}

async function getTableStructure(
  db: Surreal,
  table: string
): Promise<Map<string, FieldPermissionInfo>> {
  const [result] = await db.query(`INFO FOR TABLE ${table} STRUCTURE`);

  // Example result:
  // {
  //   fields: {
  //     username: {
  //       kind: 'normal',
  //       type: 'string',
  //       permissions: {
  //         select: 'FULL',
  //         create: 'WHERE $auth.id = id',
  //         update: 'WHERE $auth.id = id'
  //       },
  //       readonly: false
  //     },
  //     password_hash: {
  //       kind: 'normal',
  //       type: 'string',
  //       permissions: {
  //         select: 'NONE',
  //         create: 'WHERE $auth.id = id',
  //         update: 'WHERE $auth.id = id'
  //       },
  //       readonly: false
  //     },
  //     account_balance: {
  //       kind: 'normal',
  //       type: 'decimal',
  //       permissions: {
  //         select: 'WHERE $auth.id = id',
  //         create: 'NONE',
  //         update: 'NONE'
  //       },
  //       readonly: true  // No update permission
  //     },
  //     full_name: {
  //       kind: 'computed',
  //       type: 'string',
  //       permissions: { select: 'FULL' },
  //       readonly: true  // Computed field
  //     }
  //   }
  // }

  const fieldMap = new Map<string, FieldPermissionInfo>();

  for (const [fieldName, fieldInfo] of Object.entries(result.fields || {})) {
    fieldMap.set(fieldName, fieldInfo as FieldPermissionInfo);
  }

  return fieldMap;
}
```

**Pros**:
- ✅ Single query gets all field metadata
- ✅ Shows permission clauses (useful for debugging)
- ✅ Identifies computed/readonly fields
- ✅ No side effects

**Cons**:
- ❌ Requires admin privileges (INFO FOR TABLE)
- ❌ Only shows definitions, not actual user permissions
- ❌ Can't evaluate WHERE clauses client-side

---

### Strategy 2: Test Query with Field Projection

**Concept**: Execute test queries to probe which fields are accessible.

```typescript
async function testFieldAccess(
  db: Surreal,
  table: string,
  field: string,
  operation: 'select' | 'update',
  recordId?: string
): Promise<boolean> {
  try {
    switch (operation) {
      case 'select':
        // Try to select just this field from a test record
        const [selectResult] = await db.query(
          `SELECT ${field} FROM ${recordId || table + ':__test__'} LIMIT 1`
        );
        // If no error, field is readable
        return true;

      case 'update':
        // Try to update field on test/non-existent record
        const [updateResult] = await db.query(
          `UPDATE ${recordId || table + ':__test__'} SET ${field} = ${field} RETURN NONE`
        );
        // If no error, field is writable
        return true;

      default:
        return false;
    }
  } catch (error: any) {
    // Permission denied or field doesn't exist
    return false;
  }
}

async function getFieldPermissions(
  db: Surreal,
  table: string,
  fields: string[],
  recordId?: string
): Promise<Map<string, { canRead: boolean; canWrite: boolean }>> {
  const permissions = new Map();

  // Test each field in parallel
  await Promise.all(
    fields.map(async (field) => {
      const [canRead, canWrite] = await Promise.all([
        testFieldAccess(db, table, field, 'select', recordId),
        testFieldAccess(db, table, field, 'update', recordId)
      ]);

      permissions.set(field, { canRead, canWrite });
    })
  );

  return permissions;
}
```

**Pros**:
- ✅ Reflects actual user permissions (evaluates WHERE clauses)
- ✅ Works for any user (no admin required)
- ✅ Accurate for current $auth context

**Cons**:
- ❌ Multiple queries (N queries for N fields)
- ❌ Slower than INFO approach
- ❌ May have unintended side effects

---

### Strategy 3: Hybrid Approach with Introspection (Recommended)

**Concept**: Combine INFO (schema) + test queries (validation) + smart caching.

```typescript
interface FieldPermissions {
  /**
   * Whether field can be read by current user
   */
  canRead: boolean;

  /**
   * Whether field can be written by current user
   */
  canWrite: boolean;

  /**
   * Whether field is computed (always readonly)
   */
  isComputed: boolean;

  /**
   * Whether field is system-managed (no user writes)
   */
  isReadOnly: boolean;

  /**
   * Field type (from schema)
   */
  type?: string;

  /**
   * Permission clauses (if INFO available)
   */
  clauses?: {
    select?: string;
    create?: string;
    update?: string;
  };
}

class FieldPermissionManager {
  private schemaCache = new Map<string, Map<string, FieldPermissionInfo>>();
  private permissionCache = new Map<string, Map<string, FieldPermissions>>();
  private cacheTTL = 60_000; // 1 minute

  constructor(private db: Surreal) {}

  /**
   * Get field permissions for a table
   *
   * @param table - Table name (e.g., 'user', 'jsön_documents')
   * @param recordId - Optional specific record ID for row-level checks
   */
  async getFieldPermissions(
    table: string,
    recordId?: string
  ): Promise<Map<string, FieldPermissions>> {
    const cacheKey = `${table}:${recordId || 'table'}`;

    // Check cache
    const cached = this.permissionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Step 1: Get schema (if possible)
    let schema: Map<string, FieldPermissionInfo> | null = null;
    try {
      schema = await this.getTableStructure(table);
    } catch (error) {
      // INFO FOR TABLE failed (not admin) - that's OK
      // We'll fall back to test queries
    }

    // Step 2: Determine which fields to test
    let fieldsToTest: string[];

    if (schema) {
      // Use schema fields
      fieldsToTest = Array.from(schema.keys());
    } else if (recordId) {
      // Load record to discover fields
      const [result] = await this.db.query(`SELECT * FROM ${recordId} LIMIT 1`);
      const record = result?.[0];
      fieldsToTest = record ? Object.keys(record) : [];
    } else {
      // No schema, no record - can't determine fields
      throw new Error('Cannot determine fields without schema or record');
    }

    // Step 3: Test each field's accessibility
    const permissions = new Map<string, FieldPermissions>();

    await Promise.all(
      fieldsToTest.map(async (field) => {
        const fieldInfo = schema?.get(field);

        // Check if computed or readonly from schema
        const isComputed = fieldInfo?.kind === 'computed';
        const isReadOnly = fieldInfo?.readonly || false;

        // Determine permissions
        let canRead = false;
        let canWrite = false;

        if (fieldInfo) {
          // Use schema hints to avoid unnecessary queries
          const selectPerm = fieldInfo.permissions.select;
          const updatePerm = fieldInfo.permissions.update;

          // If NONE, skip test query
          if (selectPerm === 'NONE') {
            canRead = false;
          } else if (selectPerm === 'FULL') {
            canRead = true;
          } else {
            // WHERE clause - need to test
            canRead = await this.testFieldRead(table, field, recordId);
          }

          if (isComputed || isReadOnly) {
            canWrite = false;
          } else if (updatePerm === 'NONE') {
            canWrite = false;
          } else if (updatePerm === 'FULL') {
            canWrite = true;
          } else {
            // WHERE clause - need to test
            canWrite = await this.testFieldWrite(table, field, recordId);
          }
        } else {
          // No schema info - test directly
          [canRead, canWrite] = await Promise.all([
            this.testFieldRead(table, field, recordId),
            this.testFieldWrite(table, field, recordId)
          ]);
        }

        permissions.set(field, {
          canRead,
          canWrite,
          isComputed,
          isReadOnly,
          type: fieldInfo?.type,
          clauses: fieldInfo?.permissions
        });
      })
    );

    // Cache result
    this.permissionCache.set(cacheKey, permissions);

    // Auto-expire cache
    setTimeout(() => {
      this.permissionCache.delete(cacheKey);
    }, this.cacheTTL);

    return permissions;
  }

  /**
   * Get schema from INFO FOR TABLE STRUCTURE
   */
  private async getTableStructure(table: string): Promise<Map<string, FieldPermissionInfo>> {
    // Check cache
    const cached = this.schemaCache.get(table);
    if (cached) {
      return cached;
    }

    const [result] = await this.db.query(`INFO FOR TABLE ${table} STRUCTURE`);
    const fieldMap = new Map<string, FieldPermissionInfo>();

    for (const [fieldName, fieldInfo] of Object.entries(result.fields || {})) {
      fieldMap.set(fieldName, fieldInfo as FieldPermissionInfo);
    }

    // Cache schema (longer TTL since schema changes less often)
    this.schemaCache.set(table, fieldMap);

    return fieldMap;
  }

  /**
   * Test if field is readable
   */
  private async testFieldRead(
    table: string,
    field: string,
    recordId?: string
  ): Promise<boolean> {
    try {
      await this.db.query(
        `SELECT ${field} FROM ${recordId || table + ':__test__'} LIMIT 1`
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test if field is writable
   */
  private async testFieldWrite(
    table: string,
    field: string,
    recordId?: string
  ): Promise<boolean> {
    try {
      // Use transaction that gets cancelled to avoid side effects
      await this.db.query(`
        BEGIN TRANSACTION;
        UPDATE ${recordId || table + ':__test__'} SET ${field} = ${field};
        CANCEL TRANSACTION;
      `);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get permissions for specific field
   */
  async can(
    table: string,
    field: string,
    operation: 'read' | 'write',
    recordId?: string
  ): Promise<boolean> {
    const permissions = await this.getFieldPermissions(table, recordId);
    const fieldPerm = permissions.get(field);

    if (!fieldPerm) {
      return false; // Field doesn't exist or not accessible
    }

    return operation === 'read' ? fieldPerm.canRead : fieldPerm.canWrite;
  }

  /**
   * Clear caches
   */
  clearCache(table?: string): void {
    if (table) {
      this.schemaCache.delete(table);
      for (const [key] of this.permissionCache) {
        if (key.startsWith(table + ':')) {
          this.permissionCache.delete(key);
        }
      }
    } else {
      this.schemaCache.clear();
      this.permissionCache.clear();
    }
  }
}
```

---

## Integration with SurrealDBLoader

### Enhanced Loader with Field Permissions

```typescript
export class SurrealDBLoader<TSchemas extends Record<string, ZodType>> {
  private fieldPermissionManager: FieldPermissionManager;

  constructor(options: SurrealDBLoaderOptions<TSchemas>) {
    // ... existing initialization ...
    this.fieldPermissionManager = new FieldPermissionManager(this.db);
  }

  /**
   * Load document with field filtering based on permissions
   */
  async load<K extends keyof TSchemas>(
    baseName: K,
    variants?: VariantContext,
    options?: LoadOptions
  ): Promise<z.infer<TSchemas[K]>> {
    const { includePermissions = false } = options || {};

    // Load document (SurrealDB auto-filters inaccessible fields)
    const data = await this.loadInternal(baseName as string, variants);

    // Optionally get field permissions
    if (includePermissions) {
      const docId = data.id; // Assuming documents have an id field
      const fieldPerms = await this.fieldPermissionManager.getFieldPermissions(
        this.options.table,
        docId
      );

      // Attach permissions metadata
      Object.defineProperty(data, '__fieldPermissions__', {
        value: Object.fromEntries(fieldPerms),
        enumerable: false,
        writable: false
      });
    }

    return data;
  }

  /**
   * Save document with field-level permission validation
   */
  async save<K extends keyof TSchemas>(
    baseName: K,
    data: z.infer<TSchemas[K]>,
    variants?: VariantContext,
    options?: SaveOptions
  ): Promise<void> {
    const { validateFields = true } = options || {};

    // Find existing document
    const existing = await this.findExisting(baseName as string, variants);
    const recordId = existing?.id;

    if (validateFields && recordId) {
      // Get field permissions
      const fieldPerms = await this.fieldPermissionManager.getFieldPermissions(
        this.options.table,
        recordId
      );

      // Check which fields user is trying to update
      const fieldsToUpdate = Object.keys(data);
      const deniedFields: string[] = [];

      for (const field of fieldsToUpdate) {
        const perm = fieldPerms.get(field);

        if (!perm) {
          // Field doesn't exist in schema
          continue;
        }

        if (!perm.canWrite) {
          deniedFields.push(field);
        }
      }

      // If any fields are denied, throw detailed error
      if (deniedFields.length > 0) {
        throw new FieldPermissionError(
          `Cannot update fields: ${deniedFields.join(', ')}`,
          deniedFields,
          fieldPerms
        );
      }
    }

    // Proceed with save
    await this.saveInternal(baseName as string, data, variants, options);
  }

  /**
   * Get field permissions for a document type
   */
  async getFieldPermissions<K extends keyof TSchemas>(
    baseName: K,
    variants?: VariantContext
  ): Promise<Record<string, FieldPermissions>> {
    // Try to find existing document to get record ID
    const existing = await this.findExisting(baseName as string, variants);
    const recordId = existing?.id;

    const permissions = await this.fieldPermissionManager.getFieldPermissions(
      this.options.table,
      recordId
    );

    return Object.fromEntries(permissions);
  }

  /**
   * Check if specific field can be read/written
   */
  async canAccessField<K extends keyof TSchemas>(
    baseName: K,
    field: string,
    operation: 'read' | 'write',
    variants?: VariantContext
  ): Promise<boolean> {
    const existing = await this.findExisting(baseName as string, variants);
    const recordId = existing?.id;

    return this.fieldPermissionManager.can(
      this.options.table,
      field,
      operation,
      recordId
    );
  }

  /**
   * Filter data to only writable fields
   */
  async getWritableData<K extends keyof TSchemas>(
    baseName: K,
    data: z.infer<TSchemas[K]>,
    variants?: VariantContext
  ): Promise<Partial<z.infer<TSchemas[K]>>> {
    const permissions = await this.getFieldPermissions(baseName, variants);

    const writableData: any = {};

    for (const [field, value] of Object.entries(data)) {
      if (permissions[field]?.canWrite) {
        writableData[field] = value;
      }
    }

    return writableData;
  }
}

/**
 * Custom error for field permission issues
 */
export class FieldPermissionError extends Error {
  constructor(
    message: string,
    public deniedFields: string[],
    public fieldPermissions: Map<string, FieldPermissions>
  ) {
    super(message);
    this.name = 'FieldPermissionError';
  }

  /**
   * Get detailed error information
   */
  getDetails(): Array<{ field: string; canRead: boolean; canWrite: boolean; reason: string }> {
    return this.deniedFields.map(field => {
      const perm = this.fieldPermissions.get(field);
      return {
        field,
        canRead: perm?.canRead || false,
        canWrite: perm?.canWrite || false,
        reason: perm?.isReadOnly
          ? 'Field is read-only'
          : perm?.isComputed
            ? 'Field is computed'
            : 'Permission denied'
      };
    });
  }
}

interface LoadOptions {
  /**
   * Include field permissions metadata in loaded document
   * @default false
   */
  includePermissions?: boolean;
}

interface SaveOptions {
  /**
   * Validate field-level permissions before save
   * @default true
   */
  validateFields?: boolean;

  // ... other existing options ...
}
```

---

## Usage Examples

### Example 1: Conditional Form Rendering

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loader } from '~/lib/storage';

const profile = ref(null);
const fieldPerms = ref({});

onMounted(async () => {
  // Load user profile
  profile.value = await loader.load('userProfile', { userId: 'user:alice' });

  // Get field permissions
  fieldPerms.value = await loader.getFieldPermissions('userProfile', { userId: 'user:alice' });
});

function canEdit(field: string): boolean {
  return fieldPerms.value[field]?.canWrite || false;
}

function isVisible(field: string): boolean {
  return fieldPerms.value[field]?.canRead || false;
}
</script>

<template>
  <form v-if="profile">
    <!-- Public field: always editable by owner -->
    <label>
      Username:
      <input
        v-model="profile.username"
        :readonly="!canEdit('username')"
      />
    </label>

    <!-- Private field: visible to owner, editable by owner -->
    <label v-if="isVisible('email')">
      Email:
      <input
        v-model="profile.email"
        :readonly="!canEdit('email')"
        type="email"
      />
    </label>

    <!-- Admin-only field: visible but not editable by regular users -->
    <label v-if="isVisible('role')">
      Role:
      <input
        v-model="profile.role"
        :readonly="!canEdit('role')"
      />
      <span v-if="!canEdit('role')" class="hint">
        (Contact admin to change role)
      </span>
    </label>

    <!-- Sensitive field: never visible in select, but can be updated -->
    <div v-if="canEdit('password_hash')">
      <label>
        New Password:
        <input v-model="newPassword" type="password" />
      </label>
    </div>

    <!-- Read-only field: visible but never editable -->
    <label v-if="isVisible('account_balance')">
      Account Balance:
      <input
        :value="profile.account_balance"
        readonly
        disabled
      />
    </label>

    <!-- Computed field: always visible, always readonly -->
    <label v-if="isVisible('full_name')">
      Full Name:
      <input
        :value="profile.full_name"
        readonly
        disabled
      />
    </label>
  </form>
</template>
```

### Example 2: Partial Updates with Field Filtering

```typescript
import { loader } from '~/lib/storage';

// Admin wants to update user profile
const userId = 'user:bob';
const updates = {
  username: 'bob_updated',
  email: 'newemail@example.com',
  role: 'moderator',        // Admin can update
  account_balance: 1000.00  // System-only, should be filtered
};

// Option 1: Let loader filter writable fields
const writableUpdates = await loader.getWritableData('userProfile', updates, { userId });
await loader.save('userProfile', writableUpdates, { userId });
// → Only saves: { username, email, role }
// → Ignores: account_balance (readonly)

// Option 2: Explicit field validation
try {
  await loader.save('userProfile', updates, { userId }, { validateFields: true });
} catch (error) {
  if (error instanceof FieldPermissionError) {
    console.error('Cannot update fields:', error.deniedFields);
    // → ['account_balance']

    const details = error.getDetails();
    // → [{ field: 'account_balance', canRead: true, canWrite: false, reason: 'Field is read-only' }]
  }
}
```

### Example 3: Admin Panel with Field Visibility

```typescript
import { loader } from '~/lib/storage';

// Admin panel: Show which fields each role can access
const roles = ['user', 'moderator', 'admin'];
const fieldAccessMatrix: Record<string, Record<string, { read: boolean; write: boolean }>> = {};

for (const role of roles) {
  // Authenticate as role (in real app, would be different sessions)
  const testUser = { id: 'test-user', role };

  // Get field permissions
  const fieldPerms = await loader.getFieldPermissions('userProfile');

  fieldAccessMatrix[role] = {};
  for (const [field, perm] of Object.entries(fieldPerms)) {
    fieldAccessMatrix[role][field] = {
      read: perm.canRead,
      write: perm.canWrite
    };
  }
}

console.table(fieldAccessMatrix);
// Output:
// ┌──────────────────┬────────────────────┬─────────────────────┬───────────────────┐
// │                  │ user               │ moderator           │ admin             │
// ├──────────────────┼────────────────────┼─────────────────────┼───────────────────┤
// │ username         │ R: ✅ W: ✅        │ R: ✅ W: ✅         │ R: ✅ W: ✅       │
// │ email            │ R: ✅ W: ✅        │ R: ✅ W: ✅         │ R: ✅ W: ✅       │
// │ password_hash    │ R: ❌ W: ✅        │ R: ❌ W: ✅         │ R: ❌ W: ✅       │
// │ role             │ R: ✅ W: ❌        │ R: ✅ W: ❌         │ R: ✅ W: ✅       │
// │ account_balance  │ R: ✅ W: ❌        │ R: ✅ W: ❌         │ R: ✅ W: ❌       │
// │ full_name        │ R: ✅ W: ❌        │ R: ✅ W: ❌         │ R: ✅ W: ❌       │
// └──────────────────┴────────────────────┴─────────────────────┴───────────────────┘
```

### Example 4: Zod Schema with Field Permissions

```typescript
import { z } from 'zod';

// Define Zod schema matching SurrealDB field definitions
const UserProfileSchema = z.object({
  id: z.string(),

  // Public fields
  username: z.string().min(3).max(20),
  avatar: z.string().url().optional(),

  // Private fields
  email: z.string().email(),

  // Sensitive fields (never returned in select)
  password_hash: z.string().optional(), // Optional because might not be readable

  // Admin-only fields
  role: z.enum(['user', 'moderator', 'admin']),

  // System fields (readonly)
  account_balance: z.number(),

  // Computed fields
  full_name: z.string()
});

type UserProfile = z.infer<typeof UserProfileSchema>;

// Create loader
const loader = new SurrealDBLoader({
  url, namespace, database,
  schemas: {
    userProfile: UserProfileSchema
  }
});

// Load profile (auto-filtered by permissions)
const profile = await loader.load('userProfile', { userId: 'user:alice' });

// TypeScript knows all possible fields
profile.username;  // Type: string
profile.email;     // Type: string
profile.role;      // Type: 'user' | 'moderator' | 'admin'

// But at runtime, some might be undefined (permission filtered)
if (profile.password_hash !== undefined) {
  // User has permission to read password_hash
  // (In practice, this is always false due to PERMISSIONS FOR select NONE)
}

// Get field permissions for UI
const fieldPerms = await loader.getFieldPermissions('userProfile');

// Conditionally render fields
if (fieldPerms.email?.canWrite) {
  showEmailEditField();
}
```

---

## Benefits

### 1. Granular Security

**Before** (table-level only):
```sql
DEFINE TABLE user PERMISSIONS
  FOR update WHERE id = $auth.id;
```
→ User can update **all** fields on their profile, including sensitive ones

**After** (field-level):
```sql
DEFINE FIELD email ON user
  PERMISSIONS FOR update WHERE id = $auth.id;

DEFINE FIELD role ON user
  PERMISSIONS FOR update WHERE $auth.role = 'admin';

DEFINE FIELD account_balance ON user
  PERMISSIONS FOR update NONE;  -- System-only
```
→ User can only update **specific** fields, admins can update roles, balance is system-only

### 2. Better UX

**Before**:
- Show all fields in form
- User edits read-only field
- Save fails with generic error
- User confused

**After**:
- Check field permissions first
- Show read-only fields as disabled
- Or hide entirely
- Clear feedback before attempting save

### 3. Reduced Network Traffic

**Before**:
```typescript
// User tries to save entire profile including readonly fields
await save(profile); // ❌ Server rejects
```

**After**:
```typescript
// Filter to only writable fields before sending
const writable = await getWritableData(profile);
await save(writable); // ✅ Only sends what can be written
```

### 4. Clear Error Messages

**Before**:
```
Error: Permission denied
```

**After**:
```typescript
FieldPermissionError: Cannot update fields: role, account_balance
Details:
- role: Permission denied (admin-only field)
- account_balance: Field is read-only (system-managed)
```

---

## Implementation Checklist

### v0.7.0 - Field-Level Permissions

- [ ] Implement `FieldPermissionManager` class
  - [ ] `getFieldPermissions()` with schema + test query hybrid
  - [ ] `can()` for single field checks
  - [ ] Permission caching with TTL
  - [ ] `clearCache()` for invalidation

- [ ] Enhance `SurrealDBLoader`
  - [ ] Add `getFieldPermissions()` method
  - [ ] Add `canAccessField()` for single field checks
  - [ ] Add `getWritableData()` to filter writable fields
  - [ ] Add `validateFields` option to `save()`
  - [ ] Throw `FieldPermissionError` with details

- [ ] Add `FieldPermissionError` class
  - [ ] `deniedFields` array
  - [ ] `getDetails()` for formatted error info

- [ ] Write comprehensive tests
  - [ ] Field permission detection (read/write)
  - [ ] Computed field detection (always readonly)
  - [ ] System field detection (readonly)
  - [ ] Permission caching behavior
  - [ ] Error handling (FieldPermissionError)

- [ ] Document patterns
  - [ ] Conditional form rendering
  - [ ] Partial document updates
  - [ ] Admin panels with field visibility matrix
  - [ ] Zod schema + field permissions integration

---

## Success Metrics

- [ ] Detect field permissions in < 100ms (with caching: < 2ms)
- [ ] Support all SurrealDB field permission types (select/create/update)
- [ ] Identify computed and readonly fields automatically
- [ ] Clear error messages showing which fields failed
- [ ] Production example: Admin panel with field-level access matrix

---

**Document Status**: ✅ Complete (pending review)
**Last Updated**: 2025-10-06
**Next Steps**: Review design, implement in v0.7.0
