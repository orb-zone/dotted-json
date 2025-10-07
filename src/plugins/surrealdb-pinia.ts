/**
 * Unified SurrealDB + Pinia Colada Integration Plugin
 *
 * Combines real-time LIVE queries with intelligent cache management.
 * Single configuration for database connection, query generation, and
 * automatic cache invalidation.
 *
 * @requires surrealdb ^1.0.0 || ^2.0.0 (optional peer dependency)
 * @requires @pinia/colada ^0.7.0 (optional peer dependency)
 * @requires pinia ^2.0.0 (optional peer dependency)
 * @requires vue ^3.0.0 (optional peer dependency)
 * @module @orbzone/dotted-json/plugins/surrealdb-pinia
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withSurrealDBPinia } from '@orbzone/dotted-json/plugins/surrealdb-pinia';
 *
 * const plugin = await withSurrealDBPinia({
 *   // SurrealDB connection
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'app',
 *   database: 'main',
 *   auth: { type: 'root', username: 'root', password: 'root' },
 *
 *   // Auto-generate queries with caching
 *   ions: {
 *     'config': { staleTime: 60_000 },
 *     'strings': { staleTime: 300_000 },
 *   },
 *
 *   // Real-time sync
 *   live: {
 *     enabled: true,
 *     ions: ['config', 'strings']
 *   }
 * });
 *
 * const data = dotted({
 *   '.config': 'db.loadIon("config", { env: "prod" })'
 * }, { resolvers: plugin.resolvers });
 * ```
 */

import type { VariantContext } from '../types.js';
import type { SurrealDBLoaderOptions, LiveUpdateEvent } from '../loaders/surrealdb.js';
import { SurrealDBLoader } from '../loaders/surrealdb.js';
import type { PiniaColadaConfig, QueryKey } from './pinia-colada.js';
import { withPiniaColada } from './pinia-colada.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Ion configuration for auto-generated resolvers
 */
export interface IonConfig {
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
 * LIVE query configuration
 */
export interface LiveConfig {
  /**
   * Enable real-time LIVE queries
   * @default false
   */
  enabled: boolean;

  /**
   * Ion base names to watch
   * @example ['config', 'strings', 'user-prefs']
   */
  ions?: string[];

  /**
   * Callback for LIVE updates
   * @param event - Update event with action, baseName, variants, data
   */
  onUpdate?: (event: LiveUpdateEvent) => void;
}

/**
 * Unified plugin configuration
 */
export interface SurrealDBPiniaConfig {
  /**
   * SurrealDB connection URL
   * @example 'ws://localhost:8000/rpc'
   */
  url: string;

  /**
   * Namespace and database
   */
  namespace: string;
  database: string;

  /**
   * Authentication credentials
   */
  auth?: SurrealDBLoaderOptions['auth'];

  /**
   * Table to store ions
   * @default 'ion'
   */
  table?: string;

  /**
   * Ion configurations for auto-generated resolvers
   *
   * Each key becomes a resolver: db.loadIon(baseName, variants)
   *
   * @example
   * ```typescript
   * ions: {
   *   'config': { staleTime: 60_000 },
   *   'strings': { staleTime: 300_000 }
   * }
   * ```
   */
  ions?: Record<string, IonConfig>;

  /**
   * Real-time LIVE query configuration
   */
  live?: LiveConfig;

  /**
   * Default cache options applied to all ions
   */
  defaults?: {
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    retry?: number | boolean;
  };
}

/**
 * Plugin result
 */
export interface SurrealDBPiniaPlugin {
  /**
   * Generated resolvers for dotted-json
   */
  resolvers: Record<string, any>;

  /**
   * SurrealDB loader instance
   */
  loader: SurrealDBLoader;

  /**
   * Clear all cached queries
   */
  clearCache: () => void;

  /**
   * Invalidate specific queries
   */
  invalidateQueries: (key: QueryKey) => void;

  /**
   * Subscribe to ion changes
   */
  subscribe: (
    baseName: string,
    variants: VariantContext | undefined,
    callback: (data: any) => void
  ) => Promise<() => void>;

  /**
   * Close connection and cleanup
   */
  close: () => Promise<void>;
}

// ============================================================================
// Main Plugin Export
// ============================================================================

/**
 * Create a unified SurrealDB + Pinia Colada plugin
 *
 * Auto-generates resolvers with intelligent caching and real-time LIVE queries.
 * Single configuration for database connection, query generation, and cache management.
 *
 * @param config - Plugin configuration
 * @returns Plugin with generated resolvers, loader, and utilities
 *
 * @example
 * ```typescript
 * const plugin = await withSurrealDBPinia({
 *   // Connection
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'app',
 *   database: 'main',
 *   auth: { type: 'root', username: 'root', password: 'root' },
 *
 *   // Auto-generate cached queries
 *   ions: {
 *     'config': { staleTime: 60_000 },
 *     'strings': { staleTime: 300_000 },
 *     'user-prefs': { staleTime: 30_000 }
 *   },
 *
 *   // Real-time sync
 *   live: {
 *     enabled: true,
 *     ions: ['config', 'user-prefs'],
 *     onUpdate: (event) => {
 *       console.log(`${event.action}: ${event.baseName}`, event.data);
 *     }
 *   },
 *
 *   // Defaults
 *   defaults: {
 *     staleTime: 30000,
 *     gcTime: 300000,
 *     retry: 3
 *   }
 * });
 *
 * // Use in dotted-json
 * const data = dotted({
 *   '.config': 'db.loadIon("config", { env: "prod" })',
 *   '.strings': 'db.loadIon("strings", { lang: "es", form: "formal" })'
 * }, { resolvers: plugin.resolvers });
 *
 * // Access data (cached)
 * const config = await data.get('config');
 *
 * // Subscribe to real-time updates
 * const unsubscribe = await plugin.subscribe('config', { env: 'prod' }, (data) => {
 *   console.log('Config updated:', data);
 *   plugin.invalidateQueries(['ion', 'config']);  // Refresh cache
 * });
 *
 * // Cleanup
 * await unsubscribe();
 * await plugin.close();
 * ```
 */
export async function withSurrealDBPinia(
  config: SurrealDBPiniaConfig
): Promise<SurrealDBPiniaPlugin> {
  // Create SurrealDB loader
  const loader = new SurrealDBLoader({
    url: config.url,
    namespace: config.namespace,
    database: config.database,
    auth: config.auth,
    table: config.table,
    cache: true,
    cacheTTL: config.defaults?.gcTime ?? 300000,
    onLiveUpdate: config.live?.onUpdate
  });

  // Initialize connection
  await loader.init();

  // Build Pinia Colada query definitions
  const queries: PiniaColadaConfig['queries'] = {};

  if (config.ions) {
    for (const [baseName, ionConfig] of Object.entries(config.ions)) {
      // Generate query resolver: db.loadIon(baseName, variants)
      queries[`db.loadIon.${baseName}`] = {
        key: (variants?: VariantContext) => ['ion', baseName, variants || {}],
        query: async (variants?: VariantContext) => {
          return await loader.load(baseName, variants);
        },
        staleTime: ionConfig.staleTime ?? config.defaults?.staleTime,
        gcTime: ionConfig.gcTime ?? config.defaults?.gcTime,
        refetchOnWindowFocus: ionConfig.refetchOnWindowFocus ?? config.defaults?.refetchOnWindowFocus,
        retry: ionConfig.retry ?? config.defaults?.retry
      };
    }
  }

  // Create Pinia Colada plugin with generated queries
  const piniaPlugin = withPiniaColada({ queries, defaults: config.defaults });

  // Setup LIVE queries if enabled
  const liveUnsubscribers: Array<() => void> = [];

  if (config.live?.enabled && config.live.ions) {
    for (const baseName of config.live.ions) {
      // Subscribe to all variants of this ion
      const unsubscribe = await loader.subscribe(
        baseName,
        undefined,  // Watch all variants
        () => {
          // Invalidate Pinia Colada cache when LIVE update received
          piniaPlugin.invalidateQueries(['ion', baseName]);
          // Note: onUpdate callback already called by loader's onLiveUpdate
        }
      );

      liveUnsubscribers.push(unsubscribe);
    }
  }

  // Create unified API namespace: db.loadIon
  const dbResolvers = {
    db: {
      loadIon: async (baseName: string, variants?: VariantContext) => {
        return await loader.load(baseName, variants);
      }
    }
  };

  // Merge with Pinia Colada resolvers
  const resolvers = {
    ...piniaPlugin.resolvers,
    ...dbResolvers
  };

  return {
    resolvers,
    loader,
    clearCache: piniaPlugin.clearCache,
    invalidateQueries: piniaPlugin.invalidateQueries,
    subscribe: loader.subscribe.bind(loader),
    close: async () => {
      // Unsubscribe all LIVE queries
      for (const unsubscribe of liveUnsubscribers) {
        await unsubscribe();
      }
      // Close loader
      await loader.close();
    }
  };
}
