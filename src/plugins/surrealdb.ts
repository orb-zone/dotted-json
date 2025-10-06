/**
 * SurrealDB Plugin for dotted-json
 *
 * Provides automatic resolver generation for SurrealDB operations.
 * Handles connection, authentication, and CRUD operations with minimal configuration.
 *
 * @requires surrealdb ^1.0.0 or ^2.0.0
 * @module @orbzone/dotted-json/plugins/surrealdb
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';
 *
 * const plugin = await withSurrealDB({
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'app',
 *   database: 'main',
 *   tables: ['user', 'post']
 * });
 *
 * const data = dotted({
 *   user: {
 *     id: 'user:123',
 *     '.profile': 'db.user.select(${user.id})'
 *   }
 * }, { resolvers: plugin.resolvers });
 *
 * // Cleanup when done
 * await plugin.disconnect();
 * ```
 */

// Use dynamic import to support optional peer dependency
type Surreal = any;
type ZodType = any;

// ============================================================================
// Type Definitions
// ============================================================================

export interface AuthConfig {
  /**
   * Authentication type
   */
  type: 'root' | 'namespace' | 'database' | 'scope';

  /**
   * Username for root/namespace/database auth
   */
  username?: string;

  /**
   * Password for root/namespace/database auth
   */
  password?: string;

  /**
   * Namespace for namespace/database/scope auth
   */
  namespace?: string;

  /**
   * Database for database/scope auth
   */
  database?: string;

  /**
   * Access method for scope-based auth (SurrealDB 2.x)
   */
  access?: string;

  /**
   * Variables for scope-based auth
   */
  variables?: Record<string, any>;
}

/**
 * SurrealDB custom function definition with optional Zod validation
 */
export interface FunctionDefinition {
  /**
   * Function name (called as fn::name in SurrealDB)
   */
  name: string;

  /**
   * Zod schema for validating function parameters (optional)
   */
  params?: ZodType;

  /**
   * Zod schema for validating function return value (optional)
   */
  returns?: ZodType;

  /**
   * Whether to validate params/returns
   * @default true
   */
  validate?: boolean;
}

export interface SurrealDBOptions {
  /**
   * SurrealDB connection URL
   * @example 'ws://localhost:8000/rpc'
   */
  url: string;

  /**
   * Namespace to use
   */
  namespace: string;

  /**
   * Database to use
   */
  database: string;

  /**
   * Authentication configuration (optional)
   */
  auth?: AuthConfig;

  /**
   * Tables to generate CRUD resolvers for
   * @example ['user', 'post', 'comment']
   */
  tables?: string[];

  /**
   * Custom SurrealDB functions to expose
   * @example [{ name: 'getProfile', params: UserIdSchema, returns: ProfileSchema }]
   */
  functions?: FunctionDefinition[];

  /**
   * Custom resolvers (string queries or functions)
   * @example { 'db.custom.query': 'SELECT * FROM user WHERE age > $age' }
   */
  customResolvers?: Record<string, string | ((db: Surreal, params: any[]) => Promise<any>)>;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export interface SurrealDBPlugin {
  /**
   * Resolver functions for dotted-json
   */
  resolvers: Record<string, any>;

  /**
   * Direct access to SurrealDB client
   */
  db: Surreal;

  /**
   * Disconnect from SurrealDB
   */
  disconnect: () => Promise<void>;

  /**
   * Check if connected
   */
  isConnected: () => boolean;

  /**
   * Check if authenticated
   */
  isAuthenticated: () => boolean;
}

interface TableResolvers {
  select: (id: string) => Promise<any>;
  create: (data: Record<string, any>) => Promise<any>;
  update: (id: string, data: Record<string, any>) => Promise<any>;
  delete: (id: string) => Promise<void>;
  query: (sql: string, params?: Record<string, any>) => Promise<any>;
}

// ============================================================================
// SurrealDB Client Wrapper
// ============================================================================

class SurrealDBClient {
  private db: Surreal;
  private connected = false;
  private authenticated = false;
  private options: SurrealDBOptions;

  constructor(options: SurrealDBOptions, SurrealConstructor: any) {
    this.options = options;
    this.db = new SurrealConstructor();
  }

  async connect(): Promise<void> {
    try {
      if (this.options.debug) {
        console.log('[SurrealDB Plugin] Connecting to:', this.options.url);
      }

      await this.db.connect(this.options.url);

      await this.db.use({
        namespace: this.options.namespace,
        database: this.options.database
      });

      this.connected = true;

      if (this.options.debug) {
        console.log(`[SurrealDB Plugin] Connected to ${this.options.namespace}/${this.options.database}`);
      }

      // Authenticate if credentials provided
      if (this.options.auth) {
        await this.authenticate();
      }
    } catch (error) {
      this.connected = false;
      console.error('[SurrealDB Plugin] Connection failed:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.options.auth) return;

    try {
      const auth = this.options.auth;

      if (auth.type === 'root') {
        await this.db.signin({
          username: auth.username!,
          password: auth.password!
        });
      } else if (auth.type === 'namespace') {
        await this.db.signin({
          namespace: auth.namespace!,
          username: auth.username!,
          password: auth.password!
        });
      } else if (auth.type === 'database') {
        await this.db.signin({
          namespace: auth.namespace!,
          database: auth.database!,
          username: auth.username!,
          password: auth.password!
        });
      } else if (auth.type === 'scope') {
        // SurrealDB 2.x scope-based auth
        await this.db.signin({
          namespace: this.options.namespace,
          database: this.options.database,
          access: auth.access!,
          variables: auth.variables || {}
        });
      }

      this.authenticated = true;

      if (this.options.debug) {
        console.log('[SurrealDB Plugin] Authenticated successfully');
      }
    } catch (error) {
      this.authenticated = false;
      console.error('[SurrealDB Plugin] Authentication failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.db.close();
      this.connected = false;
      this.authenticated = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getDB(): Surreal {
    return this.db;
  }
}

// ============================================================================
// Resolver Generators
// ============================================================================

/**
 * Create CRUD resolvers for a table
 */
function createTableResolvers(
  client: SurrealDBClient,
  tableName: string
): TableResolvers {
  const db = client.getDB();

  return {
    /**
     * Select a record by ID
     * @example db.user.select('user:123')
     */
    select: async (id: string) => {
      const result = await db.select(id);
      return result;
    },

    /**
     * Create a new record
     * @example db.user.create({ name: 'John', email: 'john@example.com' })
     */
    create: async (data: Record<string, any>) => {
      const result = await db.create(tableName, data);
      return result;
    },

    /**
     * Update a record by ID
     * @example db.user.update('user:123', { name: 'Jane' })
     */
    update: async (id: string, data: Record<string, any>) => {
      const result = await db.update(id, data);
      return result;
    },

    /**
     * Delete a record by ID
     * @example db.user.delete('user:123')
     */
    delete: async (id: string) => {
      await db.delete(id);
    },

    /**
     * Execute a custom query on the table
     * @example db.user.query('SELECT * FROM user WHERE age > $age', { age: 18 })
     */
    query: async (sql: string, params?: Record<string, any>) => {
      const result = await db.query(sql, params);
      return result[0];
    }
  };
}

/**
 * Create a function-based resolver with optional Zod validation
 */
function createFunctionResolver(
  client: SurrealDBClient,
  functionDef: FunctionDefinition
): (...args: any[]) => Promise<any> {
  const db = client.getDB();
  const shouldValidate = functionDef.validate !== false;

  return async (...args: any[]): Promise<any> => {
    // Convert args array to params
    const params = args.length === 1 && typeof args[0] === 'object' ? args[0] : args[0];

    // Validate input parameters
    if (shouldValidate && functionDef.params) {
      try {
        functionDef.params.parse(params);
      } catch (error: any) {
        throw new Error(
          `[SurrealDB Function] Parameter validation failed for fn::${functionDef.name}: ${error.message}`
        );
      }
    }

    // Execute function
    const queryResult = await db.query(`fn::${functionDef.name}($params)`, { params });
    let result: any = queryResult[0];

    // Validate output
    if (shouldValidate && functionDef.returns) {
      try {
        result = functionDef.returns.parse(result);
      } catch (error: any) {
        throw new Error(
          `[SurrealDB Function] Return validation failed for fn::${functionDef.name}: ${error.message}`
        );
      }
    }

    return result;
  };
}

// ============================================================================
// Main Plugin Export
// ============================================================================

/**
 * Creates a SurrealDB plugin for dotted-json with automatic resolver generation
 *
 * @param options - SurrealDB configuration
 * @returns Plugin with resolvers and connection management
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';
 *
 * const plugin = await withSurrealDB({
 *   url: 'ws://localhost:8000/rpc',
 *   namespace: 'app',
 *   database: 'main',
 *   tables: ['user', 'post']
 * });
 *
 * const data = dotted({
 *   user: {
 *     id: 'user:123',
 *     '.profile': 'db.user.select(${user.id})'
 *   }
 * }, { resolvers: plugin.resolvers });
 *
 * const profile = await data.get('user.profile');
 *
 * // Cleanup
 * await plugin.disconnect();
 * ```
 */
export async function withSurrealDB(
  options: SurrealDBOptions
): Promise<SurrealDBPlugin> {
  // Dynamic import for optional peer dependency
  let Surreal: any;
  try {
    // @ts-ignore - Dynamic import of optional peer dependency
    const surrealdb = await import('surrealdb');
    Surreal = surrealdb.Surreal || surrealdb.default?.Surreal || surrealdb.default;
  } catch (error) {
    throw new Error(
      'SurrealDB plugin requires the "surrealdb" package. Install it with: bun add surrealdb'
    );
  }

  const client = new SurrealDBClient(options, Surreal);

  // Connect and authenticate
  await client.connect();

  // Build resolver tree
  const resolvers: Record<string, any> = {
    db: {},
    fn: {}
  };

  // Generate CRUD resolvers for each table
  if (options.tables && options.tables.length > 0) {
    for (const table of options.tables) {
      resolvers.db[table] = createTableResolvers(client, table);
    }
  }

  // Generate function-based resolvers
  if (options.functions && options.functions.length > 0) {
    for (const functionDef of options.functions) {
      resolvers.fn[functionDef.name] = createFunctionResolver(client, functionDef);
    }
  }

  // Add custom resolvers
  if (options.customResolvers) {
    for (const [name, resolver] of Object.entries(options.customResolvers)) {
      const parts = name.split('.');
      let current = resolvers;

      // Navigate/create nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]!;
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key] as Record<string, any>;
      }

      const finalKey = parts[parts.length - 1]!;

      // Handle string queries
      if (typeof resolver === 'string') {
        current[finalKey] = async (...args: any[]) => {
          const params = args.reduce((acc, val, idx) => {
            acc[`param_${idx}`] = val;
            return acc;
          }, {} as Record<string, any>);

          const result = await client.getDB().query(resolver, params);
          return result[0];
        };
      } else {
        // Handle function resolvers
        current[finalKey] = (...args: any[]) => resolver(client.getDB(), args);
      }
    }
  }

  return {
    resolvers,
    db: client.getDB(),
    disconnect: () => client.disconnect(),
    isConnected: () => client.isConnected(),
    isAuthenticated: () => client.isAuthenticated()
  };
}
