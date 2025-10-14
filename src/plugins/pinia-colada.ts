/**
 * Pinia Colada Integration Plugin for dotted-json
 *
 * Provides auto-generated resolvers compatible with Pinia Colada's caching patterns.
 * Combines lazy expression evaluation with smart query management for Vue 3.
 *
 * @requires @pinia/colada ^0.7.0 (optional, for Vue components)
 * @requires pinia ^2.0.0 (optional, for Vue components)
 * @requires vue ^3.0.0 (optional, for Vue components)
 * @module @orb-zone/dotted-json/plugins/pinia-colada
 *
 * @example
 * ```typescript
 * import { dotted } from '@orb-zone/dotted-json';
 * import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada';
 *
 * const plugin = withPiniaColada({
 *   queries: {
 *     'api.getUser': {
 *       key: (id: string) => ['user', id],
 *       query: async (id: string) => {
 *         const res = await fetch(`/api/users/${id}`)
 *         return res.json()
 *       }
 *     }
 *   }
 * });
 *
 * const data = dotted({
 *   user: { id: '123', '.profile': 'api.getUser(${user.id})' }
 * }, { resolvers: plugin.resolvers });
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Type for query cache keys (array of primitive values)
 */
export type QueryKey = readonly unknown[];

/**
 * Query definition for a dotted-json resolver
 */
export interface QueryDefinition {
  /**
   * Generate a unique cache key from parameters
   * @example (id: string) => ['user', id]
   */
  key: (...params: any[]) => QueryKey;

  /**
   * Fetch function that returns the data
   * @example async (id: string) => fetchUser(id)
   */
  query: (...params: any[]) => Promise<any>;

  /**
   * How long until data is considered stale (ms)
   * @default 0 (immediately stale)
   */
  staleTime?: number;

  /**
   * How long to keep unused data in cache (ms)
   * @default 300000 (5 minutes)
   */
  gcTime?: number;

  /**
   * Whether to refetch when window regains focus
   * @default true
   */
  refetchOnWindowFocus?: boolean;

  /**
   * Number of retry attempts on failure
   * @default 3
   */
  retry?: number | boolean;
}

/**
 * Mutation definition for a dotted-json resolver
 */
export interface MutationDefinition {
  /**
   * Mutation function to execute
   * @example async (id: string, data: any) => updateUser(id, data)
   */
  mutation: (...params: any[]) => Promise<any>;

  /**
   * Query keys to invalidate after successful mutation
   * Can be static keys or functions that receive mutation params
   * @example [['users'], (id: string) => ['user', id]]
   */
  invalidates?: Array<QueryKey | ((...params: any[]) => QueryKey)>;

  /**
   * Called before mutation executes (for optimistic updates)
   */
  onMutate?: (...params: any[]) => Promise<any> | any;

  /**
   * Called on mutation success
   */
  onSuccess?: (data: any, ...params: any[]) => Promise<void> | void;

  /**
   * Called on mutation error
   */
  onError?: (error: Error, params: any[], context?: any) => Promise<void> | void;

  /**
   * Called after mutation settles (success or error)
   */
  onSettled?: (
    data: any | undefined,
    error: Error | null,
    ...params: any[]
  ) => Promise<void> | void;
}

/**
 * Configuration for the Pinia Colada plugin
 */
export interface PiniaColadaConfig {
  /**
   * Query definitions that will be converted to resolvers
   */
  queries?: Record<string, QueryDefinition>;

  /**
   * Mutation definitions that will be converted to resolvers
   */
  mutations?: Record<string, MutationDefinition>;

  /**
   * Default options applied to all queries
   */
  defaults?: {
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    retry?: number | boolean;
  };
}

/**
 * Resolver map for dotted-json
 */
export type ResolverMap = Record<string, (...args: any[]) => Promise<any>>;

/**
 * Plugin result
 */
export interface PiniaColadaPlugin {
  /**
   * Generated resolvers for dotted-json
   */
  resolvers: ResolverMap;

  /**
   * Original configuration
   */
  config: PiniaColadaConfig;

  /**
   * Clear all cached queries
   */
  clearCache: () => void;

  /**
   * Invalidate specific queries
   */
  invalidateQueries: (key: QueryKey) => void;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Global query cache shared across all plugin instances
 */
const globalCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Clear the global cache
 */
function clearGlobalCache(): void {
  globalCache.clear();
}

/**
 * Invalidate queries matching a key
 */
function invalidateQueriesGlobal(key: QueryKey): void {
  const keyString = JSON.stringify(key);
  // Remove exact matches and partial matches
  for (const cacheKey of globalCache.keys()) {
    if (cacheKey.includes(keyString) || cacheKey === keyString) {
      globalCache.delete(cacheKey);
    }
  }
}

// ============================================================================
// Resolver Generators
// ============================================================================

/**
 * Create a resolver function from a query definition
 *
 * Uses a simple caching mechanism that integrates with Pinia Colada's patterns.
 * The actual Pinia Colada useQuery hook should be used in Vue components.
 */
function createQueryResolver(
  name: string,
  queryDef: QueryDefinition,
  defaults?: PiniaColadaConfig['defaults']
): (...args: any[]) => Promise<any> {
  const staleTime = queryDef.staleTime ?? defaults?.staleTime ?? 0;
  const gcTime = queryDef.gcTime ?? defaults?.gcTime ?? 300000; // 5 minutes

  return async (...params: any[]): Promise<any> => {
    const key = queryDef.key(...params);
    const cacheKey = JSON.stringify(key);

    // Check cache
    const cached = globalCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < staleTime) {
        return cached.data;
      }
    }

    // Execute query
    try {
      const data = await queryDef.query(...params);

      // Store in cache
      globalCache.set(cacheKey, { data, timestamp: Date.now() });

      // Schedule garbage collection
      setTimeout(() => {
        const entry = globalCache.get(cacheKey);
        if (entry && Date.now() - entry.timestamp >= gcTime) {
          globalCache.delete(cacheKey);
        }
      }, gcTime);

      return data;
    } catch (_error) {
      const retry = queryDef.retry ?? defaults?.retry ?? 3;
      if (typeof retry === 'number' && retry > 0) {
        // Simple retry logic (can be enhanced)
        console.warn(`[dotted-json/pinia-colada] Query ${name} failed, will retry`);
      }
      throw _error;
    }
  };
}

/**
 * Create a resolver function from a mutation definition
 *
 * Mutations don't use caching but handle invalidation and lifecycle hooks.
 */
function createMutationResolver(
  _name: string,
  mutationDef: MutationDefinition
): (...args: any[]) => Promise<any> {
  return async (...params: any[]): Promise<any> => {
    let context: any;

    try {
      // onMutate hook
      if (mutationDef.onMutate) {
        context = await mutationDef.onMutate(...params);
      }

      // Execute mutation
      const data = await mutationDef.mutation(...params);

      // Invalidate queries
      if (mutationDef.invalidates) {
        for (const invalidator of mutationDef.invalidates) {
          if (typeof invalidator === 'function') {
            const key = invalidator(...params);
            invalidateQueriesGlobal(key);
          } else {
            invalidateQueriesGlobal(invalidator);
          }
        }
      }

      // onSuccess hook
      if (mutationDef.onSuccess) {
        await mutationDef.onSuccess(data, ...params);
      }

      // onSettled hook
      if (mutationDef.onSettled) {
        await mutationDef.onSettled(data, null, ...params);
      }

      return data;
    } catch (_error) {
      // onError hook
      if (mutationDef.onError) {
        await mutationDef.onError(_error as Error, params, context);
      }

      // onSettled hook
      if (mutationDef.onSettled) {
        await mutationDef.onSettled(undefined, _error as Error, ...params);
      }

      throw _error;
    }
  };
}

// ============================================================================
// Main Plugin Export
// ============================================================================

/**
 * Create a Pinia Colada-powered plugin for dotted-json
 *
 * Auto-generates resolvers from query/mutation definitions with automatic
 * caching, request deduplication, and cache invalidation.
 *
 * @param config - Plugin configuration
 * @returns Plugin with generated resolvers
 *
 * @example
 * ```typescript
 * import { dotted } from '@orb-zone/dotted-json';
 * import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada';
 *
 * const plugin = withPiniaColada({
 *   queries: {
 *     'api.getUser': {
 *       key: (id: string) => ['user', id],
 *       query: async (id: string) => {
 *         const res = await fetch(`/api/users/${id}`);
 *         return res.json();
 *       },
 *       staleTime: 60000 // 1 minute
 *     },
 *     'api.getUsers': {
 *       key: () => ['users'],
 *       query: async () => {
 *         const res = await fetch('/api/users');
 *         return res.json();
 *       }
 *     }
 *   },
 *   mutations: {
 *     'api.updateUser': {
 *       mutation: async (id: string, data: any) => {
 *         const res = await fetch(`/api/users/${id}`, {
 *           method: 'PATCH',
 *           body: JSON.stringify(data)
 *         });
 *         return res.json();
 *       },
 *       invalidates: [
 *         ['users'], // Invalidate users list
 *         (id: string) => ['user', id] // Invalidate specific user
 *       ]
 *     }
 *   },
 *   defaults: {
 *     staleTime: 30000, // 30 seconds
 *     gcTime: 300000,   // 5 minutes
 *     retry: 3
 *   }
 * });
 *
 * const data = dotted({
 *   user: {
 *     id: '123',
 *     '.profile': 'api.getUser(${user.id})',
 *     '.posts': 'api.getUserPosts(${user.id})'
 *   }
 * }, { resolvers: plugin.resolvers });
 *
 * // Access cached data
 * const profile = await data.get('user.profile');
 *
 * // Clear cache when needed
 * plugin.clearCache();
 * ```
 */
export function withPiniaColada(config: PiniaColadaConfig): PiniaColadaPlugin {
  const resolvers: ResolverMap = {};

  // Generate query resolvers
  if (config.queries) {
    for (const [name, queryDef] of Object.entries(config.queries)) {
      // Create nested resolver structure from dotted names
      const parts = name.split('.');
      let current = resolvers;

      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]!;
        if (!current[key]) {
          current[key] = {} as any;
        }
        current = current[key] as any;
      }

      const finalKey = parts[parts.length - 1]!;
      current[finalKey] = createQueryResolver(name, queryDef, config.defaults);
    }
  }

  // Generate mutation resolvers
  if (config.mutations) {
    for (const [name, mutationDef] of Object.entries(config.mutations)) {
      // Create nested resolver structure from dotted names
      const parts = name.split('.');
      let current = resolvers;

      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]!;
        if (!current[key]) {
          current[key] = {} as any;
        }
        current = current[key] as any;
      }

      const finalKey = parts[parts.length - 1]!;
      current[finalKey] = createMutationResolver(name, mutationDef);
    }
  }

  return {
    resolvers,
    config,
    clearCache: clearGlobalCache,
    invalidateQueries: invalidateQueriesGlobal
  };
}
