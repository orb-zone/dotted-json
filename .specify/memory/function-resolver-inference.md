# SurrealDB Function Resolver Auto-Generation

**Status**: Design (v0.6.0+)
**Related**: `surql-to-zod-inference.md`, `storage-providers-design.md`, `surrealdb-vue-vision.md`
**Created**: 2025-10-06
**Author**: Design phase (implementation pending)

## Overview

Auto-generate dotted-json **resolvers** from SurrealDB `DEFINE FUNCTION` statements, enabling zero-boilerplate database function calls with full type safety and validation.

### The Vision

```typescript
// 1. Define functions in .surql (SOURCE OF TRUTH)
DEFINE FUNCTION fn::getActiveOrders($userId: string) { ... };
DEFINE FUNCTION fn::cancelOrder($orderId: string) { ... };

// 2. Auto-generate resolvers (ZERO BOILERPLATE)
const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  schema: './schema.surql',  // ← Parse this file
  // Resolvers auto-generated from schema!
});

// 3. Use in dotted expressions (TYPE-SAFE)
const data = dotted({
  userId: 'user:alice',
  '.orders': 'db.getActiveOrders(${userId})',     // ← Auto-complete works!
  '.cancel': 'db.cancelOrder(${.orders[0].id})'   // ← Zod validates inputs!
}, {
  resolvers: plugin.resolvers  // ← Auto-generated from schema
});

await data.get('.orders'); // ← Fully type-safe, validated
```

**Key Innovation**: The `.surql` schema file is the **single source of truth** for:
1. Database schema (tables, fields, permissions)
2. Custom functions (business logic)
3. Zod schemas (validation)
4. TypeScript types (type safety)
5. **Dotted-json resolvers** (runtime execution)

## Current State vs. Enhanced State

### Current (Manual Resolver Definition)

```typescript
// ❌ PROBLEM: Manual duplication everywhere!

// 1. Define function in SurrealDB
DEFINE FUNCTION fn::getProfile($userId: string) {
  SELECT * FROM user WHERE id = $userId;
};

// 2. Manually define Zod schema
const GetProfileSchema = z.object({
  params: z.object({ userId: z.string() }),
  returns: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email()
  })
});

// 3. Manually create resolver
const resolvers = {
  db: {
    getProfile: async (userId: string) => {
      return await db.query('SELECT * FROM fn::getProfile($userId)', { userId });
    }
  }
};

// 4. Manually define TypeScript types
type GetProfileParams = { userId: string };
type GetProfileResult = {
  id: string;
  name: string;
  email: string;
};
```

**Problems**:
- 😫 4 places to update when function signature changes
- 🐛 Type drift between schema, Zod, TypeScript, resolver
- 📝 Lots of boilerplate code
- 🔁 Manual synchronization required

### Enhanced (Auto-Generated)

```typescript
// ✅ SOLUTION: Everything auto-generated from .surql!

// 1. Define function in .surql (ONLY place to edit)
DEFINE FUNCTION fn::getProfile($userId: string) {
  SELECT id, name, email FROM user WHERE id = $userId LIMIT 1;
};

// 2. Auto-generate everything
const plugin = await withSurrealDB({
  schema: './schema.surql',
  // That's it! Everything below is auto-generated:
  // - Zod schemas
  // - TypeScript types
  // - Resolver functions
  // - Parameter validation
});

// 3. Use with full type safety
const data = dotted({
  userId: 'user:alice',
  '.profile': 'db.getProfile(${userId})'
}, {
  resolvers: plugin.resolvers
});

// TypeScript knows the return type!
const profile = await data.get('.profile');
// profile: { id: string; name: string; email: string }
```

**Benefits**:
- ✅ Edit function once (.surql), everything updates
- ✅ Zero type drift (impossible!)
- ✅ Minimal boilerplate
- ✅ Automatic validation

## Architecture

### 1. Function Introspection

Use SurrealDB's `INFO FOR DATABASE` to discover all custom functions:

```typescript
interface FunctionMetadata {
  name: string;           // e.g., "fn::getProfile"
  params: Parameter[];    // Extracted from $userId: string
  returns?: string;       // Inferred from RETURN statement or explicit type
  definition?: string;    // Full SurrealQL body
}

interface Parameter {
  name: string;           // e.g., "userId"
  type: string;           // e.g., "string", "int", "record<user>"
  optional?: boolean;     // e.g., "option<string>"
}

async function getFunctionMetadata(db: Surreal): Promise<FunctionMetadata[]> {
  const result = await db.query('INFO FOR DATABASE');

  const functions: FunctionMetadata[] = [];

  for (const [fnName, fnDef] of Object.entries(result.functions || {})) {
    // Parse DEFINE FUNCTION statement
    const parsed = parseFunctionDefinition(fnDef);
    functions.push({
      name: fnName,
      params: parsed.params,
      returns: parsed.returns,
      definition: parsed.definition
    });
  }

  return functions;
}
```

### 2. Zod Schema Generation

Convert function signatures to Zod schemas:

```typescript
function generateFunctionZodSchema(fn: FunctionMetadata): {
  input: z.ZodType;
  output: z.ZodType;
} {
  // Convert parameters to Zod tuple
  const inputSchemas = fn.params.map(param => {
    return surqlTypeToZod(param.type);
  });

  const input = z.tuple(inputSchemas as any);

  // Infer output type (simplified for now)
  const output = fn.returns
    ? surqlTypeToZod(fn.returns)
    : z.any();

  return { input, output };
}
```

### 3. Resolver Generation

Auto-generate resolver functions:

```typescript
function generateResolvers(
  db: Surreal,
  functions: FunctionMetadata[]
): Record<string, any> {
  const resolvers: any = { db: {} };

  for (const fn of functions) {
    // Extract function name without "fn::" prefix
    const fnName = fn.name.replace(/^fn::/, '');

    // Generate resolver function
    resolvers.db[fnName] = async (...args: any[]) => {
      // Build parameter object
      const params: Record<string, any> = {};
      fn.params.forEach((param, i) => {
        params[param.name] = args[i];
      });

      // Execute function via SurrealDB
      const query = `SELECT * FROM ${fn.name}(${
        fn.params.map(p => `$${p.name}`).join(', ')
      })`;

      const result = await db.query(query, params);
      return result[0];
    };
  }

  return resolvers;
}
```

### 4. TypeScript Type Generation

Generate `.d.ts` file for IDE autocomplete:

```typescript
function generateTypeDefinitions(functions: FunctionMetadata[]): string {
  let output = '// Auto-generated from SurrealDB schema\n\n';
  output += 'export interface DatabaseFunctions {\n';

  for (const fn of functions) {
    const fnName = fn.name.replace(/^fn::/, '');

    // Generate parameter types
    const params = fn.params.map(p =>
      `${p.name}: ${surqlTypeToTS(p.type)}`
    ).join(', ');

    // Generate return type
    const returnType = fn.returns
      ? surqlTypeToTS(fn.returns)
      : 'any';

    output += `  ${fnName}(${params}): Promise<${returnType}>;\n`;
  }

  output += '}\n\n';
  output += 'export type DB = { db: DatabaseFunctions };\n';

  return output;
}

// Example output:
// export interface DatabaseFunctions {
//   getProfile(userId: string): Promise<UserProfile>;
//   getActiveOrders(userId: string): Promise<Order[]>;
//   cancelOrder(orderId: string): Promise<{ success: boolean }>;
// }
```

## Complete Workflow

### Step 1: Schema File (schema.surql)

```sql
-- ============================================================================
-- User Management Functions
-- ============================================================================

DEFINE FUNCTION fn::getProfile($userId: string) {
  LET $user = SELECT id, name, email, avatar, role
    FROM type::thing('user', string::split($userId, ':')[1])
    LIMIT 1;
  RETURN $user[0];
};

DEFINE FUNCTION fn::updateProfile($userId: string, $data: object) {
  LET $updated = UPDATE type::thing('user', string::split($userId, ':')[1])
    SET name = $data.name,
        email = $data.email;
  RETURN $updated[0];
};

-- ============================================================================
-- Order Management Functions
-- ============================================================================

DEFINE FUNCTION fn::getActiveOrders($userId: string) {
  RETURN SELECT * FROM order
    WHERE user_id = $userId
      AND status = 'active'
    ORDER BY created_at DESC;
};

DEFINE FUNCTION fn::cancelOrder($orderId: string) {
  LET $order = UPDATE type::thing('order', string::split($orderId, ':')[1])
    SET status = 'cancelled',
        cancelled_at = time::now();

  RETURN { success: true, order: $order[0] };
};

-- ============================================================================
-- Analytics Functions
-- ============================================================================

DEFINE FUNCTION fn::getUserStats($userId: string) {
  LET $totalOrders = (
    SELECT count() as total FROM order WHERE user_id = $userId
  )[0].total OR 0;

  LET $totalSpent = (
    SELECT math::sum(total) as sum FROM order WHERE user_id = $userId
  )[0].sum OR 0;

  RETURN {
    totalOrders: $totalOrders,
    totalSpent: $totalSpent,
    memberSince: (SELECT created_at FROM $userId)[0].created_at
  };
};
```

### Step 2: Plugin Configuration

```typescript
import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';

const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'my_app',
  database: 'main',
  auth: { user: 'root', pass: 'root' },

  // Option A: Auto-discover from connected database
  autoDiscoverFunctions: true,

  // Option B: Parse from .surql file
  schema: './schema.surql',

  // Option C: Explicit function list (no auto-discovery)
  functions: [
    {
      name: 'getProfile',
      params: z.object({ userId: z.string() }),
      returns: UserProfileSchema
    }
  ]
});

// plugin.resolvers now contains:
// {
//   db: {
//     getProfile: async (userId: string) => { ... },
//     updateProfile: async (userId: string, data: any) => { ... },
//     getActiveOrders: async (userId: string) => { ... },
//     cancelOrder: async (orderId: string) => { ... },
//     getUserStats: async (userId: string) => { ... }
//   }
// }
```

### Step 3: Usage with Full Type Safety

```typescript
import { dotted } from '@orbzone/dotted-json';

const data = dotted({
  userId: 'user:alice',

  // Auto-complete suggests: getProfile, updateProfile, getActiveOrders, etc.
  '.profile': 'db.getProfile(${userId})',

  // Nested function calls
  '.orders': 'db.getActiveOrders(${userId})',

  // Use previous results
  '.stats': 'db.getUserStats(${userId})',

  // Mutations
  '.cancel': 'db.cancelOrder(${.orders[0].id})'
}, {
  resolvers: plugin.resolvers
});

// TypeScript knows the types!
const profile = await data.get('.profile');
// profile: { id: string; name: string; email: string; avatar?: string; role: string }

const orders = await data.get('.orders');
// orders: Order[]

const stats = await data.get('.stats');
// stats: { totalOrders: number; totalSpent: number; memberSince: Date }
```

### Step 4: Generated Types (Auto-Generated .d.ts)

```typescript
// schema.generated.d.ts (auto-generated)

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'completed';
  total: number;
  created_at: Date;
  cancelled_at?: Date;
}

export interface UserStats {
  totalOrders: number;
  totalSpent: number;
  memberSince: Date;
}

export interface DatabaseFunctions {
  getProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
  getActiveOrders(userId: string): Promise<Order[]>;
  cancelOrder(orderId: string): Promise<{ success: boolean; order: Order }>;
  getUserStats(userId: string): Promise<UserStats>;
}

// Import this for type-safe resolvers
export type DB = { db: DatabaseFunctions };
```

## Implementation Plan

### Phase 1: Function Discovery (v0.7.0)

```typescript
// src/plugins/surrealdb/function-discovery.ts

export async function discoverFunctions(
  db: Surreal
): Promise<FunctionMetadata[]> {
  const result = await db.query('INFO FOR DATABASE');

  const functions: FunctionMetadata[] = [];

  for (const [fnName, fnInfo] of Object.entries(result[0]?.functions || {})) {
    const metadata = parseFunctionInfo(fnName, fnInfo);
    functions.push(metadata);
  }

  return functions;
}

function parseFunctionInfo(name: string, info: any): FunctionMetadata {
  // Parse function signature from INFO output
  // Example: "DEFINE FUNCTION fn::getProfile($userId: string) { ... }"

  const paramMatches = info.match(/\$(\w+):\s*(\w+(?:<[^>]+>)?)/g) || [];

  const params: Parameter[] = paramMatches.map(match => {
    const [_, name, type] = match.match(/\$(\w+):\s*(.+)/)!;
    return {
      name,
      type,
      optional: type.startsWith('option<')
    };
  });

  return {
    name,
    params,
    definition: info
  };
}
```

### Phase 2: Resolver Generation (v0.7.0)

```typescript
// src/plugins/surrealdb/resolver-generator.ts

export function generateFunctionResolvers(
  db: Surreal,
  functions: FunctionMetadata[],
  options?: {
    validation?: boolean;  // Enable Zod validation
    prefix?: string;       // Namespace (default: 'db')
  }
): Record<string, any> {
  const prefix = options?.prefix || 'db';
  const resolvers: any = { [prefix]: {} };

  for (const fn of functions) {
    const fnName = fn.name.replace(/^fn::/, '');

    // Generate validated resolver
    resolvers[prefix][fnName] = async (...args: any[]) => {
      // Build SurrealQL query
      const paramNames = fn.params.map(p => `$${p.name}`);
      const query = `SELECT * FROM ${fn.name}(${paramNames.join(', ')})`;

      // Build parameter object
      const params: Record<string, any> = {};
      fn.params.forEach((param, i) => {
        params[param.name] = args[i];
      });

      // Execute query
      const result = await db.query(query, params);

      // SurrealDB returns array, extract first result
      return result[0]?.[0] || result[0] || null;
    };

    // Attach metadata for introspection
    resolvers[prefix][fnName]._metadata = fn;
  }

  return resolvers;
}
```

### Phase 3: Zod Integration (v0.8.0)

```typescript
// src/plugins/surrealdb/zod-integration.ts

export function generateFunctionSchemas(
  functions: FunctionMetadata[]
): Record<string, { input: z.ZodType; output: z.ZodType }> {
  const schemas: Record<string, any> = {};

  for (const fn of functions) {
    const fnName = fn.name.replace(/^fn::/, '');

    // Generate input schema (tuple of parameters)
    const inputSchemas = fn.params.map(param => {
      return surqlTypeToZod(param.type);
    });

    schemas[`db.${fnName}`] = {
      input: z.tuple(inputSchemas as any),
      output: z.any() // TODO: Infer from RETURN type
    };
  }

  return schemas;
}

// Enhanced withSurrealDB with Zod auto-generation
export async function withSurrealDB(config: {
  // ... connection config
  autoDiscoverFunctions?: boolean;
  autoGenerateZod?: boolean;
}) {
  const db = await connect(config);

  const functions = config.autoDiscoverFunctions
    ? await discoverFunctions(db)
    : [];

  const resolvers = generateFunctionResolvers(db, functions);

  const zodSchemas = config.autoGenerateZod
    ? generateFunctionSchemas(functions)
    : {};

  return {
    resolvers,
    validation: {
      schemas: {
        resolvers: zodSchemas
      }
    }
  };
}
```

### Phase 4: TypeScript Codegen (v0.9.0)

```typescript
// CLI tool: surql-to-ts

import { Command } from 'commander';

const program = new Command();

program
  .name('surql-to-ts')
  .description('Generate TypeScript types and resolvers from SurrealDB schema')
  .option('--url <url>', 'SurrealDB connection URL')
  .option('--schema <file>', 'Path to .surql schema file')
  .option('--output <file>', 'Output .d.ts file', 'schema.generated.d.ts')
  .option('--watch', 'Watch for schema changes')
  .action(async (options) => {
    // Connect to DB or parse schema file
    const functions = options.url
      ? await discoverFunctionsFromDB(options.url)
      : await parseFunctionsFromFile(options.schema);

    // Generate TypeScript definitions
    const types = generateTypeDefinitions(functions);

    // Write to file
    await writeFile(options.output, types);

    console.log(`✅ Generated ${functions.length} function types → ${options.output}`);
  });
```

**Usage**:
```bash
# Generate from live database
bunx surql-to-ts --url ws://localhost:8000/rpc --output src/db.generated.d.ts

# Generate from .surql file
bunx surql-to-ts --schema schema.surql --output src/db.generated.d.ts

# Watch mode
bunx surql-to-ts --schema schema.surql --watch
```

## Benefits

### Developer Experience

1. **Zero Boilerplate**: Define function once, use everywhere
2. **Auto-Complete**: IDE suggests all available functions
3. **Type Safety**: TypeScript catches errors at compile time
4. **Validation**: Zod validates inputs/outputs at runtime
5. **Single Source of Truth**: .surql file is the only place to edit

### Architecture

1. **Schema-Driven**: Database schema defines everything
2. **No Drift**: Types, validation, resolvers always in sync
3. **Business Logic in DB**: Leverage SurrealDB's `fn::` functions
4. **Minimal Frontend Code**: Just dotted expressions

### Performance

1. **Server-Side Logic**: Complex queries run on database
2. **Reduced Network Calls**: One function call vs multiple queries
3. **Optimized Queries**: SurrealDB optimizes `fn::` execution

## Example: E-Commerce App

### schema.surql

```sql
-- Product search
DEFINE FUNCTION fn::searchProducts($query: string, $limit: int) {
  RETURN SELECT * FROM product
    WHERE name ~ $query OR description ~ $query
    LIMIT $limit;
};

-- Cart management
DEFINE FUNCTION fn::addToCart($userId: string, $productId: string, $quantity: int) {
  LET $cart = SELECT * FROM cart WHERE user_id = $userId LIMIT 1;

  IF !$cart {
    CREATE cart CONTENT { user_id: $userId, items: [] };
  };

  UPDATE cart SET items += { product_id: $productId, quantity: $quantity }
    WHERE user_id = $userId;

  RETURN SELECT * FROM cart WHERE user_id = $userId;
};

-- Checkout
DEFINE FUNCTION fn::checkout($userId: string, $paymentMethod: string) {
  LET $cart = SELECT * FROM cart WHERE user_id = $userId LIMIT 1;

  // Calculate total, create order, clear cart
  // ...

  RETURN { orderId: $newOrder.id, total: $total };
};
```

### Frontend Usage

```typescript
const plugin = await withSurrealDB({
  schema: './schema.surql',
  autoDiscoverFunctions: true
});

// Product search page
const searchData = dotted({
  query: 'laptop',
  limit: 20,
  '.results': 'db.searchProducts(${query}, ${limit})'
}, { resolvers: plugin.resolvers });

// Shopping cart
const cartData = dotted({
  userId: 'user:alice',
  productId: 'product:123',
  quantity: 2,
  '.cart': 'db.addToCart(${userId}, ${productId}, ${quantity})'
}, { resolvers: plugin.resolvers });

// Checkout
const checkoutData = dotted({
  userId: 'user:alice',
  paymentMethod: 'stripe',
  '.order': 'db.checkout(${userId}, ${paymentMethod})'
}, { resolvers: plugin.resolvers });
```

**That's it!** No manual resolver code, no manual types, just dotted expressions calling auto-generated functions.

## Testing Strategy

### Unit Tests

```typescript
describe('Function Discovery', () => {
  it('should extract function metadata from INFO FOR DATABASE', () => {
    const info = {
      functions: {
        'fn::getProfile': 'DEFINE FUNCTION fn::getProfile($userId: string) { ... }'
      }
    };

    const functions = parseDatabaseInfo(info);

    expect(functions).toHaveLength(1);
    expect(functions[0].name).toBe('fn::getProfile');
    expect(functions[0].params).toEqual([
      { name: 'userId', type: 'string', optional: false }
    ]);
  });
});

describe('Resolver Generation', () => {
  it('should generate resolver function for each db function', () => {
    const functions = [
      { name: 'fn::getProfile', params: [{ name: 'userId', type: 'string' }] }
    ];

    const resolvers = generateFunctionResolvers(mockDB, functions);

    expect(resolvers.db.getProfile).toBeInstanceOf(Function);
  });
});
```

### Integration Tests

```typescript
describe('Auto-Generated Resolvers', () => {
  it('should call SurrealDB function and return result', async () => {
    const plugin = await withSurrealDB({
      url: 'http://127.0.0.1:9000/rpc',
      autoDiscoverFunctions: true
    });

    const data = dotted({
      userId: 'user:test_123',
      '.profile': 'db.getProfile(${userId})'
    }, {
      resolvers: plugin.resolvers
    });

    const profile = await data.get('.profile');

    expect(profile).toHaveProperty('name');
    expect(profile).toHaveProperty('email');
  });
});
```

## Open Questions

1. **Return Type Inference**: How to infer output types from `RETURN` statements?
   - **Recommendation**: Parse SELECT statements, use table schemas

2. **Function Overloading**: Does SurrealDB support function overloading?
   - **Recommendation**: Research SurrealDB capabilities

3. **Error Handling**: How to handle SurrealDB function errors gracefully?
   - **Recommendation**: Wrap in try/catch, return `errorDefault`

4. **Cache Strategy**: Should we cache function metadata?
   - **Recommendation**: Yes, cache with TTL or invalidate on schema change

## References

- [SurrealDB Functions Documentation](https://surrealdb.com/docs/surrealql/functions/custom)
- [Zod Validation Plugin](../../../src/plugins/zod.ts)
- [SurrealDB Plugin](../../../src/plugins/surrealdb.ts)
- [SurrealQL to Zod Inference](surql-to-zod-inference.md)

## Changelog

- **2025-10-06**: Initial design for function resolver auto-generation
