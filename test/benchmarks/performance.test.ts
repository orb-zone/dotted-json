/**
 * Performance Regression Test Suite
 *
 * Tracks performance metrics for critical paths to detect regressions.
 * These benchmarks establish baseline performance expectations and help
 * identify performance degradations in expression evaluation, variant resolution,
 * and caching.
 *
 * Run with: bun test test/benchmarks/performance.test.ts
 */

import { describe, it, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

// Performance threshold constants (in milliseconds)
const THRESHOLDS = {
  simpleExpressionEvaluation: 10,
  complexExpressionEvaluation: 20,
  variantResolution: 10,
  cacheHit: 2,
  largeDatasetIteration: 100,
};

describe('Performance: Expression Evaluation', () => {
  it('should evaluate simple expressions quickly', async () => {
    const schema = {
      name: 'John',
      age: 30,
      '.greeting': 'Hello, ${name}!',
    };

    const data = dotted(schema);
    const start = performance.now();
    const result = await data.get('greeting');
    const elapsed = performance.now() - start;

    expect(result).toBe('Hello, John!');
    expect(elapsed).toBeLessThan(THRESHOLDS.simpleExpressionEvaluation);
  });

  it('should handle nested property references efficiently', async () => {
    const schema = {
      user: {
        first: 'John',
        last: 'Doe',
      },
      '.greeting': 'Hello, ${user.first} ${user.last}!',
    };

    const data = dotted(schema);
    const start = performance.now();
    const result = await data.get('greeting');
    const elapsed = performance.now() - start;

    expect(result).toBe('Hello, John Doe!');
    expect(elapsed).toBeLessThan(THRESHOLDS.complexExpressionEvaluation);
  });

  it('should cache expression results for repeated accesses', async () => {
    const schema = {
      '.message': 'Cached message',
    };

    const data = dotted(schema);
    await data.get('message');

    // Measure 100 cached accesses
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await data.get('message');
    }
    const elapsed = performance.now() - start;

    // Average per access with cache
    const avgPerHit = elapsed / 100;
    expect(avgPerHit).toBeLessThan(THRESHOLDS.cacheHit);
  });
});

describe('Performance: Variant Resolution', () => {
  it('should access variant keys quickly', async () => {
    const schema = {
      greeting: 'Hello',
      'greeting:es': 'Hola',
      'greeting:es:ES': 'Hola (ES)',
    };

    const data = dotted(schema);
    const start = performance.now();
    const result = await data.get('greeting:es:ES');
    const elapsed = performance.now() - start;

    expect(result).toBe('Hola (ES)');
    expect(elapsed).toBeLessThan(THRESHOLDS.variantResolution);
  });

  it('should handle multi-level variant keys efficiently', async () => {
    const schema = {
      message: 'Default',
      'message:en:US:southern': 'Howdy y\'all!',
    };

    const data = dotted(schema);
    const start = performance.now();
    const result = await data.get('message:en:US:southern');
    const elapsed = performance.now() - start;

    expect(result).toBe('Howdy y\'all!');
    expect(elapsed).toBeLessThan(THRESHOLDS.variantResolution);
  });
});

describe('Performance: Data Access', () => {
  it('should access large array data efficiently', async () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    const schema = { items: largeArray };

    const data = dotted(schema);
    const start = performance.now();
    const items = await data.get('items');
    const elapsed = performance.now() - start;

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1000);
    expect(elapsed).toBeLessThan(THRESHOLDS.largeDatasetIteration);
  });

  it('should handle deeply nested objects', async () => {
    const schema = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'deep',
            },
          },
        },
      },
    };

    const data = dotted(schema);
    const start = performance.now();
    const result = await data.get('level1.level2.level3.level4.value');
    const elapsed = performance.now() - start;

    expect(result).toBe('deep');
    expect(elapsed).toBeLessThan(THRESHOLDS.complexExpressionEvaluation);
  });
});

describe('Performance: Cache Effectiveness', () => {
  it('should show cache improvement for repeated accesses', async () => {
    const schema = {
      '.computed': 'result',
    };

    const data = dotted(schema);
    await data.get('computed');

    // Measure 1000 cached accesses
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      await data.get('computed');
    }
    const elapsed = performance.now() - start;

    // Average per access with cache
    const avgPerAccess = elapsed / 1000;
    expect(avgPerAccess).toBeLessThan(THRESHOLDS.cacheHit);
  });

  it('should invalidate cache on data mutation', async () => {
    const schema = {
      base: 10,
      '.doubled': '${base * 2}',
    };

    const data = dotted(schema);
    const result1 = await data.get('doubled');
    expect(result1).toBe(20);

    // Mutation should invalidate cache
    await data.set('base', 20);
    const result2 = await data.get('doubled');
    expect(result2).toBe(40);

    // Verify cache is working again after mutation
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await data.get('doubled');
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 100).toBeLessThan(THRESHOLDS.cacheHit * 2);
  });
});

/**
 * Performance Baseline Metrics (Reference)
 *
 * These represent expected performance characteristics. When running benchmarks,
 * if any test exceeds its threshold, it indicates a potential regression.
 *
 * Baseline thresholds:
 * - Simple expression evaluation: < 10ms
 * - Complex nested expressions: < 20ms
 * - Variant key resolution: < 10ms
 * - Cache hits: < 2ms average
 * - Large dataset iteration (1000 items): < 100ms
 */
