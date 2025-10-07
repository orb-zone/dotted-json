/**
 * Integration Test Setup Utilities
 *
 * Provides helpers for starting/stopping in-memory SurrealDB instances
 * and importing test schemas for integration tests.
 *
 * Usage:
 *   1. Start DB manually: bun run db:test (in separate terminal)
 *   2. Run integration tests: bun test test/integration
 *
 * The in-memory DB runs on 127.0.0.1:9000 for testing isolation.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Type definitions for SurrealDB SDK (peer dependency)
export interface SurrealConnection {
  connect(url: string): Promise<void>;
  use(options: { ns: string; db: string }): Promise<void>;
  query(sql: string, vars?: Record<string, any>): Promise<any>;
  select(thing: string): Promise<any>;
  create(thing: string, data?: any): Promise<any>;
  update(thing: string, data?: any): Promise<any>;
  delete(thing: string): Promise<any>;
  close(): Promise<void>;
  signin(auth: { user: string; pass: string }): Promise<void>;
}

/**
 * Test database configuration
 */
export const TEST_DB_CONFIG = {
  url: 'http://127.0.0.1:9000/rpc',
  namespace: 'test',
  database: 'json',
  auth: {
    user: 'root',
    pass: 'root'
  }
} as const;

/**
 * Connects to the test SurrealDB instance
 *
 * @param Surreal - SurrealDB class (imported from 'surrealdb' peer dep)
 * @returns Connected and authenticated SurrealDB instance
 */
export async function connectTestDB(Surreal: any): Promise<SurrealConnection> {
  const db = new Surreal();

  try {
    await db.connect(TEST_DB_CONFIG.url);
    await db.signin(TEST_DB_CONFIG.auth);
    await db.use({
      ns: TEST_DB_CONFIG.namespace,
      db: TEST_DB_CONFIG.database
    });

    return db;
  } catch (error: any) {
    throw new Error(
      `Failed to connect to test database at ${TEST_DB_CONFIG.url}. ` +
      `Make sure SurrealDB is running (bun run db:test). ` +
      `Original error: ${error.message}`
    );
  }
}

/**
 * Imports a .surql schema file into the test database
 *
 * @param db - Connected SurrealDB instance
 * @param schemaPath - Path to .surql file (relative to project root)
 */
export async function importSchema(
  db: SurrealConnection,
  schemaPath: string
): Promise<void> {
  const absolutePath = join(process.cwd(), schemaPath);
  const schemaSQL = readFileSync(absolutePath, 'utf-8');

  // Execute the schema file as a single query
  // SurrealDB processes multiple statements separated by semicolons
  await db.query(schemaSQL);
}

/**
 * Clears all data from the test database (keeps schema)
 *
 * Useful for resetting state between tests without reimporting schema.
 *
 * @param db - Connected SurrealDB instance
 * @param tables - Array of table names to clear
 */
export async function clearTestData(
  db: SurrealConnection,
  tables: string[]
): Promise<void> {
  for (const table of tables) {
    await db.query(`DELETE ${table}`);
  }
}

/**
 * Completely removes all tables from the test database
 *
 * Use this for full cleanup after tests.
 *
 * @param db - Connected SurrealDB instance
 * @param tables - Array of table names to remove
 */
export async function dropTables(
  db: SurrealConnection,
  tables: string[]
): Promise<void> {
  for (const table of tables) {
    await db.query(`REMOVE TABLE ${table}`);
  }
}

/**
 * Verifies that the test database is accessible and responding
 *
 * @param db - Connected SurrealDB instance
 * @returns True if database is healthy
 */
export async function healthCheck(db: SurrealConnection): Promise<boolean> {
  try {
    const result = await db.query('SELECT * FROM $parent LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Waits for a condition to be true (polling helper)
 *
 * Useful for waiting for LIVE query updates or async operations.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @param intervalMs - Polling interval (default: 100ms)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await Promise.resolve(condition());
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Test fixture loader
 *
 * Loads JSÖN fixture files from test/fixtures directory
 *
 * @param fixtureName - Name of fixture file (without .jsön extension)
 * @returns Parsed JSON data
 */
export function loadFixture(fixtureName: string): any {
  const fixturePath = join(
    process.cwd(),
    'test',
    'fixtures',
    `${fixtureName}.json`
  );

  try {
    const content = readFileSync(fixturePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    throw new Error(
      `Failed to load fixture "${fixtureName}": ${error.message}`
    );
  }
}

/**
 * Creates a mock JSÖN document for testing
 *
 * @param baseName - Base name of the document
 * @param data - Document data
 * @param variants - Variant context
 * @returns Document object matching test-schema.surql format
 */
export function createMockDocument(
  baseName: string,
  data: any,
  variants: Record<string, string> = {}
) {
  return {
    base_name: baseName,
    variants: variants,
    data: data,
    created_at: new Date(),
    updated_at: new Date(),
    version: 1
  };
}

/**
 * Assertion helper for variant matching
 *
 * Checks if a document matches the expected variant context
 */
export function matchesVariants(
  documentVariants: Record<string, string> | undefined,
  expectedVariants: Record<string, string>
): boolean {
  if (!documentVariants) {
    return Object.keys(expectedVariants).length === 0;
  }

  return Object.entries(expectedVariants).every(
    ([key, value]) => documentVariants[key] === value
  );
}
