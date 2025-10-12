# Performance Optimization Guide

This guide covers best practices and techniques for optimizing dotted-json performance in production applications.

---

## Table of Contents

1. [Cache Strategy](#cache-strategy)
2. [Variant Resolution](#variant-resolution)
3. [SurrealDB Optimization](#surrealdb-optimization)
4. [Bundle Size](#bundle-size)
5. [Performance Monitoring](#performance-monitoring)
6. [Common Patterns](#common-patterns)

---

## Cache Strategy

### 1. Configure Cache TTL

Adjust `cacheTTL` based on your data update frequency:

```typescript
// Frequently updated data (30s TTL)
const realtimeLoader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  cacheTTL: 30_000  // 30 seconds
});

// Rarely updated data (1 hour TTL)
const staticLoader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  cacheTTL: 3_600_000  // 1 hour
});
```

### 2. Use Pinia Colada for Smart Caching

Leverage staleTime and gcTime for fine-grained control:

```typescript
const plugin = await withSurrealDBPinia({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  ions: {
    // Static content - long stale time
    'strings': {
      staleTime: 300_000,   // 5 minutes
      gcTime: 3_600_000     // 1 hour
    },
    // Dynamic content - short stale time
    'userPrefs': {
      staleTime: 10_000,    // 10 seconds
      gcTime: 60_000        // 1 minute
    }
  }
});
```

### 3. Invalidate Strategically

Only invalidate what changed:

```typescript
// ❌ Bad: Invalidate everything
plugin.clearCache();

// ✅ Good: Invalidate specific query
plugin.invalidateQueries(['ion', 'config']);

// ✅ Better: Let LIVE queries handle it automatically
// (with withSurrealDBPinia, cache invalidates on LIVE updates)
```

---

## Variant Resolution

### 1. Design Efficient Variant Hierarchies

Minimize variant combinations to reduce query scope:

```typescript
// ❌ Bad: Too many dimensions
{
  lang: 'es',
  region: 'MX',
  form: 'formal',
  audience: 'teen',
  platform: 'mobile'
}

// ✅ Good: Essential dimensions only
{
  lang: 'es',
  form: 'formal'
}
```

### 2. Use Specific Variants

Load exact variants when possible to avoid scoring:

```typescript
// ❌ Slower: Empty context requires scoring all candidates
const strings = await loader.load('strings', {});

// ✅ Faster: Specific variant skips scoring
const strings = await loader.load('strings', { lang: 'es', form: 'formal' });
```

### 3. Pre-scan for FileLoader

Use `preScan` to cache file discovery:

```typescript
const loader = new FileLoader({
  baseDir: './data',
  allowedVariants: {
    lang: ['en', 'es', 'ja'],
    form: ['formal', 'informal']
  },
  preScan: true  // Cache file list on init
});

await loader.init();
```

---

## SurrealDB Optimization

### 1. Array Record IDs (Built-in)

dotted-json uses optimized array Record IDs automatically:

```typescript
// Automatic O(log n) range queries
// ion:['strings', 'es', 'formal'] instead of ion:strings-es-formal
const strings = await loader.load('strings', { lang: 'es', form: 'formal' });

// Range query: ion >= ['strings'] AND ion < ['strings', '\uffff']
// 10-100x faster than table scans!
```

### 2. Connection Pooling

Reuse loader instances across requests:

```typescript
// ❌ Bad: New connection per request
app.get('/api/strings', async (req, res) => {
  const loader = new SurrealDBLoader({ /* ... */ });
  await loader.init();
  const data = await loader.load('strings', req.query);
  await loader.close();
  res.json(data);
});

// ✅ Good: Shared loader instance
const sharedLoader = new SurrealDBLoader({ /* ... */ });
await sharedLoader.init();

app.get('/api/strings', async (req, res) => {
  const data = await sharedLoader.load('strings', req.query);
  res.json(data);
});
```

### 3. Batch Operations

Group saves to reduce round trips:

```typescript
// ❌ Bad: Multiple saves
for (const [lang, data] of translations) {
  await loader.save('strings', data, { lang });
}

// ✅ Good: Batch with Promise.all
await Promise.all(
  translations.map(([lang, data]) =>
    loader.save('strings', data, { lang })
  )
);
```

### 4. Connection Retry Configuration

Tune retry settings for your network:

```typescript
const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
});

// For unreliable networks, increase attempts
// For low-latency networks, decrease delays
```

---

## Bundle Size

### 1. Import Only What You Need

Use specific imports to enable tree-shaking:

```typescript
// ❌ Bad: Imports entire library
import { dotted, FileLoader, SurrealDBLoader } from '@orb-zone/dotted-json';

// ✅ Good: Import core separately
import { dotted } from '@orb-zone/dotted-json';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

// Only import when needed
if (needsSurrealDB) {
  const { SurrealDBLoader } = await import('@orb-zone/dotted-json/loaders/surrealdb');
}
```

### 2. Plugin Loading

Load plugins on-demand:

```typescript
// Static import (included in bundle)
import { withZod } from '@orb-zone/dotted-json/plugins/zod';

// Dynamic import (lazy-loaded)
const { withSurrealDBPinia } = await import('@orb-zone/dotted-json/plugins/surrealdb-pinia');
```

### 3. Core Bundle Size

Core library is **18.18 kB** (within 20 kB constitutional limit):
- Variant resolution: ~5 kB
- Expression evaluation: ~8 kB
- Core logic: ~5 kB

Loaders and plugins are separate and optional.

---

## Performance Monitoring

### 1. Enable Metrics

Track operation performance in production:

```typescript
const loader = new SurrealDBLoader({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  metrics: true,
  onMetrics: (metrics) => {
    // Log slow operations
    if (metrics.duration > 100) {
      console.warn(`Slow ${metrics.operation}: ${metrics.duration}ms`, {
        baseName: metrics.baseName,
        cacheHit: metrics.cacheHit
      });
    }

    // Send to monitoring service
    analytics.track('loader_operation', {
      operation: metrics.operation,
      duration: metrics.duration,
      cacheHit: metrics.cacheHit,
      timestamp: metrics.timestamp
    });
  }
});
```

### 2. Cache Hit Rate

Monitor cache effectiveness:

```typescript
let cacheHits = 0;
let cacheMisses = 0;

const loader = new SurrealDBLoader({
  metrics: true,
  onMetrics: (metrics) => {
    if (metrics.operation === 'load') {
      if (metrics.cacheHit) {
        cacheHits++;
      } else {
        cacheMisses++;
      }

      const hitRate = cacheHits / (cacheHits + cacheMisses);
      if (hitRate < 0.7) {
        console.warn(`Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
      }
    }
  }
});
```

### 3. Variant Resolution Performance

Track candidate counts to optimize queries:

```typescript
onMetrics: (metrics) => {
  if (metrics.candidateCount && metrics.candidateCount > 100) {
    console.warn(`High candidate count for ${metrics.baseName}: ${metrics.candidateCount}`);
    console.warn('Consider narrowing variant dimensions or splitting into separate ions');
  }
}
```

---

## Common Patterns

### Pattern 1: Singleton Loader

Share loader across application:

```typescript
// loaders/singleton.ts
let _loader: SurrealDBLoader | null = null;

export async function getLoader(): Promise<SurrealDBLoader> {
  if (!_loader) {
    _loader = new SurrealDBLoader({
      url: process.env.SURREAL_URL,
      namespace: process.env.SURREAL_NAMESPACE,
      database: process.env.SURREAL_DATABASE,
      cache: true,
      cacheTTL: 60_000
    });
    await _loader.init();
  }
  return _loader;
}

// Usage
const loader = await getLoader();
const data = await loader.load('config', { env: 'prod' });
```

### Pattern 2: Lazy Evaluation

Defer loading until needed:

```typescript
// Define structure
const data = dotted({
  '.config': 'db.loadIon("config", { env: "prod" })',
  '.strings': 'db.loadIon("strings", { lang: "es" })',
  '.features': 'db.loadIon("features", {})'
}, { resolvers });

// Only load what's accessed
const apiUrl = await data.get('config.apiUrl');  // Only loads config
const welcome = await data.get('strings.welcome');  // Only loads strings
// features not loaded yet
```

### Pattern 3: Prefetch Critical Data

Load critical data upfront:

```typescript
// Prefetch on startup
const [config, strings] = await Promise.all([
  loader.load('config', { env: 'prod' }),
  loader.load('strings', { lang: 'en' })
]);

// Cache is warm for subsequent requests
```

### Pattern 4: Background Refresh

Keep cache warm with background updates:

```typescript
// Refresh every 5 minutes
setInterval(async () => {
  const criticalIons = ['config', 'strings', 'features'];

  await Promise.all(
    criticalIons.map(baseName =>
      loader.load(baseName, {}).catch(err =>
        console.error(`Failed to refresh ${baseName}:`, err)
      )
    )
  );

  console.log('Cache refreshed');
}, 300_000);
```

### Pattern 5: LIVE Query Optimization

Minimize LIVE subscriptions:

```typescript
// ❌ Bad: Subscribe to everything
for (const ion of allIons) {
  await loader.subscribe(ion, {}, callback);
}

// ✅ Good: Subscribe only to changing data
const changingIons = ['userPrefs', 'notifications'];
for (const ion of changingIons) {
  await loader.subscribe(ion, {}, callback);
}
```

---

## Benchmarking

### Test Your Performance

Use the included test utilities:

```typescript
import { benchmark } from '../test/helpers/surrealdb-test-utils.js';

// Benchmark load operations
await benchmark(
  async () => {
    await loader.load('strings', { lang: 'es' });
  },
  100,
  'Load Spanish strings'
);

// Expected output:
// 🏃 Running benchmark: Load Spanish strings (100 runs)
//    Avg: 12.34ms | Min: 8.21ms | Max: 45.67ms
```

### Expected Performance

Target metrics for production:

| Operation | Target | Notes |
|-----------|--------|-------|
| Cache hit | < 1ms | In-memory lookup |
| Cache miss (SurrealDB) | < 50ms | With array Record IDs |
| Variant resolution | < 5ms | Per 100 candidates |
| LIVE query setup | < 100ms | One-time cost |
| LIVE update propagation | < 10ms | WebSocket DIFF mode |

---

## Troubleshooting

### Slow Queries

1. **Enable metrics** to identify bottlenecks
2. **Check cache hit rate** - aim for > 70%
3. **Reduce variant dimensions** if candidate count > 100
4. **Use specific variants** instead of empty context

### High Memory Usage

1. **Lower `cacheTTL`** to expire data sooner
2. **Use `gcTime`** with Pinia Colada to garbage collect
3. **Limit `maxEvaluationDepth`** in dotted() options
4. **Close unused loaders** with `await loader.close()`

### Connection Issues

1. **Check retry configuration** - increase attempts for unreliable networks
2. **Use WebSocket ping/pong** - SurrealDB handles this automatically
3. **Monitor connection state** via metrics
4. **Implement reconnection logic** for long-running apps

---

## Next Steps

- Review [examples/](../examples/) for real-world patterns
- Use [test/helpers/](../test/helpers/) for benchmarking
- Monitor metrics in production
- Adjust cache settings based on usage patterns

For questions or optimization help, open an issue on GitHub.
