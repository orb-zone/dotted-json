/**
 * Type definitions for dotted-json
 *
 * @module @orb-zone/dotted-json/types
 */

/**
 * Variant context for localization and conditional content
 *
 * @example
 * ```typescript
 * {
 *   lang: 'es-MX',      // Language/locale (well-known)
 *   gender: 'f',        // Gender for pronouns (well-known: m/f/x)
 *   form: 'formal',     // Formality level (well-known)
 *   dialect: 'surfer',  // Custom dimension: regional dialect
 *   source: 'aws'       // Custom dimension: translation source
 * }
 * ```
 */
export interface VariantContext {
  /**
   * Language/locale code (ISO 639-1, e.g., 'en', 'es', 'es-MX')
   */
  lang?: string;

  /**
   * Gender for pronoun resolution ('m' | 'f' | 'x')
   */
  gender?: 'm' | 'f' | 'x';

  /**
   * Formality/honorific level (e.g., 'casual', 'informal', 'polite', 'formal', 'honorific')
   *
   * Common in languages with grammatical register like Japanese (keigo),
   * Korean (jondaemal), German (Sie/du), etc.
   */
  form?: string;

  /**
   * Custom variant dimensions (dialect, tone, source, etc.)
   */
  [dimension: string]: string | undefined;
}

export interface DottedOptions {
  /**
   * Initial data to merge with schema
   */
  initial?: Record<string, any>;

  /**
   * Fallback value for missing paths or expression errors
   * 
   * Can be a static value or a function (for lazy evaluation).
   * Functions are called each time a fallback is needed.
   * 
   * Used when:
   * - A path doesn't exist in the data
   * - An expression evaluation fails and onError returns 'fallback'
   * 
   * @example
   * ```typescript
   * // Static fallback
   * const data = dotted(schema, {
   *   fallback: null  // Return null for missing/failed values
   * });
   * 
   * // Dynamic fallback (called on each miss)
   * const data = dotted(schema, {
   *   fallback: () => ({ timestamp: Date.now() })
   * });
   * ```
   */
  fallback?: any | (() => any) | (() => Promise<any>);

  /**
   * Function registry for expression resolvers
   */
  resolvers?: Record<string, any>;

  /**
   * Maximum evaluation depth to prevent infinite recursion (default: 100)
   * @constitution Principle VI - Cycle Detection and Safeguards
   */
  maxEvaluationDepth?: number;

  /**
   * Variant context for localization and conditional content
   *
   * Well-known variants: lang, gender
   * Custom variants: any string dimension (dialect, source, tone, etc.)
   *
   * @example
   * ```typescript
   * variants: {
   *   lang: 'es',
   *   gender: 'f',
   *   register: 'formal'
   * }
   * ```
   */
  variants?: VariantContext;

  /**
   * Validation options for runtime type checking
   * Provided by plugins like @orb-zone/dotted-json/plugins/zod
   *
   * @example
   * ```typescript
   * import { withZod } from '@orb-zone/dotted-json/plugins/zod'
   *
   * const data = dotted(schema, {
   *   ...withZod({ schemas, mode: 'strict' })
   * })
   * ```
   */
  validation?: ValidationOptions;

  /**
   * Custom error handler for expression evaluation failures
   *
   * Return values:
   * - `'throw'` - Re-throw the error (fail-fast)
   * - `'fallback'` - Use the fallback value
   * - Any other value - Use that value as the result
   *
   * @param error - The error that occurred
   * @param path - The path where the error occurred
   * @returns 'throw' | 'fallback' | any custom value
   *
   * @example
   * ```typescript
   * // Fail-fast in development, graceful in production
   * onError: (error, path) => {
   *   if (process.env.NODE_ENV === 'development') {
   *     return 'throw';  // Re-throw error
   *   }
   *   logger.error(`Failed to evaluate ${path}`, error);
   *   return 'fallback';  // Use fallback value
   * }
   * 
   * // Return custom fallback per path
   * onError: (error, path) => {
   *   if (path.startsWith('user.')) return { name: 'Guest' };
   *   return 'fallback';
   * }
   * ```
   */
  onError?: (error: Error, path: string) => 'throw' | 'fallback' | any;


}

/**
 * Validation options provided by validation plugins (e.g., Zod)
 */
export interface ValidationOptions {
  /**
   * Whether validation is enabled
   */
  enabled: boolean;

  /**
   * Validates a value at a specific path
   * @param path - Dot-separated path being validated
   * @param value - Value to validate
   * @returns Validated/transformed value
   */
  validate: (path: string, value: any) => any;

  /**
   * Validates resolver input and output
   * @param name - Resolver function name
   * @param input - Input arguments array
   * @param output - Output value from resolver
   * @returns Validated/transformed output
   */
  validateResolver?: (name: string, input: any[], output: any) => any;
}

export interface GetOptions {
  /**
   * Force re-evaluation of the expression
   * 
   * When true, bypasses the cache and re-evaluates the expression,
   * then caches the new result for future calls.
   * 
   * Useful for:
   * - Getting fresh data from resolvers that might return different values
   * - Testing expression behavior
   * - Manual cache invalidation
   * 
   * @example
   * ```typescript
   * // Get cached value
   * const cached = await data.get('timestamp');
   * 
   * // Get fresh value (re-evaluate)
   * const fresh = await data.get('timestamp', { fresh: true });
   * 
   * // Subsequent calls use the new cached value
   * const newCached = await data.get('timestamp');  // Uses fresh result
   * ```
   */
  fresh?: boolean;

  /**
   * Override the instance-level fallback for this call only
   * 
   * Can be a static value or a function (for lazy evaluation).
   * 
   * @example
   * ```typescript
   * // Instance fallback is null
   * const data = dotted(schema, { fallback: null });
   * 
   * // Override for specific call with static value
   * const value = await data.get('missing.path', { fallback: 'N/A' });
   * 
   * // Override with dynamic value
   * const value = await data.get('cache.key', { 
   *   fallback: () => generateDefault() 
   * });
   * ```
   */
  fallback?: any | (() => any) | (() => Promise<any>);
}

export interface SetOptions {
  /**
   * Re-evaluate expressions that reference this path
   */
  triggerDependents?: boolean;
}

export interface HasOptions {
  /**
   * Force re-evaluation to check existence
   * 
   * When true, re-evaluates expressions before checking if the path exists.
   */
  fresh?: boolean;
}

export interface DottedJson {
  /**
   * Get value at path, evaluating dot-prefixed expressions as needed
   */
  get(path: string, options?: GetOptions): Promise<any>;

  /**
   * Set value at path. May trigger re-evaluation of dependent expressions.
   */
  set(path: string, value: any, options?: SetOptions): Promise<void>;

  /**
   * Check if path exists, evaluating expressions as needed
   */
  has(path: string, options?: HasOptions): Promise<boolean>;
}

export type ExpressionResolver = (...args: any[]) => any | Promise<any>;

export interface ResolverContext {
  [key: string]: any | ExpressionResolver;
}

export interface ExpressionContext {
  data: Record<string, any>;
  resolvers: ResolverContext;
  path: string[];
  variants?: VariantContext;  // Variant context for pronoun resolution
  error?: Error; // Available in .errorDefault expressions
  options?: DottedOptions;  // Options for error handling and other configuration
}
