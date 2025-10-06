/**
 * Zod Integration Plugin for dotted-json
 *
 * Provides runtime type validation using Zod schemas.
 * This is an optional plugin - Zod is a peer dependency.
 *
 * @requires zod ^3.0.0
 * @module @orbzone/dotted-json/plugins/zod
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withZod } from '@orbzone/dotted-json/plugins/zod';
 * import { z } from 'zod';
 *
 * const schemas = {
 *   paths: {
 *     'user.profile': z.object({
 *       email: z.string().email(),
 *       name: z.string()
 *     })
 *   }
 * };
 *
 * const data = dotted(schema, {
 *   resolvers,
 *   ...withZod({ schemas, mode: 'strict' })
 * });
 * ```
 */

import type { ValidationOptions } from '../types.js';

// Use dynamic import to support optional peer dependency
type ZodType = any;
type ZodError = any;

// ============================================================================
// Type Definitions
// ============================================================================

export interface ZodSchemas {
  /**
   * Path-based schemas for validating specific paths
   * @example
   * ```typescript
   * paths: {
   *   'user.profile': z.object({ name: z.string() }),
   *   'settings.theme': z.enum(['light', 'dark'])
   * }
   * ```
   */
  paths?: Record<string, ZodType>;

  /**
   * Resolver-based schemas for validating function inputs/outputs
   * @example
   * ```typescript
   * resolvers: {
   *   'db.users.findById': {
   *     input: z.tuple([z.string()]),
   *     output: z.object({ id: z.string(), name: z.string() })
   *   }
   * }
   * ```
   */
  resolvers?: Record<string, {
    input?: ZodType;
    output?: ZodType;
  }>;
}

export interface ZodOptions {
  /**
   * Zod schemas for path and resolver validation
   */
  schemas?: ZodSchemas;

  /**
   * Full data schema (validates entire object)
   */
  schema?: ZodType;

  /**
   * Validation mode
   * - 'strict': Throw on validation errors
   * - 'loose': Log errors but continue
   * - 'off': Disable validation
   * @default 'strict'
   */
  mode?: 'strict' | 'loose' | 'off';

  /**
   * Custom error handler
   * @param error - Zod validation error
   * @param path - Path where error occurred
   */
  onError?: (error: ZodError, path: string) => void;
}

/**
 * Validation error with Zod details
 */
export class ValidationError extends Error {
  constructor(
    public path: string,
    public zodError: ZodError
  ) {
    super(`Validation failed at ${path}`);
    this.name = 'ValidationError';
  }

  /**
   * Get formatted error details
   */
  format(): Record<string, any> {
    return this.zodError.format();
  }
}

// ============================================================================
// Zod Plugin Implementation
// ============================================================================

/**
 * Creates validation options for dotted-json from Zod schemas
 *
 * @param options - Zod plugin configuration
 * @returns Plugin options with validation configured
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withZod } from '@orbzone/dotted-json/plugins/zod';
 * import { z } from 'zod';
 *
 * const UserSchema = z.object({
 *   id: z.string(),
 *   email: z.string().email(),
 *   name: z.string()
 * });
 *
 * const data = dotted({
 *   user: {
 *     id: '123',
 *     '.profile': 'api.getUser(${user.id})'
 *   }
 * }, {
 *   resolvers: {
 *     api: { getUser: async (id) => fetchUser(id) }
 *   },
 *   ...withZod({
 *     schemas: {
 *       paths: {
 *         'user.profile': UserSchema
 *       }
 *     },
 *     mode: 'strict'
 *   })
 * });
 *
 * // Validation happens automatically
 * const profile = await data.get('user.profile'); // Validated!
 * ```
 */
export function withZod(options: ZodOptions): { validation: ValidationOptions } {
  const {
    schemas,
    schema: fullSchema,
    mode = 'strict',
    onError
  } = options;

  // Build path validators
  const pathValidators = new Map<string, ZodType>();
  if (schemas?.paths) {
    Object.entries(schemas.paths).forEach(([path, schema]) => {
      pathValidators.set(path, schema);
    });
  }

  // Build resolver validators
  const resolverValidators = new Map<string, {
    input?: ZodType;
    output?: ZodType;
  }>();
  if (schemas?.resolvers) {
    Object.entries(schemas.resolvers).forEach(([name, validators]) => {
      resolverValidators.set(name, validators);
    });
  }

  /**
   * Validates a value at a specific path
   */
  function validate(path: string, value: any): any {
    if (mode === 'off') {
      return value;
    }

    // Try path-specific validator first
    const pathValidator = pathValidators.get(path);
    if (pathValidator) {
      return validateWithSchema(pathValidator, value, path);
    }

    // Try full schema validation
    if (fullSchema) {
      // Extract value at path from full schema
      return validateWithSchema(fullSchema, value, path);
    }

    // No validation configured for this path
    return value;
  }

  /**
   * Validates resolver input/output
   */
  function validateResolver(name: string, input: any[], output: any): any {
    if (mode === 'off') {
      return output;
    }

    const validators = resolverValidators.get(name);
    if (!validators) {
      return output;
    }

    // Validate input
    if (validators.input) {
      const inputResult = validators.input.safeParse(input);
      if (!inputResult.success) {
        handleValidationError(inputResult.error, `${name}(input)`);
      }
    }

    // Validate output
    if (validators.output) {
      return validateWithSchema(validators.output, output, `${name}(output)`);
    }

    return output;
  }

  /**
   * Validates value against schema
   */
  function validateWithSchema(schema: ZodType, value: any, path: string): any {
    const result = schema.safeParse(value);

    if (!result.success) {
      handleValidationError(result.error, path);

      // In loose mode, return original value despite error
      if (mode === 'loose') {
        return value;
      }

      // In strict mode, throw
      throw new ValidationError(path, result.error);
    }

    return result.data;
  }

  /**
   * Handles validation errors based on mode
   */
  function handleValidationError(error: ZodError, path: string): void {
    if (onError) {
      onError(error, path);
    } else {
      console.error(`[dotted-json] Validation error at ${path}:`, error.format());
    }
  }

  return {
    validation: {
      enabled: mode !== 'off',
      validate,
      validateResolver
    }
  };
}
