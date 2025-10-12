/**
 * Tests for SurrealDB LIVE query types and interfaces
 *
 * Note: Integration tests with real SurrealDB are in test/integration/
 *
 * @group unit
 */

import { describe, it, expect } from 'vitest';
import type {
  LiveAction,
  LiveUpdateEvent,
  SurrealDBLoaderOptions
} from '../../src/loaders/surrealdb.js';

describe('SurrealDB LIVE Query Types', () => {
  describe('LiveAction', () => {
    it('should accept valid action types', () => {
      const actions: LiveAction[] = ['CREATE', 'UPDATE', 'DELETE'];
      expect(actions).toHaveLength(3);
    });
  });

  describe('LiveUpdateEvent', () => {
    it('should have correct shape for CREATE event', () => {
      const event: LiveUpdateEvent = {
        action: 'CREATE',
        id: ['config', 'prod'],
        baseName: 'config',
        variants: { env: 'prod' },
        data: { apiUrl: 'https://api.example.com' }
      };

      expect(event.action).toBe('CREATE');
      expect(event.baseName).toBe('config');
      expect(event.data).toBeDefined();
    });

    it('should have correct shape for UPDATE event', () => {
      const event: LiveUpdateEvent = {
        action: 'UPDATE',
        id: ['strings', 'es', 'formal'],
        baseName: 'strings',
        variants: { lang: 'es', form: 'formal' },
        data: { hello: 'Hola' }
      };

      expect(event.action).toBe('UPDATE');
      expect(event.variants.lang).toBe('es');
    });

    it('should have correct shape for DELETE event', () => {
      const event: LiveUpdateEvent = {
        action: 'DELETE',
        id: ['config', 'old'],
        baseName: 'config',
        variants: { env: 'old' }
      };

      expect(event.action).toBe('DELETE');
      expect(event.data).toBeUndefined();
    });
  });

  describe('SurrealDBLoaderOptions', () => {
    it('should accept onLiveUpdate callback', () => {
      const options: SurrealDBLoaderOptions = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
        onLiveUpdate: (event: LiveUpdateEvent) => {
          console.log(`${event.action}: ${event.baseName}`);
        }
      };

      expect(options.onLiveUpdate).toBeDefined();
      expect(typeof options.onLiveUpdate).toBe('function');
    });

    it('should work without onLiveUpdate callback', () => {
      const options: SurrealDBLoaderOptions = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test'
      };

      expect(options.onLiveUpdate).toBeUndefined();
    });
  });
});

describe('SurrealDB subscribe() API', () => {
  it('should have correct StorageProvider interface signature', () => {
    // This test verifies TypeScript compilation
    // The actual implementation is tested in integration tests

    type SubscribeFn = (
      baseName: string,
      variants: Record<string, any> | undefined,
      callback: (data: any) => void
    ) => Promise<() => void>;

    const mockSubscribe: SubscribeFn = async (baseName, variants, callback) => {
      return async () => {
        // Unsubscribe
      };
    };

    expect(typeof mockSubscribe).toBe('function');
  });
});
