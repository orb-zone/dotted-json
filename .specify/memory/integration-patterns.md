# SurrealDB + Pinia Integration Patterns

**Created**: 2025-10-06
**Relates To**: [surrealdb-vue-vision.md](./surrealdb-vue-vision.md)
**Status**: Pattern Library

---

## Overview

This document provides concrete patterns for integrating SurrealDB with Pinia stores using the dotted-json plugin architecture. Each pattern includes:

- **Problem**: What challenge does this solve?
- **Solution**: How to implement it
- **Example**: Working code
- **Trade-offs**: Pros and cons

---

## Table of Contents

1. [Real-Time Sync Patterns](#real-time-sync-patterns)
2. [Business Logic Patterns](#business-logic-patterns)
3. [Graph Relations Patterns](#graph-relations-patterns)
4. [Permission Model Patterns](#permission-model-patterns)
5. [Caching Strategies](#caching-strategies)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Optimistic Updates](#optimistic-updates)
8. [Multi-Tenancy Patterns](#multi-tenancy-patterns)

---

## Real-Time Sync Patterns

### Pattern 1.1: LIVE Query with Cache Invalidation

**Problem**: Keep Pinia cache in sync with database changes from other clients.

**Solution**: Subscribe to SurrealDB LIVE queries and invalidate Pinia Colada cache on updates.

**Example**:

```typescript
import { withSurrealDB } from '@orb-zone/dotted-json/plugins/surrealdb';
import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada';
import { onUnmounted } from 'vue';

// Setup SurrealDB plugin
const surrealPlugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  tables: ['orders']
});

// Setup Pinia Colada plugin
const coladaPlugin = withPiniaColada({
  queries: {
    'orders.list': {
      key: (userId: string) => ['orders', userId],
      query: async (userId: string) => {
        const [result] = await surrealPlugin.resolvers['db.orders.select']();
        return result.filter(order => order.user === userId);
      },
      staleTime: 30_000
    }
  }
});

// Subscribe to LIVE queries in store
export const useOrderStore = defineStore('orders', () => {
  const { db } = surrealPlugin;
  const userId = ref('user:alice');
  let liveQueryId: string | null = null;

  // Subscribe to live updates
  async function subscribeLiveUpdates() {
    liveQueryId = await db.live('orders', (action, result) => {
      // Filter to current user's orders
      if (result.user !== userId.value) return;

      switch (action) {
        case 'CREATE':
          // Invalidate cache to refetch with new order
          coladaPlugin.invalidateQueries(['orders', userId.value]);
          break;

        case 'UPDATE':
          // Update cache directly for instant UI update
          coladaPlugin.setQueryData(['orders', userId.value], (old: any[]) => {
            return old.map(order =>
              order.id === result.id ? result : order
            );
          });
          break;

        case 'DELETE':
          // Remove from cache
          coladaPlugin.setQueryData(['orders', userId.value], (old: any[]) => {
            return old.filter(order => order.id !== result.id);
          });
          break;

        case 'CLOSE':
          console.log('Live query closed');
          break;
      }
    });
  }

  // Cleanup on unmount
  onUnmounted(async () => {
    if (liveQueryId) {
      await db.kill(liveQueryId);
    }
  });

  // Initialize
  subscribeLiveUpdates();

  const data = dotted({
    userId,
    '.orders': 'orders.list(${userId})'
  }, {
    resolvers: {
      ...surrealPlugin.resolvers,
      ...coladaPlugin.resolvers
    }
  });

  return { data };
});
```

**Trade-offs**:
- ✅ **Pro**: Instant updates across all clients
- ✅ **Pro**: No polling needed
- ❌ **Con**: Requires WebSocket connection (more server resources)
- ❌ **Con**: Needs manual cleanup to avoid memory leaks

---

### Pattern 1.2: Selective LIVE Query Subscription

**Problem**: Don't want to subscribe to all tables, only specific critical ones.

**Solution**: Use table-specific LIVE queries with filters.

**Example**:

```typescript
// Only subscribe to high-priority notifications
const notificationStore = defineStore('notifications', () => {
  const userId = ref('user:alice');

  async function subscribeToNotifications() {
    // Use query() with LIVE SELECT for filtering
    const result = await surrealPlugin.db.query(
      'LIVE SELECT * FROM notifications WHERE user = $userId AND priority = "high"',
      { userId: userId.value }
    );

    const liveQueryId = result[0]; // UUID of live query

    await surrealPlugin.db.subscribeLive(liveQueryId, (action, notification) => {
      if (action === 'CREATE') {
        // Show toast notification
        showToast(notification);
        // Invalidate cache
        coladaPlugin.invalidateQueries(['notifications', userId.value]);
      }
    });

    return liveQueryId;
  }

  // ... rest of store
});
```

**Trade-offs**:
- ✅ **Pro**: Fine-grained control over subscriptions
- ✅ **Pro**: Reduces server load (filtered at DB level)
- ❌ **Con**: More complex setup than table-level subscription
- ⚠️ **Note**: Filters must match SurrealDB permissions

---

### Pattern 1.3: DIFF Mode for Large Records

**Problem**: Large records cause excessive bandwidth when using full updates.

**Solution**: Use LIVE query DIFF mode to receive only changes (JSON Patch format).

**Example**:

```typescript
// Subscribe with diff mode
const liveQueryId = await surrealPlugin.db.live('large_documents', {
  diff: true // Request JSON Patch format
}, (action, patch) => {
  if (action === 'UPDATE' && patch.diff) {
    // Apply JSON Patch to cached data
    coladaPlugin.setQueryData(['document', patch.id], (old: any) => {
      return applyPatch(old, patch.diff); // Use fast-json-patch or similar
    });
  }
});
```

**Trade-offs**:
- ✅ **Pro**: Reduced bandwidth for large records
- ✅ **Pro**: Faster updates
- ❌ **Con**: Requires JSON Patch library
- ❌ **Con**: More complex to handle

---

## Business Logic Patterns

### Pattern 2.1: Custom Functions with Validation

**Problem**: Need to encapsulate business logic in database with type safety.

**Solution**: Define SurrealDB functions with Zod validation.

**Example**:

```sql
-- Server-side SurrealQL
DEFINE FUNCTION fn::processOrder($orderId: string) {
  -- Validate order status
  LET $order = SELECT * FROM $orderId LIMIT 1;
  IF !$order OR $order.status != 'pending' {
    THROW "Order not found or already processed";
  };

  -- Update inventory
  FOR $item IN $order.items {
    UPDATE $item.product SET stock -= $item.quantity;
  };

  -- Update order status
  UPDATE $orderId SET status = 'processing', processed_at = time::now();

  -- Return updated order
  RETURN SELECT * FROM $orderId;
} PERMISSIONS WHERE $auth.role IN ['admin', 'processor'];
```

**Client-side integration**:

```typescript
import { z } from 'zod';

const OrderSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
  items: z.array(z.object({
    product: z.string(),
    quantity: z.number().positive()
  })),
  processed_at: z.string().optional()
});

const plugin = await withSurrealDB({
  url, namespace, database,
  functions: [{
    name: 'processOrder',
    params: z.object({ orderId: z.string() }),
    returns: OrderSchema,
    validate: true // Enable Zod validation
  }]
});

// Usage
try {
  const result = await plugin.resolvers['db.fn.processOrder']({
    orderId: 'order:123'
  });
  // result is type-safe and validated
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  } else {
    console.error('Business logic error:', error.message);
  }
}
```

**Trade-offs**:
- ✅ **Pro**: Business logic centralized in database
- ✅ **Pro**: Type-safe end-to-end (Zod + TypeScript)
- ✅ **Pro**: Permissions enforced at DB level
- ❌ **Con**: Requires learning SurrealQL
- ⚠️ **Note**: Function errors propagate to client

---

### Pattern 2.2: Transaction-Like Functions

**Problem**: Need to ensure multiple operations succeed or fail together.

**Solution**: Use SurrealDB functions with error handling.

**Example**:

```sql
DEFINE FUNCTION fn::transferFunds($fromAccount: string, $toAccount: string, $amount: decimal) {
  -- Check source balance
  LET $from = SELECT * FROM $fromAccount LIMIT 1;
  IF $from.balance < $amount {
    THROW "Insufficient funds";
  };

  -- Perform transfer (atomic within function)
  UPDATE $fromAccount SET balance -= $amount;
  UPDATE $toAccount SET balance += $amount;

  -- Record transaction
  CREATE transaction SET
    from = $fromAccount,
    to = $toAccount,
    amount = $amount,
    timestamp = time::now();

  -- Return updated balances
  RETURN {
    from: (SELECT * FROM $fromAccount),
    to: (SELECT * FROM $toAccount)
  };
};
```

**Client usage**:

```typescript
const result = await plugin.resolvers['db.fn.transferFunds']({
  fromAccount: 'account:alice',
  toAccount: 'account:bob',
  amount: 100.00
});

// Update cache with new balances
coladaPlugin.setQueryData(['account', 'alice'], result.from);
coladaPlugin.setQueryData(['account', 'bob'], result.to);
```

**Trade-offs**:
- ✅ **Pro**: Atomic operations (all or nothing)
- ✅ **Pro**: Server-side validation
- ✅ **Pro**: Audit trail in one place
- ❌ **Con**: Limited transaction isolation (SurrealDB is eventually consistent)
- ⚠️ **Note**: Not ACID compliant in distributed mode

---

### Pattern 2.3: Computed Fields via Functions

**Problem**: Need expensive computed fields that shouldn't run client-side.

**Solution**: Create SurrealDB functions that compute server-side.

**Example**:

```sql
DEFINE FUNCTION fn::getUserStats($userId: string) {
  LET $user = SELECT * FROM $userId LIMIT 1;

  RETURN {
    user: $user,
    order_count: (SELECT count() FROM orders WHERE user = $userId GROUP ALL)[0].count,
    total_spent: (SELECT math::sum(total) AS sum FROM orders WHERE user = $userId GROUP ALL)[0].sum,
    avg_order_value: (SELECT math::mean(total) AS mean FROM orders WHERE user = $userId GROUP ALL)[0].mean,
    last_order_date: (SELECT created_at FROM orders WHERE user = $userId ORDER BY created_at DESC LIMIT 1)[0].created_at
  };
};
```

**Client usage**:

```typescript
const data = dotted({
  userId: 'user:alice',
  '.stats': 'db.fn.getUserStats({ userId: ${userId} })',
  '.displayStats': '${stats.order_count} orders, $${stats.total_spent.toFixed(2)} spent'
}, { resolvers: plugin.resolvers });

await data.displayStats; // → "42 orders, $1,234.56 spent"
```

**Trade-offs**:
- ✅ **Pro**: Offloads computation to database
- ✅ **Pro**: Reduces client bundle size
- ✅ **Pro**: Single source of truth for calculations
- ❌ **Con**: Slower than client-side computation
- ⚠️ **Cache**: Set high `staleTime` for expensive computations

---

## Graph Relations Patterns

### Pattern 3.1: Fetching Relations with FETCH

**Problem**: Need to load related records without multiple round-trips.

**Solution**: Use SurrealDB's `FETCH` clause in custom functions.

**Example**:

```sql
DEFINE FUNCTION fn::getPostWithComments($postId: string) {
  RETURN SELECT *,
    author.name AS author_name,
    comments.*.{
      id,
      text,
      author.name AS author_name,
      created_at
    } AS comments
  FROM $postId
  FETCH author, comments, comments.author;
};
```

**Client usage**:

```typescript
const data = dotted({
  postId: 'post:123',
  '.post': 'db.fn.getPostWithComments({ postId: ${postId} })',
  '.commentCount': '${post.comments.length}',
  '.commentAuthors': '${post.comments.map(c => c.author_name).join(", ")}'
}, { resolvers: plugin.resolvers });

await data.commentAuthors; // → "Alice, Bob, Charlie"
```

**Trade-offs**:
- ✅ **Pro**: Single query for nested data
- ✅ **Pro**: Efficient server-side joins
- ❌ **Con**: Can over-fetch if not careful
- ⚠️ **Note**: Use selective field projection to reduce payload

---

### Pattern 3.2: Graph Traversal with Edges

**Problem**: Need to query relationships stored as graph edges.

**Solution**: Use SurrealDB's graph traversal syntax.

**Example**:

```sql
-- Define edge table
DEFINE TABLE follows SCHEMAFULL TYPE RELATION IN user OUT user;
DEFINE FIELD created_at ON follows TYPE datetime DEFAULT time::now();

-- Function to get user's feed (posts from followed users)
DEFINE FUNCTION fn::getUserFeed($userId: string, $limit: int) {
  -- Get posts from users that $userId follows
  RETURN SELECT ->follows->user->posts.* AS posts
         FROM $userId
         FLATTEN posts
         ORDER BY created_at DESC
         LIMIT $limit;
};
```

**Client usage**:

```typescript
const data = dotted({
  userId: 'user:alice',
  '.feed': 'db.fn.getUserFeed({ userId: ${userId}, limit: 20 })',
  '.latestPost': '${feed[0]}',
  '.feedAuthors': '${feed.map(p => p.author).filter((v, i, a) => a.indexOf(v) === i)}'
}, { resolvers: plugin.resolvers });
```

**Trade-offs**:
- ✅ **Pro**: Natural representation of relationships
- ✅ **Pro**: Bidirectional queries (`->` and `<-`)
- ✅ **Pro**: Can store metadata on edges
- ❌ **Con**: More complex queries than simple JOINs

---

### Pattern 3.3: Multi-Hop Traversal

**Problem**: Need to traverse multiple levels of relationships.

**Solution**: Use recursive queries or multi-hop graph syntax.

**Example**:

```sql
DEFINE FUNCTION fn::getFriendOfFriends($userId: string, $depth: int) {
  -- Get friends of friends (2 hops)
  IF $depth = 2 {
    RETURN SELECT ->friends->user->friends->user.* AS fof
           FROM $userId
           FLATTEN fof
           WHERE fof.id != $userId; -- Exclude self
  };

  -- Get friends (1 hop)
  RETURN SELECT ->friends->user.* AS friends
         FROM $userId
         FLATTEN friends;
};
```

**Client usage**:

```typescript
const data = dotted({
  userId: 'user:alice',
  '.friends': 'db.fn.getFriendOfFriends({ userId: ${userId}, depth: 1 })',
  '.fof': 'db.fn.getFriendOfFriends({ userId: ${userId}, depth: 2 })',
  '.suggestions': '${fof.filter(f => !friends.some(fr => fr.id === f.id))}'
}, { resolvers: plugin.resolvers });

await data.suggestions; // Friend suggestions (FOF who aren't already friends)
```

**Trade-offs**:
- ✅ **Pro**: Enables social graph queries
- ✅ **Pro**: Server-side computation
- ❌ **Con**: Performance degrades with depth
- ⚠️ **Limit**: Set reasonable depth limits (max 3-4 hops)

---

## Permission Model Patterns

### Pattern 4.1: Row-Level Security

**Problem**: Users should only see their own data.

**Solution**: Use SurrealDB table permissions with `$auth` context.

**Example**:

```sql
-- Define table with row-level permissions
DEFINE TABLE messages SCHEMAFULL
  PERMISSIONS
    FOR select WHERE to = $auth.id OR from = $auth.id
    FOR create WHERE from = $auth.id
    FOR update NONE
    FOR delete WHERE from = $auth.id;

DEFINE FIELD from ON messages TYPE record<user>;
DEFINE FIELD to ON messages TYPE record<user>;
DEFINE FIELD text ON messages TYPE string;
DEFINE FIELD created_at ON messages TYPE datetime DEFAULT time::now();
```

**Client usage** (automatic filtering):

```typescript
// User alice@example.com is authenticated
const data = dotted({
  '.messages': 'db.messages.select()'
}, { resolvers: plugin.resolvers });

// Returns only messages where:
// - to = 'user:alice' OR from = 'user:alice'
// Other users' messages are invisible
await data.messages;
```

**Trade-offs**:
- ✅ **Pro**: Security enforced at database level
- ✅ **Pro**: Impossible to bypass (unlike middleware)
- ✅ **Pro**: Works with LIVE queries
- ❌ **Con**: Complex permissions can impact performance
- ⚠️ **Note**: Always test permissions with different user roles

---

### Pattern 4.2: Role-Based Access Control

**Problem**: Different user roles need different access levels.

**Solution**: Use `$auth.role` in permission clauses.

**Example**:

```sql
DEFINE TABLE posts SCHEMAFULL
  PERMISSIONS
    -- Anyone can read published posts
    FOR select WHERE published = true OR author = $auth.id OR $auth.role = 'admin'

    -- Only authenticated users can create
    FOR create WHERE $auth.id != NONE AND author = $auth.id

    -- Authors can update their own posts, admins can update any
    FOR update WHERE author = $auth.id OR $auth.role = 'admin'

    -- Only admins can delete
    FOR delete WHERE $auth.role = 'admin';
```

**Client usage**:

```typescript
// Regular user sees published + their drafts
const userData = dotted({
  '.posts': 'db.posts.select()'
}, { resolvers: plugin.resolvers });

// Admin sees all posts
const adminData = dotted({
  '.posts': 'db.posts.select()'
}, { resolvers: adminPlugin.resolvers }); // authenticated as admin
```

**Trade-offs**:
- ✅ **Pro**: Fine-grained access control
- ✅ **Pro**: Role checks happen at DB level
- ✅ **Pro**: No custom middleware needed
- ❌ **Con**: Roles must be set during authentication
- ⚠️ **Note**: Ensure roles are validated server-side

---

### Pattern 4.3: Field-Level Permissions

**Problem**: Some fields should only be visible to authorized users.

**Solution**: Use field-level permissions or projection in functions.

**Example**:

```sql
DEFINE FUNCTION fn::getUserProfile($userId: string) {
  LET $user = SELECT * FROM $userId LIMIT 1;

  -- Return different fields based on requester
  IF $auth.id = $userId {
    -- Own profile: return everything
    RETURN $user;
  } ELSE IF $auth.role = 'admin' {
    -- Admin: return everything except password_hash
    RETURN SELECT * OMIT password_hash FROM $userId;
  } ELSE {
    -- Public: return only public fields
    RETURN SELECT id, name, avatar, bio FROM $userId;
  };
};
```

**Client usage**:

```typescript
// Viewing own profile
const ownData = dotted({
  '.profile': 'db.fn.getUserProfile({ userId: "user:alice" })'
}, { resolvers: plugin.resolvers }); // authenticated as alice

await ownData.profile; // → { id, name, email, avatar, bio, settings }

// Viewing someone else's profile
const otherData = dotted({
  '.profile': 'db.fn.getUserProfile({ userId: "user:bob" })'
}, { resolvers: plugin.resolvers }); // authenticated as alice

await otherData.profile; // → { id, name, avatar, bio } (no email/settings)
```

**Trade-offs**:
- ✅ **Pro**: Granular field visibility
- ✅ **Pro**: Single function for all contexts
- ❌ **Con**: More complex function logic
- ⚠️ **Note**: Consider caching implications (different cache keys per requester)

---

## Caching Strategies

### Pattern 5.1: Stale-While-Revalidate

**Problem**: Want instant UI updates but also fresh data.

**Solution**: Use Pinia Colada's stale-while-revalidate pattern.

**Example**:

```typescript
const coladaPlugin = withPiniaColada({
  queries: {
    'user.profile': {
      key: (userId: string) => ['user', userId],
      query: async (userId: string) => {
        return surrealPlugin.resolvers['db.user.select'](userId);
      },
      staleTime: 60_000,  // Fresh for 1 minute
      gcTime: 5 * 60_000  // Keep in cache for 5 minutes
    }
  }
});
```

**Behavior**:
1. **First access**: Fetch from DB, cache result
2. **Within 1 minute**: Return cached result instantly
3. **After 1 minute**: Return stale cached result, refetch in background
4. **After 5 minutes idle**: Remove from cache

**Trade-offs**:
- ✅ **Pro**: Instant UI responses
- ✅ **Pro**: Data stays reasonably fresh
- ❌ **Con**: Users may briefly see stale data
- ⚠️ **Tune**: Adjust `staleTime` based on data volatility

---

### Pattern 5.2: Cache-First with Manual Invalidation

**Problem**: Data rarely changes, don't want unnecessary refetches.

**Solution**: Long `staleTime`, manual invalidation on mutations.

**Example**:

```typescript
const coladaPlugin = withPiniaColada({
  queries: {
    'categories.list': {
      key: () => ['categories'],
      query: async () => {
        return surrealPlugin.resolvers['db.categories.select']();
      },
      staleTime: Infinity, // Never auto-refetch
      gcTime: Infinity     // Never remove from cache
    }
  },
  mutations: {
    'categories.create': {
      mutation: async (name: string) => {
        return surrealPlugin.resolvers['db.categories.create']({ name });
      },
      invalidates: [['categories']] // Refetch categories after create
    }
  }
});
```

**Trade-offs**:
- ✅ **Pro**: Zero unnecessary network requests
- ✅ **Pro**: Instant UI for static data
- ❌ **Con**: Must remember to invalidate on mutations
- ⚠️ **Use**: Only for truly static data (settings, categories, etc.)

---

### Pattern 5.3: Optimistic Updates with Rollback

**Problem**: Want instant UI feedback for mutations, but handle errors gracefully.

**Solution**: Update cache optimistically, rollback on error.

**Example**:

```typescript
const coladaPlugin = withPiniaColada({
  mutations: {
    'todo.toggle': {
      mutation: async (todoId: string) => {
        return surrealPlugin.resolvers['db.fn.toggleTodo']({ todoId });
      },
      // Optimistic update
      onMutate: async (todoId: string) => {
        // Snapshot current cache
        const snapshot = coladaPlugin.getQueryData(['todos']);

        // Optimistically update cache
        coladaPlugin.setQueryData(['todos'], (old: any[]) => {
          return old.map(todo =>
            todo.id === todoId
              ? { ...todo, completed: !todo.completed }
              : todo
          );
        });

        // Return snapshot for rollback
        return { snapshot };
      },
      // Rollback on error
      onError: (error, todoId, context) => {
        // Restore snapshot
        coladaPlugin.setQueryData(['todos'], context.snapshot);
        console.error('Failed to toggle todo:', error);
      },
      // Refetch on success to ensure sync
      onSuccess: () => {
        coladaPlugin.invalidateQueries(['todos']);
      }
    }
  }
});
```

**Trade-offs**:
- ✅ **Pro**: Instant UI feedback
- ✅ **Pro**: Graceful error handling
- ❌ **Con**: More complex mutation logic
- ❌ **Con**: UI briefly shows incorrect state on error
- ⚠️ **Use**: For high-frequency mutations (likes, toggles, etc.)

---

## Error Handling Patterns

### Pattern 6.1: Hierarchical Error Defaults

**Problem**: Want graceful fallbacks for different error scenarios.

**Solution**: Use dotted-json's `.errorDefault` system.

**Example**:

```typescript
const data = dotted({
  userId: 'user:alice',

  '.user': 'db.user.select(${userId})',
  '.userName': {
    '.default': '${user.name}',
    '.errorDefault': 'Guest' // Fallback if user fetch fails
  },

  '.orders': 'db.fn.getActiveOrders({ userId: ${userId} })',
  '.orderCount': {
    '.default': '${orders.length}',
    '.errorDefault': 0 // Fallback if orders fetch fails
  },

  '.greeting': {
    '.default': 'Hello, ${userName}! You have ${orderCount} orders.',
    '.errorDefault': 'Hello! Unable to load your data right now.'
  }
}, { resolvers: plugin.resolvers });

// Even if all fetches fail, greeting still works
await data.greeting; // → "Hello! Unable to load your data right now."
```

**Trade-offs**:
- ✅ **Pro**: UI never breaks from errors
- ✅ **Pro**: Graceful degradation
- ❌ **Con**: May hide important errors
- ⚠️ **Log**: Always log errors even when using `.errorDefault`

---

### Pattern 6.2: Custom Error Types

**Problem**: Need to handle different error types differently.

**Solution**: Throw custom errors from SurrealDB functions, catch in client.

**Example**:

```sql
DEFINE FUNCTION fn::purchaseItem($userId: string, $itemId: string) {
  LET $user = SELECT * FROM $userId LIMIT 1;
  LET $item = SELECT * FROM $itemId LIMIT 1;

  IF !$item {
    THROW { type: 'NOT_FOUND', message: 'Item not found', code: 404 };
  };

  IF $user.balance < $item.price {
    THROW { type: 'INSUFFICIENT_FUNDS', message: 'Not enough credits', code: 402 };
  };

  -- Process purchase...
  RETURN $purchase;
};
```

**Client handling**:

```typescript
try {
  await plugin.resolvers['db.fn.purchaseItem']({
    userId: 'user:alice',
    itemId: 'item:sword'
  });
} catch (error: any) {
  switch (error.type) {
    case 'NOT_FOUND':
      showError('Item no longer available');
      break;
    case 'INSUFFICIENT_FUNDS':
      showError('You need more credits. Visit the shop!');
      break;
    default:
      showError('Something went wrong. Please try again.');
  }
}
```

**Trade-offs**:
- ✅ **Pro**: Rich error context
- ✅ **Pro**: Actionable user messages
- ❌ **Con**: Requires error handling in every caller
- ⚠️ **Consistency**: Use consistent error types across functions

---

### Pattern 6.3: Retry with Exponential Backoff

**Problem**: Transient failures (network issues) should be retried.

**Solution**: Use Pinia Colada's retry configuration.

**Example**:

```typescript
const coladaPlugin = withPiniaColada({
  queries: {
    'critical.data': {
      key: () => ['critical'],
      query: async () => {
        return surrealPlugin.resolvers['db.fn.getCriticalData']();
      },
      retry: 3, // Retry 3 times
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
    },
    'non.critical': {
      key: () => ['non-critical'],
      query: async () => {
        return surrealPlugin.resolvers['db.fn.getNonCriticalData']();
      },
      retry: false // Don't retry
    }
  }
});
```

**Trade-offs**:
- ✅ **Pro**: Resilient to transient failures
- ✅ **Pro**: Automatic retry logic
- ❌ **Con**: Slower error feedback on persistent failures
- ⚠️ **Limit**: Don't retry non-idempotent mutations

---

## Optimistic Updates

### Pattern 7.1: Instant Like/Unlike

**Problem**: Waiting for server response makes UI feel sluggish.

**Solution**: Update cache immediately, sync in background.

**Example**:

```typescript
const coladaPlugin = withPiniaColada({
  mutations: {
    'post.like': {
      mutation: async (postId: string) => {
        return surrealPlugin.resolvers['db.fn.likePost']({ postId });
      },
      onMutate: async (postId: string) => {
        // Cancel in-flight queries
        await coladaPlugin.cancelQueries(['posts']);

        // Snapshot for rollback
        const snapshot = coladaPlugin.getQueryData(['posts']);

        // Optimistic update
        coladaPlugin.setQueryData(['posts'], (old: any[]) => {
          return old.map(post =>
            post.id === postId
              ? { ...post, liked: true, like_count: post.like_count + 1 }
              : post
          );
        });

        return { snapshot };
      },
      onError: (error, postId, context) => {
        // Rollback
        coladaPlugin.setQueryData(['posts'], context.snapshot);
      }
    },
    'post.unlike': {
      mutation: async (postId: string) => {
        return surrealPlugin.resolvers['db.fn.unlikePost']({ postId });
      },
      onMutate: async (postId: string) => {
        const snapshot = coladaPlugin.getQueryData(['posts']);

        coladaPlugin.setQueryData(['posts'], (old: any[]) => {
          return old.map(post =>
            post.id === postId
              ? { ...post, liked: false, like_count: post.like_count - 1 }
              : post
          );
        });

        return { snapshot };
      },
      onError: (error, postId, context) => {
        coladaPlugin.setQueryData(['posts'], context.snapshot);
      }
    }
  }
});
```

**Trade-offs**:
- ✅ **Pro**: Instant UI feedback
- ✅ **Pro**: Perceived performance boost
- ❌ **Con**: Briefly shows incorrect state on error
- ⚠️ **Use**: Only for idempotent operations

---

### Pattern 7.2: Optimistic List Updates

**Problem**: Adding/removing items from list should feel instant.

**Solution**: Update list cache immediately.

**Example**:

```typescript
const coladaPlugin = withPiniaColada({
  mutations: {
    'todo.create': {
      mutation: async (text: string) => {
        return surrealPlugin.resolvers['db.todos.create']({ text, completed: false });
      },
      onMutate: async (text: string) => {
        const snapshot = coladaPlugin.getQueryData(['todos']);

        // Generate temporary ID
        const tempId = `temp-${Date.now()}`;

        // Add to cache immediately
        coladaPlugin.setQueryData(['todos'], (old: any[]) => [
          ...old,
          { id: tempId, text, completed: false, _optimistic: true }
        ]);

        return { snapshot, tempId };
      },
      onSuccess: (newTodo, text, context) => {
        // Replace temp item with real item
        coladaPlugin.setQueryData(['todos'], (old: any[]) => {
          return old.map(todo =>
            todo.id === context.tempId ? newTodo : todo
          );
        });
      },
      onError: (error, text, context) => {
        coladaPlugin.setQueryData(['todos'], context.snapshot);
      }
    }
  }
});
```

**Trade-offs**:
- ✅ **Pro**: Instant item appears in list
- ✅ **Pro**: Great UX for common operations
- ❌ **Con**: Need to manage temporary IDs
- ⚠️ **UI**: Show loading indicator for optimistic items

---

## Multi-Tenancy Patterns

### Pattern 8.1: Tenant Isolation via Namespace

**Problem**: Need to isolate data between different tenants/organizations.

**Solution**: Use separate SurrealDB namespaces per tenant.

**Example**:

```typescript
// Create plugin per tenant
async function createTenantPlugin(tenantId: string) {
  return await withSurrealDB({
    url: 'ws://localhost:8000/rpc',
    namespace: `tenant_${tenantId}`, // Separate namespace
    database: 'main',
    auth: {
      type: 'namespace',
      username: 'admin',
      password: process.env.NAMESPACE_PASSWORD
    },
    tables: ['users', 'projects']
  });
}

// Usage in store
const tenantStore = defineStore('tenant', () => {
  const tenantId = ref('acme-corp');
  const plugin = ref(null);

  watchEffect(async () => {
    plugin.value = await createTenantPlugin(tenantId.value);
  });

  const data = computed(() => dotted({
    '.users': 'db.users.select()'
  }, { resolvers: plugin.value?.resolvers }));

  return { data };
});
```

**Trade-offs**:
- ✅ **Pro**: Complete data isolation
- ✅ **Pro**: Easy to scale (separate namespaces)
- ❌ **Con**: More complex connection management
- ⚠️ **Security**: Ensure tenant ID is validated server-side

---

### Pattern 8.2: Tenant Filtering via Row-Level Security

**Problem**: Want all tenants in same database, but isolated.

**Solution**: Add `tenant` field and use permissions.

**Example**:

```sql
DEFINE TABLE projects SCHEMAFULL
  PERMISSIONS
    FOR select WHERE tenant = $auth.tenant
    FOR create WHERE tenant = $auth.tenant
    FOR update WHERE tenant = $auth.tenant
    FOR delete WHERE tenant = $auth.tenant;

DEFINE FIELD tenant ON projects TYPE string ASSERT $value = $auth.tenant;
DEFINE FIELD name ON projects TYPE string;
DEFINE FIELD status ON projects TYPE string;
```

**Client usage**:

```typescript
// Authenticate with tenant context
const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  auth: {
    type: 'scope',
    access: 'tenant_user',
    variables: {
      email: 'alice@acme.com',
      password: 'secure123',
      tenant: 'acme-corp' // Tenant ID embedded in auth
    }
  },
  tables: ['projects']
});

// Queries automatically filtered to tenant
const data = dotted({
  '.projects': 'db.projects.select()'
}, { resolvers: plugin.resolvers });

// Only returns projects where tenant = 'acme-corp'
await data.projects;
```

**Trade-offs**:
- ✅ **Pro**: Single database, simpler ops
- ✅ **Pro**: Row-level isolation via permissions
- ❌ **Con**: All tenants share same schema
- ⚠️ **Security**: Critical to validate `$auth.tenant` in permissions

---

## Summary

These patterns provide battle-tested approaches for common scenarios when integrating SurrealDB with Pinia stores using dotted-json. Key themes:

1. **LIVE Queries**: Enable real-time sync with smart cache invalidation
2. **Business Logic**: Centralize logic in `fn::` functions with Zod validation
3. **Graph Relations**: Leverage SurrealDB's graph features for rich queries
4. **Permissions**: Enforce security at database level
5. **Caching**: Use Pinia Colada for intelligent caching strategies
6. **Error Handling**: Graceful degradation with `.errorDefault`
7. **Optimistic Updates**: Instant UI feedback with rollback
8. **Multi-Tenancy**: Isolate data via namespaces or row-level security

**Next Steps**: See [surrealdb-vue-vision.md](./surrealdb-vue-vision.md) for architectural overview and future roadmap.

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-10-06
