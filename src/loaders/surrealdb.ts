/**
 * SurrealDB loader with variant-aware document storage
 *
 * Stores JSÖN documents in SurrealDB with:
 * - Array-based Record IDs for 10-100x faster queries
 * - Variant-aware resolution (language, formality, etc.)
 * - Real-time subscriptions via LIVE queries
 * - Full CRUD operations (load, save, list, delete)
 *
 * @module @orbzone/dotted-json/loaders/surrealdb
 */

import type { VariantContext } from '../types.js';

/**
 * Storage provider interface for JSÖN documents
 *
 * All storage providers (File, SurrealDB, etc.) must implement this interface
 */
export interface StorageProvider {
  /**
   * Initialize the storage provider
   *
   * Called once before any operations. Throws if initialization fails.
   */
  init(): Promise<void>;

  /**
   * Load a document by base name and variants
   *
   * @param baseName - Document identifier (e.g., 'greetings', 'app-config')
   * @param variants - Variant context for resolution (e.g., { lang: 'es', form: 'formal' })
   * @returns Document data, or null if not found
   *
   * @throws Error if baseName is empty or invalid
   */
  load(baseName: string, variants?: VariantContext): Promise<any>;

  /**
   * Save a document with optional variants
   *
   * @param baseName - Document identifier
   * @param data - Document contents
   * @param variants - Variant context (e.g., { lang: 'es' })
   * @param options - Save options (merge strategy, etc.)
   *
   * @throws Error if baseName is empty or data is invalid
   */
  save(
    baseName: string,
    data: any,
    variants?: VariantContext,
    options?: SaveOptions
  ): Promise<void>;

  /**
   * List all documents matching a base name pattern
   *
   * @param pattern - Base name pattern (exact match or wildcard)
   * @param variants - Optional variant filter
   * @returns Array of document metadata
   *
   * @example
   * ```typescript
   * // List all variants of 'greetings'
   * await loader.list('greetings');
   * // → ['greetings:en', 'greetings:es', 'greetings:es:formal']
   *
   * // List all documents with lang=es
   * await loader.list('*', { lang: 'es' });
   * // → ['greetings:es', 'greetings:es:formal', 'errors:es']
   * ```
   */
  list(pattern?: string, variants?: Partial<VariantContext>): Promise<DocumentMetadata[]>;

  /**
   * Delete a document by base name and variants
   *
   * @param baseName - Document identifier
   * @param variants - Variant context (optional)
   *
   * @throws Error if document not found
   */
  delete(baseName: string, variants?: VariantContext): Promise<void>;

  /**
   * Subscribe to real-time updates for a document
   *
   * @param baseName - Document identifier
   * @param callback - Called when document changes
   * @param variants - Variant context (optional)
   * @returns Unsubscribe function
   */
  subscribe?(
    baseName: string,
    callback: (data: any) => void,
    variants?: VariantContext
  ): Promise<() => void>;

  /**
   * Cleanup resources (close connections, etc.)
   */
  close?(): Promise<void>;
}

/**
 * Document metadata returned by list()
 */
export interface DocumentMetadata {
  /**
   * Record ID (e.g., 'jsön_documents:["greetings", "es"]')
   */
  id: string;

  /**
   * Base document name (e.g., 'greetings')
   */
  baseName: string;

  /**
   * Variant context (e.g., { lang: 'es', form: 'formal' })
   */
  variants: VariantContext;

  /**
   * Last modified timestamp
   */
  updatedAt?: Date;

  /**
   * Creation timestamp
   */
  createdAt?: Date;

  /**
   * Document size in bytes (if available)
   */
  size?: number;
}

/**
 * Options for save() operation
 */
export interface SaveOptions {
  /**
   * Merge strategy when document exists
   *
   * - 'replace': Overwrite entire document (default)
   * - 'merge': Deep merge with existing document
   * - 'error': Throw error if document exists
   */
  merge?: 'replace' | 'merge' | 'error';

  /**
   * Create document if it doesn't exist
   *
   * @default true
   */
  upsert?: boolean;

  /**
   * Additional metadata to store
   */
  metadata?: Record<string, any>;
}

/**
 * SurrealDB connection configuration
 */
export interface SurrealDBConnection {
  /**
   * SurrealDB WebSocket URL
   *
   * @example 'ws://localhost:8000/rpc'
   * @example 'wss://db.example.com/rpc'
   */
  url: string;

  /**
   * Namespace
   */
  namespace: string;

  /**
   * Database
   */
  database: string;

  /**
   * Authentication (optional)
   */
  auth?: {
    /**
     * Authentication type
     */
    type: 'root' | 'namespace' | 'database' | 'scope';

    /**
     * Username (for root/namespace/database auth)
     */
    username?: string;

    /**
     * Password (for root/namespace/database auth)
     */
    password?: string;

    /**
     * Scope name (for scope auth)
     */
    scope?: string;

    /**
     * Scope variables (for scope auth)
     */
    variables?: Record<string, any>;
  };
}

/**
 * SurrealDB loader configuration
 */
export interface SurrealDBLoaderOptions extends SurrealDBConnection {
  /**
   * Table name for JSÖN documents
   *
   * @default 'jsön_documents'
   */
  table?: string;

  /**
   * Enable LIVE query subscriptions
   *
   * @default false
   */
  enableLiveQueries?: boolean;

  /**
   * Cache loaded documents in memory
   *
   * @default true
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   *
   * @default 60000 (1 minute)
   */
  cacheTTL?: number;

  /**
   * Automatically invalidate cache on save
   *
   * @default true
   */
  autoInvalidateCache?: boolean;

  /**
   * Priority order for variant resolution
   *
   * @default ['lang', 'form', 'gender']
   */
  variantPriority?: string[];
}

/**
 * Internal cache entry
 */
interface CacheEntry {
  data: any;
  timestamp: number;
}

/**
 * SurrealDB loader for JSÖN documents
 *
 * Uses array-based Record IDs for 10-100x faster queries:
 * - `jsön_documents:['greetings', 'es']` (O(log n) index lookup)
 * - vs WHERE base_name = 'greetings' AND variants.lang = 'es' (O(n) table scan)
 *
 * @example
 * ```typescript
 * const loader = new SurrealDBLoader({
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'my_app',
 *   database: 'main',
 *   auth: {
 *     type: 'root',
 *     username: 'root',
 *     password: 'root'
 *   }
 * });
 *
 * await loader.init();
 *
 * // Save document with variants
 * await loader.save('greetings', { hello: 'Hola' }, { lang: 'es' });
 *
 * // Load best matching variant
 * const data = await loader.load('greetings', { lang: 'es', form: 'formal' });
 * ```
 */
export class SurrealDBLoader implements StorageProvider {
  private db: any = null;
  private initialized = false;
  private options: Required<Omit<SurrealDBLoaderOptions, 'auth'>> & {
    auth?: SurrealDBLoaderOptions['auth'];
  };
  private cache = new Map<string, CacheEntry>();
  private liveQueries = new Map<string, { queryId: string; callbacks: Set<Function> }>();

  constructor(options: SurrealDBLoaderOptions) {
    this.options = {
      table: 'jsön_documents',
      enableLiveQueries: false,
      cache: true,
      cacheTTL: 60000,
      autoInvalidateCache: true,
      variantPriority: ['lang', 'form', 'gender'],
      ...options
    };
  }

  /**
   * Initialize SurrealDB connection
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to avoid bundling surrealdb if not used
      const { default: Surreal } = await import('surrealdb') as { default: any };

      this.db = new Surreal();
      await this.db.connect(this.options.url);

      // Authenticate if credentials provided
      if (this.options.auth) {
        const { type, username, password, scope, variables } = this.options.auth;

        if (type === 'root' || type === 'namespace' || type === 'database') {
          await this.db.signin({ username, password });
        } else if (type === 'scope') {
          await this.db.signin({ scope, ...variables });
        }
      }

      // Select namespace and database
      await this.db.use({
        namespace: this.options.namespace,
        database: this.options.database
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize SurrealDBLoader: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Load document with variant resolution
   *
   * Uses array Record ID range queries for fast lookup
   */
  async load(baseName: string, variants: VariantContext = {}): Promise<any> {
    this.ensureInitialized();

    if (!baseName || baseName.trim() === '') {
      throw new Error('baseName is required and cannot be empty');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(baseName, variants);
    if (this.options.cache) {
      const cached = this.getCached(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Build Record ID for exact match
    const recordID = this.makeRecordID(baseName, variants);

    // Try exact match first
    let result = await this.db.select([this.options.table, recordID]);

    // If no exact match, try range query for partial matches
    if (!result) {
      result = await this.findBestMatch(baseName, variants);
    }

    if (!result) {
      return null;
    }

    const data = result.data;

    // Cache result
    if (this.options.cache && data) {
      this.setCached(cacheKey, data);
    }

    return data;
  }

  /**
   * Save document with variants
   *
   * Creates/updates document with array-based Record ID
   */
  async save(
    baseName: string,
    data: any,
    variants: VariantContext = {},
    options: SaveOptions = {}
  ): Promise<void> {
    this.ensureInitialized();

    if (!baseName || baseName.trim() === '') {
      throw new Error('baseName is required and cannot be empty');
    }

    const { merge = 'replace', metadata = {} } = options;

    // Build Record ID
    const recordID = this.makeRecordID(baseName, variants);
    const fullID = [this.options.table, recordID];

    // Check if document exists
    const existing = await this.db.select(fullID);

    if (existing && merge === 'error') {
      throw new Error(`Document already exists: ${baseName} with variants ${JSON.stringify(variants)}`);
    }

    // Prepare document
    const document: Record<string, any> = {
      base_name: baseName,
      variants: variants || {},
      data,
      ...metadata,
      updated_at: new Date().toISOString()
    };

    if (!existing) {
      document.created_at = new Date().toISOString();
    }

    // Save document
    if (merge === 'merge' && existing) {
      // Deep merge with existing data
      await this.db.merge(fullID, {
        data: this.deepMerge(existing.data, data),
        updated_at: document.updated_at
      });
    } else {
      // Replace or create
      await this.db.update(fullID, document);
    }

    // Invalidate cache
    if (this.options.autoInvalidateCache) {
      this.invalidateCache(baseName, variants);
    }
  }

  /**
   * List documents matching pattern and variants
   */
  async list(pattern: string = '*', variants?: Partial<VariantContext>): Promise<DocumentMetadata[]> {
    this.ensureInitialized();

    let query: string;
    const params: Record<string, any> = {};

    if (pattern === '*' && !variants) {
      // List all documents
      query = `SELECT * FROM ${this.options.table}`;
    } else if (pattern !== '*' && !variants) {
      // List all variants of a base name
      params.baseName = pattern;
      query = `SELECT * FROM ${this.options.table} WHERE base_name = $baseName`;
    } else {
      // List with variant filter
      query = `SELECT * FROM ${this.options.table} WHERE base_name = $baseName`;
      params.baseName = pattern === '*' ? null : pattern;

      // Add variant filters
      if (variants) {
        const conditions: string[] = [];
        if (params.baseName) {
          conditions.push('base_name = $baseName');
        }

        for (const [key, value] of Object.entries(variants)) {
          if (value !== undefined) {
            const paramKey = `variant_${key}`;
            params[paramKey] = value;
            conditions.push(`variants.${key} = $${paramKey}`);
          }
        }

        query = `SELECT * FROM ${this.options.table} WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.db.query(query, params);
    const documents = result[0] || [];

    return documents.map((doc: any) => ({
      id: doc.id,
      baseName: doc.base_name,
      variants: doc.variants || {},
      createdAt: doc.created_at ? new Date(doc.created_at) : undefined,
      updatedAt: doc.updated_at ? new Date(doc.updated_at) : undefined
    }));
  }

  /**
   * Delete document by base name and variants
   */
  async delete(baseName: string, variants: VariantContext = {}): Promise<void> {
    this.ensureInitialized();

    if (!baseName || baseName.trim() === '') {
      throw new Error('baseName is required and cannot be empty');
    }

    const recordID = this.makeRecordID(baseName, variants);
    const fullID = [this.options.table, recordID];

    const result = await this.db.delete(fullID);

    if (!result) {
      throw new Error(`Document not found: ${baseName} with variants ${JSON.stringify(variants)}`);
    }

    // Invalidate cache
    if (this.options.autoInvalidateCache) {
      this.invalidateCache(baseName, variants);
    }
  }

  /**
   * Subscribe to real-time updates via LIVE query
   */
  async subscribe(
    baseName: string,
    callback: (data: any) => void,
    variants: VariantContext = {}
  ): Promise<() => void> {
    this.ensureInitialized();

    if (!this.options.enableLiveQueries) {
      throw new Error('LIVE queries not enabled. Set enableLiveQueries: true in options.');
    }

    const cacheKey = this.getCacheKey(baseName, variants);

    // Check if LIVE query already exists for this document
    let liveQuery = this.liveQueries.get(cacheKey);

    if (!liveQuery) {
      // Create new LIVE query
      const recordID = this.makeRecordID(baseName, variants);
      const fullID = `${this.options.table}:${JSON.stringify(recordID)}`;

      const queryId = await this.db.live(fullID, (_action: string, result: any) => {
        // Notify all subscribers
        const callbacks = this.liveQueries.get(cacheKey)?.callbacks;
        if (callbacks) {
          for (const cb of callbacks) {
            cb(result?.data);
          }
        }

        // Update cache
        if (this.options.cache && result?.data) {
          this.setCached(cacheKey, result.data);
        }
      });

      liveQuery = {
        queryId,
        callbacks: new Set([callback])
      };

      this.liveQueries.set(cacheKey, liveQuery);
    } else {
      // Add callback to existing LIVE query
      liveQuery.callbacks.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const query = this.liveQueries.get(cacheKey);
      if (query) {
        query.callbacks.delete(callback);

        // Kill LIVE query if no more subscribers
        if (query.callbacks.size === 0) {
          this.db.kill(query.queryId);
          this.liveQueries.delete(cacheKey);
        }
      }
    };
  }

  /**
   * Close SurrealDB connection and cleanup resources
   */
  async close(): Promise<void> {
    if (!this.initialized) return;

    // Kill all LIVE queries
    for (const { queryId } of this.liveQueries.values()) {
      try {
        await this.db.kill(queryId);
      } catch (error) {
        // Ignore errors on cleanup
      }
    }

    this.liveQueries.clear();
    this.cache.clear();

    await this.db.close();
    this.initialized = false;
  }

  /**
   * Generate array-based Record ID from base name and variants
   *
   * Priority order ensures consistent sorting:
   * 1. lang (most common)
   * 2. form (formality level)
   * 3. gender
   * 4. Other variants (alphabetically)
   *
   * Examples:
   * - makeRecordID('greetings', { lang: 'es' }) → ['greetings', 'es']
   * - makeRecordID('greetings', { lang: 'es', form: 'formal' }) → ['greetings', 'es', 'formal']
   * - makeRecordID('profile', { gender: 'f' }) → ['profile', '', '', 'f']
   */
  private makeRecordID(baseName: string, variants: VariantContext = {}): any[] {
    const id: any[] = [baseName];

    // Add variants in priority order
    for (const key of this.options.variantPriority) {
      id.push(variants[key] || '');
    }

    // Add remaining variants alphabetically
    const remaining = Object.keys(variants)
      .filter(key => !this.options.variantPriority.includes(key))
      .sort();

    for (const key of remaining) {
      id.push(variants[key]);
    }

    // Trim trailing empty strings
    while (id.length > 1 && id[id.length - 1] === '') {
      id.pop();
    }

    return id;
  }

  /**
   * Find best matching document using range query
   *
   * Tries progressively less specific variants until match found
   */
  private async findBestMatch(baseName: string, variants: VariantContext): Promise<any> {
    // Build candidates by removing variants one by one
    const candidates: VariantContext[] = [variants];

    // Try removing each variant
    for (const key of Object.keys(variants)) {
      const partial = { ...variants };
      delete partial[key];
      candidates.push(partial);
    }

    // Try base document (no variants)
    candidates.push({});

    // Try each candidate in order
    for (const candidate of candidates) {
      const recordID = this.makeRecordID(baseName, candidate);
      const result = await this.db.select([this.options.table, recordID]);

      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    if (typeof source !== 'object' || source === null) {
      return source;
    }

    if (Array.isArray(source)) {
      return source;
    }

    const merged = { ...target };

    for (const key in source) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
        merged[key] = this.deepMerge(merged[key] || {}, source[key]);
      } else {
        merged[key] = source[key];
      }
    }

    return merged;
  }

  /**
   * Get cache key from base name and variants
   */
  private getCacheKey(baseName: string, variants: VariantContext): string {
    const sorted = Object.keys(variants).sort();
    const variantStr = sorted.map(k => `${k}:${variants[k]}`).join('|');
    return variantStr ? `${baseName}|${variantStr}` : baseName;
  }

  /**
   * Get cached value if still valid
   */
  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.options.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value
   */
  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a document
   */
  private invalidateCache(baseName: string, variants: VariantContext): void {
    const key = this.getCacheKey(baseName, variants);
    this.cache.delete(key);
  }

  /**
   * Ensure loader is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SurrealDBLoader not initialized. Call init() first.');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      liveQueries: this.liveQueries.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Plugin factory for SurrealDB integration
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withSurrealDB } from '@orbzone/dotted-json/loaders/surrealdb';
 *
 * const plugin = await withSurrealDB({
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'my_app',
 *   database: 'main'
 * });
 *
 * const data = dotted(
 *   {
 *     '.config': 'db.load("app-config")'
 *   },
 *   {
 *     resolvers: plugin.resolvers
 *   }
 * );
 * ```
 */
export async function withSurrealDB(options: SurrealDBLoaderOptions) {
  const loader = new SurrealDBLoader(options);
  await loader.init();

  return {
    resolvers: {
      db: {
        /**
         * Load document from SurrealDB
         */
        async load(this: any, baseName: string, variants?: VariantContext) {
          const ctx = this?.variants || variants || {};
          return await loader.load(baseName, ctx);
        },

        /**
         * Save document to SurrealDB
         */
        async save(this: any, baseName: string, data: any, variants?: VariantContext) {
          const ctx = this?.variants || variants || {};
          return await loader.save(baseName, data, ctx);
        },

        /**
         * List documents
         */
        async list(pattern?: string, variants?: Partial<VariantContext>) {
          return await loader.list(pattern, variants);
        },

        /**
         * Delete document
         */
        async delete(baseName: string, variants?: VariantContext) {
          return await loader.delete(baseName, variants);
        }
      }
    },

    // Expose loader for advanced usage
    __loader: loader
  };
}
