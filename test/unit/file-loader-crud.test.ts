/**
 * Tests for FileLoader CRUD operations (v0.6.0)
 *
 * Tests save(), list(), delete(), and close() methods
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { FileLoader } from '../../src/loaders/file';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = './test-output/file-loader-crud';

describe('FileLoader CRUD Operations', () => {
  let loader: FileLoader;

  beforeAll(() => {
    // Create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  beforeEach(() => {
    // Fresh loader for each test
    loader = new FileLoader({
      baseDir: TEST_DIR,
      allowedVariants: {
        lang: ['en', 'es', 'fr'],
        form: ['casual', 'formal'],
        gender: ['m', 'f', 'x']
      }
    });
  });

  afterAll(() => {
    // Cleanup: Remove test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('save()', () => {
    test('creates new file with correct name', async () => {
      await loader.init();

      const data = { greeting: 'Hola' };
      await loader.save('strings', data, { lang: 'es' });

      const filePath = join(TEST_DIR, 'strings:es.jsön');
      expect(existsSync(filePath)).toBe(true);
    });

    test('saves with multiple variants in deterministic order', async () => {
      await loader.init();

      const data = { greeting: 'Bonjour madame' };
      await loader.save('strings', data, { form: 'formal', lang: 'fr' });

      // Should save as: strings:fr:formal.jsön (lang before form)
      const filePath = join(TEST_DIR, 'strings:fr:formal.jsön');
      expect(existsSync(filePath)).toBe(true);
    });

    test('pretty-prints JSON by default', async () => {
      await loader.init();

      const data = { greeting: 'Hello', farewell: 'Goodbye' };
      await loader.save('strings', data, { lang: 'en' });

      const content = await Bun.file(join(TEST_DIR, 'strings:en.jsön')).text();
      expect(content).toContain('\n');  // Pretty-printed (has newlines)
      expect(content).toContain('  ');  // Indented
    });

    test('saves minified JSON when pretty: false', async () => {
      await loader.init();

      const data = { greeting: 'Hello' };
      await loader.save('strings', data, { lang: 'en' }, { pretty: false });

      const content = await Bun.file(join(TEST_DIR, 'strings:en.jsön')).text();
      expect(content).not.toContain('\n');  // Minified (no newlines except end)
    });

    test('replaces existing file by default (replace strategy)', async () => {
      await loader.init();

      const originalData = { greeting: 'Hola', count: 1 };
      await loader.save('strings', originalData, { lang: 'es' });

      const newData = { greeting: 'Buenos días' };
      await loader.save('strings', newData, { lang: 'es' });

      const loaded = await loader.load('strings', { lang: 'es' });
      expect(loaded).toEqual({ greeting: 'Buenos días' });
      expect(loaded.count).toBeUndefined();  // Old field removed
    });

    test('shallow merges with merge strategy', async () => {
      await loader.init();

      const originalData = { greeting: 'Hola', count: 1 };
      await loader.save('strings', originalData, { lang: 'es' });

      const newData = { greeting: 'Buenos días', extra: 'value' };
      await loader.save('strings', newData, { lang: 'es' }, { strategy: 'merge' });

      const loaded = await loader.load('strings', { lang: 'es' });
      expect(loaded).toEqual({
        greeting: 'Buenos días',  // Updated
        count: 1,                  // Preserved
        extra: 'value'            // Added
      });
    });

    test('deep merges nested objects with deep-merge strategy', async () => {
      await loader.init();

      const originalData = {
        user: { name: 'Alice', age: 30 },
        config: { theme: 'dark' }
      };
      await loader.save('data', originalData, {});

      const newData = {
        user: { age: 31 },
        config: { language: 'es' }
      };
      await loader.save('data', newData, {}, { strategy: 'deep-merge' });

      const loaded = await loader.load('data', {});
      expect(loaded).toEqual({
        user: { name: 'Alice', age: 31 },         // Deep merged
        config: { theme: 'dark', language: 'es' } // Deep merged
      });
    });

    test('validates data with Zod schema if zod is installed', async () => {
      try {
        const { z } = await import('zod');
        await loader.init();

        const ConfigSchema = z.object({
          apiUrl: z.string().url(),
          timeout: z.number().positive()
        });

        const validData = {
          apiUrl: 'https://api.example.com',
          timeout: 30
        };

        // Should not throw
        await loader.save('config', validData, {}, { schema: ConfigSchema });

        const invalidData = {
          apiUrl: 'not-a-url',
          timeout: -5
        };

        // Should throw ZodError
        await expect(
          loader.save('config', invalidData, {}, { schema: ConfigSchema })
        ).rejects.toThrow();
      } catch (error: any) {
        if (error.message?.includes('Cannot find package')) {
          // Zod not installed (optional dependency) - skip test
          console.log('Skipping Zod validation test (zod not installed)');
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });

    test('throws error if file does not exist and upsert: false', async () => {
      await loader.init();

      await expect(
        loader.save('nonexistent', { data: 'value' }, {}, { upsert: false })
      ).rejects.toThrow(/does not exist/);
    });

    test('updates available files cache after save', async () => {
      await loader.init();

      await loader.save('new-file', { data: 'test' }, { lang: 'en' });

      // Should be able to load immediately without re-scan
      const loaded = await loader.load('new-file', { lang: 'en' });
      expect(loaded).toEqual({ data: 'test' });
    });
  });

  describe('list()', () => {
    beforeEach(async () => {
      // Clear directory
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
      mkdirSync(TEST_DIR, { recursive: true });

      // Fresh loader
      loader = new FileLoader({
        baseDir: TEST_DIR,
        allowedVariants: {
          lang: ['en', 'es', 'fr'],
          form: ['casual', 'formal'],
          gender: ['m', 'f', 'x']
        }
      });

      await loader.init();

      // Create test files
      await loader.save('strings', { hello: 'Hello' }, { lang: 'en' });
      await loader.save('strings', { hello: 'Hola' }, { lang: 'es' });
      await loader.save('strings', { hello: 'Bonjour' }, { lang: 'fr', form: 'casual' });
      await loader.save('config', { theme: 'dark' }, {});
    });

    test('lists all documents when no filter', async () => {
      const docs = await loader.list();

      expect(docs.length).toBeGreaterThanOrEqual(4);
      expect(docs.some(d => d.baseName === 'strings')).toBe(true);
      expect(docs.some(d => d.baseName === 'config')).toBe(true);
    });

    test('filters by baseName', async () => {
      const docs = await loader.list({ baseName: 'strings' });

      expect(docs.length).toBe(3);
      expect(docs.every(d => d.baseName === 'strings')).toBe(true);
    });

    test('filters by variant (lang: es)', async () => {
      const docs = await loader.list({ variants: { lang: 'es' } });

      expect(docs.length).toBe(1);
      expect(docs[0].variants.lang).toBe('es');
    });

    test('filters by multiple variants', async () => {
      const docs = await loader.list({ variants: { lang: 'fr', form: 'casual' } });

      expect(docs.length).toBe(1);
      expect(docs[0].variants.lang).toBe('fr');
      expect(docs[0].variants.form).toBe('casual');
    });

    test('returns document metadata (createdAt, updatedAt, size)', async () => {
      const docs = await loader.list({ baseName: 'config' });

      expect(docs.length).toBe(1);
      const doc = docs[0];

      expect(doc.metadata).toBeDefined();
      expect(doc.metadata?.createdAt).toBeInstanceOf(Date);
      expect(doc.metadata?.updatedAt).toBeInstanceOf(Date);
      expect(doc.metadata?.size).toBeGreaterThan(0);
    });

    test('returns correct fullName and identifier', async () => {
      const docs = await loader.list({ baseName: 'strings', variants: { lang: 'es' } });

      expect(docs.length).toBe(1);
      expect(docs[0].fullName).toBe('strings:es');
      expect(docs[0].identifier).toContain('strings:es.jsön');
    });
  });

  describe('delete()', () => {
    beforeEach(async () => {
      await loader.init();

      // Create test files
      await loader.save('strings', { hello: 'Hello' }, { lang: 'en' });
      await loader.save('strings', { hello: 'Hola' }, { lang: 'es' });
    });

    test('deletes existing file', async () => {
      const filePath = join(TEST_DIR, 'strings:es.jsön');
      expect(existsSync(filePath)).toBe(true);

      await loader.delete('strings', { lang: 'es' });

      expect(existsSync(filePath)).toBe(false);
    });

    test('removes file from available files cache', async () => {
      await loader.delete('strings', { lang: 'es' });

      // Should not be found by load()
      await expect(
        loader.load('strings', { lang: 'es' })
      ).rejects.toThrow(/not found/);
    });

    test('removes file from content cache', async () => {
      // Load to populate cache
      await loader.load('strings', { lang: 'en' });

      // Delete
      await loader.delete('strings', { lang: 'en' });

      // Should be removed from cache (even though we try to load again)
      await expect(
        loader.load('strings', { lang: 'en' })
      ).rejects.toThrow(/not found/);
    });

    test('throws error if file does not exist', async () => {
      await expect(
        loader.delete('nonexistent', { lang: 'fr' })
      ).rejects.toThrow(/not found/);
    });

    test('does not delete other variants', async () => {
      await loader.delete('strings', { lang: 'es' });

      // Should still be able to load English
      const loaded = await loader.load('strings', { lang: 'en' });
      expect(loaded.hello).toBe('Hello');
    });
  });

  describe('close()', () => {
    test('clears all caches', async () => {
      await loader.init();

      await loader.save('test', { data: 'value' }, {});
      await loader.load('test', {});  // Populate cache

      await loader.close();

      // Cache should be cleared
      const stats = loader.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test('resets initialized flag', async () => {
      await loader.init();
      expect(loader['initialized']).toBe(true);

      await loader.close();
      expect(loader['initialized']).toBe(false);
    });

    test('allows re-initialization after close', async () => {
      await loader.init();
      await loader.save('test', { data: 'value' }, {});
      await loader.close();

      // Should be able to re-init and use again
      await loader.init();
      const loaded = await loader.load('test', {});
      expect(loaded).toEqual({ data: 'value' });
    });
  });

  describe('StorageProvider compliance', () => {
    test('implements all required methods', () => {
      expect(typeof loader.init).toBe('function');
      expect(typeof loader.load).toBe('function');
      expect(typeof loader.save).toBe('function');
      expect(typeof loader.list).toBe('function');
      expect(typeof loader.delete).toBe('function');
      expect(typeof loader.close).toBe('function');
    });
  });
});
