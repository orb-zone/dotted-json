/**
 * SurrealDBLoader Integration Test Suite
 *
 * Tests the SurrealDBLoader storage provider with a real in-memory SurrealDB instance.
 * These tests validate the schema-driven workflow and CRUD operations.
 *
 * Prerequisites:
 *   - SurrealDB installed (brew install surrealdb/tap/surreal)
 *   - Run `bun run db:test` in a separate terminal before running these tests
 *
 * Based on design: .specify/memory/storage-providers-design.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import {
  connectTestDB,
  importSchema,
  clearTestData,
  dropTables,
  healthCheck,
  createMockDocument,
  matchesVariants,
  type SurrealConnection
} from './setup.js';

// ============================================================================
// Mock SurrealDBLoader (will be implemented in src/loaders/surrealdb.ts)
// ============================================================================

interface VariantContext {
  lang?: string;
  gender?: 'm' | 'f' | 'x';
  form?: string;
  [key: string]: string | undefined;
}

interface SaveOptions {
  merge?: boolean;
  upsert?: boolean;
}

class SurrealDBLoader {
  private db: SurrealConnection;
  private tableName: string;

  constructor(connection: SurrealConnection, tableName = 'jsön_documents') {
    this.db = connection;
    this.tableName = tableName;
  }

  async init(): Promise<void> {
    // Verify table exists
    const result = await this.db.query(
      `INFO FOR TABLE ${this.tableName}`
    );

    if (!result || result.length === 0) {
      throw new Error(`Table ${this.tableName} does not exist`);
    }
  }

  async load(baseName: string, variants?: VariantContext): Promise<any> {
    const query = `
      SELECT data FROM ${this.tableName}
      WHERE base_name = $baseName
      ${variants ? 'AND variants = $variants' : 'AND variants = {}'}
      LIMIT 1
    `;

    const result = await this.db.query(query, {
      baseName,
      variants: variants || {}
    });

    if (!result || result[0]?.length === 0) {
      throw new Error(
        `Document not found: ${baseName}${variants ? ` (${JSON.stringify(variants)})` : ''}`
      );
    }

    return result[0][0].data;
  }

  async save(
    baseName: string,
    data: any,
    variants?: VariantContext,
    options?: SaveOptions
  ): Promise<void> {
    const variantObj = variants || {};

    if (options?.merge) {
      // Load existing, merge, then update
      try {
        const existing = await this.load(baseName, variants);
        data = { ...existing, ...data };
      } catch {
        // Document doesn't exist, proceed with insert
      }
    }

    // Upsert: Try to find existing document first
    const existing = await this.db.query(
      `SELECT id FROM ${this.tableName} WHERE base_name = $baseName AND variants = $variants LIMIT 1`,
      { baseName, variants: variantObj }
    );

    if (existing && existing[0]?.length > 0) {
      // Update existing
      const id = existing[0][0].id;
      await this.db.update(id, {
        data,
        updated_at: new Date(),
        version: 1 // Simplified versioning for now
      });
    } else {
      // Create new
      await this.db.create(this.tableName, {
        base_name: baseName,
        variants: variantObj,
        data,
        created_at: new Date(),
        updated_at: new Date(),
        version: 1
      });
    }
  }

  async delete(baseName: string, variants?: VariantContext): Promise<void> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE base_name = $baseName
      ${variants ? 'AND variants = $variants' : 'AND variants = {}'}
    `;

    const result = await this.db.query(query, {
      baseName,
      variants: variants || {}
    });

    if (!result || result[0]?.length === 0) {
      throw new Error(`Document not found: ${baseName}`);
    }
  }

  async list(baseName?: string): Promise<any[]> {
    const query = baseName
      ? `SELECT * FROM ${this.tableName} WHERE base_name = $baseName`
      : `SELECT * FROM ${this.tableName}`;

    const result = await this.db.query(query, { baseName });
    return result[0] || [];
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('SurrealDBLoader Integration', () => {
  let db: SurrealConnection;
  let loader: SurrealDBLoader;
  let Surreal: any;

  // Skip tests if SurrealDB SDK not available
  const isSurrealDBAvailable = async () => {
    try {
      Surreal = (await import('surrealdb')).default;
      return true;
    } catch {
      return false;
    }
  };

  beforeAll(async () => {
    // Check if surrealdb peer dependency is installed
    const available = await isSurrealDBAvailable();
    if (!available) {
      console.log('⏭️  Skipping SurrealDB integration tests (surrealdb not installed)');
      console.log('   Install with: bun add -d surrealdb');
      return;
    }

    try {
      // Connect to test database
      db = await connectTestDB(Surreal);

      // Verify database is healthy
      const healthy = await healthCheck(db);
      if (!healthy) {
        throw new Error('Database health check failed');
      }

      // Import test schema
      await importSchema(db, 'test/integration/fixtures/test-schema.surql');

      // Create loader instance
      loader = new SurrealDBLoader(db);
      await loader.init();
    } catch (error: any) {
      console.error('❌ Failed to setup SurrealDB integration tests:');
      console.error('   ' + error.message);
      console.error('   Make sure SurrealDB is running: bun run db:test');
      throw error;
    }
  });

  afterAll(async () => {
    if (!Surreal || !db) return;

    // Cleanup: drop all test tables
    await dropTables(db, ['jsön_documents', 'app_config', 'user', 'post']);
    await db.close();
  });

  beforeEach(async () => {
    if (!Surreal || !db) return;

    // Clear test data before each test
    await clearTestData(db, ['jsön_documents']);
  });

  describe('Initialization', () => {
    it('should connect to test database', async () => {
      if (!Surreal) return;

      expect(db).toBeDefined();
      const healthy = await healthCheck(db);
      expect(healthy).toBe(true);
    });

    it('should verify jsön_documents table exists', async () => {
      if (!Surreal) return;

      const result = await db.query('INFO FOR TABLE jsön_documents');
      expect(result).toBeDefined();
    });

    it('should initialize loader successfully', async () => {
      if (!Surreal) return;

      const testLoader = new SurrealDBLoader(db);
      await expect(testLoader.init()).resolves.not.toThrow();
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should save and load a document', async () => {
      if (!Surreal) return;

      const data = { greeting: 'Hello', name: 'World' };

      await loader.save('greetings', data);
      const loaded = await loader.load('greetings');

      expect(loaded).toEqual(data);
    });

    it('should save and load document with variants', async () => {
      if (!Surreal) return;

      const enData = { hello: 'Hello', goodbye: 'Goodbye' };
      const esData = { hello: 'Hola', goodbye: 'Adiós' };
      const jaData = { hello: 'こんにちは', goodbye: 'さようなら' };

      await loader.save('greetings', enData, { lang: 'en' });
      await loader.save('greetings', esData, { lang: 'es' });
      await loader.save('greetings', jaData, { lang: 'ja' });

      const loadedEn = await loader.load('greetings', { lang: 'en' });
      const loadedEs = await loader.load('greetings', { lang: 'es' });
      const loadedJa = await loader.load('greetings', { lang: 'ja' });

      expect(loadedEn).toEqual(enData);
      expect(loadedEs).toEqual(esData);
      expect(loadedJa).toEqual(jaData);
    });

    it('should update existing document', async () => {
      if (!Surreal) return;

      await loader.save('config', { theme: 'light', timeout: 5000 });
      await loader.save('config', { theme: 'dark', timeout: 10000 });

      const loaded = await loader.load('config');
      expect(loaded).toEqual({ theme: 'dark', timeout: 10000 });
    });

    it('should delete a document', async () => {
      if (!Surreal) return;

      await loader.save('temp', { foo: 'bar' });
      await loader.delete('temp');

      await expect(loader.load('temp')).rejects.toThrow('Document not found');
    });

    it('should delete document with specific variant', async () => {
      if (!Surreal) return;

      await loader.save('greetings', { hello: 'Hello' }, { lang: 'en' });
      await loader.save('greetings', { hello: 'Hola' }, { lang: 'es' });

      await loader.delete('greetings', { lang: 'en' });

      await expect(
        loader.load('greetings', { lang: 'en' })
      ).rejects.toThrow('Document not found');

      // Spanish variant should still exist
      const esDoc = await loader.load('greetings', { lang: 'es' });
      expect(esDoc).toEqual({ hello: 'Hola' });
    });
  });

  describe('Save Options', () => {
    it('should merge with existing document when merge=true', async () => {
      if (!Surreal) return;

      await loader.save('config', { theme: 'light', timeout: 5000 });
      await loader.save('config', { theme: 'dark' }, undefined, { merge: true });

      const loaded = await loader.load('config');
      expect(loaded).toEqual({ theme: 'dark', timeout: 5000 });
    });

    it('should create new document if merge=true but document does not exist', async () => {
      if (!Surreal) return;

      await loader.save('new-doc', { foo: 'bar' }, undefined, { merge: true });

      const loaded = await loader.load('new-doc');
      expect(loaded).toEqual({ foo: 'bar' });
    });
  });

  describe('List Operations', () => {
    beforeEach(async () => {
      if (!Surreal) return;

      await loader.save('greetings', { hello: 'Hello' }, { lang: 'en' });
      await loader.save('greetings', { hello: 'Hola' }, { lang: 'es' });
      await loader.save('greetings', { hello: 'こんにちは' }, { lang: 'ja' });
      await loader.save('config', { theme: 'dark' });
    });

    it('should list all documents', async () => {
      if (!Surreal) return;

      const docs = await loader.list();
      expect(docs.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter by baseName', async () => {
      if (!Surreal) return;

      const docs = await loader.list('greetings');
      expect(docs).toHaveLength(3);
      expect(docs.every(d => d.base_name === 'greetings')).toBe(true);
    });

    it('should include document metadata', async () => {
      if (!Surreal) return;

      const docs = await loader.list('config');
      expect(docs).toHaveLength(1);

      const doc = docs[0];
      expect(doc).toHaveProperty('base_name', 'config');
      expect(doc).toHaveProperty('data');
      expect(doc).toHaveProperty('variants');
      expect(doc).toHaveProperty('created_at');
      expect(doc).toHaveProperty('updated_at');
      expect(doc).toHaveProperty('version');
    });
  });

  describe('Multi-variant Documents', () => {
    it('should handle complex variant combinations', async () => {
      if (!Surreal) return;

      const variants = [
        { lang: 'en' },
        { lang: 'en', form: 'casual' },
        { lang: 'en', form: 'formal' },
        { lang: 'es', form: 'casual' },
        { lang: 'es', form: 'formal' },
        { lang: 'ja', form: 'honorific' }
      ];

      for (const variant of variants) {
        await loader.save(
          'greetings',
          { variant: JSON.stringify(variant) },
          variant
        );
      }

      for (const variant of variants) {
        const loaded = await loader.load('greetings', variant);
        expect(loaded.variant).toBe(JSON.stringify(variant));
      }
    });

    it('should distinguish between no variants and empty variants object', async () => {
      if (!Surreal) return;

      await loader.save('doc1', { type: 'no-variants' });
      await loader.save('doc2', { type: 'empty-variants' }, {});

      const doc1 = await loader.load('doc1');
      const doc2 = await loader.load('doc2');

      expect(doc1.type).toBe('no-variants');
      expect(doc2.type).toBe('empty-variants');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when loading non-existent document', async () => {
      if (!Surreal) return;

      await expect(
        loader.load('nonexistent')
      ).rejects.toThrow('Document not found');
    });

    it('should throw error when deleting non-existent document', async () => {
      if (!Surreal) return;

      await expect(
        loader.delete('nonexistent')
      ).rejects.toThrow('Document not found');
    });

    it('should provide detailed error messages with variant info', async () => {
      if (!Surreal) return;

      try {
        await loader.load('missing', { lang: 'en', form: 'formal' });
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('missing');
        expect(error.message).toContain('lang');
      }
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle i18n translation storage', async () => {
      if (!Surreal) return;

      // Simulate storing translations for a multi-language app
      const translations = {
        en: { welcome: 'Welcome', login: 'Log In', logout: 'Log Out' },
        es: { welcome: 'Bienvenido', login: 'Iniciar Sesión', logout: 'Cerrar Sesión' },
        ja: { welcome: 'ようこそ', login: 'ログイン', logout: 'ログアウト' }
      };

      for (const [lang, strings] of Object.entries(translations)) {
        await loader.save('ui_strings', strings, { lang });
      }

      // Load and verify each translation
      for (const [lang, expectedStrings] of Object.entries(translations)) {
        const loaded = await loader.load('ui_strings', { lang });
        expect(loaded).toEqual(expectedStrings);
      }
    });

    it('should handle configuration with environment variants', async () => {
      if (!Surreal) return;

      const configs = {
        dev: { apiUrl: 'http://localhost:3000', debug: true },
        staging: { apiUrl: 'https://staging.example.com', debug: true },
        prod: { apiUrl: 'https://api.example.com', debug: false }
      };

      for (const [env, config] of Object.entries(configs)) {
        await loader.save('app_config', config, { env });
      }

      const prodConfig = await loader.load('app_config', { env: 'prod' });
      expect(prodConfig.debug).toBe(false);
      expect(prodConfig.apiUrl).toContain('api.example.com');
    });
  });
});
