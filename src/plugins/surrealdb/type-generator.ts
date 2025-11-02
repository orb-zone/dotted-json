/**
 * SurrealDB TypeScript Type Generator
 *
 * Converts SurrealDB types to TypeScript type definitions
 *
 * @module @orb-zone/dotted-json/plugins/surrealdb/type-generator
 */

import type { FunctionMetadata } from './function-discovery.js';
import { logWarn } from '../../logger.js';

/**
 * Type generation options
 */
export interface TypeGeneratorOptions {
  /**
   * Include JSDoc comments
   * @default true
   */
  includeComments?: boolean;

  /**
   * Export style
   * @default 'named'
   */
  exportStyle?: 'named' | 'default' | 'namespace';

  /**
   * Include resolver interface
   * @default true
   */
  includeResolverInterface?: boolean;

  /**
   * Namespace name for resolver types
   * @default 'DB'
   */
  resolverNamespace?: string;
}

/**
 * Convert SurrealDB type to TypeScript type
 *
 * Mapping:
 * - string → string
 * - int, float, decimal, number → number
 * - bool → boolean
 * - datetime, duration → Date
 * - uuid → string
 * - record<T> → string (Record ID as string)
 * - array<T> → T[]
 * - option<T> → T | undefined
 * - object → Record<string, any>
 * - any → any
 *
 * @param surqlType - SurrealDB type string
 * @returns TypeScript type string
 *
 * @example
 * ```typescript
 * surqlTypeToTS('string') // → 'string'
 * surqlTypeToTS('int') // → 'number'
 * surqlTypeToTS('option<string>') // → 'string | undefined'
 * surqlTypeToTS('array<record<user>>') // → 'string[]'
 * ```
 */
export function surqlTypeToTS(surqlType: string): string {
  // Remove whitespace
  const type = surqlType.trim();

  // Handle option<T> (nullable/optional types)
  if (type.startsWith('option<') && type.endsWith('>')) {
    const innerType = type.slice(7, -1);
    return `${surqlTypeToTS(innerType)} | undefined`;
  }

  // Handle array<T>
  if (type.startsWith('array<') && type.endsWith('>')) {
    const innerType = type.slice(6, -1);
    return `${surqlTypeToTS(innerType)}[]`;
  }

  // Handle set<T> (treated same as array in TypeScript)
  if (type.startsWith('set<') && type.endsWith('>')) {
    const innerType = type.slice(4, -1);
    return `${surqlTypeToTS(innerType)}[]`;
  }

  // Handle record<table> (Record IDs)
  if (type.startsWith('record<') && type.endsWith('>')) {
    // Record IDs are strings in TypeScript
    // Could be branded type: `string & { __table: 'user' }`
    return 'string';
  }

  // Handle geometry types
  if (type.startsWith('geometry<')) {
    return 'GeoJSON.Geometry'; // Assumes GeoJSON types available
  }

  // Primitive type mapping
  switch (type.toLowerCase()) {
    // String types
    case 'string':
      return 'string';

    // Numeric types
    case 'int':
    case 'float':
    case 'decimal':
    case 'number':
      return 'number';

    // Boolean
    case 'bool':
    case 'boolean':
      return 'boolean';

    // Date/Time
    case 'datetime':
    case 'duration':
      return 'Date';

    // UUID
    case 'uuid':
      return 'string';

    // Object
    case 'object':
      return 'Record<string, any>';

    // Any/Unknown
    case 'any':
      return 'any';

    case 'null':
      return 'null';

    case 'none':
      return 'undefined';

    // Default: treat as any
    default:
      logWarn(`[type-generator] Unknown SurrealDB type: ${type}, using 'any'`);
      return 'any';
  }
}

/**
 * Generate TypeScript interface for function parameters
 *
 * @param fn - Function metadata
 * @returns TypeScript interface string
 *
 * @example
 * ```typescript
 * const fn = {
 *   name: 'fn::getProfile',
 *   resolverName: 'getProfile',
 *   params: [
 *     { name: 'userId', type: 'string', optional: false },
 *     { name: 'includePrivate', type: 'bool', optional: true }
 *   ]
 * };
 *
 * generateParameterInterface(fn);
 * // export interface GetProfileParams {
 * //   userId: string;
 * //   includePrivate?: boolean;
 * // }
 * ```
 */
export function generateParameterInterface(fn: FunctionMetadata): string {
  const interfaceName = `${pascalCase(fn.resolverName)}Params`;

  if (fn.params.length === 0) {
    return `export type ${interfaceName} = Record<string, never>;\n`;
  }

  let code = `export interface ${interfaceName} {\n`;

  for (const param of fn.params) {
    const optional = param.optional ? '?' : '';
    const tsType = surqlTypeToTS(param.type);

    code += `  ${param.name}${optional}: ${tsType};\n`;
  }

  code += '}\n';

  return code;
}

/**
 * Generate TypeScript type for function return value
 *
 * @param fn - Function metadata
 * @returns TypeScript type alias string
 */
export function generateReturnType(fn: FunctionMetadata): string {
  const typeName = `${pascalCase(fn.resolverName)}Return`;

  // If return type is explicitly defined, use it
  if (fn.returns) {
    const tsType = surqlTypeToTS(fn.returns);
    return `export type ${typeName} = ${tsType};\n`;
  }

  // Otherwise, default to any
  return `export type ${typeName} = any;\n`;
}

/**
 * Generate complete TypeScript definitions for all functions
 *
 * Creates:
 * - Parameter interfaces
 * - Return type aliases
 * - Resolver interface
 * - Complete typed API
 *
 * @param functions - Array of function metadata
 * @param options - Generation options
 * @returns Complete TypeScript code
 *
 * @example
 * ```typescript
 * const code = generateTypeDefinitions(functions, {
 *   includeComments: true,
 *   resolverNamespace: 'DB'
 * });
 *
 * await writeFile('db.generated.d.ts', code);
 * ```
 */
export function generateTypeDefinitions(
  functions: FunctionMetadata[],
  options: TypeGeneratorOptions = {}
): string {
  const {
    includeComments = true,
    includeResolverInterface = true,
    resolverNamespace = 'DB'
  } = options;

  let code = '';

  // File header
  code += '/**\n';
  code += ' * Auto-generated TypeScript types from SurrealDB functions\n';
  code += ' *\n';
  code += ' * DO NOT EDIT MANUALLY\n';
  code += ' *\n';
  code += ` * Generated: ${new Date().toISOString()}\n`;
  code += ` * Functions: ${functions.length}\n`;
  code += ' */\n\n';

  // Group functions by namespace
  const grouped = groupByNamespace(functions);

  // Generate parameter interfaces and return types
  for (const fn of functions) {
    if (includeComments && fn.comment) {
      code += `/**\n * ${fn.comment}\n */\n`;
    }

    // Parameter interface
    code += generateParameterInterface(fn);
    code += '\n';

    // Return type
    code += generateReturnType(fn);
    code += '\n';
  }

  // Generate resolver interface
  if (includeResolverInterface) {
    code += generateResolverInterface(grouped, resolverNamespace, includeComments);
  }

  return code;
}

/**
 * Generate resolver interface with all function signatures
 *
 * @param grouped - Functions grouped by namespace
 * @param namespaceName - Name for resolver namespace
 * @param includeComments - Include JSDoc comments
 * @returns TypeScript interface code
 *
 * @internal
 */
function generateResolverInterface(
  grouped: Record<string, FunctionMetadata[]>,
  namespaceName: string,
  includeComments: boolean
): string {
  let code = '';

  code += `/**\n`;
  code += ` * Type-safe resolver interface for SurrealDB functions\n`;
  code += ` *\n`;
  code += ` * @example\n`;
  code += ` * const resolvers: ${namespaceName}Resolvers = {\n`;
  code += ` *   db: {\n`;
  code += ` *     getProfile: async (params) => { ... }\n`;
  code += ` *   }\n`;
  code += ` * };\n`;
  code += ` */\n`;

  code += `export interface ${namespaceName}Resolvers {\n`;

  for (const [namespace, fns] of Object.entries(grouped)) {
    const nsName = namespace || 'db';

    code += `  ${nsName}: {\n`;

    for (const fn of fns) {
      if (includeComments && fn.comment) {
        code += `    /** ${fn.comment} */\n`;
      }

      const paramsType = `${pascalCase(fn.resolverName)}Params`;
      const returnType = `${pascalCase(fn.resolverName)}Return`;

      // Generate function signature
      if (fn.params.length === 0) {
        code += `    ${fn.resolverName}(): Promise<${returnType}>;\n`;
      } else {
        code += `    ${fn.resolverName}(params: ${paramsType}): Promise<${returnType}>;\n`;
      }
    }

    code += `  };\n`;
  }

  code += '}\n\n';

  // Add convenience type for accessing resolver functions
  code += `/** Type helper for accessing resolver return types */\n`;
  code += `export type ${namespaceName}Function<T extends keyof ${namespaceName}Resolvers['db']> = ${namespaceName}Resolvers['db'][T];\n`;

  return code;
}

/**
 * Group functions by namespace
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
    '': [] // Default namespace (db)
  };

  for (const fn of functions) {
    if (!fn.resolverName) continue;

    const parts = fn.resolverName.split('.');

    if (parts.length === 1) {
      if (!grouped['']) grouped[''] = [];
      grouped[''].push(fn);
    } else if (parts.length > 1) {
      const namespace = parts[0];
      const rest = parts.slice(1);

      if (namespace) {
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
 * Convert string to PascalCase
 *
 * @param str - Input string
 * @returns PascalCase string
 *
 * @example
 * ```typescript
 * pascalCase('getUserProfile') // → 'GetUserProfile'
 * pascalCase('user.getProfile') // → 'UserGetProfile'
 * ```
 *
 * @internal
 */
function pascalCase(str: string): string {
  return str
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Generate Zod schema code for function parameters
 *
 * Useful for runtime validation of generated types
 *
 * @param fn - Function metadata
 * @returns Zod schema code string
 *
 * @example
 * ```typescript
 * const schema = generateZodSchema(fn);
 * // export const GetProfileParamsSchema = z.object({
 * //   userId: z.string(),
 * //   includePrivate: z.boolean().optional()
 * // });
 * ```
 */
export function generateZodSchema(fn: FunctionMetadata): string {
  const schemaName = `${pascalCase(fn.resolverName)}ParamsSchema`;

  if (fn.params.length === 0) {
    return `export const ${schemaName} = z.object({});\n`;
  }

  let code = `export const ${schemaName} = z.object({\n`;

  for (const param of fn.params) {
    const zodType = surqlTypeToZod(param.type);
    const optional = param.optional ? '.optional()' : '';

    code += `  ${param.name}: ${zodType}${optional},\n`;
  }

  code += '});\n';

  return code;
}

/**
 * Convert SurrealDB type to Zod schema
 *
 * @param surqlType - SurrealDB type string
 * @returns Zod schema code
 *
 * @internal
 */
function surqlTypeToZod(surqlType: string): string {
  const type = surqlType.trim();

  // Handle option<T>
  if (type.startsWith('option<') && type.endsWith('>')) {
    const innerType = type.slice(7, -1);
    return surqlTypeToZod(innerType);
  }

  // Handle array<T>
  if (type.startsWith('array<') && type.endsWith('>')) {
    const innerType = type.slice(6, -1);
    return `z.array(${surqlTypeToZod(innerType)})`;
  }

  // Handle record<T>
  if (type.startsWith('record<')) {
    return 'z.string()'; // Record IDs are strings
  }

  // Primitive mappings
  switch (type.toLowerCase()) {
    case 'string':
    case 'uuid':
      return 'z.string()';

    case 'int':
      return 'z.number().int()';

    case 'float':
    case 'decimal':
    case 'number':
      return 'z.number()';

    case 'bool':
    case 'boolean':
      return 'z.boolean()';

    case 'datetime':
      return 'z.date()';

    case 'object':
      return 'z.record(z.any())';

    case 'any':
      return 'z.any()';

    default:
      return 'z.any()';
  }
}
