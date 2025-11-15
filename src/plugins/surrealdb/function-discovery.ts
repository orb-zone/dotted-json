/**
 * SurrealDB Function Discovery
 *
 * Auto-discovers custom functions from SurrealDB using INFO FOR DATABASE
 * and generates metadata for resolver/type generation.
 *
 * @module @orb-zone/dotted-json/plugins/surrealdb/function-discovery
 */

import { logWarn, logError } from '../../logger.js';

/**
 * Function parameter metadata
 */
export interface Parameter {
  /**
   * Parameter name (without $ prefix)
   * @example "userId", "limit", "data"
   */
  name: string;

  /**
   * SurrealDB type
   * @example "string", "int", "option<string>", "record<user>"
   */
  type: string;

  /**
   * Whether parameter is optional
   */
  optional: boolean;
}

/**
 * Function metadata extracted from SurrealDB
 */
export interface FunctionMetadata {
  /**
   * Full function name with fn:: prefix
   * @example "fn::getProfile", "fn::updateUser"
   */
  name: string;

  /**
   * Function name without fn:: prefix (used for resolvers)
   * @example "getProfile", "updateUser"
   */
  resolverName: string;

  /**
   * Function parameters
   */
  params: Parameter[];

  /**
   * Return type (if explicitly defined)
   * @example "record<user>", "array<order>", "object"
   */
  returns?: string;

  /**
   * Full function definition (for debugging)
   */
  definition: string;

  /**
   * Function comment/documentation (if available)
   */
  comment?: string;
}

/**
 * Discover all custom functions from connected SurrealDB database
 *
 * Uses INFO FOR DATABASE to introspect function definitions
 *
 * @param db - Connected Surreal instance
 * @returns Array of function metadata
 *
 * @example
 * ```typescript
 * const functions = await discoverFunctions(db);
 * // [
 * //   {
 * //     name: 'fn::getProfile',
 * //     resolverName: 'getProfile',
 * //     params: [{ name: 'userId', type: 'string', optional: false }],
 * //     definition: '...'
 * //   }
 * // ]
 * ```
 */
export async function discoverFunctions(db: any): Promise<FunctionMetadata[]> {
  try {
    // Query database info
    const result = await db.query('INFO FOR DATABASE');

    if (!result || !result[0]) {
      return [];
    }

    const dbInfo = result[0];

    // Extract functions object from INFO result
    // Format varies by SurrealDB version, try different keys
    const functionsObj =
      dbInfo.functions ||
      dbInfo.fn ||
      (typeof dbInfo === 'object' && 'fn' in dbInfo ? dbInfo.fn : null);

    if (!functionsObj || typeof functionsObj !== 'object') {
      return [];
    }

    const functions: FunctionMetadata[] = [];

    // Parse each function definition
    for (const [fnName, fnDef] of Object.entries(functionsObj)) {
      try {
        const metadata = parseFunctionDefinition(fnName, fnDef as string);
        functions.push(metadata);
      } catch (error) {
        logWarn(`[surrealdb] Failed to parse function ${fnName}:`, { error: String(error) });
        // Continue with other functions
      }
    }

    return functions;
  } catch (error) {
    logError('[surrealdb] Failed to discover functions:', { error: String(error) });
    return [];
  }
}

/**
 * Parse function definition string into metadata
 *
 * Handles SurrealQL DEFINE FUNCTION syntax:
 * - DEFINE FUNCTION fn::name($param: type) { ... }
 * - DEFINE FUNCTION fn::name($param: type, $param2: type) -> type { ... }
 *
 * @param name - Function name (e.g., "fn::getProfile")
 * @param definition - Full DEFINE FUNCTION statement
 * @returns Parsed function metadata
 *
 * @internal
 */
export function parseFunctionDefinition(
  name: string,
  definition: string
): FunctionMetadata {
  const resolverName = name.replace(/^fn::/, '');

  // Extract parameters from function signature
  // Pattern: $paramName: type
  const params = extractParameters(definition);

  // Extract return type (if explicitly defined)
  // Pattern: -> type or RETURNS type
  const returns = extractReturnType(definition);

  // Extract comment (if present)
  // Pattern: -- Comment text
  const comment = extractComment(definition);

  return {
    name,
    resolverName,
    params,
    returns,
    definition,
    comment
  };
}

/**
 * Extract parameters from function definition
 *
 * Matches patterns like:
 * - $userId: string
 * - $limit: int
 * - $data: option<object>
 * - $productId: record<product>
 *
 * @param definition - Function definition string
 * @returns Array of parameter metadata
 *
 * @internal
 */
function extractParameters(definition: string): Parameter[] {
  const params: Parameter[] = [];

  // Match all $paramName: type patterns
  // Regex: \$(\w+)\s*:\s*([a-zA-Z0-9_<>[\]]+)
  const paramRegex = /\$(\w+)\s*:\s*([a-zA-Z0-9_<>[\]]+)/g;

  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(definition)) !== null) {
    const [, name, type] = match;

    // Check if type is optional (option<T>)
    const optional = type?.startsWith('option<') || false;

    // Extract inner type if optional
    const actualType = optional
      ? type?.match(/option<(.+)>/)?.[1] || type
      : type;

    if (name && actualType) {
      params.push({
        name,
        type: actualType,
        optional
      });
    }
  }

  return params;
}

/**
 * Extract return type from function definition
 *
 * Matches patterns like:
 * - ) -> type {
 * - ) RETURNS type {
 *
 * @param definition - Function definition string
 * @returns Return type or undefined
 *
 * @internal
 */
function extractReturnType(definition: string): string | undefined {
  // Try arrow syntax: ) -> type {
  const arrowMatch = definition.match(/\)\s*->\s*([a-zA-Z0-9_<>[\]]+)\s*\{/);
  if (arrowMatch) {
    return arrowMatch[1];
  }

  // Try RETURNS keyword: ) RETURNS type {
  const returnsMatch = definition.match(
    /\)\s*RETURNS\s+([a-zA-Z0-9_<>[\]]+)\s*\{/i
  );
  if (returnsMatch) {
    return returnsMatch[1];
  }

  return undefined;
}

/**
 * Extract comment from function definition
 *
 * Looks for comment before DEFINE statement:
 * -- This is a comment
 * DEFINE FUNCTION ...
 *
 * @param definition - Function definition string
 * @returns Comment text or undefined
 *
 * @internal
 */
function extractComment(definition: string): string | undefined {
  // Match SQL comment(s) before DEFINE statement
  // Look for the last substantive comment (not just separator lines)
  const lines = definition.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    if (currentLine && currentLine.trim().toUpperCase().startsWith('DEFINE FUNCTION')) {
      // Found DEFINE line, look backwards for comment
      for (let j = i - 1; j >= 0; j--) {
        const line = lines[j]?.trim() || '';

        // Skip empty lines and separator comments (====)
        if (!line || line.match(/^--\s*={3,}/)) {
          continue;
        }

        // Found a substantive comment
        if (line.startsWith('--')) {
          return line.replace(/^--\s*/, '').trim();
        }

        // Stop if we hit non-comment content
        break;
      }
      break;
    }
  }

  return undefined;
}

/**
 * Parse function definitions from .surql schema file
 *
 * Alternative to runtime discovery when schema file is available
 *
 * @param schemaContent - Contents of .surql file
 * @returns Array of function metadata
 *
 * @example
 * ```typescript
 * const schema = await readFile('./schema.surql', 'utf-8');
 * const functions = parseFunctionsFromSchema(schema);
 * ```
 */
export function parseFunctionsFromSchema(
  schemaContent: string
): FunctionMetadata[] {
  const functions: FunctionMetadata[] = [];

  // Split by DEFINE FUNCTION statements
  const functionStatements = schemaContent.split(/(?=DEFINE FUNCTION)/gi);

  for (const statement of functionStatements) {
    if (!statement.trim().startsWith('DEFINE FUNCTION')) {
      continue;
    }

    try {
      // Extract function name
      const nameMatch = statement.match(/DEFINE FUNCTION\s+(fn::\w+)/i);
      if (!nameMatch) continue;

      const name = nameMatch[1];
      if (name) {
        const metadata = parseFunctionDefinition(name, statement);
        functions.push(metadata);
      }
    } catch (error) {
      logWarn('[surrealdb] Failed to parse function from schema:', { error: String(error) });
    }
  }

  return functions;
}

/**
 * Validate function metadata
 *
 * Ensures function has valid name and parameters
 *
 * @param fn - Function metadata to validate
 * @returns true if valid, false otherwise
 */
export function validateFunctionMetadata(fn: FunctionMetadata): boolean {
  // Must have name starting with fn::
  if (!fn.name || !fn.name.startsWith('fn::')) {
    return false;
  }

  // Must have resolverName (name without prefix)
  if (!fn.resolverName || fn.resolverName.length === 0) {
    return false;
  }

  // Parameters must be array (can be empty)
  if (!Array.isArray(fn.params)) {
    return false;
  }

  // Each parameter must have name and type
  for (const param of fn.params) {
    if (!param.name || !param.type) {
      return false;
    }
  }

  return true;
}

/**
 * Group functions by namespace
 *
 * Organizes functions into nested object by namespace prefix
 *
 * @param functions - Array of function metadata
 * @returns Nested object of functions by namespace
 *
 * @example
 * ```typescript
 * const functions = [
 *   { resolverName: 'user.getProfile', ... },
 *   { resolverName: 'user.updateProfile', ... },
 *   { resolverName: 'order.getActive', ... }
 * ];
 *
 * const grouped = groupFunctionsByNamespace(functions);
 * // {
 * //   user: {
 * //     getProfile: { ... },
 * //     updateProfile: { ... }
 * //   },
 * //   order: {
 * //     getActive: { ... }
 * //   }
 * // }
 * ```
 */
export function groupFunctionsByNamespace(
  functions: FunctionMetadata[]
): Record<string, Record<string, FunctionMetadata>> {
  const grouped: Record<string, Record<string, FunctionMetadata>> = {};

  for (const fn of functions) {
    // Check if function name contains namespace (e.g., "user.getProfile")
    const parts = fn.resolverName?.split('.') || [];

    if (parts.length === 1) {
      // No namespace, use 'db' as default
      if (!grouped.db) grouped.db = {};
      if (fn.resolverName) {
        grouped.db[fn.resolverName] = fn;
      }
    } else if (parts.length > 1) {
      // Has namespace
      const namespace = parts[0];
      const fnName = parts.slice(1).join('.');

      if (namespace && fnName) {
        if (!grouped[namespace]) grouped[namespace] = {};
        grouped[namespace][fnName] = fn;
      }
    }
  }

  return grouped;
}
