/**
 * SurrealDB Resolver Generator
 *
 * Auto-generates dotted-json resolvers from function metadata
 *
 * @module @orb-zone/dotted-json/plugins/surrealdb/resolver-generator
 */

import type { FunctionMetadata } from './function-discovery.js';

/**
 * Options for resolver generation
 */
export interface ResolverGeneratorOptions {
  /**
   * Namespace for resolvers
   * @default 'db'
   */
  namespace?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error, functionName: string, args: any[]) => void;

  /**
   * Result transformer
   * Applied to function results before returning
   */
  transformResult?: (result: any, functionName: string) => any;
}

/**
 * Generate resolver functions from function metadata
 *
 * Creates async functions that:
 * 1. Accept typed parameters
 * 2. Execute SurrealDB function via query
 * 3. Extract and return result
 * 4. Handle errors gracefully
 *
 * @param db - Connected Surreal instance
 * @param functions - Array of function metadata
 * @param options - Generator options
 * @returns Nested object of resolver functions
 *
 * @example
 * ```typescript
 * const functions = await discoverFunctions(db);
 * const resolvers = generateFunctionResolvers(db, functions);
 *
 * // Usage in dotted-json
 * const data = dotted({
 *   userId: 'user:alice',
 *   '.profile': 'db.getProfile(${userId})'
 * }, { resolvers });
 * ```
 */
export function generateFunctionResolvers(
  db: any,
  functions: FunctionMetadata[],
  options: ResolverGeneratorOptions = {}
): Record<string, any> {
  const {
    namespace = 'db',
    debug = false,
    onError,
    transformResult
  } = options;

  const resolvers: Record<string, any> = {};

  // Group functions by namespace
  const grouped = groupByNamespace(functions);

  for (const [ns, fns] of Object.entries(grouped)) {
    const nsName = ns || namespace;

    if (!resolvers[nsName]) {
      resolvers[nsName] = {};
    }

    for (const fn of fns) {
      // Generate resolver function
      resolvers[nsName][fn.resolverName] = createResolverFunction(
        db,
        fn,
        { debug, onError, transformResult }
      );

      // Attach metadata for introspection
      Object.defineProperty(resolvers[nsName][fn.resolverName], '_metadata', {
        value: fn,
        enumerable: false,
        writable: false
      });
    }
  }

  return resolvers;
}

/**
 * Create individual resolver function
 *
 * @param db - Surreal instance
 * @param fn - Function metadata
 * @param options - Options
 * @returns Async resolver function
 *
 * @internal
 */
function createResolverFunction(
  db: any,
  fn: FunctionMetadata,
  options: Pick<ResolverGeneratorOptions, 'debug' | 'onError' | 'transformResult'>
): (...args: any[]) => Promise<any> {
  return async function resolverFunction(...args: any[]): Promise<any> {
    try {
      if (options.debug) {
        console.log(`[surrealdb] Calling ${fn.name} with args:`, args);
      }

      // Build parameter mapping
      const params: Record<string, any> = {};
      fn.params.forEach((param, index) => {
        params[param.name] = args[index];
      });

      // Build SurrealQL query
      const paramPlaceholders = fn.params
        .map(p => `$${p.name}`)
        .join(', ');

      const query = `SELECT * FROM ${fn.name}(${paramPlaceholders})`;

      if (options.debug) {
        console.log(`[surrealdb] Query: ${query}`, params);
      }

      // Execute function via SurrealDB
      const result = await db.query(query, params);

      // Extract result
      // SurrealDB returns: [[result]] or [result] or result
      let extracted = result;

      // Unwrap nested arrays
      if (Array.isArray(extracted) && extracted.length > 0) {
        extracted = extracted[0];
      }

      if (Array.isArray(extracted) && extracted.length > 0) {
        extracted = extracted[0];
      }

      if (options.debug) {
        console.log(`[surrealdb] Result from ${fn.name}:`, extracted);
      }

      // Apply custom transformer if provided
      if (options.transformResult) {
        extracted = options.transformResult(extracted, fn.resolverName);
      }

      return extracted;
    } catch (error) {
      if (options.onError) {
        options.onError(error as Error, fn.resolverName, args);
      }

      throw new Error(
        `Failed to execute ${fn.name}: ${error instanceof Error ? error.message : error}`
      );
    }
  };
}

/**
 * Group functions by namespace
 *
 * Extracts namespace from resolver name (e.g., "user.getProfile" -> "user")
 *
 * @param functions - Array of function metadata
 * @returns Grouped functions
 *
 * @internal
 */
function groupByNamespace(
  functions: FunctionMetadata[]
): Record<string, FunctionMetadata[]> {
  const grouped: Record<string, FunctionMetadata[]> = {
    '': [] // Default namespace
  };

  for (const fn of functions) {
    if (!fn.resolverName) continue;

    // Check if resolver name has namespace prefix
    const parts = fn.resolverName.split('.');

    if (parts.length === 1) {
      // No namespace
      if (!grouped['']) grouped[''] = [];
      grouped[''].push(fn);
    } else if (parts.length > 1) {
      // Has namespace
      const namespace = parts[0];
      const rest = parts.slice(1);

      if (namespace) {
        // Create new function metadata with namespace-stripped name
        const namespacedFn: FunctionMetadata = {
          ...fn,
          resolverName: rest.join('.')
        };

        if (!grouped[namespace]) {
          grouped[namespace] = [];
        }

        grouped[namespace].push(namespacedFn);
      }
    }
  }

  return grouped;
}

/**
 * Generate resolver documentation
 *
 * Creates markdown documentation for all generated resolvers
 *
 * @param functions - Array of function metadata
 * @returns Markdown documentation string
 *
 * @example
 * ```typescript
 * const docs = generateResolverDocs(functions);
 * await writeFile('RESOLVERS.md', docs);
 * ```
 */
export function generateResolverDocs(functions: FunctionMetadata[]): string {
  let docs = '# Auto-Generated Resolvers\n\n';
  docs += `Generated from ${functions.length} SurrealDB functions.\n\n`;

  // Group by namespace
  const grouped = groupByNamespace(functions);

  for (const [namespace, fns] of Object.entries(grouped)) {
    const nsName = namespace || 'db';

    docs += `## \`${nsName}\` namespace\n\n`;

    for (const fn of fns) {
      docs += `### \`${nsName}.${fn.resolverName}\`\n\n`;

      if (fn.comment) {
        docs += `${fn.comment}\n\n`;
      }

      // Parameters
      docs += '**Parameters:**\n\n';
      if (fn.params.length === 0) {
        docs += '- None\n\n';
      } else {
        for (const param of fn.params) {
          const optional = param.optional ? ' (optional)' : '';
          docs += `- \`${param.name}\`: \`${param.type}\`${optional}\n`;
        }
        docs += '\n';
      }

      // Returns
      if (fn.returns) {
        docs += `**Returns:** \`${fn.returns}\`\n\n`;
      }

      // Usage example
      docs += '**Usage:**\n\n';
      docs += '```typescript\n';

      const paramList = fn.params.map(p => `\${${p.name}}`).join(', ');
      docs += `'.result': '${nsName}.${fn.resolverName}(${paramList})'\n`;
      docs += '```\n\n';

      docs += '---\n\n';
    }
  }

  return docs;
}

/**
 * Get resolver function metadata
 *
 * Extracts attached metadata from generated resolver
 *
 * @param resolver - Generated resolver function
 * @returns Function metadata or undefined
 *
 * @example
 * ```typescript
 * const metadata = getResolverMetadata(resolvers.db.getProfile);
 * console.log(metadata.params); // [{ name: 'userId', type: 'string', ... }]
 * ```
 */
export function getResolverMetadata(
  resolver: Function
): FunctionMetadata | undefined {
  return (resolver as any)._metadata;
}

/**
 * List all available resolvers
 *
 * Extracts all resolver names from generated resolver object
 *
 * @param resolvers - Generated resolvers object
 * @returns Array of resolver paths
 *
 * @example
 * ```typescript
 * const paths = listResolvers(resolvers);
 * // ['db.getProfile', 'db.updateProfile', 'order.getActive']
 * ```
 */
export function listResolvers(resolvers: Record<string, any>): string[] {
  const paths: string[] = [];

  function walk(obj: any, prefix: string = ''): void {
    for (const key in obj) {
      const value = obj[key];

      if (typeof value === 'function') {
        paths.push(prefix ? `${prefix}.${key}` : key);
      } else if (typeof value === 'object' && value !== null) {
        walk(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  walk(resolvers);
  return paths;
}
