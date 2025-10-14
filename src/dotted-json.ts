import { getProperty as dotGet, setProperty as dotSet, hasProperty as dotHas } from 'dot-prop';
import { createExpressionEvaluator } from './expression-evaluator.js';
import { resolveVariantPath, getAvailablePaths } from './variant-resolver.js';
import type {
  DottedOptions,
  GetOptions,
  SetOptions,
  HasOptions,
  DottedJson as IDottedJson,
} from './types.js';

const DEFAULT_MAX_DEPTH = 100;

export class DottedJson implements IDottedJson {
  private schema: Record<string, any>;
  private data: Record<string, any>;
  private cache: Map<string, any> = new Map();
  private options: Required<Omit<DottedOptions, 'validation'>> & Pick<DottedOptions, 'validation'>;
  private evaluationStack: Set<string> = new Set();
  private evaluationDepth = 0;
  private availablePaths: string[] = [];

  constructor(schema: Record<string, any>, options: DottedOptions = {}) {
    this.schema = structuredClone(schema);
    this.options = {
      initial: options.initial || {},
      default: options.default,
      errorDefault: options.errorDefault,
      resolvers: options.resolvers || {},
      maxEvaluationDepth: options.maxEvaluationDepth ?? DEFAULT_MAX_DEPTH,
      variants: options.variants || {},
      validation: options.validation
    };

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
      const resolvedPath = this.resolveVariant(path);

      // Check if we need to evaluate any dot-prefixed expressions along the path
      await this.evaluateExpressionsInPath(resolvedPath, options.ignoreCache);

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

      // Value is missing - resolve default using hierarchical lookup
      return await this.resolveDefault(path, options.default);

    } catch (_error) {
      // Error occurred - check for default first (higher priority than errorDefault)
      if (options.default !== undefined || this.options.default !== undefined) {
        return await this.resolveDefault(path, options.default);
      }

      // If no default, resolve errorDefault
      if (this.options.errorDefault !== undefined || options.errorDefault !== undefined) {
        return await this.resolveErrorDefault(path, _error as Error, options.errorDefault);
      }
      throw _error;
    }
  }

  async set(path: string, value: any, _options: SetOptions = {}): Promise<void> {
    try {
      dotSet(this.data, path, value);

      // Clear cache since data changed
      this.cache.clear();
    } catch (_error) {
      throw _error;
    }
  }

  async has(path: string, options: HasOptions = {}): Promise<boolean> {
    try {
      // Evaluate expressions along the path if needed
      await this.evaluateExpressionsInPath(path, options.ignoreCache);

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

  private async evaluateExpressionsInPath(path: string, ignoreCache = false): Promise<void> {
    // Handle leading dot (expression prefix) specially
    const isExpression = path.startsWith('.');
    const actualPath = isExpression ? path.substring(1) : path;
    const pathSegments = actualPath.split('.');

    // If this is a dotted expression reference (e.g., ".sum"), evaluate it
    if (isExpression) {
      const escapedExpressionPath = `\\.${actualPath}`;
      if (dotHas(this.data, escapedExpressionPath)) {
        const cachedResult = dotGet(this.data, actualPath);
        if (cachedResult === undefined || ignoreCache) {
          await this.evaluateExpression(escapedExpressionPath, actualPath, ignoreCache);
        }
      }
    }

    // Walk through each segment and check if we need to evaluate expressions
    for (let i = 0; i < pathSegments.length; i++) {
      const partialPath = pathSegments.slice(0, i + 1).join('.');
      const parentPath = pathSegments.slice(0, i).join('.');
      const currentSegment = pathSegments[i];

      // Check if there's a dot-prefixed expression that would populate this segment
      let escapedExpressionPath = parentPath ? `${parentPath}.\\.${currentSegment}` : `\\.${currentSegment}`;

      // Resolve variant for this expression key within parent context
      const baseExpressionKey = `.${currentSegment}`;
      const fullPathPrefix = parentPath ? `${parentPath}.` : '';

      // Filter available paths to those matching the current parent context
      const contextPaths = this.availablePaths
        .filter(p => p.startsWith(fullPathPrefix))
        .map(p => p.substring(fullPathPrefix.length));

      const resolvedExpressionKey = resolveVariantPath(
        baseExpressionKey,
        this.options.variants,
        contextPaths
      );

      // If variant resolution changed the key, update the escaped expression path
      if (resolvedExpressionKey !== baseExpressionKey) {
        const resolvedSegment = resolvedExpressionKey.substring(1); // Remove leading dot
        escapedExpressionPath = parentPath ? `${parentPath}.\\.${resolvedSegment}` : `\\.${resolvedSegment}`;
      }

      // If the expression exists and hasn't been evaluated yet (or we're ignoring cache)
      if (dotHas(this.data, escapedExpressionPath)) {
        const cachedResult = dotGet(this.data, partialPath);
        if (cachedResult === undefined || ignoreCache) {
          await this.evaluateExpression(escapedExpressionPath, partialPath, ignoreCache);
        }
      }
    }
  }

  private async evaluateExpression(expressionPath: string, targetPath: string, ignoreCache = false): Promise<void> {
    // Cycle detection (Constitution Principle VI)
    if (this.evaluationStack.has(expressionPath)) {
      throw new Error(`Circular dependency detected: ${expressionPath} references itself`);
    }

    // Depth limit enforcement (Constitution Principle VI)
    if (this.evaluationDepth >= this.options.maxEvaluationDepth) {
      throw new Error(`Maximum evaluation depth of ${this.options.maxEvaluationDepth} exceeded`);
    }

    // Check cache first
    if (!ignoreCache && this.cache.has(expressionPath)) {
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

      const result = await this.evaluateExpressionString(expression);

      // Cache the result
      this.cache.set(expressionPath, result);

      // Set the evaluated result in the data
      dotSet(this.data, targetPath, result);

    } catch (_error) {
      throw _error;
    } finally {
      // Clean up tracking state
      this.evaluationStack.delete(expressionPath);
      this.evaluationDepth--;
    }
  }

  private async evaluateExpressionString(expression: string): Promise<any> {
    // Check if expression has dependencies that need to be resolved first
    await this.resolveDependencies(expression);

    const evaluator = createExpressionEvaluator(
      this.data,
      this.options.resolvers,
      [],
      this.options.variants
    );

    return await evaluator.evaluate(expression);
  }

  /**
   * Resolve variant path based on context
   *
   * @example
   * // With variants: { lang: 'es', gender: 'f' }
   * resolveVariant('.bio')
   * // → '.bio:es:f' (if exists), or '.bio:es', or '.bio'
   */
  private resolveVariant(path: string): string {
    const context = this.options.variants;
    if (!context || Object.keys(context).length === 0) {
      return path;  // No variant context
    }

    return resolveVariantPath(path, context, this.availablePaths);
  }

  private async resolveDependencies(expression: string): Promise<void> {
    // Extract variable references from the expression
    const variableMatches = expression.match(/\$\{([^}]+)\}/g);
    if (!variableMatches) return;

    for (const match of variableMatches) {
      const expr = match.slice(2, -1).trim(); // Remove ${ and }

      // Extract individual variable names from the expression (not the whole expression)
      // Handle paths like "a", "user.name", ".sum", etc.
      const varNames = expr.match(/\.?[a-zA-Z_$][a-zA-Z0-9_$.]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*(?![a-zA-Z0-9_$])/g) || [];

      for (const varName of varNames) {
        // Recursively evaluate dependencies for each variable
        await this.evaluateExpressionsInPath(varName, false);
      }
    }
  }

  private async resolveDefault(_path: string, overrideDefault?: any): Promise<any> {
    // 1. Use override default if provided
    if (overrideDefault !== undefined) {
      return overrideDefault;
    }

    // 2. Fall back to instance-level default
    return this.options.default;
  }

  private async resolveErrorDefault(_path: string, _error: Error, overrideErrorDefault?: any): Promise<any> {
    // 1. Use override errorDefault if provided
    if (overrideErrorDefault !== undefined) {
      return overrideErrorDefault;
    }

    // 2. Fall back to instance-level errorDefault
    return this.options.errorDefault;
  }
}
