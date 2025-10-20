import { getProperty as dotGet, setProperty as dotSet, hasProperty as dotHas } from 'dot-prop';
import { ExpressionEvaluator, createExpressionEvaluator } from './expression-evaluator.js';
import { resolveVariantPath, getAvailablePaths } from './variant-resolver.js';
import type {
  DottedOptions,
  GetOptions,
  SetOptions,
  HasOptions,
  VariantContext,
  DottedJson as IDottedJson,
} from './types.js';

const VARIABLE_REFERENCE_PATTERN = /(?:\.{1,}[a-zA-Z_$][a-zA-Z0-9_$.]*|[a-zA-Z_$][a-zA-Z0-9_$.]*)(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/g;

const DEFAULT_MAX_DEPTH = 100;

export class DottedJson implements IDottedJson {
  private schema: Record<string, any>;
  public data: Record<string, any>;  // Public for Proxy access
  private cache: Map<string, any> = new Map();
  private options: Required<Omit<DottedOptions, 'validation'>> & Pick<DottedOptions, 'validation'>;
  private evaluationStack: Set<string> = new Set();
  private evaluationDepth = 0;
  private availablePaths: string[] = [];

  constructor(schema: Record<string, any>, options: DottedOptions = {}) {
    this.schema = structuredClone(schema);
    
    // Backward compatibility: support old 'default' and 'errorDefault' as 'fallback'
    const fallback = options.fallback !== undefined 
      ? options.fallback 
      : ((options as any).errorDefault !== undefined 
          ? (options as any).errorDefault 
          : (options as any).default);  // Support legacy options
    
    this.options = {
      initial: options.initial || {},
      fallback,
      resolvers: options.resolvers || {},
      maxEvaluationDepth: options.maxEvaluationDepth ?? DEFAULT_MAX_DEPTH,
      validation: options.validation,
      onError: options.onError
    } as any;

    // Merge schema with initial data
    this.data = this.mergeData(this.schema, this.options.initial);

    // Cache available paths for variant resolution
    this.updateAvailablePaths();
  }

  /**
   * Update cached list of available property paths
   * Called after data changes
   */
  private updateAvailablePaths(): void {
    this.availablePaths = getAvailablePaths(this.data);
  }



  async get(path: string, options: GetOptions = {}): Promise<any> {
    try {
      // Resolve variant path based on context (e.g., .bio → .bio:es:f)
      const resolvedPath = await this.resolveVariant(path);

      const fresh = options.fresh;
      
      // Backward compatibility: support old 'default' as 'fallback'
      const fallback = options.fallback !== undefined 
        ? options.fallback 
        : (options as any).default;

      // Check if this path contains a fresh expression that should be re-evaluated
      const escapedPath = resolvedPath.startsWith('.') ? `\\${resolvedPath}` : `\\.${resolvedPath}`;
      const expression = dotGet(this.data, escapedPath);
      const hasFreshCalls = typeof expression === 'string' && /fresh\s*\(/.test(expression);

      // Check if we need to evaluate any dot-prefixed expressions along the path
      await this.evaluateExpressionsInPath(resolvedPath, fresh || hasFreshCalls);

      // Handle leading dot (expression prefix) - actual data is stored without the dot
      const actualPath = resolvedPath.startsWith('.') ? resolvedPath.substring(1) : resolvedPath;

      // Get the value using dot-prop
      let result = dotGet(this.data, actualPath);

      // If value exists, validate it if validation is configured
      if (result !== undefined) {
        // Apply validation if enabled
        if (this.options.validation?.enabled) {
          result = this.options.validation.validate(path, result);
        }
        return result;
      }

      // Value is missing - return fallback
      return this.resolveFallback(fallback);

    } catch (_error) {
      // Handle error using onError or fallback
      return this.handleError(_error as Error, path, options.fallback || (options as any).default);
    }
  }

  async set(path: string, value: any, _options: SetOptions = {}): Promise<void> {
    // Validate key is not reserved
    this.validateKey(path);

    // If path starts with a dot (expression key), we need to escape it for dot-prop
    // because dot-prop treats leading dots as path separators
    let escapedPath = path;
    let materializedPath: string | null = null;

    if (path.startsWith('.')) {
      // Escape the leading dot: .greeting -> \.greeting
      escapedPath = '\\' + path;
      // Track the materialized path (without the dot)
      materializedPath = path.substring(1);
    }

    dotSet(this.data, escapedPath, value);

      // If setting an expression key, clear the materialized value
      if (materializedPath) {
        // Delete the materialized value
        if (dotHas(this.data, materializedPath)) {
          const pathParts = materializedPath.split('.');
          const parentPath = pathParts.slice(0, -1).join('.');
          const key = pathParts[pathParts.length - 1];

          if (parentPath) {
            const parent = dotGet(this.data, parentPath);
            if (parent && typeof parent === 'object' && key) {
              delete parent[key];
            }
          } else if (key) {
            delete this.data[key];
          }
        }
      }

    // Clear cache since data changed
    this.cache.clear();
    
    // Clear all materialized expression values (simple invalidation strategy)
    // This ensures that expressions depending on the changed value are re-evaluated
    this.clearMaterializedValues(this.data);
  }

  /**
   * Clear materialized expression values from data
   * A value is considered materialized if there exists a corresponding dot-prefixed expression key
   */
  private clearMaterializedValues(obj: any, prefix = ''): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      if (key.startsWith('.') || key.startsWith('\\')) {
        // This is an expression key, check if there's a materialized value
        const expressionKey = key.startsWith('\\') ? key.substring(1) : key;
        const materializedKey = expressionKey.startsWith('.') ? expressionKey.substring(1) : expressionKey;
        
        if (materializedKey in obj) {
          delete obj[materializedKey];
        }
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        // Recursively clear nested objects
        const nestedPrefix = prefix ? `${prefix}.${key}` : key;
        this.clearMaterializedValues(obj[key], nestedPrefix);
      }
    }
  }

  /**
   * Validate that a key name is not reserved
   * Reserved keys are method names that would conflict with the DottedJson API
   *
   * @param path - The path/key to validate
   * @throws {Error} If key is reserved
   */
  private validateKey(path: string): void {
    const RESERVED_KEYS = ['get', 'set', 'has', 'delete', 'clear', 'keys'];

    // Extract the final key from the path (e.g., "user.name" → "name")
    const finalKey = path.includes('.') ? path.split('.').pop()! : path;

    if (RESERVED_KEYS.includes(finalKey)) {
      throw new Error(
        `Cannot set reserved key: "${finalKey}". ` +
        `Reserved keys: ${RESERVED_KEYS.join(', ')}. ` +
        `These keys are used by the DottedJson API and cannot be modified.`
      );
    }
  }

  async has(path: string, options: HasOptions = {}): Promise<boolean> {
    try {
      const fresh = options.fresh;
      
      // Evaluate expressions along the path if needed
      await this.evaluateExpressionsInPath(path, fresh);

      return dotHas(this.data, path);
    } catch (_error) {
      return false;
    }
  }

  private mergeData(schema: Record<string, any>, initial: Record<string, any>): Record<string, any> {
    // Deep merge schema and initial data
    const result = structuredClone(schema);

    // Simple merge for now - will enhance with proper deep merging
    for (const [key, value] of Object.entries(initial)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private async evaluateExpressionsInPath(path: string, fresh = false): Promise<void> {
    // Handle leading dot (expression prefix) specially
    const isExpression = path.startsWith('.');
    const actualPath = isExpression ? path.substring(1) : path;
    const pathSegments = actualPath.split('.');

    // If this is a dotted expression reference (e.g., ".sum"), evaluate it
    if (isExpression) {
      const escapedExpressionPath = `\\.${actualPath}`;
      if (dotHas(this.data, escapedExpressionPath)) {
        const cachedResult = dotGet(this.data, actualPath);
        if (cachedResult === undefined || fresh) {
          await this.evaluateExpression(escapedExpressionPath, actualPath, fresh);
        }
      }
    }

    // Walk through each segment and check if we need to evaluate expressions
    // Skip this loop if we already handled the entire path as an expression
    if (!isExpression || pathSegments.length > 1) {
      for (let i = 0; i < pathSegments.length; i++) {
        const partialPath = pathSegments.slice(0, i + 1).join('.');
        const parentPath = pathSegments.slice(0, i).join('.');
        const currentSegment = pathSegments[i];

        // Check if there's a dot-prefixed expression that would populate this segment
        const escapedExpressionPath = parentPath ? `${parentPath}.\\.${currentSegment}` : `\\.${currentSegment}`;

        // If the expression exists and hasn't been evaluated yet (or we want fresh evaluation)
        if (dotHas(this.data, escapedExpressionPath)) {
          const cachedResult = dotGet(this.data, partialPath);
          if (cachedResult === undefined || fresh) {
            await this.evaluateExpression(escapedExpressionPath, partialPath, fresh);
          }
        }
      }
    }
  }

  private async evaluateExpression(expressionPath: string, targetPath: string, fresh = false): Promise<void> {
    // Cycle detection (Constitution Principle VI)
    if (this.evaluationStack.has(expressionPath)) {
      throw new Error(`Circular dependency detected: ${expressionPath} references itself`);
    }

    // Depth limit enforcement (Constitution Principle VI)
    if (this.evaluationDepth >= this.options.maxEvaluationDepth) {
      throw new Error(`Maximum evaluation depth of ${this.options.maxEvaluationDepth} exceeded`);
    }

    // Check cache first (unless fresh evaluation is requested)
    if (!fresh && this.cache.has(expressionPath)) {
      dotSet(this.data, targetPath, this.cache.get(expressionPath));
      return;
    }

    const expression = dotGet(this.data, expressionPath);

    if (typeof expression !== 'string') {
      return;
    }

    try {
      // Track evaluation state for cycle detection
      this.evaluationStack.add(expressionPath);
      this.evaluationDepth++;

      const result = await this.evaluateExpressionString(expression, targetPath);

      // Don't cache expressions that contain fresh() calls
      if (!/fresh\s*\(/.test(expression)) {
        this.cache.set(expressionPath, result);
      }

      // Set the evaluated result in the data
      dotSet(this.data, targetPath, result);

    } finally {
      // Clean up tracking state
      this.evaluationStack.delete(expressionPath);
      this.evaluationDepth--;
    }
  }

  private async evaluateExpressionString(
    expression: string,
    targetPath: string
  ): Promise<any> {
    // Check if expression has dependencies that need to be resolved first
    await this.resolveDependencies(expression, targetPath);

    // Convert dot-separated path to array for context
    // The context path should be the path to the object containing the expression,
    // not including the property being evaluated
    const pathArray = targetPath
      ? targetPath.split('.').filter(Boolean).slice(0, -1)  // Remove the last segment (property name)
      : [];



    const evaluator = createExpressionEvaluator(
      this.data,
      this.options.resolvers,
      pathArray,
      this.options,  // Pass full options for error handling
      targetPath,
      this  // Pass DottedJson instance for live re-evaluation
    );

    return await evaluator.evaluate(expression);
  }

  /**
   * Resolve variant path by reading variant values from data hierarchy
   * Uses tree-walking to find variant properties and build context
   *
   * @example
   * // With data containing: { lang: 'es', gender: 'f' }
   * resolveVariant('.bio')
   * // → '.bio:es:f' (if exists), or '.bio:es', or '.bio'
   *
   * @example
   * // With data containing: { style: 'pirate' }
   * resolveVariant('.action')
   * // → '.action:pirate' (if exists), or '.action'
   */
  private async resolveVariant(path: string): Promise<string> {
    // Create a temporary expression evaluator to access tree-walking
    const evaluator = new ExpressionEvaluator({
      data: this.data,
      path: [], // Start from root for variant resolution
      resolvers: this.options.resolvers || {},
      options: this.options
    });

    // Build variant context from tree-walked values
    const variants: VariantContext = {};

    // Well-known variant dimensions
    const lang = evaluator.resolveTreeWalkingValue('lang');
    const form = evaluator.resolveTreeWalkingValue('form');
    const gender = evaluator.resolveTreeWalkingValue('gender');

    if (lang !== undefined && typeof lang === 'string') variants.lang = lang;
    if (form !== undefined && typeof form === 'string') variants.form = form;
    if (gender !== undefined && typeof gender === 'string' && ['m', 'f', 'x'].includes(gender)) {
      variants.gender = gender as 'm' | 'f' | 'x';
    }

    // Custom variant dimensions - any property value becomes a potential variant
    // Look for properties that could represent variant dimensions
    const potentialVariants = ['region', 'theme', 'platform', 'device', 'style', 'context', 'environment', 'tone', 'dialect', 'source'];
    for (const prop of potentialVariants) {
      const value = evaluator.resolveTreeWalkingValue(prop);
      if (value !== undefined && typeof value === 'string') {
        // For custom variants, the property value becomes the variant name
        // e.g., style: 'pirate' creates variant { pirate: 'pirate' }
        variants[value] = value;
      }
    }

    // If no variants found, return original path
    if (Object.keys(variants).length === 0) {
      return path;
    }

    // Use existing variant resolution logic
    return resolveVariantPath(path, variants, this.availablePaths);
  }

  private async resolveDependencies(expression: string, currentPath: string): Promise<void> {
    // Extract variable references from the expression
    const variableMatches = expression.match(/\$\{([^}]+)\}/g);
    if (!variableMatches) return;

    const currentSegments = currentPath
      ? currentPath.split('.').filter(Boolean)
      : [];

    for (const match of variableMatches) {
      const expr = match.slice(2, -1).trim(); // Remove ${ and }
      if (!expr) continue;

      // Skip live re-evaluation references (${@path}) - they will be evaluated when accessed
      if (expr.startsWith('@')) {
        continue;
      }

      const varNames = expr.match(VARIABLE_REFERENCE_PATTERN) || [];

      for (const varName of varNames) {
        const leadingDots = varName.match(/^\.+/)?.[0].length ?? 0;

        if (leadingDots > 1) {
          const targetPath = this.computeParentReferencePath(varName, leadingDots, currentSegments);
          if (targetPath) {
            await this.evaluateExpressionsInPath(targetPath, false);
          }
          continue;
        }

        // Recursively evaluate dependencies for each variable
        await this.evaluateExpressionsInPath(varName, false);
      }
    }
  }

  private computeParentReferencePath(varPath: string, leadingDots: number, currentSegments: string[]): string {
    const currentPathStr = currentSegments.length > 0 ? currentSegments.join('.') : '(root)';
    const parentSegments = currentSegments.slice(0, -1);
    const parentLevels = leadingDots - 1;
    const availableLevels = parentSegments.length;

    if (availableLevels < parentLevels) {
      throw new Error(
        `Parent reference '${varPath}' at '${currentPathStr}' goes beyond root (requires ${parentLevels} parent levels, only ${availableLevels} available)`
      );
    }

    const baseSegments = parentLevels > 0
      ? parentSegments.slice(0, availableLevels - parentLevels)
      : parentSegments;
    const propertyPath = varPath.substring(leadingDots);
    const propertySegments = propertyPath ? propertyPath.split('.') : [];
    const targetSegments = [...baseSegments, ...propertySegments];
    return targetSegments.join('.');
  }

  /**
   * Resolve fallback value (supports static values and functions)
   */
  private async resolveFallback(overrideFallback?: any): Promise<any> {
    const fallback = overrideFallback !== undefined 
      ? overrideFallback 
      : this.options.fallback;

    // If fallback is a function, call it
    if (typeof fallback === 'function') {
      const result = fallback();
      // Handle async functions
      return result && typeof result.then === 'function' ? await result : result;
    }

    return fallback;
  }

  /**
   * Handle errors using onError handler or fallback
   */
  private async handleError(error: Error, path: string, overrideFallback?: any): Promise<any> {
    // If custom error handler is provided, use it
    if (this.options.onError) {
      const result = this.options.onError(error, path);
      
      if (result === 'throw') {
        throw error;
      }
      
      if (result === 'fallback') {
        return this.resolveFallback(overrideFallback);
      }
      
      // Return custom value from error handler
      return result;
    }

    // If fallback is provided (instance or override), use it
    const hasFallback = overrideFallback !== undefined || this.options.fallback !== undefined;
    if (hasFallback) {
      return this.resolveFallback(overrideFallback);
    }

    // Default behavior: throw (no error handler, no fallback)
    throw error;
  }
}
