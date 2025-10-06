/**
 * Pinia Colada Plugin Test Suite
 *
 * Tests the withPiniaColada() plugin for dotted-json v0.5.0
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { withPiniaColada } from '../../src/plugins/pinia-colada.js';

describe('Pinia Colada Plugin - Basic Setup', () => {
  it('should create plugin with query resolvers', () => {
    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => ({ id, name: 'Test User' })
        }
      }
    });

    expect(plugin).toBeDefined();
    expect(plugin.resolvers).toBeDefined();
    expect(plugin.resolvers.api).toBeDefined();
    expect(typeof plugin.resolvers.api.getUser).toBe('function');
  });

  it('should create nested resolver structure', () => {
    const plugin = withPiniaColada({
      queries: {
        'api.users.getById': {
          key: (id: string) => ['user', id],
          query: async (id: string) => ({ id, name: 'Test' })
        }
      }
    });

    expect(plugin.resolvers.api.users.getById).toBeDefined();
    expect(typeof plugin.resolvers.api.users.getById).toBe('function');
  });

  it('should provide clearCache and invalidateQueries methods', () => {
    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => ({ id })
        }
      }
    });

    expect(typeof plugin.clearCache).toBe('function');
    expect(typeof plugin.invalidateQueries).toBe('function');
  });
});

describe('Pinia Colada Plugin - Query Caching', () => {
  beforeEach(() => {
    // Clear cache before each test
    const plugin = withPiniaColada({ queries: {} });
    plugin.clearCache();
  });

  it('should cache query results', async () => {
    let callCount = 0;

    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => {
            callCount++;
            return { id, name: `User ${callCount}` };
          },
          staleTime: 60000 // 1 minute
        }
      }
    });

    // First call
    const result1 = await plugin.resolvers.api.getUser('123');
    expect(result1.name).toBe('User 1');
    expect(callCount).toBe(1);

    // Second call - should use cache
    const result2 = await plugin.resolvers.api.getUser('123');
    expect(result2.name).toBe('User 1'); // Same as first call
    expect(callCount).toBe(1); // Query not executed again
  });

  it('should respect staleTime', async () => {
    let callCount = 0;

    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => {
            callCount++;
            return { id, name: `User ${callCount}` };
          },
          staleTime: 10 // 10ms - very short
        }
      }
    });

    // First call
    await plugin.resolvers.api.getUser('123');
    expect(callCount).toBe(1);

    // Wait for stale time
    await new Promise(resolve => setTimeout(resolve, 20));

    // Second call - should refetch
    await plugin.resolvers.api.getUser('123');
    expect(callCount).toBe(2);
  });

  it('should invalidate queries', async () => {
    let callCount = 0;

    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => {
            callCount++;
            return { id, name: `User ${callCount}` };
          },
          staleTime: 60000
        }
      }
    });

    // First call
    await plugin.resolvers.api.getUser('123');
    expect(callCount).toBe(1);

    // Invalidate
    plugin.invalidateQueries(['user', '123']);

    // Second call - should refetch
    await plugin.resolvers.api.getUser('123');
    expect(callCount).toBe(2);
  });
});

describe('Pinia Colada Plugin - Mutations', () => {
  beforeEach(() => {
    const plugin = withPiniaColada({ queries: {} });
    plugin.clearCache();
  });

  it('should create mutation resolvers', () => {
    const plugin = withPiniaColada({
      mutations: {
        'api.updateUser': {
          mutation: async (id: string, data: any) => ({ id, ...data })
        }
      }
    });

    expect(plugin.resolvers.api.updateUser).toBeDefined();
    expect(typeof plugin.resolvers.api.updateUser).toBe('function');
  });

  it('should execute mutations', async () => {
    const plugin = withPiniaColada({
      mutations: {
        'api.updateUser': {
          mutation: async (id: string, data: any) => {
            return { id, ...data, updated: true };
          }
        }
      }
    });

    const result = await plugin.resolvers.api.updateUser('123', { name: 'Updated' });
    expect(result.id).toBe('123');
    expect(result.name).toBe('Updated');
    expect(result.updated).toBe(true);
  });

  it('should invalidate queries on mutation', async () => {
    let queryCallCount = 0;

    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => {
            queryCallCount++;
            return { id, name: `User ${queryCallCount}` };
          },
          staleTime: 60000
        }
      },
      mutations: {
        'api.updateUser': {
          mutation: async (id: string, data: any) => ({ id, ...data }),
          invalidates: [(id: string) => ['user', id]]
        }
      }
    });

    // Query first time
    await plugin.resolvers.api.getUser('123');
    expect(queryCallCount).toBe(1);

    // Mutate (should invalidate cache)
    await plugin.resolvers.api.updateUser('123', { name: 'Updated' });

    // Query again - should refetch
    await plugin.resolvers.api.getUser('123');
    expect(queryCallCount).toBe(2);
  });

  it('should call lifecycle hooks', async () => {
    const hooks: string[] = [];

    const plugin = withPiniaColada({
      mutations: {
        'api.updateUser': {
          mutation: async (id: string) => ({ id, updated: true }),
          onMutate: () => { hooks.push('mutate'); },
          onSuccess: () => { hooks.push('success'); },
          onSettled: () => { hooks.push('settled'); }
        }
      }
    });

    await plugin.resolvers.api.updateUser('123');

    expect(hooks).toEqual(['mutate', 'success', 'settled']);
  });

  it('should call onError on failure', async () => {
    const hooks: string[] = [];

    const plugin = withPiniaColada({
      mutations: {
        'api.updateUser': {
          mutation: async () => {
            throw new Error('Update failed');
          },
          onError: () => { hooks.push('error'); },
          onSettled: () => { hooks.push('settled'); }
        }
      }
    });

    await expect(plugin.resolvers.api.updateUser('123')).rejects.toThrow('Update failed');
    expect(hooks).toEqual(['error', 'settled']);
  });
});

describe('Pinia Colada Plugin - Integration', () => {
  it('should work with dotted-json', async () => {
    const { dotted } = await import('../../src/index.js');

    const plugin = withPiniaColada({
      queries: {
        'api.getUser': {
          key: (id: string) => ['user', id],
          query: async (id: string) => ({
            id,
            name: 'John Doe',
            email: `user${id}@example.com`
          })
        }
      }
    });

    const data = dotted({
      user: {
        id: '123',
        '.profile': 'api.getUser(${user.id})'
      }
    }, { resolvers: plugin.resolvers });

    const profile = await data.get('user.profile');
    expect(profile.id).toBe('123');
    expect(profile.name).toBe('John Doe');
    expect(profile.email).toBe('user123@example.com');
  });
});
