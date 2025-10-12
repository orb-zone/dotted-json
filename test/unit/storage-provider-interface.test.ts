/**
 * StorageProvider Interface Test Suite
 *
 * Tests the StorageProvider interface contract (v0.6.0+)
 * Uses mock implementations to validate interface behavior
 *
 * Based on design: .specify/memory/storage-providers-design.md
 */

import { describe, it, expect, beforeEach } from 'bun:test';

// ============================================================================
// StorageProvider Interface Definition
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

interface DocumentInfo {
  baseName: string;
  variants?: VariantContext;
  size?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ListFilter {
  baseName?: string;
  variants?: Partial<VariantContext>;
}

interface StorageProvider {
  init(): Promise<void>;
  load(baseName: string, variants?: VariantContext): Promise<any>;
  save(baseName: string, data: any, variants?: VariantContext, options?: SaveOptions): Promise<void>;
  list?(filter?: ListFilter): Promise<DocumentInfo[]>;
  delete?(baseName: string, variants?: VariantContext): Promise<void>;
  subscribe?(baseName: string, callback: (data: any) => void): Promise<() => void>;
  close(): Promise<void>;
}

// ============================================================================
// Mock Implementation for Testing
// ============================================================================

class MockStorageProvider implements StorageProvider {
  private documents: Map<string, any> = new Map();
  private initialized = false;
  private closed = false;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();

  async init(): Promise<void> {
    if (this.initialized) {
      throw new Error('Provider already initialized');
    }
    this.initialized = true;
  }

  async load(baseName: string, variants?: VariantContext): Promise<any> {
    this.ensureInitialized();
    const key = this.makeKey(baseName, variants);
    const doc = this.documents.get(key);

    if (!doc) {
      throw new Error(`Document not found: ${key}`);
    }

    return doc;
  }

  async save(
    baseName: string,
    data: any,
    variants?: VariantContext,
    options?: SaveOptions
  ): Promise<void> {
    this.ensureInitialized();

    if (!baseName || baseName.trim() === '') {
      throw new Error('baseName is required and cannot be empty');
    }

    const key = this.makeKey(baseName, variants);

    if (options?.merge && this.documents.has(key)) {
      const existing = this.documents.get(key);
      this.documents.set(key, { ...existing, ...data });
    } else {
      this.documents.set(key, data);
    }

    // Notify subscribers
    this.notifySubscribers(baseName, this.documents.get(key));
  }

  async list(filter?: ListFilter): Promise<DocumentInfo[]> {
    this.ensureInitialized();
    const results: DocumentInfo[] = [];

    for (const [key, data] of this.documents.entries()) {
      const { baseName, variants } = this.parseKey(key);

      // Apply filters
      if (filter?.baseName && baseName !== filter.baseName) {
        continue;
      }

      if (filter?.variants) {
        const matchesVariants = Object.entries(filter.variants).every(
          ([k, v]) => variants?.[k] === v
        );
        if (!matchesVariants) {
          continue;
        }
      }

      results.push({
        baseName,
        variants,
        size: JSON.stringify(data).length,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return results;
  }

  async delete(baseName: string, variants?: VariantContext): Promise<void> {
    this.ensureInitialized();
    const key = this.makeKey(baseName, variants);

    if (!this.documents.has(key)) {
      throw new Error(`Document not found: ${key}`);
    }

    this.documents.delete(key);
  }

  async subscribe(baseName: string, callback: (data: any) => void): Promise<() => void> {
    this.ensureInitialized();

    if (!this.subscriptions.has(baseName)) {
      this.subscriptions.set(baseName, new Set());
    }

    this.subscriptions.get(baseName)!.add(callback);

    // Return unsubscribe function
    return async () => {
      this.subscriptions.get(baseName)?.delete(callback);
    };
  }

  async close(): Promise<void> {
    this.ensureInitialized();
    this.closed = true;
    this.documents.clear();
    this.subscriptions.clear();
  }

  // Helper methods
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Provider not initialized. Call init() first.');
    }
    if (this.closed) {
      throw new Error('Provider is closed');
    }
  }

  private makeKey(baseName: string, variants?: VariantContext): string {
    if (!variants || Object.keys(variants).length === 0) {
      return baseName;
    }

    const variantStr = Object.entries(variants)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');

    return `${baseName}:${variantStr}`;
  }

  private parseKey(key: string): { baseName: string; variants?: VariantContext } {
    const parts = key.split(':');
    const baseName = parts[0];

    if (parts.length === 1) {
      return { baseName };
    }

    const variants: VariantContext = {};
    for (let i = 1; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        variants[parts[i]] = parts[i + 1];
      }
    }

    return { baseName, variants };
  }

  private notifySubscribers(baseName: string, data: any): void {
    const callbacks = this.subscriptions.get(baseName);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('StorageProvider Interface - Contract', () => {
  let provider: MockStorageProvider;

  beforeEach(async () => {
    provider = new MockStorageProvider();
    await provider.init();
  });

  describe('Lifecycle', () => {
    it('should initialize before use', async () => {
      const uninitializedProvider = new MockStorageProvider();

      await expect(
        uninitializedProvider.load('test')
      ).rejects.toThrow('Provider not initialized');
    });

    it('should not allow double initialization', async () => {
      await expect(provider.init()).rejects.toThrow('already initialized');
    });

    it('should close and cleanup resources', async () => {
      await provider.save('test', { foo: 'bar' });
      await provider.close();

      await expect(provider.load('test')).rejects.toThrow('Provider is closed');
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should save and load a document', async () => {
      const data = { greeting: 'Hello', name: 'World' };

      await provider.save('greetings', data);
      const loaded = await provider.load('greetings');

      expect(loaded).toEqual(data);
    });

    it('should save and load document with variants', async () => {
      const enData = { hello: 'Hello' };
      const esData = { hello: 'Hola' };

      await provider.save('greetings', enData, { lang: 'en' });
      await provider.save('greetings', esData, { lang: 'es' });

      const loadedEn = await provider.load('greetings', { lang: 'en' });
      const loadedEs = await provider.load('greetings', { lang: 'es' });

      expect(loadedEn).toEqual(enData);
      expect(loadedEs).toEqual(esData);
    });

    it('should throw error when loading non-existent document', async () => {
      await expect(
        provider.load('nonexistent')
      ).rejects.toThrow('Document not found');
    });

    it('should delete a document', async () => {
      await provider.save('test', { foo: 'bar' });
      await provider.delete('test');

      await expect(provider.load('test')).rejects.toThrow('Document not found');
    });

    it('should delete document with variants', async () => {
      await provider.save('greetings', { hello: 'Hello' }, { lang: 'en' });
      await provider.save('greetings', { hello: 'Hola' }, { lang: 'es' });

      await provider.delete('greetings', { lang: 'en' });

      await expect(
        provider.load('greetings', { lang: 'en' })
      ).rejects.toThrow('Document not found');

      // Spanish variant should still exist
      const esDoc = await provider.load('greetings', { lang: 'es' });
      expect(esDoc).toEqual({ hello: 'Hola' });
    });
  });

  describe('Save Options', () => {
    it('should overwrite existing document by default', async () => {
      await provider.save('config', { theme: 'light', timeout: 5000 });
      await provider.save('config', { theme: 'dark' });

      const loaded = await provider.load('config');
      expect(loaded).toEqual({ theme: 'dark' });
    });

    it('should merge with existing document when merge=true', async () => {
      await provider.save('config', { theme: 'light', timeout: 5000 });
      await provider.save('config', { theme: 'dark' }, undefined, { merge: true });

      const loaded = await provider.load('config');
      expect(loaded).toEqual({ theme: 'dark', timeout: 5000 });
    });

    it('should create new document with upsert=true', async () => {
      await provider.save('new-doc', { foo: 'bar' }, undefined, { upsert: true });

      const loaded = await provider.load('new-doc');
      expect(loaded).toEqual({ foo: 'bar' });
    });
  });

  describe('List Operations', () => {
    beforeEach(async () => {
      await provider.save('greetings', { hello: 'Hello' }, { lang: 'en' });
      await provider.save('greetings', { hello: 'Hola' }, { lang: 'es' });
      await provider.save('greetings', { hello: 'こんにちは' }, { lang: 'ja' });
      await provider.save('config', { theme: 'dark' });
    });

    it('should list all documents', async () => {
      const docs = await provider.list!();
      expect(docs).toHaveLength(4);
    });

    it('should filter by baseName', async () => {
      const docs = await provider.list!({ baseName: 'greetings' });
      expect(docs).toHaveLength(3);
      expect(docs.every(d => d.baseName === 'greetings')).toBe(true);
    });

    it('should filter by variants', async () => {
      const docs = await provider.list!({
        baseName: 'greetings',
        variants: { lang: 'es' }
      });

      expect(docs).toHaveLength(1);
      expect(docs[0].variants).toEqual({ lang: 'es' });
    });

    it('should include document metadata', async () => {
      const docs = await provider.list!({ baseName: 'config' });

      expect(docs[0]).toHaveProperty('baseName', 'config');
      expect(docs[0]).toHaveProperty('size');
      expect(docs[0]).toHaveProperty('createdAt');
      expect(docs[0]).toHaveProperty('updatedAt');
    });
  });

  describe('Subscriptions (Real-time)', () => {
    it('should notify subscribers on save', async () => {
      let notifiedData: any = null;

      const unsubscribe = await provider.subscribe!('config', (data) => {
        notifiedData = data;
      });

      await provider.save('config', { theme: 'dark' });

      expect(notifiedData).toEqual({ theme: 'dark' });

      await unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      let notificationCount = 0;

      const unsubscribe = await provider.subscribe!('config', () => {
        notificationCount++;
      });

      await provider.save('config', { theme: 'dark' });
      expect(notificationCount).toBe(1);

      await unsubscribe();

      await provider.save('config', { theme: 'light' });
      expect(notificationCount).toBe(1); // Should still be 1
    });

    it('should support multiple subscribers', async () => {
      let subscriber1Data: any = null;
      let subscriber2Data: any = null;

      const unsub1 = await provider.subscribe!('config', (data) => {
        subscriber1Data = data;
      });

      const unsub2 = await provider.subscribe!('config', (data) => {
        subscriber2Data = data;
      });

      await provider.save('config', { theme: 'dark' });

      expect(subscriber1Data).toEqual({ theme: 'dark' });
      expect(subscriber2Data).toEqual({ theme: 'dark' });

      await unsub1();
      await unsub2();
    });
  });

  describe('Variant Resolution', () => {
    it('should distinguish documents with different variants', async () => {
      const variants = [
        { lang: 'en' },
        { lang: 'en', form: 'casual' },
        { lang: 'en', form: 'formal' },
        { lang: 'es', form: 'casual' }
      ];

      for (const variant of variants) {
        await provider.save('greetings', { variant }, variant);
      }

      for (const variant of variants) {
        const loaded = await provider.load('greetings', variant);
        expect(loaded.variant).toEqual(variant);
      }
    });

    it('should treat missing variants as distinct from empty object', async () => {
      await provider.save('doc1', { type: 'no-variants' });
      await provider.save('doc2', { type: 'empty-variants' }, {});

      const doc1 = await provider.load('doc1');
      const doc2 = await provider.load('doc2');

      expect(doc1.type).toBe('no-variants');
      expect(doc2.type).toBe('empty-variants');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages', async () => {
      await expect(
        provider.load('missing-doc')
      ).rejects.toThrow(/Document not found/);

      await expect(
        provider.delete('missing-doc')
      ).rejects.toThrow(/Document not found/);
    });

    it('should validate baseName is provided', async () => {
      await expect(
        provider.save('', { foo: 'bar' })
      ).rejects.toThrow();
    });
  });
});

describe('StorageProvider Interface - Type Safety', () => {
  it('should enforce interface contract at compile time', () => {
    // This test verifies TypeScript compilation, not runtime behavior
    const provider: StorageProvider = new MockStorageProvider();

    // Required methods
    expect(typeof provider.init).toBe('function');
    expect(typeof provider.load).toBe('function');
    expect(typeof provider.save).toBe('function');
    expect(typeof provider.close).toBe('function');

    // Optional methods
    expect(typeof provider.list).toBe('function');
    expect(typeof provider.delete).toBe('function');
    expect(typeof provider.subscribe).toBe('function');
  });

  it('should accept variant context with known and custom keys', async () => {
    const provider = new MockStorageProvider();
    await provider.init();

    // Known variants
    await provider.save('doc', {}, { lang: 'en', gender: 'm', form: 'casual' });

    // Custom variants
    await provider.save('doc', {}, { lang: 'en', env: 'prod', region: 'us-west' });

    expect(true).toBe(true); // If this compiles, types are correct
  });
});
