import { getProperty as dotGet } from 'dot-prop';
import { resolvePronoun, isPronounPlaceholder, extractPronounForm, type Gender } from './pronouns.js';
import { typeCoercionHelpers } from './helpers/type-coercion.js';
import type { ExpressionContext, ResolverContext, VariantContext } from './types.js';

const VARIABLE_REFERENCE_PATTERN = /(?:\.{1,}[a-zA-Z_$][a-zA-Z0-9_$.]*|[a-zA-Z_$][a-zA-Z0-9_$.]*)(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/g;
const SIMPLE_PATH_PATTERN = /^\.{0,}[a-zA-Z_$][a-zA-Z0-9_$.]*$/;

export class ExpressionEvaluator {
  private context: ExpressionContext;

  constructor(context: ExpressionContext) {
    this.context = context;
  }

  async evaluate(expression: string): Promise<any> {
    const hasTemplateLiterals = this.hasTemplateLiterals(expression);
    const hasFunctionCalls = this.hasFunctionCalls(expression);

    // If it's just a plain string with no special syntax, return it as-is
    if (!hasTemplateLiterals && !hasFunctionCalls) {
      return expression;
    }

    try {
      // Simple template literal (only ${} interpolation, no function calls)
      if (hasTemplateLiterals && !hasFunctionCalls) {
        return this.evaluateTemplateLiteral(expression);
      } else {
        // Function calls (with or without template literals)
        const interpolatedExpression = this.interpolateVariables(expression);
        const pathStr = this.context.path.join('.');
        return await this.executeExpression(interpolatedExpression, pathStr);
      }
    } catch (_error) {
      throw _error;
    }
  }

  private hasTemplateLiterals(expression: string): boolean {
    return typeof expression === 'string' && expression.includes('${');
  }

  private hasFunctionCalls(expression: string): boolean {
    // Check if this looks like a function call
    return /[a-zA-Z_$][a-zA-Z0-9_$.]*\s*\(/.test(expression);
  }

  /**
   * Resolve a variable path with scoped context lookup
   * First tries relative to current path context, then falls back to root
   */
  private resolveScopedValue(varPath: string): any {
    const leadingDots = varPath.match(/^\.+/)?.[0].length ?? 0;

    if (leadingDots > 1) {
      return this.resolveParentReference(varPath, leadingDots);
    }

    // Handle leading dot (expression prefix) - actual data is stored without the dot
    const actualPath = leadingDots === 1 ? varPath.substring(1) : varPath;
    
    // If we have a path context (nested evaluation), try scoped lookup first
    if (this.context.path && this.context.path.length > 0) {
      // Get parent path (exclude the last segment which is the current property)
      const parentPath = this.context.path.slice(0, -1);
      
      if (parentPath.length > 0) {
        // Try to resolve relative to parent context
        const scopedPath = `${parentPath.join('.')}.${actualPath}`;
        const scopedValue = dotGet(this.context.data, scopedPath);
        
        if (scopedValue !== undefined) {
          return scopedValue;
        }
      }
    }
    
    // Fall back to root-level lookup
    const rootValue = dotGet(this.context.data, actualPath);
    if (rootValue !== undefined) {
      return rootValue;
    }

    if (!actualPath.includes('.') && !varPath.startsWith('.') && this.context.variants) {
      const variantValue = this.context.variants[actualPath];
      if (variantValue !== undefined) {
        return variantValue;
      }
    }

    return rootValue;
  }

  private resolveParentReference(varPath: string, leadingDots: number): any {
    const {
      targetPath,
      propertySegments,
      propertyPath
    } = this.computeParentReferenceTarget(varPath, leadingDots);

    const value = targetPath
      ? dotGet(this.context.data, targetPath)
      : this.context.data;

    if (value !== undefined) {
      return value;
    }

    if (propertySegments.length === 1 && this.context.variants) {
      const [variantKey] = propertySegments;
      if (variantKey) {
        const variantValue = this.context.variants[variantKey];
        if (variantValue !== undefined) {
          return variantValue;
        }
      }
    }

    const currentPathStr = this.context.path && this.context.path.length > 0
      ? this.context.path.join('.')
      : '(root)';
    const resolvedPath = targetPath || propertyPath || '(root)';
    throw new Error(
      `Parent reference '${varPath}' at '${currentPathStr}' resolved to undefined path '${resolvedPath}'`
    );
  }

  private computeParentReferenceTarget(
    varPath: string,
    leadingDots: number
  ): {
    targetPath: string;
    parentLevels: number;
    availableLevels: number;
    baseSegments: string[];
    propertySegments: string[];
    propertyPath: string;
  } {
    const currentPathSegments = Array.isArray(this.context.path)
      ? [...this.context.path]
      : [];
    const currentPathStr = currentPathSegments.length > 0
      ? currentPathSegments.join('.')
      : '(root)';

    const parentSegments = currentPathSegments.slice(0, -1);
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
    const targetPath = targetSegments.filter(Boolean).join('.');

    return {
      targetPath,
      parentLevels,
      availableLevels,
      baseSegments,
      propertySegments,
      propertyPath
    };
  }

  private evaluateTemplateLiteral(expression: string): any {
    // Check if expression is a single variable reference (e.g., "${counter}" or "${.foo}")
    // In this case, return the value directly without string conversion to preserve type
    const singleVarMatch = expression.trim().match(/^\$\{([^}]+)\}$/);
    if (singleVarMatch && singleVarMatch[1]) {
      const varPath = singleVarMatch[1].trim();

      // Check for pronoun placeholder
      if (isPronounPlaceholder(varPath)) {
        return this.resolvePronounPlaceholder(varPath);
      }

      if (!SIMPLE_PATH_PATTERN.test(varPath)) {
        return this.executeTemplateExpression(expression);
      }

      // Return the value directly to preserve its type (number, boolean, object, etc.)
      return this.resolveScopedValue(varPath);
    }

    // Check if expression is wrapped in quotes (JavaScript string literal)
    // e.g., '"${firstName} ${lastName}"' or "'${name}'"
    const isQuotedString = /^["'].*["']$/.test(expression.trim());

    // Replace pronoun placeholders with a neutral token to avoid false operator detection
    const sanitizedExpression = expression.replace(/\$\{(:[a-z]+)\}/g, '${PRONOUN}');

    // Check if template literal contains JavaScript expressions
    // Either operators inside ${} OR operators outside (mixed expressions like "${x} * 2")
    const hasOperatorsInside = /\$\{[^}]*[+\-*/()[\]<>!=&|?:][^}]*\}/g.test(sanitizedExpression);
    const hasOperatorsOutside = /\$\{[^}]+\}\s*[+\-*/()[\]<>!=&|?:]/.test(sanitizedExpression) ||
      /[+\-*/()[\]<>!=&|?:]\s*\$\{[^}]+\}/.test(sanitizedExpression);

    // If quoted or has operators, use full expression evaluation
    if (isQuotedString || hasOperatorsInside || hasOperatorsOutside) {
      // Use full expression evaluation for JS expressions (pass original expression)
      return this.executeTemplateExpression(expression);
    }

    // Simple template literal evaluation - just replace ${path} with values
    return expression.replace(/\$\{([^}]+)\}/g, (_match, path) => {
      const trimmedPath = path.trim();

      // Check for pronoun placeholder (:subject, :possessive, etc.)
      if (isPronounPlaceholder(trimmedPath)) {
        return this.resolvePronounPlaceholder(trimmedPath);
      }

      if (trimmedPath.startsWith(':')) {
        return `\${${trimmedPath}}`;
      }

      // Use scoped value resolution
      const value = this.resolveScopedValue(trimmedPath);

      if (value === undefined || value === null) {
        return 'undefined';
      }

      return String(value);
    });
  }

  private executeTemplateExpression(expression: string): any {

    try {
      // First, resolve pronoun placeholders
      let processedExpression = expression;
      const pronounMatches = expression.matchAll(/\$\{(:[a-z]+)\}/g);

      for (const match of pronounMatches) {
        const placeholder = match[1];
        const fullMatch = match[0];
        if (placeholder && fullMatch && isPronounPlaceholder(placeholder)) {
          const resolved = this.resolvePronounPlaceholder(placeholder);
          processedExpression = processedExpression.replace(fullMatch, resolved);
        }
      }

      // Extract all variable references from template expressions
      const variables: Record<string, any> = {};
      const matches = processedExpression.matchAll(/\$\{([^}]+)\}/g);

      for (const match of matches) {
        const expr = match[1];
        if (!expr) continue;

        // Extract simple variable names from the expression (handle dot notation and parent references)
        const varNames = expr.match(VARIABLE_REFERENCE_PATTERN) || [];

        for (const varName of varNames) {
          if (!(varName in variables)) {
            // Use scoped value resolution
            const value = this.resolveScopedValue(varName);

            if (value !== undefined) {
              // Store with the original variable name (including leading dot if present)
              variables[varName] = value;

              // For dotted paths (with . as separator), also add underscore version
              const actualVarName = varName.startsWith('.') ? varName.substring(1) : varName;
              if (actualVarName.includes('.')) {
                const safeName = actualVarName.replace(/\./g, '_');
                variables[safeName] = value;
              }
            }
          }
        }
      }

      // Track whether original expression has template literals
      const hasTemplateLiterals = processedExpression.includes('${');

      // Create safe variable names and replace in expression
      const safeVariables: Record<string, any> = {};
      let safeExpression = processedExpression;

      for (const [varName, value] of Object.entries(variables)) {
        // Create a safe identifier (replace dots with underscores, add prefix for leading dot)
        let safeName = varName;
        if (varName.startsWith('.')) {
          const normalizedName = varName.substring(1).replace(/\./g, '_');
          safeName = `_dot_${normalizedName}`;
          // Escape the dot for regex (backslash-dot matches literal dot)
          safeExpression = safeExpression.replace(new RegExp(varName.replace(/\./g, '\\.') + '\\b', 'g'), safeName);
        } else if (varName.includes('.')) {
          safeName = varName.replace(/\./g, '_');
          // Escape dots for regex and add word boundaries
          safeExpression = safeExpression.replace(new RegExp(varName.replace(/\./g, '\\.'), 'g'), safeName);
        } else {
          // Simple variable name, keep as is
          safeVariables[varName] = value;
          continue;
        }
        safeVariables[safeName] = value;
      }

      // Evaluate the expression
      // For expressions with template literals, evaluate as template literal
      // For expressions without (after variable replacement), evaluate as JavaScript
      let result;
      if (hasTemplateLiterals) {
        // Check if the original expression is wrapped in quotes (JavaScript string literal with template)
        // e.g., '"${firstName} ${lastName}"' should be evaluated as a JS string, not wrapped in backticks
        const isQuotedExpression = /^["'].*["']$/.test(expression.trim());
        
        let templateResult;
        if (isQuotedExpression) {
          // The expression is a quoted string with ${} inside
          // Convert it to a template literal by replacing the outer quotes with backticks
          const asTemplateLiteral = safeExpression.replace(/^["']/, '`').replace(/["']$/, '`');
          const func = new Function(...Object.keys(safeVariables), 'return ' + asTemplateLiteral);
          templateResult = func(...Object.values(safeVariables));
        } else {
          // Evaluate as template literal (allows ${} interpolation with JavaScript expressions)
          const func = new Function(...Object.keys(safeVariables), 'return `' + safeExpression + '`');
          templateResult = func(...Object.values(safeVariables));
        }

        // Only do secondary evaluation if there were operators truly OUTSIDE template literals
        // E.g., "${x} * 2" should evaluate to 10, but "${.a} + ${.b}" should stay as "5 + 5"
        // Count template literals
        const templateCount = (processedExpression.match(/\$\{[^}]+\}/g) || []).length;
        // Check if operators exist after removing all template literals
        const withoutTemplates = processedExpression.replace(/\$\{[^}]+\}/g, '');
        const hasOperatorsOutsideTemplates = /[+\-*/()[\]<>=!&|?:]/.test(withoutTemplates);

        if (templateCount === 1 && hasOperatorsOutsideTemplates && typeof templateResult === 'string' && /^[\d\s+\-*/().]+$/.test(templateResult)) {
          try {
            const evalFunc = new Function('return ' + templateResult);
            result = evalFunc();
          } catch {
            result = templateResult;
          }
        } else {
          result = templateResult;
        }
      } else {
        // No template literals - evaluate as direct JavaScript
        const func = new Function(...Object.keys(safeVariables), 'return ' + safeExpression);
        result = func(...Object.values(safeVariables));
      }

      // Try to parse as number if possible
      const numResult = Number(result);
      if (!isNaN(numResult) && String(numResult) === String(result).trim()) {
        return numResult;
      }

      return result;
    } catch (_error) {
      // If template evaluation fails, return the string as-is
      return expression;
    }
  }

  private interpolateVariables(expression: string): string {
    // Replace ${path} with actual values from the data context
    return expression.replace(/\$\{([^}]+)\}/g, (_match, pathStr) => {
      const trimmedPath = pathStr.trim();
      const value = this.resolveScopedValue(trimmedPath);

      if (value === undefined || value === null) {
        return SIMPLE_PATH_PATTERN.test(trimmedPath) ? 'undefined' : trimmedPath;
      }


      // Convert to appropriate string representation for JavaScript evaluation
      if (typeof value === 'string') {
        const strValue = value;
        return `"${strValue.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  private async executeExpression(expression: string, path?: string): Promise<any> {
    // Create a safe execution environment with resolvers
    const resolverContext = this.createResolverContext();

    try {
      // Use Function constructor for safer evaluation than eval()
      const func = new Function(...Object.keys(resolverContext), `return ${expression}`);
      const result = func(...Object.values(resolverContext));

      // Handle both sync and async resolver functions
      if (result && typeof result.then === 'function') {
        return await result;
      }

      return result;
    } catch (_error) {
      // Handle error according to v1.0 error handling contract
      const error = _error instanceof Error
        ? _error
        : new Error(`Expression execution failed: ${expression} - ${String(_error)}`);

      return this.handleError(error, path || 'unknown');
    }
  }

  /**
   * Handle expression evaluation errors
   *
   * Behavior:
   * - If options.onError is set: use custom handler
   * - Otherwise: throw error
   *
   * @param error - The error that occurred
   * @param path - The path where error occurred
   * @returns Fallback value or throws
   */
  private handleError(error: Error, path: string): any {
    const options = this.context.options;

    // Custom error handler
    if (options?.onError) {
      const result = options.onError(error, path);
      
      // If handler returns 'throw', re-throw the error
      if (result === 'throw') {
        throw error;
      }
      
      // Handler will return 'fallback' or a custom value
      // The calling code (dotted-json.ts) will handle 'fallback'
      return result;
    }

    // Default behavior: throw
    throw error;
  }

  private createResolverContext(): Record<string, any> {
    const context: Record<string, any> = {};

    // Add type coercion helpers (int, float, bool, json)
    // These are always available in expression evaluation contexts
    Object.assign(context, typeCoercionHelpers);

    // Flatten resolver hierarchy for direct access
    this.flattenResolvers(this.context.resolvers, context);

    return context;
  }

  private flattenResolvers(resolvers: ResolverContext, target: Record<string, any>, prefix = ''): void {
    for (const [key, value] of Object.entries(resolvers)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;

      if (typeof value === 'function') {
        target[fullKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        // For nested objects, create a proxy object and also flatten
        target[key] = value;
        this.flattenResolvers(value, target, fullKey);
      } else {
        target[fullKey] = value;
      }
    }
  }

  /**
   * Resolve pronoun placeholder based on variant context
   *
   * @param placeholder - Pronoun placeholder (e.g., ':subject', ':possessive')
   * @returns Resolved pronoun string
   */
  private resolvePronounPlaceholder(placeholder: string): string {
    const form = extractPronounForm(placeholder);
    if (!form) return placeholder;  // Invalid placeholder

    const gender = (this.context.variants?.gender || 'x') as Gender;
    const lang = this.context.variants?.lang || 'en';

    return resolvePronoun(form, gender, lang);
  }
}

export function createExpressionEvaluator(
  data: Record<string, any>,
  resolvers: ResolverContext,
  path: string[] = [],
  variants?: VariantContext,
  options?: any
): ExpressionEvaluator {
  return new ExpressionEvaluator({
    data,
    resolvers,
    path,
    variants,
    options
  });
}
