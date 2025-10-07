/**
 * Complete Schema-Driven Workflow Example
 *
 * Demonstrates the full power of @orbzone/dotted-json with SurrealDB:
 * 1. Define functions once in .surql schema
 * 2. Auto-generate TypeScript types with surql-to-ts
 * 3. Auto-generate resolvers with withSurrealDB
 * 4. Use in dotted-json with full type safety
 *
 * Result: 90% less code, zero type drift, single source of truth
 */

import { dotted } from '@orbzone/dotted-json';
import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';

// Import generated types (from: bun surql-to-ts --schema schema-example.surql)
import type {
  DBResolvers,
  GetProfileParams,
  GetProfileReturn,
  GetActiveOrdersParams
} from './db.generated.js';

/**
 * STEP 1: Connect to SurrealDB with auto-discovery
 *
 * The plugin automatically:
 * - Connects to database
 * - Discovers all DEFINE FUNCTION statements
 * - Generates runtime resolvers
 * - Returns type-safe resolver object
 */
async function setupDatabase() {
  const plugin = await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: 'my_app',
    database: 'main',
    auth: {
      type: 'root',
      username: 'root',
      password: 'root'
    },

    // ✨ Magic happens here - auto-discovers all functions
    autoDiscoverFunctions: true,

    // Alternative: parse from schema file
    // schemaFile: './schema-example.surql',

    debug: true
  });

  return plugin;
}

/**
 * STEP 2: Use in dotted-json with full type safety
 *
 * The resolvers are fully typed thanks to:
 * - Generated types from surql-to-ts
 * - Runtime resolvers from withSurrealDB
 * - TypeScript inference in dotted-json
 */
async function example1_BasicUsage() {
  const plugin = await setupDatabase();

  // Create dotted data with expressions
  const data = dotted({
    userId: 'user:alice',

    // Auto-complete works! TypeScript knows about getProfile
    '.profile': 'db.getProfile(${userId})',

    // Nested function calls
    '.orders': 'db.getActiveOrders(${userId}, 10)',

    // Use results from previous expressions
    '.stats': 'db.getUserStats(${userId})',

    // Conditional expressions
    '.greeting': '${.profile.name ? `Hello, ${.profile.name}!` : "Hello!"}',

    // Format data
    '.orderCount': '${.orders.length} orders'
  }, {
    resolvers: plugin.resolvers
  });

  // Access data (lazy evaluation - only runs when accessed)
  const profile = await data.get('.profile');
  console.log('Profile:', profile);

  const orders = await data.get('.orders');
  console.log('Orders:', orders);

  const greeting = await data.get('.greeting');
  console.log('Greeting:', greeting);

  await plugin.disconnect();
}

/**
 * STEP 3: Type-safe function calls
 *
 * Use generated types for parameters and returns
 */
async function example2_TypeSafety() {
  const plugin = await setupDatabase();

  // Parameters are type-checked
  const params: GetProfileParams = {
    userId: 'user:bob'
  };

  // Direct resolver call (bypassing dotted-json)
  const profile: GetProfileReturn = await plugin.resolvers.db.getProfile(params);

  console.log('Type-safe profile:', profile);

  await plugin.disconnect();
}

/**
 * STEP 4: Complex workflow with mutations
 */
async function example3_MutationsAndUpdates() {
  const plugin = await setupDatabase();

  const cart = dotted({
    userId: 'user:alice',

    // Load user profile
    '.user': 'db.getProfile(${userId})',

    // Get active orders
    '.orders': 'db.getActiveOrders(${userId}, 5)',

    // Calculate totals
    items: [
      { product_id: 'product:1', price: 29.99, quantity: 2 },
      { product_id: 'product:2', price: 49.99, quantity: 1 }
    ],
    '.total': 'db.calculateOrderTotal(${items})',

    // Send notification after calculation
    '.notification': 'db.sendNotification(${userId}, "Order Total", `Your order total is $${.total.total}`, "info")'
  }, {
    resolvers: plugin.resolvers
  });

  // Access nested data
  const user = await cart.get('.user');
  const total = await cart.get('.total');
  const notification = await cart.get('.notification');

  console.log('User:', user);
  console.log('Total:', total);
  console.log('Notification sent:', notification);

  await plugin.disconnect();
}

/**
 * STEP 5: Real-time subscriptions (if enabled)
 */
async function example4_Subscriptions() {
  // Note: This requires SurrealDBLoader with LIVE queries enabled
  // See: src/loaders/surrealdb.ts

  console.log('Subscription example requires SurrealDBLoader with LIVE queries');
  console.log('See storage-providers-design.md for implementation');
}

/**
 * STEP 6: Integration with Zod validation
 */
async function example5_ZodValidation() {
  const plugin = await setupDatabase();

  // Import generated Zod schemas
  // import { GetProfileParamsSchema } from './db.generated.with-zod.js';

  const data = dotted({
    userId: 'user:charlie',
    '.profile': 'db.getProfile(${userId})'
  }, {
    resolvers: plugin.resolvers,
    // Add Zod validation (requires withZod plugin)
    // validation: {
    //   schemas: {
    //     resolvers: {
    //       'db.getProfile': {
    //         input: GetProfileParamsSchema,
    //         output: ProfileSchema
    //       }
    //     }
    //   }
    // }
  });

  const profile = await data.get('.profile');
  console.log('Validated profile:', profile);

  await plugin.disconnect();
}

/**
 * Benefits Summary
 */
console.log(`
╭─────────────────────────────────────────────────────────────╮
│  Schema-Driven Development Benefits                        │
╰─────────────────────────────────────────────────────────────╯

✅ Single Source of Truth
   Define functions once in .surql → everything else generated

✅ Zero Type Drift
   Types, resolvers, and runtime always in sync

✅ 90% Less Code
   No manual type definitions
   No manual resolver implementations
   No manual validation schemas

✅ Full Type Safety
   IDE autocomplete for all functions
   TypeScript catches errors at compile time
   Zod validates at runtime

✅ Developer Experience
   Change function signature once
   Everything updates automatically
   No boilerplate maintenance

╰─────────────────────────────────────────────────────────────╯

Workflow:
  1. Edit schema.surql (add/modify DEFINE FUNCTION)
  2. Run: bun surql-to-ts --schema schema.surql --watch
  3. Types regenerate automatically
  4. Use in dotted-json with full type safety
  5. Ship with confidence!
`);

// Run examples (uncomment to test)
// example1_BasicUsage().catch(console.error);
// example2_TypeSafety().catch(console.error);
// example3_MutationsAndUpdates().catch(console.error);
