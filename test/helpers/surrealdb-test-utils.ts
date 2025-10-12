/**
 * SurrealDB Integration Test Utilities
 *
 * Helper functions and utilities for testing with real SurrealDB instances.
 * Provides setup, teardown, and assertion helpers for integration tests.
 *
 * @module test/helpers/surrealdb-test-utils
 */

import { SurrealDBLoader } from '../../src/loaders/surrealdb.js';
import type { VariantContext } from '../../src/types.js';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Default test database configuration
 */
export const TEST_CONFIG = {
  url: process.env.SURREAL_URL || 'ws://localhost:8000/rpc',
  namespace: process.env.SURREAL_NAMESPACE || 'test',
  database: process.env.SURREAL_DATABASE || 'test',
  auth: {
    type: 'root' as const,
    username: process.env.SURREAL_USER || 'root',
    password: process.env.SURREAL_PASS || 'root'
  }
};

/**
 * Check if SurrealDB is available for testing
 */
export async function isSurrealDBAvailable(): Promise<boolean> {
  try {
    const loader = new SurrealDBLoader(TEST_CONFIG);
    await loader.init();
    await loader.close();
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Sample translation data for i18n tests
 */
export const SAMPLE_TRANSLATIONS = {
  en: {
    'welcome.title': 'Welcome',
    'welcome.subtitle': 'Get started',
    'nav.home': 'Home',
    'nav.profile': 'Profile'
  },
  es: {
    'welcome.title': 'Bienvenido',
    'welcome.subtitle': 'Empezar',
    'nav.home': 'Inicio',
    'nav.profile': 'Perfil'
  },
  ja: {
    'welcome.title': 'ようこそ',
    'welcome.subtitle': 'はじめる',
    'nav.home': 'ホーム',
    'nav.profile': 'プロフィール'
  }
};

/**
 * Sample config data for config tests
 */
export const SAMPLE_CONFIGS = {
  dev: {
    apiUrl: 'http://localhost:3000',
    apiKey: 'dev-key-123',
    timeout: 5000,
    debug: true
  },
  staging: {
    apiUrl: 'https://staging.example.com',
    apiKey: 'staging-key-456',
    timeout: 10000,
    debug: true
  },
  prod: {
    apiUrl: 'https://api.example.com',
    apiKey: 'prod-key-789',
    timeout: 15000,
    debug: false
  }
};

// ============================================================================
// Test Database Setup/Teardown
// ============================================================================

/**
 * Create a test loader with isolated database
 */
export async function createTestLoader(
  tableName: string = 'ion',
  config?: Partial<typeof TEST_CONFIG>
): Promise<SurrealDBLoader> {
  const loader = new SurrealDBLoader({
    ...TEST_CONFIG,
    ...config,
    table: tableName,
    cache: true,
    cacheTTL: 60000
  });

  await loader.init();
  return loader;
}

/**
 * Clean up test data from a table
 */
export async function cleanupTestData(
  loader: SurrealDBLoader,
  baseName?: string
): Promise<void> {
  const documents = await loader.list(baseName ? { baseName } : undefined);

  for (const doc of documents) {
    await loader.delete(doc.baseName, doc.variants);
  }
}

/**
 * Seed test data into database
 */
export async function seedTestData(
  loader: SurrealDBLoader,
  baseName: string,
  data: Record<string, any>,
  variants?: VariantContext
): Promise<void> {
  await loader.save(baseName, data, variants || {});
}

/**
 * Seed multiple variants
 */
export async function seedMultipleVariants(
  loader: SurrealDBLoader,
  baseName: string,
  variantData: Array<{ variants: VariantContext; data: any }>
): Promise<void> {
  for (const { variants, data } of variantData) {
    await loader.save(baseName, data, variants);
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that ion exists
 */
export async function assertIonExists(
  loader: SurrealDBLoader,
  baseName: string,
  variants: VariantContext = {}
): Promise<void> {
  try {
    await loader.load(baseName, variants);
  } catch (error: any) {
    throw new Error(
      `Expected ion "${baseName}" with variants ${JSON.stringify(variants)} to exist, but it doesn't`
    );
  }
}

/**
 * Assert that ion does not exist
 */
export async function assertIonNotExists(
  loader: SurrealDBLoader,
  baseName: string,
  variants: VariantContext = {}
): Promise<void> {
  try {
    await loader.load(baseName, variants);
    throw new Error(
      `Expected ion "${baseName}" with variants ${JSON.stringify(variants)} to not exist, but it does`
    );
  } catch (error: any) {
    if (!error.message.includes('not found')) {
      throw error;
    }
  }
}

/**
 * Assert ion data matches expected
 */
export async function assertIonData(
  loader: SurrealDBLoader,
  baseName: string,
  variants: VariantContext,
  expected: any
): Promise<void> {
  const actual = await loader.load(baseName, variants);

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Ion data mismatch:\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`
    );
  }
}

/**
 * Assert variant count
 */
export async function assertVariantCount(
  loader: SurrealDBLoader,
  baseName: string,
  expectedCount: number
): Promise<void> {
  const documents = await loader.list({ baseName });

  if (documents.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} variants for "${baseName}", but found ${documents.length}`
    );
  }
}

// ============================================================================
// Test Lifecycle Helpers
// ============================================================================

/**
 * Setup test environment with isolated database
 */
export async function setupTestEnvironment(tableName?: string) {
  const loader = await createTestLoader(tableName);
  await cleanupTestData(loader);
  return loader;
}

/**
 * Teardown test environment
 */
export async function teardownTestEnvironment(loader: SurrealDBLoader) {
  await cleanupTestData(loader);
  await loader.close();
}

/**
 * Run test with automatic setup/teardown
 */
export async function withTestLoader<T>(
  testFn: (loader: SurrealDBLoader) => Promise<T>,
  tableName?: string
): Promise<T> {
  const loader = await setupTestEnvironment(tableName);

  try {
    return await testFn(loader);
  } finally {
    await teardownTestEnvironment(loader);
  }
}

// ============================================================================
// Performance Testing Helpers
// ============================================================================

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;

  console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}

/**
 * Benchmark operation with multiple runs
 */
export async function benchmark(
  operation: () => Promise<void>,
  runs: number = 10,
  label: string = 'Operation'
): Promise<{
  avg: number;
  min: number;
  max: number;
  runs: number;
}> {
  const durations: number[] = [];

  console.log(`🏃 Running benchmark: ${label} (${runs} runs)`);

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await operation();
    const duration = performance.now() - start;
    durations.push(duration);
  }

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  console.log(`   Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`);

  return { avg, min, max, runs };
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate random translation key
 */
export function generateTranslationKey(prefix: string = 'test'): string {
  const categories = ['welcome', 'nav', 'action', 'error', 'success'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const id = Math.random().toString(36).substring(7);
  return `${prefix}.${category}.${id}`;
}

/**
 * Generate random translation bundle
 */
export function generateTranslationBundle(keyCount: number = 10): Record<string, string> {
  const bundle: Record<string, string> = {};

  for (let i = 0; i < keyCount; i++) {
    const key = generateTranslationKey();
    bundle[key] = `Translation for ${key}`;
  }

  return bundle;
}

/**
 * Generate test variants
 */
export function generateVariants(lang: string, form?: string): VariantContext {
  const variants: VariantContext = { lang };
  if (form) variants.form = form;
  return variants;
}

// ============================================================================
// Debugging Helpers
// ============================================================================

/**
 * Print all documents in a table
 */
export async function debugPrintDocuments(
  loader: SurrealDBLoader,
  baseName?: string
): Promise<void> {
  const documents = await loader.list(baseName ? { baseName } : undefined);

  console.log(`\n🔍 Documents${baseName ? ` for "${baseName}"` : ''}:`);
  console.log(`   Total: ${documents.length}\n`);

  for (const doc of documents) {
    console.log(`   ${doc.baseName} (${JSON.stringify(doc.variants)})`);
    console.log(`      Size: ${doc.size} bytes`);
    console.log(`      Updated: ${doc.updatedAt.toISOString()}`);
  }

  console.log();
}

/**
 * Print loader cache status
 */
export async function debugPrintCacheStatus(loader: SurrealDBLoader): Promise<void> {
  // Note: Cache is private, this is for debugging output only
  console.log('💾 Cache status: [Cache is internal - use metrics to track hits/misses]');
}

/**
 * Wait for LIVE query propagation
 */
export async function waitForLiveUpdate(ms: number = 100): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Export All
// ============================================================================

export default {
  TEST_CONFIG,
  isSurrealDBAvailable,
  createTestLoader,
  cleanupTestData,
  seedTestData,
  seedMultipleVariants,
  assertIonExists,
  assertIonNotExists,
  assertIonData,
  assertVariantCount,
  setupTestEnvironment,
  teardownTestEnvironment,
  withTestLoader,
  measurePerformance,
  benchmark,
  generateTranslationKey,
  generateTranslationBundle,
  generateVariants,
  debugPrintDocuments,
  debugPrintCacheStatus,
  waitForLiveUpdate,
  SAMPLE_TRANSLATIONS,
  SAMPLE_CONFIGS
};
