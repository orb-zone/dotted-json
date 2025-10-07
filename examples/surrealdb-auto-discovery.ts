/**
 * SurrealDB Auto-Discovery Example
 *
 * Demonstrates the complete schema-driven workflow:
 * 1. Define functions in .surql schema
 * 2. Auto-discover functions from database
 * 3. Use auto-generated resolvers with full type safety
 *
 * Prerequisites:
 * 1. Install: bun add surrealdb
 * 2. Start SurrealDB: surreal start --user root --pass root memory
 * 3. Generate types: bun surql-to-ts --schema examples/schema-example.surql --output examples/db.generated.ts
 * 4. Run: bun examples/surrealdb-auto-discovery.ts
 */

import { dotted } from '../src/index.js';
import { withSurrealDB } from '../src/plugins/surrealdb.js';

// ============================================================================
// Example 1: Auto-Discovery from Schema File
// ============================================================================

async function example1_SchemaFileDiscovery() {
  console.log('\n📄 Example 1: Auto-Discovery from Schema File\n');

  const plugin = await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: 'examples',
    database: 'main',
    auth: {
      type: 'root',
      username: 'root',
      password: 'root'
    },

    // Parse functions from schema file
    schemaFile: './examples/schema-example.surql',
    debug: true
  });

  console.log('✅ Discovered functions from schema file');
  console.log(`   Functions available: ${Object.keys(plugin.resolvers.db || {}).length}`);

  await plugin.disconnect();
}

// ============================================================================
// Example 2: Runtime Auto-Discovery
// ============================================================================

async function example2_RuntimeDiscovery() {
  console.log('\n🔍 Example 2: Runtime Auto-Discovery\n');

  const plugin = await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: 'examples',
    database: 'main',
    auth: {
      type: 'root',
      username: 'root',
      password: 'root'
    },

    // Auto-discover from running database
    autoDiscoverFunctions: true,
    debug: true
  });

  console.log('✅ Discovered functions from database');
  console.log(`   Functions available: ${Object.keys(plugin.resolvers.db || {}).length}`);

  await plugin.disconnect();
}

// ============================================================================
// Example 3: Using Auto-Generated Resolvers
// ============================================================================

async function example3_UsingResolvers() {
  console.log('\n🚀 Example 3: Using Auto-Generated Resolvers\n');

  const plugin = await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: 'examples',
    database: 'main',
    auth: {
      type: 'root',
      username: 'root',
      password: 'root'
    },
    schemaFile: './examples/schema-example.surql'
  });

  // Create sample user first
  await plugin.db.create('user:alice', {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'user',
    created_at: new Date().toISOString()
  });

  // Use auto-discovered functions in dotted-json
  const userData = dotted({
    userId: 'user:alice',

    // Auto-complete works if you generated types!
    '.profile': 'db.getProfile(${userId})',
    '.stats': 'db.getUserStats(${userId})',

    // Nested expressions
    '.greeting': '`Hello, ${.profile.name}!`',
    '.orderCount': '${.stats.totalOrders} orders'
  }, {
    resolvers: plugin.resolvers
  });

  const profile = await userData.get('.profile');
  const stats = await userData.get('.stats');
  const greeting = await userData.get('.greeting');

  console.log('Profile:', profile);
  console.log('Stats:', stats);
  console.log('Greeting:', greeting);

  await plugin.disconnect();
}

// ============================================================================
// Example 4: Type-Safe Function Calls (with generated types)
// ============================================================================

async function example4_TypeSafety() {
  console.log('\n🔒 Example 4: Type-Safe Function Calls\n');

  const plugin = await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: 'examples',
    database: 'main',
    auth: {
      type: 'root',
      username: 'root',
      password: 'root'
    },
    schemaFile: './examples/schema-example.surql'
  });

  // If you've generated types with surql-to-ts, these calls are fully typed!
  // import type { GetProfileParams, GetProfileReturn } from './db.generated.js';

  try {
    // Direct resolver call (bypassing dotted-json)
    const profile = await plugin.resolvers.db.getProfile({ userId: 'user:alice' });
    console.log('✅ Type-safe profile fetch:', profile);
  } catch (error) {
    console.log('⚠️  User not found (expected if not created yet)');
  }

  await plugin.disconnect();
}

// ============================================================================
// Example 5: Search and Notifications
// ============================================================================

async function example5_SearchAndNotifications() {
  console.log('\n🔔 Example 5: Search & Notifications\n');

  const plugin = await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: 'examples',
    database: 'main',
    auth: {
      type: 'root',
      username: 'root',
      password: 'root'
    },
    schemaFile: './examples/schema-example.surql'
  });

  // Search example
  const searchData = dotted({
    query: 'laptop',
    limit: 10,
    '.results': 'db.searchProducts(${query}, ${limit})'
  }, {
    resolvers: plugin.resolvers
  });

  // Send notification example
  const notificationData = dotted({
    userId: 'user:alice',
    title: 'Welcome!',
    message: 'Thanks for joining our platform',
    '.sent': 'db.sendNotification(${userId}, ${title}, ${message}, "info")'
  }, {
    resolvers: plugin.resolvers
  });

  console.log('Search and notification resolvers ready');
  console.log('(Skipping actual execution - requires database setup)');

  await plugin.disconnect();
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log('╭─────────────────────────────────────────────────────────────╮');
  console.log('│  SurrealDB Auto-Discovery Examples                        │');
  console.log('│  Demonstrating schema-driven development                  │');
  console.log('╰─────────────────────────────────────────────────────────────╯');

  try {
    await example1_SchemaFileDiscovery();
    await example2_RuntimeDiscovery();

    // These require actual database setup
    // Uncomment when ready:
    // await example3_UsingResolvers();
    // await example4_TypeSafety();
    // await example5_SearchAndNotifications();

    console.log('\n✨ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    console.log('\nMake sure SurrealDB is running:');
    console.log('  surreal start --user root --pass root memory\n');
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
