/**
 * File loader tests - Variant-aware file resolution
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { FileLoader } from '../../src/loaders/file.js';
import { join } from 'path';

const FIXTURES_DIR = join(import.meta.dir, '../fixtures/i18n');

describe('FileLoader', () => {
  let loader: FileLoader;

  beforeEach(async () => {
    loader = new FileLoader({
      baseDir: FIXTURES_DIR,
      allowedVariants: {
        lang: ['en', 'es', 'ja', 'fr'],
        gender: ['m', 'f', 'x'],
        form: ['casual', 'polite', 'formal', 'honorific']
      }
    });
    await loader.init();
  });

  describe('Basic file loading', () => {
    test('loads base file when no variants specified', async () => {
      const data = await loader.load('strings');
      expect(data.welcome).toBe('Welcome');
    });

    test('loads base file when variants is empty object', async () => {
      const data = await loader.load('strings', {});
      expect(data.welcome).toBe('Welcome');
    });

    test('throws error for non-existent file', async () => {
      await expect(loader.load('nonexistent')).rejects.toThrow('File not found');
    });
  });

  describe('Language variant resolution', () => {
    test('loads language-specific file', async () => {
      const data = await loader.load('strings', { lang: 'es' });
      expect(data.welcome).toBe('Bienvenido');
    });

    test('falls back to base when language not available', async () => {
      const data = await loader.load('strings', { lang: 'fr' });
      expect(data.welcome).toBe('Welcome');  // No strings:fr.jsön
    });
  });

  describe('Form (formality) variant resolution', () => {
    test('loads lang + form combination', async () => {
      const data = await loader.load('strings', { lang: 'es', form: 'formal' });
      expect(data.welcome).toBe('Bienvenido señor/señora');
    });

    test('loads Japanese polite form', async () => {
      const data = await loader.load('strings', { lang: 'ja', form: 'polite' });
      expect(data.welcome).toBe('いらっしゃいませ');
    });

    test('falls back to lang when form not available', async () => {
      const data = await loader.load('strings', { lang: 'es', form: 'casual' });
      expect(data.welcome).toBe('Bienvenido');  // No strings:es:casual.jsön
    });
  });

  describe('Gender variant resolution', () => {
    test('loads female profile', async () => {
      const data = await loader.load('profile', { gender: 'f' });
      expect(data.title).toBe('Ms.');
      expect(data.pronoun).toBe('she');
    });

    test('loads male profile', async () => {
      const data = await loader.load('profile', { gender: 'm' });
      expect(data.title).toBe('Mr.');
      expect(data.pronoun).toBe('he');
    });
  });

  describe('Variant priority scoring', () => {
    test('prioritizes exact match over partial match', async () => {
      // With strings:es.jsön and strings:es:formal.jsön available
      const formal = await loader.load('strings', { lang: 'es', form: 'formal' });
      expect(formal.welcome).toBe('Bienvenido señor/señora');

      const casual = await loader.load('strings', { lang: 'es', form: 'casual' });
      expect(casual.welcome).toBe('Bienvenido');  // Falls back to strings:es
    });

    test('prefers lang match over form match', async () => {
      // Lang (1000 points) should beat form (50 points)
      const data = await loader.load('strings', { lang: 'ja', form: 'formal' });
      // Should get strings:ja:polite (lang + form match) if it exists
      // Otherwise strings:ja if it exists
      // Current fixtures have strings:ja:polite
      expect(data.welcome).toBe('いらっしゃいませ');
    });
  });

  describe('Security - Variant validation', () => {
    test('blocks non-whitelisted language', async () => {
      const data = await loader.load('strings', { lang: 'de' });  // Not in whitelist
      expect(data.welcome).toBe('Welcome');  // Falls back to base
    });

    test('blocks path traversal attempt', async () => {
      const data = await loader.load('strings', { lang: '../../../etc/passwd' });
      expect(data.welcome).toBe('Welcome');  // Attack blocked, uses base
    });

    test('blocks special characters in variants', async () => {
      const data = await loader.load('strings', { lang: 'es;rm -rf /' });
      expect(data.welcome).toBe('Welcome');  // Attack blocked
    });
  });

  describe('Permissive mode', () => {
    test('allows any variant when allowedVariants is true', async () => {
      const permissiveLoader = new FileLoader({
        baseDir: FIXTURES_DIR,
        allowedVariants: true
      });
      await permissiveLoader.init();

      // Should work with any variant (if file exists)
      const data = await permissiveLoader.load('strings', { lang: 'es' });
      expect(data.welcome).toBe('Bienvenido');
    });

    test('still sanitizes path-unsafe characters in permissive mode', async () => {
      const permissiveLoader = new FileLoader({
        baseDir: FIXTURES_DIR,
        allowedVariants: true
      });
      await permissiveLoader.init();

      const data = await permissiveLoader.load('strings', { lang: '../../../etc/passwd' });
      expect(data.welcome).toBe('Welcome');  // Path traversal still blocked
    });
  });

  describe('Strict mode (no variants)', () => {
    test('only loads base files when allowedVariants undefined', async () => {
      const strictLoader = new FileLoader({
        baseDir: FIXTURES_DIR
        // allowedVariants not set
      });
      await strictLoader.init();

      const data = await strictLoader.load('strings', { lang: 'es' });
      expect(data.welcome).toBe('Welcome');  // Ignores variant, uses base
    });
  });

  describe('Caching', () => {
    test('caches loaded files', async () => {
      const data1 = await loader.load('strings', { lang: 'es' });
      const data2 = await loader.load('strings', { lang: 'es' });

      expect(data1).toBe(data2);  // Same object reference (cached)
      expect(loader.getCacheStats().size).toBeGreaterThan(0);
    });

    test('different variants cache separately', async () => {
      await loader.load('strings', { lang: 'es' });
      await loader.load('strings', { lang: 'ja', form: 'polite' });

      const stats = loader.getCacheStats();
      expect(stats.size).toBe(2);  // Two different cache entries
    });

    test('clearCache() empties cache', async () => {
      await loader.load('strings', { lang: 'es' });
      expect(loader.getCacheStats().size).toBe(1);

      loader.clearCache();
      expect(loader.getCacheStats().size).toBe(0);
    });

    test('cache keys are order-independent', async () => {
      await loader.load('strings', { lang: 'es', form: 'formal' });
      await loader.load('strings', { form: 'formal', lang: 'es' });

      const stats = loader.getCacheStats();
      expect(stats.size).toBe(1);  // Same cache entry (order-independent)
    });
  });

  describe('Pre-scanning', () => {
    test('finds all variant files during init', async () => {
      const scanLoader = new FileLoader({
        baseDir: FIXTURES_DIR,
        preload: true,
        allowedVariants: true
      });

      await scanLoader.init();

      // Should have found: strings, strings:es, strings:es:formal, strings:ja:polite, profile:f, profile:m
      const es = await scanLoader.load('strings', { lang: 'es' });
      const ja = await scanLoader.load('strings', { lang: 'ja', form: 'polite' });

      expect(es.welcome).toBe('Bienvenido');
      expect(ja.welcome).toBe('いらっしゃいませ');
    });

    test('works without pre-scanning', async () => {
      const noScanLoader = new FileLoader({
        baseDir: FIXTURES_DIR,
        preload: false,
        allowedVariants: { lang: ['es'] }
      });

      // No init() call - should still work
      const data = await noScanLoader.load('strings', { lang: 'es' });
      expect(data.welcome).toBe('Bienvenido');
    });
  });

  describe('Extension handling', () => {
    test('tries .jsön before .json', async () => {
      const data = await loader.load('strings');
      expect(data.welcome).toBe('Welcome');  // Found strings.jsön
    });

    test('respects custom extension order', async () => {
      const customLoader = new FileLoader({
        baseDir: FIXTURES_DIR,
        extensions: ['.json', '.jsön'],  // .json first
        allowedVariants: { lang: ['es'] }
      });
      await customLoader.init();

      // Should still work (tries .json first, then .jsön)
      const data = await customLoader.load('strings', { lang: 'es' });
      expect(data).toBeDefined();
    });
  });
});
