import { getProperty as dotGet, setProperty as dotSet, hasProperty as dotHas } from 'dot-prop';
import { createExpressionEvaluator } from './expression-evaluator.js';
import type {
  DottedOptions,
  GetOptions,
  SetOptions,
  HasOptions,
  DottedJson as IDottedJson
} from './types.js';

const DEFAULT_MAX_DEPTH = 100;

export class DottedJson implements IDottedJson {
  private schema: Record<string, any>;
  private data: Record<string, any>;
  private cache: Map<string, any> = new Map();
  private options: Required<DottedOptions>;
  private evaluationStack: Set<string> = new Set();
  private evaluationDepth = 0;

  constructor(schema: Record<string, any>, options: DottedOptions = {}) {
    this.schema = structuredClone(schema);
    this.options = {
      initial: options.initial || {},
      default: options.default,
      errorDefault: options.errorDefault,
      resolvers: options.resolvers || {},
      maxEvaluationDepth: options.maxEvaluationDepth ?? DEFAULT_MAX_DEPTH
    };

    // Merge schema with initial data
    this.data = this.mergeData(this.schema, this.options.initial);
  }

  async get(path: string, options: GetOptions = {}): Promise<any> {
    try {
      // Check if we need to evaluate any dot-prefixed expressions along the path
      await this.evaluateExpressionsInPath(path, options.ignoreCache);

      // Handle leading dot (expression prefix) - actual data is stored without the dot
      const actualPath = path.startsWith('.') ? path.substring(1) : path;

      // Get the value using dot-prop
      const result = dotGet(this.data, actualPath);

      // If value exists, return it
      if (result !== undefined) {
        return result;
      }

      // Value is missing - resolve default using hierarchical lookup
      return await this.resolveDefault(path, options.default);

    } catch (error) {
      // Error occurred - check for default first (higher priority than errorDefault)
      if (options.default !== undefined || this.options.default !== undefined) {
        return await this.resolveDefault(path, options.default);
      }

      // If no default, resolve errorDefault
      if (this.options.errorDefault !== undefined || options.errorDefault !== undefined) {
        return await this.resolveErrorDefault(path, error as Error, options.errorDefault);
      }
      throw error;
    }
  }

  async set(path: string, value: any, _options: SetOptions = {}): Promise<void> {
    try {
      dotSet(this.data, path, value);

      // Clear cache since data changed
      this.cache.clear();
    } catch (error) {
      throw error;
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
      const escapedExpressionPath = parentPath ? `${parentPath}.\\.${currentSegment}` : `\\.${currentSegment}`;

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

    } catch (error) {
      throw error;
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
      []
    );

    return await evaluator.evaluate(expression);
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
