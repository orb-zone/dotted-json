/**
 * Type definitions for dotted-json
 *
 * @module @orbzone/dotted-json/types
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
   * Default value for missing values (fallback when path not found)
   */
  default?: any;

  /**
   * Default value for evaluation errors (fallback when expression fails)
   */
  errorDefault?: any;

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
}

export interface GetOptions {
  /**
   * Force re-evaluation even if cached
   */
  ignoreCache?: boolean;

  /**
   * Override instance default for missing values
   */
  default?: any;

  /**
   * Override instance errorDefault for errors
   */
  errorDefault?: any;
}

export interface SetOptions {
  /**
   * Re-evaluate expressions that reference this path
   */
  triggerDependents?: boolean;
}

export interface HasOptions {
  /**
   * Force evaluation to check existence
   */
  ignoreCache?: boolean;
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
}
