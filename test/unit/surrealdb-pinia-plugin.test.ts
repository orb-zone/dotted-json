/**
 * Tests for unified SurrealDB + Pinia Colada plugin types
 *
 * Note: Integration tests with real SurrealDB are in test/integration/
 *
 * @group unit
 */

import { describe, it, expect } from 'vitest';
import type {
  SurrealDBPiniaConfig,
  IonConfig,
  LiveConfig,
  SurrealDBPiniaPlugin
} from '../../src/plugins/surrealdb-pinia.js';

describe('SurrealDB + Pinia Plugin Types', () => {
  describe('IonConfig', () => {
    it('should accept cache timing options', () => {
      const config: IonConfig = {
        staleTime: 60000,
        gcTime: 300000,
        refetchOnWindowFocus: true,
        retry: 3
      };

      expect(config.staleTime).toBe(60000);
      expect(config.gcTime).toBe(300000);
    });

    it('should work with minimal config', () => {
      const config: IonConfig = {};

      expect(config.staleTime).toBeUndefined();
    });
  });

  describe('LiveConfig', () => {
    it('should require enabled flag', () => {
      const config: LiveConfig = {
        enabled: true
      };

      expect(config.enabled).toBe(true);
    });

    it('should accept ion list and callback', () => {
      const config: LiveConfig = {
        enabled: true,
        ions: ['config', 'strings'],
        onUpdate: (event) => {
          console.log(event.action);
        }
      };

      expect(config.ions).toHaveLength(2);
      expect(typeof config.onUpdate).toBe('function');
    });
  });

  describe('SurrealDBPiniaConfig', () => {
    it('should accept minimal connection config', () => {
      const config: SurrealDBPiniaConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test'
      };

      expect(config.url).toBeDefined();
      expect(config.namespace).toBe('test');
    });

    it('should accept full configuration', () => {
      const config: SurrealDBPiniaConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'app',
        database: 'main',
        auth: {
          type: 'root',
          username: 'root',
          password: 'root'
        },
        table: 'ion',
        ions: {
          'config': { staleTime: 60000 },
          'strings': { staleTime: 300000 }
        },
        live: {
          enabled: true,
          ions: ['config', 'strings'],
          onUpdate: (event) => {}
        },
        defaults: {
          staleTime: 30000,
          gcTime: 300000,
          retry: 3
        }
      };

      expect(config.ions).toBeDefined();
      expect(config.live?.enabled).toBe(true);
      expect(config.defaults?.staleTime).toBe(30000);
    });
  });

  describe('SurrealDBPiniaPlugin', () => {
    it('should have required properties', () => {
      // Type-only test - verifies interface structure
      type RequiredProps = keyof SurrealDBPiniaPlugin;

      const requiredProps: RequiredProps[] = [
        'resolvers',
        'loader',
        'clearCache',
        'invalidateQueries',
        'subscribe',
        'close'
      ];

      expect(requiredProps).toHaveLength(6);
    });
  });
});

describe('Plugin API Design', () => {
  it('should support db.loadIon resolver pattern', () => {
    // Verify the expected resolver structure compiles
    type DBResolver = {
      db: {
        loadIon: (baseName: string, variants?: Record<string, any>) => Promise<any>;
      };
    };

    const mockResolver: DBResolver = {
      db: {
        loadIon: async (baseName, variants) => {
          return { mocked: true };
        }
      }
    };

    expect(typeof mockResolver.db.loadIon).toBe('function');
  });

  it('should support subscribe method signature', () => {
    type SubscribeMethod = (
      baseName: string,
      variants: Record<string, any> | undefined,
      callback: (data: any) => void
    ) => Promise<() => void>;

    const mockSubscribe: SubscribeMethod = async (baseName, variants, callback) => {
      return async () => {};
    };

    expect(typeof mockSubscribe).toBe('function');
  });

  it('should support invalidateQueries method signature', () => {
    type InvalidateMethod = (key: readonly unknown[]) => void;

    const mockInvalidate: InvalidateMethod = (key) => {
      // Mock implementation
    };

    expect(typeof mockInvalidate).toBe('function');
  });
});
