/**
 * Schema Validation & Security Module
 *
 * Provides runtime validation of JSöN schemas with security checks.
 * Helps prevent issues from misconfigured or untrusted schemas.
 *
 * @security Schemas should come from trusted sources (application code, not user input).
 * This validator provides defense-in-depth but should not be relied upon as sole protection.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration for schema validation constraints
 */
export interface ValidationConfig {
  /** Maximum depth of nested objects allowed (prevents DoS via deep nesting) */
  maxDepth?: number;

  /** Maximum number of keys per object (prevents memory exhaustion) */
  maxKeysPerObject?: number;

  /** Maximum length of string values (prevents memory exhaustion) */
  maxStringLength?: number;

  /** Maximum number of array elements (prevents memory exhaustion) */
  maxArrayLength?: number;

  /** If true, warn when circular references detected in schema */
  detectCircular?: boolean;
}

/** Default validation constraints - conservative to prevent abuse */
const DEFAULT_CONFIG: Required<ValidationConfig> = {
  maxDepth: 50,
  maxKeysPerObject: 1000,
  maxStringLength: 1_000_000,
  maxArrayLength: 10_000,
  detectCircular: true,
};

/**
 * Validates a JSöN schema object for structure, size, and security issues.
 *
 * @param schema - The schema object to validate
 * @param config - Optional validation constraints (uses defaults if not provided)
 * @returns ValidationResult with valid flag and any errors/warnings
 *
 * @example
 * ```typescript
 * const schema = { user: { name: 'John', age: 30 } };
 * const result = validateSchema(schema);
 * if (!result.valid) {
 *   throw new Error(`Invalid schema: ${result.errors.join(', ')}`);
 * }
 * ```
 *
 * @security This provides runtime validation but is not a substitute for trusting your schema source.
 * Always ensure schemas come from application code, not user input or untrusted networks.
 */
export function validateSchema(
  schema: unknown,
  config: ValidationConfig = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const finalConfig: Required<ValidationConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Basic type check
  if (schema === null || schema === undefined) {
    errors.push('Schema cannot be null or undefined');
    return { valid: false, errors, warnings };
  }

  if (typeof schema !== 'object' || Array.isArray(schema)) {
    errors.push('Schema must be a plain object, not an array or primitive');
    return { valid: false, errors, warnings };
  }

  // Track visited objects to detect circular references
  const visited = new WeakSet<object>();

  const validateValue = (
    value: unknown,
    depth: number,
    path: string,
  ): void => {
    // Check depth constraint
    if (depth > finalConfig.maxDepth) {
      errors.push(
        `Schema exceeds maximum nesting depth of ${finalConfig.maxDepth} at path "${path}"`,
      );
      return;
    }

    if (value === null || value === undefined) {
      return;
    }

    // Handle primitive types
    if (typeof value === 'string') {
      if (value.length > finalConfig.maxStringLength) {
        errors.push(
          `String at path "${path}" exceeds maximum length of ${finalConfig.maxStringLength}`,
        );
      }
      return;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        errors.push(`Non-finite number at path "${path}": ${value}`);
      }
      return;
    }

    if (typeof value === 'boolean') {
      return;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length > finalConfig.maxArrayLength) {
        errors.push(
          `Array at path "${path}" exceeds maximum length of ${finalConfig.maxArrayLength}`,
        );
      }

      value.forEach((item, index) => {
        validateValue(item, depth + 1, `${path}[${index}]`);
      });
      return;
    }

    // Handle objects
    if (typeof value === 'object') {
      if (finalConfig.detectCircular && visited.has(value)) {
        warnings.push(`Circular reference detected at path "${path}"`);
        return;
      }

      visited.add(value);

      const keys = Object.keys(value);
      if (keys.length > finalConfig.maxKeysPerObject) {
        errors.push(
          `Object at path "${path}" exceeds maximum keys of ${finalConfig.maxKeysPerObject}`,
        );
      }

      keys.forEach((key) => {
        const nextValue = (value as Record<string, unknown>)[key];
        const nextPath = path ? `${path}.${key}` : key;
        validateValue(nextValue, depth + 1, nextPath);
      });
      return;
    }

    // Functions, symbols, etc.
    if (typeof value === 'function' || typeof value === 'symbol') {
      warnings.push(
        `Non-serializable type ${typeof value} at path "${path}" may cause issues`,
      );
      return;
    }
  };

  // Start validation from root
  const rootKeys = Object.keys(schema);
  if (rootKeys.length > finalConfig.maxKeysPerObject) {
    errors.push(
      `Root object exceeds maximum keys of ${finalConfig.maxKeysPerObject}`,
    );
  }

  rootKeys.forEach((key) => {
    const value = (schema as Record<string, unknown>)[key];
    validateValue(value, 1, key);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Asserts that a schema is valid, throwing an error if not.
 *
 * @param schema - The schema object to validate
 * @param config - Optional validation constraints
 * @throws Error if schema is invalid
 *
 * @example
 * ```typescript
 * try {
 *   assertValidSchema(userSchema);
 * } catch (error) {
 *   console.error('Schema validation failed:', error.message);
 * }
 * ```
 */
export function assertValidSchema(
  schema: unknown,
  config: ValidationConfig = {},
): asserts schema is object {
  const result = validateSchema(schema, config);

  if (!result.valid) {
    const message = `Invalid schema: ${result.errors.join('; ')}`;
    const error = new Error(message);
    Object.assign(error, {
      validationErrors: result.errors,
      validationWarnings: result.warnings,
    });
    throw error;
  }

  if (result.warnings.length > 0) {
    // Log warnings but don't fail
    if (typeof globalThis !== 'undefined' && globalThis.console) {
      result.warnings.forEach((warning) => {
        if (globalThis.console?.warn) {
          globalThis.console.warn(`[JSöN Schema Warning] ${warning}`);
        }
      });
    }
  }
}
