import { getProperty as dotGet } from 'dot-prop';
import { resolvePronoun, isPronounPlaceholder, extractPronounForm, type Gender } from './pronouns.js';
import type { ExpressionContext, ResolverContext, VariantContext } from './types.js';

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
        return await this.executeExpression(interpolatedExpression);
      }
    } catch (error) {
      throw error;
    }
  }

  private hasTemplateLiterals(expression: string): boolean {
    return typeof expression === 'string' && expression.includes('${');
  }

  private hasFunctionCalls(expression: string): boolean {
    // Check if this looks like a function call
    return /[a-zA-Z_$][a-zA-Z0-9_$.]*\s*\(/.test(expression);
  }

  private evaluateTemplateLiteral(expression: string): any {
    // Check if template literal contains JavaScript expressions
    // Either operators inside ${} OR operators outside (mixed expressions like "${x} * 2")
    const hasOperatorsInside = /\$\{[^}]*[+\-*/()[\]<>=!&|?:][^}]*\}/g.test(expression);
    const hasOperatorsOutside = /\$\{[^}]+\}\s*[+\-*/()[\]<>=!&|?:]/.test(expression) ||
                                 /[+\-*/()[\]<>=!&|?:]\s*\$\{[^}]+\}/.test(expression);

    if (hasOperatorsInside || hasOperatorsOutside) {
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

      // Handle leading dot (expression prefix) - actual data is stored without the dot
      const actualPath = trimmedPath.startsWith('.') ? trimmedPath.substring(1) : trimmedPath;
      const value = dotGet(this.context.data, actualPath);

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

        // Extract simple variable names from the expression (handle dot notation and leading dots)
        const varNames = expr.match(/\.?[a-zA-Z_$][a-zA-Z0-9_$.]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*(?![a-zA-Z0-9_$])/g) || [];

        for (const varName of varNames) {
          if (!(varName in variables)) {
            // Handle leading dot (expression prefix) - actual data is stored without the dot
            const actualVarName = varName.startsWith('.') ? varName.substring(1) : varName;

            // Try to get the value - handle both root level and dotted paths
            let value = dotGet(this.context.data, actualVarName);

            // If not found with dot-prop, try direct property access (for simple names)
            if (value === undefined && !actualVarName.includes('.')) {
              value = this.context.data[actualVarName];
            }

            if (value !== undefined) {
              // Store with the original variable name (including leading dot if present)
              variables[varName] = value;

              // For dotted paths (with . as separator), also add underscore version
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
          safeName = '_dot_' + varName.substring(1);
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
        // Evaluate as template literal (allows ${} interpolation with JavaScript expressions)
        const func = new Function(...Object.keys(safeVariables), 'return `' + safeExpression + '`');
        const templateResult = func(...Object.values(safeVariables));

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
    } catch (error) {
      // If template evaluation fails, return the string as-is
      return expression;
    }
  }

  private interpolateVariables(expression: string): string {
    // Replace ${path} with actual values from the data context
    return expression.replace(/\$\{([^}]+)\}/g, (_match, pathStr) => {
      const trimmedPath = pathStr.trim();
      const value = dotGet(this.context.data, trimmedPath);

      if (value === undefined || value === null) {
        return 'undefined';
      }

      // Convert to appropriate string representation for JavaScript evaluation
      if (typeof value === 'string') {
        const strValue = value as string;
        return `"${strValue.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  private async executeExpression(expression: string): Promise<any> {
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
    } catch (error) {
      // Preserve the original error if it's already an Error object
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Expression execution failed: ${expression} - ${String(error)}`);
    }
  }

  private createResolverContext(): Record<string, any> {
    const context: Record<string, any> = {};

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
  variants?: VariantContext
): ExpressionEvaluator {
  return new ExpressionEvaluator({
    data,
    resolvers,
    path,
    variants
  });
}
