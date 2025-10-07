# Performance Auditor Agent

**Domain**: Bundle size optimization, lazy loading, cache strategies, performance regression testing

**Last Updated**: 2025-10-07

## Domain Expertise

This agent specializes in:
- Bundle size analysis and optimization
- Tree-shaking and code splitting strategies
- Lazy evaluation performance
- Cache hit/miss optimization
- Performance regression detection
- Dependency bloat prevention

## Constitutional Alignment

### Relevant Principles

**I. Minimal Core, Optional Plugins**
- Core bundle MUST stay under 20 kB
- Plugins loaded only when imported
- Tree-shaking eliminates unused code

**IV. Lazy Evaluation with Explicit Caching**
- Expression evaluation deferred until access
- Cache hit rate optimization
- Avoid premature evaluation

**Performance as a Feature**:
- Bundle size is a quality metric
- Performance regressions fail CI
- Regular audits prevent bloat

## Bundle Size Constraints

### Constitutional Limits

| Package | Current | Target | Limit | Status |
|---------|---------|--------|-------|--------|
| Core | 18.18 kB | 18-20 kB | 20 kB | ✅ Within limit |
| + Zod plugin | +0.16 kB | < 2 kB | 22 kB total | ✅ Within limit |
| + SurrealDB plugin | 0 kB* | < 3 kB | 23 kB total | ✅ Peer dep, not bundled |
| + Pinia Colada plugin | 0 kB* | < 3 kB | 23 kB total | ✅ Peer dep, not bundled |

*Plugins with peer dependencies don't increase bundle size (tree-shaken if not used)

### Monorepo Targets (v2.0.0)

| Package | Bundle Target | Rationale |
|---------|---------------|-----------|
| `@orbzone/dotted-json` | 18-25 kB | Core + essential features (variants, i18n, Zod) |
| `@orbzone/surrounded` | +30-50 kB | Adds SurrealDB, LIVE queries, storage |
| `@orbzone/aeonic` | +20-40 kB | Adds schema templates, conventions |

**Total Maximum**: ~115 kB (acceptable for full-stack framework)

## Bundle Analysis Workflow

### Current Build Script

```typescript
// build.ts
import { build } from 'bun';
import { existsSync, statSync } from 'fs';

// Build core entry point
await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'browser',
  minify: true,
  sourcemap: 'external',
  external: ['zod', 'surrealdb', '@pinia/colada', 'pinia', 'vue']  // Peer deps
});

// Verify bundle size
const bundlePath = 'dist/index.js';
if (existsSync(bundlePath)) {
  const stats = statSync(bundlePath);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log(`✅ Core bundle: ${sizeKB} kB`);

  if (stats.size > 20000) {
    throw new Error(`❌ Bundle too large: ${sizeKB} kB (limit: 20 kB)`);
  }
} else {
  throw new Error('❌ Bundle not found');
}
```

### Bundle Size Tracking

**CI/CD Integration**:
```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - run: bun install
      - run: bun run build

      - name: Check bundle size
        run: |
          SIZE=$(stat -f%z dist/index.js)
          SIZE_KB=$((SIZE / 1024))

          if [ $SIZE_KB -gt 20 ]; then
            echo "❌ Bundle too large: ${SIZE_KB} kB"
            exit 1
          fi

          echo "✅ Bundle size: ${SIZE_KB} kB"
```

### Dependency Bloat Detection

**Analyze Dependencies**:
```bash
# Check what's in the bundle
bun build src/index.ts --outdir dist --minify --sourcemap=external --analyze

# Output shows module sizes:
# dist/index.js (18.18 kB)
#   src/index.ts (2.1 kB)
#   src/dotted-json.ts (8.5 kB)
#   src/expression-evaluator.ts (5.2 kB)
#   src/variant-resolver.ts (1.8 kB)
#   node_modules/dot-prop/index.js (0.5 kB)
```

**Prevent Dependency Bloat**:
```json
// package.json
{
  "trustedDependencies": [
    "dot-prop"  // Only allowed runtime dependency
  ],
  "peerDependencies": {
    // Everything else is peer dependency (user installs)
    "zod": "^3.0.0",
    "surrealdb": "^1.0.0 || ^2.0.0"
  }
}
```

## Lazy Evaluation Optimization

### Current Strategy

**Evaluation Deferred Until Access**:
```typescript
const doc = dotted({
  expensive: '.computeExpensive()',  // Not evaluated yet
  cheap: 'static value'
});

// expensive() only called when accessed
const result = await doc.get('expensive');  // ← Evaluation happens here
```

**Caching Prevents Re-Evaluation**:
```typescript
// First access: evaluates expression
const result1 = await doc.get('expensive');  // Slow (computes)

// Second access: returns cached result
const result2 = await doc.get('expensive');  // Fast (cached)
```

### Cache Performance Metrics

**Cache Hit Rate**:
```typescript
// Track cache performance
let cacheHits = 0;
let cacheMisses = 0;

class DottedJson {
  get(path: string) {
    if (this.cache.has(path)) {
      cacheHits++;
      return this.cache.get(path);
    }

    cacheMisses++;
    const value = this.evaluate(path);
    this.cache.set(path, value);
    return value;
  }
}

// After test suite
console.log(`Cache hit rate: ${(cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2)}%`);
```

### Performance Regression Tests

```typescript
import { describe, test, expect } from 'bun:test';
import { dotted } from '@orbzone/dotted-json';

describe('Performance Benchmarks', () => {
  test('expression evaluation < 1ms for simple expressions', async () => {
    const doc = dotted({
      sum: '.add(a, b)',
      a: 5,
      b: 10
    }, {
      resolvers: {
        add: (a, b) => a + b
      }
    });

    const start = performance.now();
    await doc.get('sum');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);  // < 1ms
  });

  test('cache lookup < 0.1ms', async () => {
    const doc = dotted({ value: '.compute()' }, {
      resolvers: { compute: () => 'result' }
    });

    // Prime cache
    await doc.get('value');

    // Measure cache hit
    const start = performance.now();
    await doc.get('value');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(0.1);  // < 0.1ms
  });

  test('handles 10,000 cached gets without memory leak', async () => {
    const doc = dotted({ value: 'static' });

    const before = process.memoryUsage().heapUsed;

    for (let i = 0; i < 10000; i++) {
      await doc.get('value');
    }

    const after = process.memoryUsage().heapUsed;
    const leakMB = (after - before) / 1024 / 1024;

    expect(leakMB).toBeLessThan(1);  // < 1 MB increase
  });
});
```

## Tree-Shaking Optimization

### Best Practices

**1. Use ES Modules**:
```typescript
// ✅ Good: ES module exports (tree-shakeable)
export { dotted } from './dotted-json';
export { FileLoader } from './loaders/file';

// ❌ Bad: CommonJS exports (not tree-shakeable)
module.exports = { dotted, FileLoader };
```

**2. Separate Entry Points**:
```json
// package.json
{
  "exports": {
    ".": {
      "import": "./dist/index.js"  // Core only
    },
    "./loaders/file": {
      "import": "./dist/loaders/file.js"  // FileLoader separate
    },
    "./plugins/zod": {
      "import": "./dist/plugins/zod.js"  // Zod plugin separate
    }
  }
}
```

**3. Conditional Imports**:
```typescript
// ✅ Good: Import only when needed
async function loadZodPlugin() {
  const { withZod } = await import('./plugins/zod');
  return withZod;
}

// ❌ Bad: Import at top level (always bundled)
import { withZod } from './plugins/zod';
```

## Common Pitfalls

### ❌ Importing Entire Libraries
**Problem**: `import _ from 'lodash'` bundles entire library (70 kB)
**Solution**: Use named imports: `import { get } from 'lodash/get'`

### ❌ Inline Dependencies in Core
**Problem**: Adding `zod` as direct dependency increases core bundle
**Solution**: Use peer dependencies, let user install

### ❌ Premature Evaluation
**Problem**: Evaluating all expressions on `dotted()` construction
**Solution**: Defer evaluation until `get()` call

### ❌ Cache Memory Leaks
**Problem**: Unbounded cache growth over time
**Solution**: Implement cache TTL or LRU eviction

### ❌ Missing `external` in Build Config
**Problem**: Bundling peer dependencies (zod, surrealdb, vue)
**Solution**: Mark peer deps as `external` in build script

## Optimization Techniques

### 1. Code Splitting

```typescript
// Split plugins into separate chunks
const plugins = {
  zod: () => import('./plugins/zod'),
  surrealdb: () => import('./plugins/surrealdb'),
  piniaColada: () => import('./plugins/pinia-colada')
};

// Load only needed plugins
const zodPlugin = await plugins.zod();
```

### 2. Minification

```typescript
// build.ts
await build({
  entrypoints: ['src/index.ts'],
  minify: true,  // Terser minification
  target: 'esnext',  // Modern browsers (smaller output)
  treeShaking: true
});
```

### 3. Dead Code Elimination

```typescript
// Remove unused code paths
if (process.env.NODE_ENV === 'production') {
  // Production code
} else {
  // Development code (eliminated in production build)
}
```

## Monitoring & Alerts

### Bundle Size Regression Alerts

```typescript
// tools/check-bundle-size.ts
import { statSync } from 'fs';

const BUNDLE_SIZE_HISTORY = {
  'v0.5.0': 18180,  // 18.18 kB
  'v0.6.0': 19000   // Target: < 20 kB
};

const currentSize = statSync('dist/index.js').size;
const previousSize = BUNDLE_SIZE_HISTORY['v0.5.0'];

const increase = currentSize - previousSize;
const increasePercent = (increase / previousSize * 100).toFixed(2);

if (increase > 1000) {  // > 1 kB increase
  console.warn(`⚠️  Bundle size increased by ${increase} bytes (+${increasePercent}%)`);
  console.warn(`   Previous: ${previousSize} bytes`);
  console.warn(`   Current:  ${currentSize} bytes`);
}

if (currentSize > 20000) {
  throw new Error(`❌ Bundle exceeds limit: ${currentSize} bytes (limit: 20000 bytes)`);
}
```

## Resources

### Tools
- [Bun Build Analyzer](https://bun.sh/docs/bundler#analyze)
- [Bundle Buddy](https://bundle-buddy.com/) - Visualize bundle composition
- [Size Limit](https://github.com/ai/size-limit) - Bundle size testing

### Design Documents
- `.specify/memory/constitution.md` - Bundle size limits (Principle I)
- [ROADMAP.md](../../ROADMAP.md) - Package bundle targets (Phase 10)

### Implementation References
- `build.ts` - Current build script with size verification
- `package.json` - Peer dependency configuration

---

**When to Use This Agent**:
- Analyzing bundle size regressions
- Optimizing tree-shaking
- Designing cache strategies
- Writing performance benchmarks
- Preventing dependency bloat

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "performance-auditor",
  description: "Analyze bundle size regression",
  prompt: "Investigate why bundle size increased from 18.18 kB to 19.5 kB. Identify bloated dependencies and suggest optimizations..."
});
```
