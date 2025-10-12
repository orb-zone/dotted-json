# SurrealDB + Vue Integration Vision

**Created**: 2025-10-06
**Status**: Design Phase
**Target**: Post v1.0.0 (Phase 6+)

---

## Executive Summary

This document captures the **grand vision** for tight integration between SurrealDB (as source of truth) and Vue 3 client applications using Pinia for state management. The goal is to create a seamless, real-time, type-safe bridge where:

1. **Business logic lives in the database** via SurrealDB custom functions (`fn::`)
2. **Real-time sync** happens automatically via LIVE queries
3. **Intelligent caching** optimizes performance via Pinia Colada
4. **Dotted-JSON expressions** bridge database and client state elegantly

This architecture minimizes custom backend code while maximizing developer experience, type safety, and performance.

---

## Architecture Overview

### The Stack

```
┌─────────────────────────────────────────────────────────┐
│ Vue 3 Components (Reactive UI)                          │
│   - Composables consume Pinia stores                    │
│   - Automatic re-renders on state changes               │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Pinia Stores (Client View-Model State)                  │
│   - Dotted-JSON expressions define data dependencies    │
│   - Lazy evaluation reduces unnecessary computations    │
│   - Template interpolation (${path}) for dynamic refs   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ Pinia Colada Plugin (Caching + Invalidation Layer)      │
│   - Query resolvers with intelligent caching            │
│   - Mutation resolvers with lifecycle hooks             │
│   - Cache invalidation on mutations                     │
│   - Request deduplication                               │
│   - Stale-while-revalidate patterns                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│ SurrealDB Plugin (Database Integration Layer)           │
│   - Auto-generated CRUD resolvers (create/select/etc)   │
│   - Custom function resolvers (fn::)                    │
│   - Zod validation for params/returns                   │
│   - Connection management                               │
│   - (Future) LIVE query subscriptions                   │
└─────────────────┬───────────────────────────────────────┘
                  │ WebSocket (ws://localhost:8000/rpc)
┌─────────────────▼───────────────────────────────────────┐
│ SurrealDB Server (Source of Truth)                      │
│   - Custom functions (fn::) encapsulate business logic  │
│   - Row-level permissions enforce security              │
│   - LIVE SELECT provides real-time change streams       │
│   - Graph relations model complex data                  │
│   - Schema definitions ensure data integrity            │
└─────────────────────────────────────────────────────────┘
```

---

## Key Synergies

### 1. Business Logic in Database Functions

**Problem**: Traditional apps scatter logic across frontend, backend API, and database.

**Solution**: SurrealDB custom functions (`fn::`) centralize logic in the database.

```sql
-- Define business logic once (server-side SurrealQL)
DEFINE FUNCTION fn::getActiveOrders($userId: string) {
  RETURN SELECT * FROM orders
         WHERE user = $userId
         AND status IN ['pending', 'processing', 'shipped']
         ORDER BY created_at DESC
         FETCH items, items.product;
};

-- Add permissions (security model)
DEFINE FUNCTION fn::getActiveOrders($userId: string)
  PERMISSIONS
    WHERE $auth.id = $userId OR $auth.role = 'admin';
```

**Client Integration** (with Zod validation):

```typescript
import { z } from 'zod';
import { withSurrealDB } from '@orb-zone/dotted-json/plugins/surrealdb';

const OrderSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'shipped']),
  items: z.array(z.object({
    product: z.object({
      name: z.string(),
      price: z.number()
    })
  }))
});

const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  functions: [{
    name: 'getActiveOrders',
    params: z.object({ userId: z.string() }),
    returns: z.array(OrderSchema)
  }]
});

// Usage in dotted-json
const data = dotted({
  userId: 'user:alice',
  '.orders': 'db.fn.getActiveOrders({ userId: ${userId} })',
  '.orderCount': '${orders.length}',
  '.totalValue': '${orders.reduce((sum, o) => sum + o.total, 0)}'
}, { resolvers: plugin.resolvers });

await data.orders; // Returns validated Order[]
```

**Benefits**:
- ✅ **Single source of truth**: Logic lives in one place
- ✅ **Type safety**: Zod validates at runtime, TypeScript at compile time
- ✅ **Security**: Permissions enforced at database level
- ✅ **Reusability**: Same function works across all clients
- ✅ **Performance**: Database-side filtering and joining

---

### 2. Real-Time Sync with LIVE Queries

**Problem**: Keeping multiple clients in sync requires complex WebSocket infrastructure.

**Solution**: SurrealDB's `LIVE SELECT` provides built-in real-time change streams.

```typescript
// Server-side: Just use LIVE SELECT
// LIVE SELECT * FROM orders WHERE user = $userId;

// Client-side: Subscribe to changes
const liveQueryId = await db.live('orders', (action, result) => {
  switch (action) {
    case 'CREATE':
      // New order created
      piniaColada.setQueryData(['orders'], (old) => [...old, result]);
      break;
    case 'UPDATE':
      // Order updated
      piniaColada.setQueryData(['orders'], (old) =>
        old.map(o => o.id === result.id ? result : o)
      );
      break;
    case 'DELETE':
      // Order deleted
      piniaColada.setQueryData(['orders'], (old) =>
        old.filter(o => o.id !== result.id)
      );
      break;
  }
});

// Cleanup on unmount
onUnmounted(() => db.kill(liveQueryId));
```

**Integration with Pinia Colada** (future unified plugin):

```typescript
const plugin = withSurrealDBPinia({
  surrealdb: { url, namespace, database },
  live: {
    enabled: true,
    tables: ['orders', 'notifications'],
    // Auto-invalidate cache on changes
    onUpdate: (table, action, data) => {
      // Invalidate all queries for this table
      piniaColada.invalidateQueries({ queryKey: [table] });

      // Or update cache directly for instant UI updates
      if (action === 'UPDATE') {
        piniaColada.setQueryData([table, data.id], data);
      }
    }
  }
});
```

**Benefits**:
- ✅ **Multi-client sync**: All clients see changes instantly
- ✅ **No polling**: WebSocket push is efficient
- ✅ **Built-in**: No custom infrastructure needed
- ✅ **Row-level permissions**: Users only see their authorized data
- ✅ **Automatic cache updates**: Pinia Colada stays fresh

---

### 3. Intelligent Caching with Pinia Colada

**Problem**: Repeated API calls waste bandwidth and slow down UX.

**Solution**: Pinia Colada provides smart caching with invalidation patterns.

```typescript
import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada';

const coladaPlugin = withPiniaColada({
  queries: {
    'orders.active': {
      key: (userId: string) => ['active-orders', userId],
      query: async (userId: string) => {
        // This calls SurrealDB fn::getActiveOrders
        return surrealPlugin.resolvers['db.fn.getActiveOrders']({ userId });
      },
      staleTime: 30_000,  // 30 seconds
      gcTime: 5 * 60_000, // 5 minutes
      refetchOnWindowFocus: true
    },

    'user.profile': {
      key: (userId: string) => ['user', userId],
      query: async (userId: string) => {
        return surrealPlugin.resolvers['db.user.select']({ id: userId });
      },
      staleTime: 60_000 // 1 minute
    }
  },

  mutations: {
    'orders.cancel': {
      mutation: async (orderId: string) => {
        return surrealPlugin.resolvers['db.fn.cancelOrder']({ orderId });
      },
      // Invalidate related queries after mutation
      invalidates: [
        ['active-orders'], // Invalidate all active orders
        (orderId: string) => ['order', orderId] // Invalidate specific order
      ],
      onSuccess: (data, orderId) => {
        console.log(`Order ${orderId} cancelled successfully`);
      }
    }
  }
});
```

**Usage in Pinia Store**:

```typescript
import { defineStore } from 'pinia';
import { dotted } from '@orb-zone/dotted-json';

export const useOrderStore = defineStore('orders', () => {
  const userId = ref('user:alice');

  const data = dotted({
    userId,
    '.activeOrders': 'orders.active(${userId})',
    '.userProfile': 'user.profile(${userId})',
    '.displayName': '${userProfile.name}',
    '.pendingCount': '${activeOrders.filter(o => o.status === "pending").length}'
  }, {
    resolvers: {
      ...surrealPlugin.resolvers,
      ...coladaPlugin.resolvers
    }
  });

  async function cancelOrder(orderId: string) {
    await coladaPlugin.resolvers['orders.cancel'](orderId);
    // Cache automatically invalidated, UI updates
  }

  return { data, cancelOrder };
});
```

**Benefits**:
- ✅ **Reduced network traffic**: Cache hits avoid database calls
- ✅ **Faster UI**: Instant responses from cache
- ✅ **Smart invalidation**: Mutations trigger precise cache updates
- ✅ **Request deduplication**: Multiple components share same query
- ✅ **Stale-while-revalidate**: Show cached data, fetch fresh in background

---

### 4. Dotted-JSON as the Bridge

**Problem**: Connecting database queries to reactive state is verbose and error-prone.

**Solution**: Dotted-JSON expressions provide declarative data dependencies.

```typescript
const store = dotted({
  // Static data
  userId: 'user:alice',
  settings: { theme: 'dark', locale: 'en' },

  // Database queries (lazy, cached)
  '.user': 'db.user.select(${userId})',
  '.orders': 'orders.active(${userId})',

  // Derived computations (lazy)
  '.userName': '${user.name || "Guest"}',
  '.orderCount': '${orders.length}',
  '.totalSpent': '${orders.reduce((sum, o) => sum + o.total, 0)}',

  // Nested expansion
  '.recentOrder': '${orders[0]}',
  '.recentItems': '${recentOrder?.items || []}',

  // Conditional logic
  '.isPremium': '${user.subscriptionTier === "premium"}',
  '.discount': '${isPremium ? 0.15 : 0}',

  // i18n with variants
  '.greeting': {
    '.default': 'Hello, ${userName}!',
    '.es': 'Hola, ${userName}!',
    '.ja': 'こんにちは、${userName}さん!'
  }
}, { resolvers, context: { lang: 'en' } });

// All properties are lazy - only evaluated when accessed
await store.userName;      // Triggers user query if not cached
await store.orderCount;    // Triggers orders query if not cached
await store.greeting;      // Uses variant resolver for i18n
```

**Benefits**:
- ✅ **Declarative**: Data dependencies are self-documenting
- ✅ **Lazy**: Only fetch what's actually used
- ✅ **Type-safe**: TypeScript + Zod validation
- ✅ **Template interpolation**: `${path}` syntax is intuitive
- ✅ **i18n built-in**: Variant system for localization

---

## Concrete Usage Pattern

### Full Stack Example: Order Management App

#### 1. Database Schema (SurrealDB)

```sql
-- Define tables
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD email ON user TYPE string ASSERT string::is::email($value);
DEFINE FIELD role ON user TYPE string ASSERT $value IN ['user', 'admin'];

DEFINE TABLE orders SCHEMAFULL;
DEFINE FIELD user ON orders TYPE record<user>;
DEFINE FIELD status ON orders TYPE string;
DEFINE FIELD total ON orders TYPE decimal;
DEFINE FIELD items ON orders TYPE array;
DEFINE FIELD created_at ON orders TYPE datetime DEFAULT time::now();

-- Define custom functions
DEFINE FUNCTION fn::getActiveOrders($userId: string) {
  RETURN SELECT * FROM orders
         WHERE user = $userId
         AND status IN ['pending', 'processing', 'shipped']
         ORDER BY created_at DESC
         FETCH items;
} PERMISSIONS WHERE $auth.id = $userId OR $auth.role = 'admin';

DEFINE FUNCTION fn::cancelOrder($orderId: string) {
  LET $order = SELECT * FROM $orderId;
  IF $order.status != 'pending' {
    THROW "Cannot cancel order in status: " + $order.status;
  };
  UPDATE $orderId SET status = 'cancelled', updated_at = time::now();
  RETURN SELECT * FROM $orderId;
} PERMISSIONS WHERE $auth.id = (SELECT user FROM $orderId).user OR $auth.role = 'admin';

-- Define permissions
DEFINE TABLE orders PERMISSIONS
  FOR select WHERE user = $auth.id OR $auth.role = 'admin'
  FOR create WHERE user = $auth.id
  FOR update WHERE user = $auth.id OR $auth.role = 'admin'
  FOR delete WHERE $auth.role = 'admin';
```

#### 2. Client Setup (Vue + Pinia)

```typescript
// plugins/database.ts
import { withSurrealDB } from '@orb-zone/dotted-json/plugins/surrealdb';
import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada';
import { z } from 'zod';

// Zod schemas mirror database schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin'])
});

const OrderSchema = z.object({
  id: z.string(),
  user: z.string(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  total: z.number(),
  items: z.array(z.any()),
  created_at: z.string()
});

// Initialize SurrealDB plugin
export const surrealPlugin = await withSurrealDB({
  url: import.meta.env.VITE_SURREALDB_URL,
  namespace: 'app',
  database: 'main',
  auth: {
    type: 'scope',
    namespace: 'app',
    database: 'main',
    access: 'user',
    variables: {
      email: 'alice@example.com',
      pass: 'secure123'
    }
  },
  tables: ['user', 'orders'],
  functions: [
    {
      name: 'getActiveOrders',
      params: z.object({ userId: z.string() }),
      returns: z.array(OrderSchema)
    },
    {
      name: 'cancelOrder',
      params: z.object({ orderId: z.string() }),
      returns: OrderSchema
    }
  ]
});

// Initialize Pinia Colada plugin
export const coladaPlugin = withPiniaColada({
  queries: {
    'orders.active': {
      key: (userId: string) => ['active-orders', userId],
      query: async (userId: string) => {
        return surrealPlugin.resolvers['db.fn.getActiveOrders']({ userId });
      },
      staleTime: 30_000,
      refetchOnWindowFocus: true
    },
    'user.byId': {
      key: (userId: string) => ['user', userId],
      query: async (userId: string) => {
        const result = await surrealPlugin.resolvers['db.user.select'](userId);
        return result[0];
      },
      staleTime: 60_000
    }
  },
  mutations: {
    'orders.cancel': {
      mutation: async (orderId: string) => {
        return surrealPlugin.resolvers['db.fn.cancelOrder']({ orderId });
      },
      invalidates: [
        (orderId: string) => ['active-orders'],
        (orderId: string) => ['order', orderId]
      ]
    }
  }
});
```

#### 3. Pinia Store

```typescript
// stores/orders.ts
import { defineStore } from 'pinia';
import { dotted } from '@orb-zone/dotted-json';
import { surrealPlugin, coladaPlugin } from '~/plugins/database';

export const useOrderStore = defineStore('orders', () => {
  const authStore = useAuthStore();

  const data = dotted({
    // Current user ID from auth store
    get userId() {
      return authStore.userId;
    },

    // Fetch user profile
    '.user': 'user.byId(${userId})',

    // Fetch active orders
    '.orders': 'orders.active(${userId})',

    // Derived state
    '.userName': '${user?.name || "Guest"}',
    '.orderCount': '${orders?.length || 0}',
    '.totalSpent': '${orders?.reduce((sum, o) => sum + o.total, 0) || 0}',
    '.pendingOrders': '${orders?.filter(o => o.status === "pending") || []}',

    // i18n messages
    '.welcomeMessage': {
      '.default': 'Welcome, ${userName}!',
      '.es': '¡Bienvenido, ${userName}!',
      '.ja': 'ようこそ、${userName}さん!'
    }
  }, {
    resolvers: {
      ...surrealPlugin.resolvers,
      ...coladaPlugin.resolvers
    }
  });

  // Actions
  async function cancelOrder(orderId: string) {
    try {
      await coladaPlugin.resolvers['orders.cancel'](orderId);
      // Cache auto-invalidated, UI updates
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  return {
    data,
    cancelOrder
  };
});
```

#### 4. Vue Component

```vue
<script setup lang="ts">
import { useOrderStore } from '~/stores/orders';

const orderStore = useOrderStore();
const { data } = orderStore;

// Reactive computations
const userName = computed(() => data.userName);
const orders = computed(() => data.orders);
const totalSpent = computed(() => data.totalSpent);
const welcomeMessage = computed(() => data.welcomeMessage);

async function handleCancelOrder(orderId: string) {
  if (confirm('Are you sure you want to cancel this order?')) {
    await orderStore.cancelOrder(orderId);
  }
}
</script>

<template>
  <div class="order-dashboard">
    <h1>{{ welcomeMessage }}</h1>

    <div class="stats">
      <div class="stat">
        <span class="label">Total Orders</span>
        <span class="value">{{ orders?.length || 0 }}</span>
      </div>
      <div class="stat">
        <span class="label">Total Spent</span>
        <span class="value">${{ totalSpent?.toFixed(2) }}</span>
      </div>
    </div>

    <div class="orders">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header">
          <span class="order-id">{{ order.id }}</span>
          <span class="order-status" :class="order.status">
            {{ order.status }}
          </span>
        </div>
        <div class="order-total">${{ order.total.toFixed(2) }}</div>
        <button
          v-if="order.status === 'pending'"
          @click="handleCancelOrder(order.id)"
          class="btn-cancel"
        >
          Cancel Order
        </button>
      </div>
    </div>
  </div>
</template>
```

**What happens when user clicks "Cancel Order"**:

1. `handleCancelOrder` calls `orderStore.cancelOrder(orderId)`
2. Mutation resolver calls `db.fn.cancelOrder({ orderId })`
3. SurrealDB validates permissions, updates order status
4. Mutation's `invalidates` triggers cache invalidation for `['active-orders']`
5. Pinia Colada refetches fresh data
6. Vue reactivity updates UI automatically

**Benefits**:
- ✅ **Zero custom backend**: All logic in SurrealDB functions
- ✅ **Type-safe end-to-end**: Zod validates at runtime
- ✅ **Automatic cache management**: Pinia Colada handles invalidation
- ✅ **Reactive UI**: Vue updates when cache updates
- ✅ **i18n ready**: Variant system for localization

---

## Future: Unified Plugin

### The Missing Piece

Currently, integrating SurrealDB + Pinia Colada requires manual wiring:
- Define SurrealDB functions separately from Pinia queries
- Manually invalidate cache on LIVE query updates
- Duplicate query key logic

### Proposed: `withSurrealDBPinia()`

A unified plugin that combines both layers:

```typescript
import { withSurrealDBPinia } from '@orb-zone/dotted-json/plugins/surrealdb-pinia';

const plugin = await withSurrealDBPinia({
  // SurrealDB connection
  surrealdb: {
    url: 'ws://localhost:8000/rpc',
    namespace: 'app',
    database: 'main',
    auth: { type: 'scope', access: 'user', variables: { /* ... */ } }
  },

  // Auto-generate Pinia Colada queries from tables
  tables: {
    user: {
      staleTime: 60_000,
      cache: true
    },
    orders: {
      staleTime: 30_000,
      cache: true
    }
  },

  // Custom functions automatically become cached queries
  functions: [
    {
      name: 'getActiveOrders',
      params: z.object({ userId: z.string() }),
      returns: z.array(OrderSchema),
      cache: {
        key: (params) => ['active-orders', params.userId],
        staleTime: 30_000
      }
    },
    {
      name: 'cancelOrder',
      params: z.object({ orderId: z.string() }),
      returns: OrderSchema,
      mutation: true, // Mark as mutation
      invalidates: [
        (params) => ['active-orders'], // Invalidate all active orders
        (params) => ['order', params.orderId] // Invalidate specific order
      ]
    }
  ],

  // Real-time LIVE queries
  live: {
    enabled: true,
    tables: ['orders', 'notifications'],
    // Auto-invalidate Pinia cache on database changes
    onUpdate: (table, action, data) => {
      // Smart invalidation based on action
      switch (action) {
        case 'CREATE':
          plugin.invalidateQueries([table]);
          break;
        case 'UPDATE':
          plugin.setQueryData([table, data.id], data);
          break;
        case 'DELETE':
          plugin.invalidateQueries([table]);
          plugin.removeQueries([table, data.id]);
          break;
      }
    },
    // DIFF mode for efficient updates
    diff: true
  },

  // Global cache defaults
  defaults: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 3
  }
});

// Usage in Pinia store - much simpler!
const data = dotted({
  userId: 'user:alice',
  '.orders': 'db.fn.getActiveOrders({ userId: ${userId} })',
  '.orderCount': '${orders.length}'
}, { resolvers: plugin.resolvers });

// Mutations trigger automatic cache invalidation
await plugin.resolvers['db.fn.cancelOrder']({ orderId: 'order:123' });
// ^ Automatically invalidates ['active-orders'] and refetches
```

### Benefits of Unified Plugin

1. **Single Configuration**: One place to define database + cache behavior
2. **Auto-Generated Queries**: Tables automatically become cached queries
3. **Smart Invalidation**: LIVE queries trigger precise cache updates
4. **Type Safety**: Zod schemas validate both DB and cache boundaries
5. **Real-Time Sync**: WebSocket updates keep all clients in sync
6. **Zero Boilerplate**: No manual query key management

### Implementation Strategy

This could be built as:

**Option A**: New plugin `src/plugins/surrealdb-pinia.ts`
- Wraps both `withSurrealDB` and `withPiniaColada`
- Manages lifecycle (connect/disconnect/subscribe)
- Provides unified API

**Option B**: Enhancement to existing plugins
- Add `withCache` option to SurrealDB plugin
- Add `withSurrealDB` option to Pinia Colada plugin
- Both delegate to shared integration layer

**Recommendation**: Option A (new plugin) for clean separation of concerns.

---

## Graph Relations & Advanced Patterns

### Using SurrealDB Graph Relations

SurrealDB's graph capabilities enable rich data models:

```sql
-- Define edge table for relationships
DEFINE TABLE likes SCHEMAFULL TYPE RELATION IN user OUT post;
DEFINE FIELD created_at ON likes TYPE datetime DEFAULT time::now();

-- Create relationship
RELATE user:alice->likes->post:123 SET created_at = time::now();

-- Query with graph traversal
SELECT *, ->likes->post.* AS liked_posts FROM user:alice;

-- Custom function with graph traversal
DEFINE FUNCTION fn::getUserFeed($userId: string, $limit: int) {
  RETURN SELECT * FROM (
    SELECT ->follows->user->posts AS feed FROM $userId
  ).feed ORDER BY created_at DESC LIMIT $limit;
};
```

**Client Integration**:

```typescript
const plugin = await withSurrealDBPinia({
  surrealdb: { /* ... */ },
  functions: [
    {
      name: 'getUserFeed',
      params: z.object({
        userId: z.string(),
        limit: z.number().default(20)
      }),
      returns: z.array(PostSchema),
      cache: {
        key: (params) => ['user-feed', params.userId, params.limit],
        staleTime: 60_000
      }
    }
  ]
});

// Usage
const store = dotted({
  userId: 'user:alice',
  '.feed': 'db.fn.getUserFeed({ userId: ${userId}, limit: 20 })',
  '.latestPost': '${feed[0]}'
}, { resolvers: plugin.resolvers });
```

### Permission-Based Filtering

SurrealDB's row-level permissions automatically filter data:

```sql
-- Define permissions on table
DEFINE TABLE posts PERMISSIONS
  FOR select WHERE
    published = true
    OR author = $auth.id
    OR $auth.role = 'admin';
  FOR create WHERE author = $auth.id;
  FOR update WHERE author = $auth.id OR $auth.role = 'admin';
  FOR delete WHERE author = $auth.id OR $auth.role = 'admin';

-- Users automatically see only authorized rows
SELECT * FROM posts;
-- ^ Returns only published posts OR user's own posts OR all if admin
```

**Client Integration** (automatic):

```typescript
// Same query, different results based on auth context
const data = dotted({
  '.posts': 'db.posts.select()'
}, { resolvers: plugin.resolvers });

// User sees: [published posts, their drafts]
// Admin sees: [all posts]
// Anonymous sees: [published posts]
```

---

## Developer Experience Wins

### 1. No Custom Backend Needed

Traditional stack:
```
Frontend → REST API → Business Logic Layer → ORM → Database
```

SurrealDB stack:
```
Frontend → SurrealDB (business logic in fn::)
```

**Savings**:
- ❌ No Express/Fastify/etc server
- ❌ No REST/GraphQL schema definitions
- ❌ No ORM (Prisma/TypeORM/etc)
- ❌ No manual auth middleware
- ✅ Just SurrealDB functions + permissions

### 2. Type Safety End-to-End

```typescript
// Define schema once
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// Use everywhere with validation
const plugin = await withSurrealDBPinia({
  functions: [{
    name: 'getUser',
    params: z.object({ id: z.string() }),
    returns: UserSchema // ← Runtime validation
  }]
});

// TypeScript infers types from Zod
type User = z.infer<typeof UserSchema>;

// Usage is fully typed
const user: User = await plugin.resolvers['db.fn.getUser']({ id: 'user:123' });
```

### 3. Real-Time by Default

Traditional approach:
- Set up Socket.io/Pusher
- Write event handlers
- Manage subscriptions
- Handle reconnection logic

SurrealDB approach:
```typescript
const plugin = await withSurrealDBPinia({
  live: { enabled: true, tables: ['orders'] }
});

// Done! UI updates automatically on database changes
```

### 4. Intelligent Caching

Traditional approach:
- Write cache logic manually
- Decide when to invalidate
- Handle race conditions
- Implement request deduplication

Pinia Colada approach:
```typescript
const plugin = withPiniaColada({
  queries: {
    'getUser': {
      key: (id) => ['user', id],
      query: fetchUser,
      staleTime: 60_000 // ← Automatic caching
    }
  },
  mutations: {
    'updateUser': {
      mutation: updateUser,
      invalidates: [['users']] // ← Automatic invalidation
    }
  }
});

// Done! Cache managed automatically
```

### 5. i18n Built-In

Traditional approach:
- Set up i18next/vue-i18n
- Create translation files
- Manage language switching
- Handle pluralization

Dotted-JSON approach:
```typescript
const data = dotted({
  '.greeting': {
    '.default': 'Hello, ${userName}!',
    '.es': '¡Hola, ${userName}!',
    '.es:formal': 'Saludos, ${userName}.',
    '.ja': 'こんにちは、${userName}さん!',
    '.ja:formal': '${userName}様、ようこそ。'
  }
}, { context: { lang: 'es', form: 'casual' } });

await data.greeting; // → "¡Hola, Alice!"
```

---

## Performance Characteristics

### Caching Strategy

**Query Cache Lifecycle**:

1. **First Access**:
   - Cache miss → fetch from SurrealDB
   - Store in Pinia Colada cache
   - Return result

2. **Subsequent Access** (within `staleTime`):
   - Cache hit → return immediately
   - No network request

3. **After `staleTime`**:
   - Return stale data immediately (fast UX)
   - Fetch fresh data in background
   - Update cache when fresh data arrives

4. **After `gcTime`**:
   - Remove from cache if unused
   - Next access is cache miss

**Example Timings**:

```typescript
const config = {
  queries: {
    'user': {
      staleTime: 60_000,  // Fresh for 1 minute
      gcTime: 5 * 60_000  // Keep for 5 minutes if unused
    },
    'orders': {
      staleTime: 30_000,  // Fresh for 30 seconds
      gcTime: 2 * 60_000  // Keep for 2 minutes
    }
  }
};
```

### Request Deduplication

Multiple components accessing same data triggers only one request:

```typescript
// Component A
const orders = await data.orders;

// Component B (renders simultaneously)
const orders = await data.orders;

// ^ Only ONE network request, both get same cached result
```

### Lazy Evaluation

Dotted-JSON only evaluates accessed properties:

```typescript
const data = dotted({
  '.orders': 'db.fn.getOrders()',     // Not fetched yet
  '.user': 'db.fn.getUser()',         // Not fetched yet
  '.stats': 'db.fn.getStats()'        // Not fetched yet
});

await data.orders; // ← Only this query runs
// user and stats remain unfetched until accessed
```

### Bundle Size Impact

**Core Library**: ~18 kB (current)

**Plugin Sizes** (estimated):
- SurrealDB plugin: ~2-3 kB (CRUD + function wrappers)
- Pinia Colada plugin: ~1-2 kB (query/mutation resolvers)
- Unified plugin: ~4-5 kB (combines both + LIVE query logic)

**Peer Dependencies** (user installs):
- `surrealdb`: ~80 kB
- `@pinia/colada`: ~30 kB
- `pinia`: ~20 kB
- `vue`: (already in Vue app)

**Total Bundle Impact**: ~25-30 kB for full stack (core + plugins + dependencies)

**Comparison**:
- Traditional stack (Express + Axios + Vuex): ~150-200 kB
- This approach: ~25-30 kB
- **Savings**: ~120-170 kB

---

## Roadmap to Implementation

### Phase 6A: LIVE Query Support (v0.6.0)

**Goal**: Add real-time subscriptions to existing SurrealDB plugin

**Tasks**:
1. Enhance `withSurrealDB` with `live` config option
2. Implement `db.live()` subscription management
3. Add lifecycle hooks (`onUpdate`, `onCreate`, `onDelete`)
4. Write tests for LIVE queries (requires SurrealDB instance)
5. Document LIVE query patterns

**API**:
```typescript
const plugin = await withSurrealDB({
  url, namespace, database,
  live: {
    enabled: true,
    tables: ['orders'],
    onUpdate: (table, action, data) => {
      console.log(`${table} ${action}:`, data);
    }
  }
});
```

### Phase 6B: Cache Integration (v0.7.0)

**Goal**: Bridge SurrealDB LIVE queries with Pinia Colada cache

**Tasks**:
1. Add `invalidateCache` option to LIVE query config
2. Integrate with Pinia Colada's `invalidateQueries` API
3. Support `setQueryData` for optimistic updates
4. Write integration tests (SurrealDB + Pinia Colada)
5. Document cache invalidation patterns

**API**:
```typescript
const plugin = await withSurrealDB({
  live: {
    enabled: true,
    tables: ['orders'],
    cache: {
      enabled: true,
      onUpdate: (table, action, data) => {
        piniaColada.invalidateQueries({ queryKey: [table] });
      }
    }
  }
});
```

### Phase 6C: Unified Plugin (v0.8.0)

**Goal**: Single plugin combining SurrealDB + Pinia Colada

**Tasks**:
1. Create `src/plugins/surrealdb-pinia.ts`
2. Auto-generate query resolvers from `tables` config
3. Auto-generate mutation resolvers from `functions` with `mutation: true`
4. Implement smart cache invalidation from LIVE queries
5. Add Vue composable: `useSurrealQuery()` / `useSurrealMutation()`
6. Write comprehensive tests
7. Document migration from separate plugins

**API**:
```typescript
const plugin = await withSurrealDBPinia({
  surrealdb: { url, namespace, database },
  tables: {
    user: { staleTime: 60_000 },
    orders: { staleTime: 30_000 }
  },
  functions: [
    {
      name: 'getActiveOrders',
      cache: { staleTime: 30_000 }
    },
    {
      name: 'cancelOrder',
      mutation: true,
      invalidates: ['active-orders']
    }
  ],
  live: { enabled: true, tables: ['orders'] }
});
```

### Phase 7: Vue Composables (v0.9.0)

**Goal**: First-class Vue integration with composables

**Tasks**:
1. Create `src/composables/useSurrealQuery.ts`
2. Create `src/composables/useSurrealMutation.ts`
3. Integrate with Vue lifecycle (automatic cleanup on unmount)
4. Add SSR support (Nuxt compatibility)
5. Write Vue-specific tests
6. Document composable patterns

**API**:
```typescript
// In Vue component
const { data, isLoading, error, refetch } = useSurrealQuery(
  () => ['active-orders', userId.value],
  () => plugin.resolvers['db.fn.getActiveOrders']({ userId: userId.value }),
  { staleTime: 30_000 }
);

const { mutate, isPending } = useSurrealMutation(
  (orderId: string) => plugin.resolvers['db.fn.cancelOrder']({ orderId }),
  {
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries(['active-orders']);
    }
  }
);
```

---

## Open Questions & Decisions

### 1. Framework Flexibility vs Vue Focus

**Current State**: Plugin architecture supports any framework

**Question**: Should unified plugin be Vue-only or framework-agnostic?

**Options**:
- **A**: `withSurrealDBPinia` is Vue-only, keep existing plugins for other frameworks
- **B**: Unified plugin is framework-agnostic, Vue composables are separate layer

**Recommendation**: **Option A**
- Primary use case is Vue 3 ecosystem
- Can add `withSurrealDBTanstack` later for React/Svelte/etc
- Simpler initial implementation

### 2. LIVE Query Auto-Subscription

**Question**: Should LIVE queries auto-subscribe for cached queries?

**Options**:
- **A**: Auto-subscribe to all cached queries (automatic real-time)
- **B**: Manual opt-in per query (`live: true`)
- **C**: Global opt-in with table whitelist (`live: { tables: [...] }`)

**Recommendation**: **Option C**
- Explicit control over WebSocket connections
- Avoids unexpected network usage
- User can scale to real-time incrementally

### 3. Cache Invalidation Strategy

**Question**: How aggressive should LIVE query cache invalidation be?

**Options**:
- **A**: Invalidate entire table on any change (simple, aggressive)
- **B**: Invalidate specific queries based on record ID (precise, complex)
- **C**: Allow custom invalidation logic (flexible, requires user code)

**Recommendation**: **Option C with defaults**
- Default: Invalidate entire table (Option A)
- Advanced: Custom `onUpdate` callback (Option C)
- User can optimize for their use case

### 4. Permission Errors vs Silent Filtering

**Question**: How to handle permission-denied scenarios?

**SurrealDB Behavior**: Returns empty results for unauthorized rows (silent filtering)

**Options**:
- **A**: Preserve SurrealDB behavior (empty results)
- **B**: Throw error if zero results (explicit)
- **C**: Return metadata indicating filtering (`{ data: [], filtered: true }`)

**Recommendation**: **Option A**
- Matches SurrealDB semantics
- User can check `results.length === 0` if needed
- Less surprising for SurrealDB users

### 5. Zod Validation in Production

**Question**: Should Zod validation run in production builds?

**Options**:
- **A**: Always validate (safety over performance)
- **B**: Strip in production (performance over safety)
- **C**: Configurable per function (`validate: false`)

**Recommendation**: **Option C with default true**
- Safety by default
- Allow opt-out for performance-critical paths
- User can measure impact and decide

---

## Success Metrics

### Technical Metrics

- **Bundle Size**: Unified plugin < 5 kB
- **Performance**: Cache hit < 1ms, cache miss < 50ms (local network)
- **Type Safety**: 100% type coverage, zero `any` types
- **Test Coverage**: > 90% across all plugin features

### Developer Experience

- **Time to First Query**: < 5 minutes from install to working query
- **Boilerplate Reduction**: 80% less code vs traditional stack
- **Type Errors**: Catch 90%+ of issues at compile time (TypeScript + Zod)

### Adoption

- **Community Feedback**: Positive response from Vue + SurrealDB communities
- **Example Apps**: 3+ production-ready examples
- **Documentation**: Comprehensive guides for common patterns

---

## Conclusion

This vision combines the best of three ecosystems:

1. **SurrealDB**: Database-first development with `fn::` functions and LIVE queries
2. **Pinia Colada**: Intelligent caching and mutation management for Vue
3. **Dotted-JSON**: Declarative data dependencies with lazy evaluation

The result is a **zero-backend, type-safe, real-time, cached** architecture that maximizes developer experience while minimizing bundle size and boilerplate.

**Next Steps**:
1. Document integration patterns (separate doc)
2. Update ROADMAP.md with Phase 6-7 plans
3. Prototype unified plugin to validate API design
4. Gather community feedback before full implementation

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-10-06
**Next Review**: After v1.0.0 release
