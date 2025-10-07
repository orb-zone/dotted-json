# Generate Resolver from SurrealDB Function

Auto-generate dotted-json resolver functions from SurrealDB DEFINE FUNCTION statements.

## Usage

```
/resolver-from-fn [function-name or schema-file]
```

## Examples

### Generate from Function Name

```
/resolver-from-fn getActiveOrders
```

Looks up `fn::getActiveOrders` definition and generates resolver.

### Generate from Schema File

```
/resolver-from-fn test/integration/fixtures/test-schema.surql
```

Generates resolvers for all functions in the file.

### Generate from Inline Function

```
/resolver-from-fn
DEFINE FUNCTION fn::getProfile($userId: string) {
  LET $user = SELECT id, name, email, role
    FROM type::thing('user', string::split($userId, ':')[1])
    LIMIT 1;
  RETURN $user[0];
};
```

## What Gets Generated

For each DEFINE FUNCTION:

1. **Resolver function** - Callable from dotted expressions
2. **Zod validation** - Input/output schemas
3. **TypeScript types** - Params and return types
4. **Error handling** - Proper error messages
5. **Integration** - Works with withSurrealDB plugin

## Output Format

### Single Function

```typescript
// Generated from: fn::getProfile
// Date: [timestamp]
// Generator: resolver-from-fn

import { z } from 'zod';
import type { Surreal } from 'surrealdb';

// ============================================================================
// fn::getProfile
// ============================================================================

/**
 * Get user profile by ID
 *
 * @param userId - User record ID (e.g., 'user:alice')
 * @returns User profile object with id, name, email, role
 */

// Input schema (function parameters)
export const GetProfileParamsSchema = z.object({
  userId: z.string()
});

// Output schema (return type)
export const GetProfileReturnSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin'])
});

// TypeScript types
export type GetProfileParams = z.infer<typeof GetProfileParamsSchema>;
export type GetProfileReturn = z.infer<typeof GetProfileReturnSchema>;

// Resolver function
export async function getProfile(
  db: Surreal,
  params: GetProfileParams
): Promise<GetProfileReturn> {
  // Validate input
  const validated = GetProfileParamsSchema.parse(params);

  // Execute SurrealDB function
  const result = await db.query('SELECT * FROM fn::getProfile($userId)', {
    userId: validated.userId
  });

  // Extract result (SurrealDB returns array)
  const data = result[0]?.[0];

  if (!data) {
    throw new Error(`Profile not found for user: ${validated.userId}`);
  }

  // Validate output
  return GetProfileReturnSchema.parse(data);
}

// Metadata for introspection
getProfile.metadata = {
  name: 'getProfile',
  surrealFunction: 'fn::getProfile',
  params: GetProfileParamsSchema,
  returns: GetProfileReturnSchema
};
```

### Multiple Functions (Plugin Export)

```typescript
// Generated from: test-schema.surql
// Date: [timestamp]
// Contains: 5 functions

import { dotted } from '@orbzone/dotted';

/**
 * Auto-generated SurrealDB function resolvers
 *
 * Usage:
 *   const plugin = await withSurrealDB({
 *     resolvers: generatedResolvers
 *   });
 */
export const generatedResolvers = {
  db: {
    getProfile: async (userId: string) => {
      return await getProfile(db, { userId });
    },

    getActiveOrders: async (userId: string) => {
      return await getActiveOrders(db, { userId });
    },

    cancelOrder: async (orderId: string) => {
      return await cancelOrder(db, { orderId });
    },

    // ... other functions
  }
};

// For use with dotted-json
const data = dotted({
  userId: 'user:alice',
  '.profile': 'db.getProfile(${userId})',
  '.orders': 'db.getActiveOrders(${userId})'
}, {
  resolvers: generatedResolvers
});
```

## Function Discovery

The command can discover functions via:

1. **Parsing .surql files** - Static analysis of DEFINE FUNCTION
2. **INFO FOR DATABASE** - Runtime introspection of connected DB
3. **Manual specification** - Explicit function definitions

### Discovery from Database

```
/resolver-from-fn --discover --url ws://localhost:8000/rpc
```

Connects to SurrealDB and discovers all custom functions via:
```sql
INFO FOR DATABASE;
```

## Parameter Type Inference

### Simple Types

```sql
DEFINE FUNCTION fn::example($name: string, $age: int, $active: bool)
```

Generated:
```typescript
const ExampleParamsSchema = z.object({
  name: z.string(),
  age: z.number().int(),
  active: z.boolean()
});
```

### Complex Types

```sql
DEFINE FUNCTION fn::createUser($data: object)
```

Generated:
```typescript
const CreateUserParamsSchema = z.object({
  data: z.object({
    // Inferred from table schema if available
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['user', 'admin'])
  })
});
```

### Record Types

```sql
DEFINE FUNCTION fn::linkPosts($userId: record<user>, $postIds: array<record<post>>)
```

Generated:
```typescript
const LinkPostsParamsSchema = z.object({
  userId: z.string(), // Record IDs are strings
  postIds: z.array(z.string())
});
```

## Return Type Inference

### From RETURN Statement

```sql
DEFINE FUNCTION fn::getCount() {
  LET $count = SELECT count() FROM user;
  RETURN $count[0].count;
};
```

Inferred return type: `z.number()`

### From SELECT Statement

```sql
DEFINE FUNCTION fn::getUsers() {
  RETURN SELECT id, name, email FROM user;
};
```

Inferred return type: `z.array(UserSchema)`

### Explicit Type Hint (Comment)

```sql
-- @returns {count: number, total: number}
DEFINE FUNCTION fn::getStats($userId: string) {
  // Complex logic...
};
```

Uses comment hint for return type.

## Integration with withSurrealDB

```typescript
import { withSurrealDB } from '@orbzone/dotted/plugins/surrealdb';
import { generatedResolvers } from './resolvers.generated';

const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'my_app',
  database: 'main',

  // Option 1: Use generated resolvers directly
  resolvers: generatedResolvers,

  // Option 2: Let plugin auto-discover
  autoDiscoverFunctions: true,

  // Option 3: Specify schema file
  schema: './schema.surql'
});

// All functions available as db.* resolvers
const data = dotted({
  userId: 'user:alice',
  '.profile': 'db.getProfile(${userId})',
  '.orders': 'db.getActiveOrders(${userId})',
  '.stats': 'db.getUserStats(${userId})'
}, {
  resolvers: plugin.resolvers
});
```

## Options

```
/resolver-from-fn [source] --output [path] --discover --url [db-url] --validation [strict|loose|off]
```

- `--output` - Where to save generated file (default: `src/resolvers.generated.ts`)
- `--discover` - Discover functions from live database
- `--url` - SurrealDB connection URL for discovery
- `--validation` - Zod validation mode (default: `strict`)
- `--watch` - Watch schema file for changes

## Validation Modes

### Strict (Default)
- ✅ Validates inputs before executing
- ✅ Validates outputs after executing
- ❌ Throws on validation failure

### Loose
- ✅ Validates inputs before executing
- ⚠️ Logs warning on output validation failure
- ✅ Returns data even if output validation fails

### Off
- ❌ No validation
- 🚀 Fastest performance
- ⚠️ Use only if confident in data integrity

## Error Handling

Generated resolvers include comprehensive error handling:

```typescript
export async function getProfile(db: Surreal, params: GetProfileParams) {
  try {
    // Validate input
    const validated = GetProfileParamsSchema.parse(params);
  } catch (error) {
    throw new Error(`Invalid parameters for getProfile: ${error.message}`);
  }

  try {
    // Execute function
    const result = await db.query('SELECT * FROM fn::getProfile($userId)', {
      userId: validated.userId
    });
  } catch (error) {
    throw new Error(`SurrealDB error in getProfile: ${error.message}`);
  }

  try {
    // Validate output
    return GetProfileReturnSchema.parse(data);
  } catch (error) {
    throw new Error(`Invalid return value from getProfile: ${error.message}`);
  }
}
```

## Success Criteria

Generated resolvers are ready when:
- ✅ All functions have corresponding resolvers
- ✅ Input/output schemas are type-safe
- ✅ Error handling is comprehensive
- ✅ Integration with withSurrealDB works
- ✅ Tests pass with generated resolvers
- ✅ TypeScript compilation succeeds

## Related Commands

- `/surql-review` - Review functions before generating resolvers
- `/zod-from-surql` - Generate Zod schemas (used by resolvers)
- `/surql` - Generate new functions
- `/implement` - Implement feature using generated resolvers
