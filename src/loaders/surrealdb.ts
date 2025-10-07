/**
 * SurrealDB loader for ions (variant-aware document storage)
 *
 * Uses array-based Record IDs for performant variant resolution:
 * - ion:['strings', 'es', 'formal'] - Spanish formal strings
 * - ion:['config', 'prod'] - Production config
 * - ion:['user-prefs', 'alice'] - User-specific preferences
 *
 * Benefits:
 * - 10-100x faster queries (Record ID ranges vs WHERE clauses)
 * - Natural hierarchical sorting
 * - No redundant base_name/variants fields
 *
 * @module @orbzone/dotted-json/loaders/surrealdb
 */

import type { VariantContext } from '../types.js';
import type { StorageProvider, SaveOptions, DocumentInfo, ListFilter } from '../types/storage.js';
import { scoreVariantMatch } from '../variant-resolver.js';

// SurrealDB types (will be properly typed if surrealdb is installed)
type Surreal = any;

/**
 * Action types for LIVE query updates
 */
export type LiveAction = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * LIVE query update event
 */
export interface LiveUpdateEvent {
  /** Action type */
  action: LiveAction;
  /** Record ID that changed */
  id: any;
  /** Base name from the Record ID */
  baseName: string;
  /** Variants from the Record ID */
  variants: VariantContext;
  /** New data (for CREATE/UPDATE) */
  data?: any;
}

/**
 * SurrealDB connection and authentication options
 */
export interface SurrealDBLoaderOptions {
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
  auth?: {
    /** Auth type */
    type: 'root' | 'namespace' | 'database' | 'scope';
    /** Username (for root/namespace/database) */
    username?: string;
    /** Password (for root/namespace/database) */
    password?: string;
    /** Access method (for scope) */
    access?: string;
    /** Scope variables (for scope) */
    variables?: Record<string, any>;
  };

  /**
   * Table to store ions (variant documents)
   * @default 'ion'
   */
  table?: string;

  /**
   * Cache loaded documents in memory
   * @default true
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   * @default 60000 (1 minute)
   */
  cacheTTL?: number;

  /**
   * Callback for LIVE query updates
   * Called whenever a document changes in real-time
   *
   * @example
   * ```typescript
   * onLiveUpdate: (event) => {
   *   console.log(`${event.action}: ${event.baseName}`, event.data);
   *   // Invalidate cache, update UI, etc.
   * }
   * ```
   */
  onLiveUpdate?: (event: LiveUpdateEvent) => void;

  /**
   * Connection retry configuration
   */
  retry?: {
    /** Maximum number of retry attempts @default 3 */
    maxAttempts?: number;
    /** Initial delay in ms @default 1000 */
    initialDelay?: number;
    /** Maximum delay in ms @default 10000 */
    maxDelay?: number;
    /** Exponential backoff multiplier @default 2 */
    backoffMultiplier?: number;
  };
}

/**
 * Cache entry with expiration
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}

/**
 * SurrealDB loader for ions (JSÖN documents with variant support)
 *
 * Implements StorageProvider interface with array-based Record IDs
 * for performant variant resolution.
 *
 * @example
 * ```typescript
 * const loader = new SurrealDBLoader({
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'app',
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
 * // Save ion with variants
 * await loader.save('strings', { hello: 'Hola' }, { lang: 'es', form: 'formal' });
 *
 * // Load with variant resolution
 * const strings = await loader.load('strings', { lang: 'es', form: 'formal' });
 * console.log(strings.hello);  // "Hola"
 * ```
 */
export class SurrealDBLoader implements StorageProvider {
  private db: Surreal | null = null;
  private options: Required<Omit<SurrealDBLoaderOptions, 'auth' | 'onLiveUpdate' | 'retry'>> & {
    auth?: SurrealDBLoaderOptions['auth'];
    onLiveUpdate?: (event: LiveUpdateEvent) => void;
    retry: {
      maxAttempts: number;
      initialDelay: number;
      maxDelay: number;
      backoffMultiplier: number;
    };
  };
  private cache = new Map<string, CacheEntry>();
  private initialized = false;
  private liveQueries = new Map<string, string>();  // baseName → queryUUID

  constructor(options: SurrealDBLoaderOptions) {
    this.options = {
      url: options.url,
      namespace: options.namespace,
      database: options.database,
      table: options.table ?? 'ion',
      cache: options.cache ?? true,
      cacheTTL: options.cacheTTL ?? 60000,  // 1 minute
      retry: {
        maxAttempts: options.retry?.maxAttempts ?? 3,
        initialDelay: options.retry?.initialDelay ?? 1000,
        maxDelay: options.retry?.maxDelay ?? 10000,
        backoffMultiplier: options.retry?.backoffMultiplier ?? 2
      },
      auth: options.auth,
      onLiveUpdate: options.onLiveUpdate
    };
  }

  /**
   * Initialize connection to SurrealDB with automatic retry
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const { maxAttempts, initialDelay, maxDelay, backoffMultiplier } = this.options.retry;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Dynamic import of surrealdb (peer dependency)
        const surrealdb = await import('surrealdb');
        this.db = new surrealdb.default();

        await this.db.connect(this.options.url);
        await this.db.use({
          namespace: this.options.namespace,
          database: this.options.database
        });

        if (this.options.auth) {
          await this.authenticate();
        }

        this.initialized = true;
        return;

      } catch (error: any) {
        lastError = error;

        // Don't retry on missing dependency
        if (error.message?.includes('Cannot find')) {
          throw new Error(
            'SurrealDB not installed. Install with: bun add surrealdb'
          );
        }

        // Don't retry on auth errors
        if (error.message?.includes('auth') || error.message?.includes('permission')) {
          throw new Error(
            `SurrealDB authentication failed: ${error.message}. Check your credentials.`
          );
        }

        // Calculate backoff delay with exponential growth
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );

        // Log retry attempt (if not last attempt)
        if (attempt < maxAttempts - 1) {
          console.warn(
            `[SurrealDBLoader] Connection failed (attempt ${attempt + 1}/${maxAttempts}): ${error.message}. Retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `SurrealDBLoader: Failed to connect after ${maxAttempts} attempts. ` +
      `Last error: ${lastError?.message}. ` +
      `Check if SurrealDB is running at ${this.options.url} and credentials are correct.`
    );
  }

  /**
   * Authenticate with SurrealDB
   */
  private async authenticate(): Promise<void> {
    const { auth } = this.options;
    if (!auth || !this.db) return;

    switch (auth.type) {
      case 'root':
      case 'namespace':
      case 'database':
        if (!auth.username || !auth.password) {
          throw new Error(`${auth.type} auth requires username and password`);
        }
        await this.db.signin({
          username: auth.username,
          password: auth.password
        });
        break;

      case 'scope':
        if (!auth.access) {
          throw new Error('Scope auth requires access method');
        }
        await this.db.signin({
          namespace: this.options.namespace,
          database: this.options.database,
          access: auth.access,
          variables: auth.variables || {}
        });
        break;
    }
  }

  /**
   * Build array Record ID from base name and variants
   *
   * Format: [base_name, lang?, gender?, form?, ...custom]
   * Well-known variants in priority order, custom variants alphabetically
   *
   * @example
   * ```typescript
   * buildRecordId('strings', { lang: 'es', form: 'formal' })
   * // → ['strings', 'es', 'formal']
   *
   * buildRecordId('config', { env: 'prod' })
   * // → ['config', 'prod']
   * ```
   */
  private buildRecordId(baseName: string, variants: VariantContext = {}): any[] {
    const parts = [baseName];

    // Well-known variants in priority order
    if (variants.lang) parts.push(variants.lang);
    if (variants.gender) parts.push(variants.gender);
    if (variants.form) parts.push(variants.form);

    // Custom variants in alphabetical order
    const customKeys = Object.keys(variants)
      .filter(k => k !== 'lang' && k !== 'gender' && k !== 'form')
      .sort();

    for (const key of customKeys) {
      const value = variants[key];
      if (typeof value === 'string') {
        parts.push(value);
      }
    }

    return parts;
  }

  /**
   * Parse array Record ID into base name and variants
   *
   * Inverse of buildRecordId()
   */
  private parseRecordId(recordId: any[]): { baseName: string; variants: VariantContext } {
    if (!Array.isArray(recordId) || recordId.length === 0) {
      throw new Error('Invalid Record ID: expected array with at least base_name');
    }

    const baseName = recordId[0];
    const variants: VariantContext = {};

    // Well-known variant positions
    if (recordId[1]) {
      // Could be lang, gender, form, or custom
      // Try to detect based on pattern
      if (/^[a-z]{2}(-[A-Z]{2})?$/.test(recordId[1])) {
        variants.lang = recordId[1];
      } else if (/^[mfx]$/.test(recordId[1])) {
        variants.gender = recordId[1] as 'm' | 'f' | 'x';
      } else if (/^(casual|informal|neutral|polite|formal|honorific)$/.test(recordId[1])) {
        variants.form = recordId[1];
      } else {
        // Custom variant
        variants[recordId[1]] = recordId[1];
      }
    }

    if (recordId[2]) {
      if (/^[mfx]$/.test(recordId[2])) {
        variants.gender = recordId[2] as 'm' | 'f' | 'x';
      } else if (/^(casual|informal|neutral|polite|formal|honorific)$/.test(recordId[2])) {
        variants.form = recordId[2];
      } else {
        variants[recordId[2]] = recordId[2];
      }
    }

    if (recordId[3]) {
      if (/^(casual|informal|neutral|polite|formal|honorific)$/.test(recordId[3])) {
        variants.form = recordId[3];
      } else {
        variants[recordId[3]] = recordId[3];
      }
    }

    // Remaining are custom variants
    for (let i = 4; i < recordId.length; i++) {
      variants[recordId[i]] = recordId[i];
    }

    return { baseName, variants };
  }

  /**
   * Load ion with variant resolution
   *
   * Uses range query for efficient variant matching:
   * 1. Query all ions with matching base_name prefix
   * 2. Score candidates using variant resolver
   * 3. Return best match
   */
  async load(baseName: string, variants: VariantContext = {}): Promise<any> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('SurrealDB not initialized');
    }

    // Check cache
    const cacheKey = this.getCacheKey(baseName, variants);
    if (this.options.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // Build range query for all ions with this base_name
    // Range: [baseName] to [baseName, '\uffff'] catches all variants
    const startId = [baseName];
    const endId = [baseName, '\uffff'];

    const query = `
      SELECT * FROM type::table($table)
      WHERE id >= type::thing($table, $startId)
        AND id < type::thing($table, $endId)
    `;

    const [result] = await this.db.query(query, {
      table: this.options.table,
      startId,
      endId
    });

    const candidates = result as any[];

    if (!candidates || candidates.length === 0) {
      const variantStr = Object.keys(variants).length > 0
        ? ` with variants ${JSON.stringify(variants)}`
        : '';
      throw new Error(
        `Ion not found: "${baseName}"${variantStr}. ` +
        `Searched in table "${this.options.table}". ` +
        `Make sure the ion exists or create it with loader.save().`
      );
    }

    // Resolve best matching variant
    const bestMatch = this.resolveBestVariant(candidates, variants);

    // Cache result
    if (this.options.cache) {
      this.cache.set(cacheKey, {
        data: bestMatch.data,
        expiresAt: Date.now() + this.options.cacheTTL
      });
    }

    return bestMatch.data;
  }

  /**
   * Resolve best matching document based on variant scoring
   */
  private resolveBestVariant(candidates: any[], contextVariants: VariantContext): any {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Score each candidate
    let bestScore = -1;
    let bestMatch = candidates[0];

    for (const candidate of candidates) {
      // Parse Record ID to get variants
      const { variants: docVariants } = this.parseRecordId(candidate.id);

      // Score match
      const score = scoreVariantMatch(docVariants, contextVariants);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  /**
   * Save ion to SurrealDB
   *
   * Uses array Record ID for efficient variant storage
   */
  async save(
    baseName: string,
    data: any,
    variants: VariantContext = {},
    options: SaveOptions = {}
  ): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('SurrealDB not initialized');
    }

    const {
      upsert = true,
      schema,
      strategy = 'replace',
      metadata = {}
    } = options;

    // Validate with Zod if schema provided
    if (schema) {
      schema.parse(data);
    }

    // Build Record ID
    const recordIdArray = this.buildRecordId(baseName, variants);
    const recordId = `${this.options.table}:${JSON.stringify(recordIdArray)}`;

    // Build document
    let documentData = data;

    // Handle merge strategies
    if (strategy !== 'replace' && upsert) {
      try {
        // Try to load existing
        const existing = await this.db.select(recordId);
        if (existing && existing.length > 0) {
          const existingDoc = existing[0];

          if (strategy === 'merge') {
            // Shallow merge
            documentData = { ...existingDoc.data, ...data };
          } else if (strategy === 'deep-merge') {
            // Deep merge
            documentData = this.deepMerge(existingDoc.data, data);
          }
        }
      } catch (error) {
        // Document doesn't exist - will create new
      }
    }

    // Create/update ion record
    const record: any = {
      data: documentData,
      updated_at: new Date().toISOString(),
      ...metadata
    };

    if (upsert) {
      // Upsert (create or update)
      await this.db.upsert(recordId, record);
    } else {
      // Create only
      record.created_at = new Date().toISOString();
      await this.db.create(recordId, record);
    }

    // Invalidate cache
    const cacheKey = this.getCacheKey(baseName, variants);
    this.cache.delete(cacheKey);
  }

  /**
   * List available ions
   *
   * Uses range queries for efficient filtering
   */
  async list(filter: ListFilter = {}): Promise<DocumentInfo[]> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('SurrealDB not initialized');
    }

    let query: string;
    let params: Record<string, any>;

    if (filter.baseName) {
      // Range query for specific base_name
      const startId = [filter.baseName];
      const endId = [filter.baseName, '\uffff'];

      query = `
        SELECT * FROM type::table($table)
        WHERE id >= type::thing($table, $startId)
          AND id < type::thing($table, $endId)
      `;
      params = {
        table: this.options.table,
        startId,
        endId
      };
    } else {
      // List all ions
      query = `SELECT * FROM type::table($table)`;
      params = { table: this.options.table };
    }

    const [result] = await this.db.query(query, params);
    let ions = result as any[];

    // Apply variant filter
    if (filter.variants) {
      ions = ions.filter(ion => {
        const { variants: ionVariants } = this.parseRecordId(ion.id);

        for (const [key, value] of Object.entries(filter.variants!)) {
          if (ionVariants[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    // Convert to DocumentInfo
    return ions.map(ion => {
      const { baseName, variants } = this.parseRecordId(ion.id);
      const variantStr = Object.values(variants)
        .join(':');

      return {
        baseName,
        variants,
        fullName: baseName + (variantStr ? ':' + variantStr : ''),
        identifier: ion.id,
        metadata: {
          createdAt: ion.created_at ? new Date(ion.created_at) : undefined,
          updatedAt: ion.updated_at ? new Date(ion.updated_at) : undefined,
          version: ion.version
        }
      };
    });
  }

  /**
   * Delete ion from SurrealDB
   */
  async delete(baseName: string, variants: VariantContext = {}): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('SurrealDB not initialized');
    }

    // Build Record ID
    const recordIdArray = this.buildRecordId(baseName, variants);
    const recordId = `${this.options.table}:${JSON.stringify(recordIdArray)}`;

    // Delete ion
    const deleted = await this.db.delete(recordId);

    if (!deleted || deleted.length === 0) {
      const variantStr = Object.keys(variants).length > 0
        ? ` with variants ${JSON.stringify(variants)}`
        : '';
      throw new Error(
        `Cannot delete ion: "${baseName}"${variantStr} not found. ` +
        `Record ID: ${recordId}`
      );
    }

    // Invalidate cache
    const cacheKey = this.getCacheKey(baseName, variants);
    this.cache.delete(cacheKey);
  }

  /**
   * Subscribe to ion changes in real-time
   *
   * Uses SurrealDB LIVE SELECT with DIFF mode for efficient updates.
   * Automatically invalidates local cache and calls onLiveUpdate callback.
   *
   * @param baseName - Document identifier to watch
   * @param variants - Variant context (optional, watches all variants if omitted)
   * @param callback - Called when document changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * // Watch all 'config' variants
   * const unsubscribe = await loader.subscribe('config', undefined, (data) => {
   *   console.log('Config updated:', data);
   * });
   *
   * // Watch specific variant
   * const unsubscribe2 = await loader.subscribe('strings', { lang: 'es' }, (data) => {
   *   console.log('Spanish strings updated:', data);
   * });
   *
   * // Stop listening
   * await unsubscribe();
   * ```
   */
  async subscribe(
    baseName: string,
    variants: VariantContext | undefined,
    callback: (data: any) => void
  ): Promise<() => void> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('SurrealDB not initialized');
    }

    // Build LIVE SELECT query
    // If variants specified, watch specific record; otherwise watch all with baseName prefix
    let liveQuery: string;
    let queryParams: Record<string, any>;

    if (variants && Object.keys(variants).length > 0) {
      // Watch specific variant
      const recordIdArray = this.buildRecordId(baseName, variants);
      const recordId = `${this.options.table}:${JSON.stringify(recordIdArray)}`;

      liveQuery = `LIVE SELECT DIFF FROM ${recordId}`;
      queryParams = {};
    } else {
      // Watch all variants with this baseName
      const startId = [baseName];
      const endId = [baseName, '\uffff'];

      liveQuery = `
        LIVE SELECT DIFF FROM type::table($table)
        WHERE id >= type::thing($table, $startId)
          AND id < type::thing($table, $endId)
      `;
      queryParams = {
        table: this.options.table,
        startId,
        endId
      };
    }

    // Execute LIVE query
    const queryUUID = await this.db.query(liveQuery, queryParams);

    // Track this subscription
    const subscriptionKey = this.getCacheKey(baseName, variants || {});
    this.liveQueries.set(subscriptionKey, queryUUID);

    // Listen for updates
    this.db.listenLive(queryUUID, (action: LiveAction, result: any) => {
      // Parse Record ID to get baseName and variants
      const { baseName: updatedBaseName, variants: updatedVariants } = this.parseRecordId(result.id);

      // Extract data based on action
      let data: any = undefined;
      if (action === 'CREATE' || action === 'UPDATE') {
        data = result.data;
      }

      // Invalidate cache for this document
      const cacheKey = this.getCacheKey(updatedBaseName, updatedVariants);
      this.cache.delete(cacheKey);

      // Call user callback
      callback(data);

      // Call global onLiveUpdate callback if configured
      if (this.options.onLiveUpdate) {
        this.options.onLiveUpdate({
          action,
          id: result.id,
          baseName: updatedBaseName,
          variants: updatedVariants,
          data
        });
      }
    });

    // Return unsubscribe function
    return async () => {
      if (this.db) {
        await this.db.kill(queryUUID);
        this.liveQueries.delete(subscriptionKey);
      }
    };
  }

  /**
   * Close connection and cleanup resources
   */
  async close(): Promise<void> {
    // Kill all active LIVE queries
    if (this.db) {
      for (const queryUUID of this.liveQueries.values()) {
        try {
          await this.db.kill(queryUUID);
        } catch (error) {
          // Ignore errors when killing queries
          console.warn('Error killing LIVE query:', error);
        }
      }
      this.liveQueries.clear();

      await this.db.close();
      this.db = null;
    }
    this.cache.clear();
    this.initialized = false;
  }

  /**
   * Generate cache key from base name + sorted variants
   */
  private getCacheKey(baseName: string, variants: VariantContext): string {
    const sorted = Object.keys(variants).sort();
    const variantStr = sorted.map(k => `${k}:${variants[k]}`).join('|');
    return variantStr ? `${baseName}|${variantStr}` : baseName;
  }

  /**
   * Deep merge two objects recursively
   */
  private deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null ||
        typeof source !== 'object' || source === null) {
      return source;
    }

    if (Array.isArray(source)) {
      return source;  // Arrays replaced entirely
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
          typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
