/**
 * Type Coercion Helpers
 *
 * Built-in helpers for type casting in expressions to prevent common JavaScript
 * pitfalls like "4" + 1 = "41" when you expect 5.
 *
 * These helpers are automatically available in expression evaluation contexts.
 *
 * @example
 * ```typescript
 * const data = dotted({
 *   count: "4",
 *   ".computed": "int(${count}) + 1"  // 5, not "41"
 * });
 * ```
 */

/**
 * Cast value to integer
 *
 * Converts any value to an integer using parseInt with base 10.
 * Truncates decimal values.
 *
 * @param val - Value to cast
 * @returns Integer value, or NaN if conversion fails
 *
 * @example
 * ```typescript
 * int("42")    // 42
 * int("3.14")  // 3
 * int(true)    // 1
 * int("abc")   // NaN
 * ```
 */
export function int(val: unknown): number {
  // Handle special cases
  if (val === null) return 0;
  if (val === undefined) return NaN;
  if (typeof val === 'boolean') return val ? 1 : 0;

  // Convert to string first to handle all types consistently
  const str = String(val);

  // Use parseInt for integer conversion
  const result = parseInt(str, 10);

  return result;
}

/**
 * Cast value to floating-point number
 *
 * Converts any value to a floating-point number using parseFloat.
 * Preserves decimal precision.
 *
 * @param val - Value to cast
 * @returns Float value, or NaN if conversion fails
 *
 * @example
 * ```typescript
 * float("3.14")     // 3.14
 * float("10.555")   // 10.555
 * float("1e3")      // 1000
 * float("abc")      // NaN
 * ```
 */
export function float(val: unknown): number {
  // Handle special cases
  if (val === null) return 0;
  if (val === undefined) return NaN;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'number') return val;

  // Convert to string and parse
  const str = String(val);
  const result = parseFloat(str);

  return result;
}

/**
 * Cast value to boolean
 *
 * Converts any value to a boolean with special handling for common
 * string representations like "true", "false", "yes", "no", etc.
 *
 * @param val - Value to cast
 * @returns Boolean value
 *
 * @example
 * ```typescript
 * bool("true")    // true
 * bool("false")   // false
 * bool("yes")     // true
 * bool("no")      // false
 * bool("1")       // true
 * bool("0")       // false
 * bool(null)      // false
 * ```
 */
export function bool(val: unknown): boolean {
  // Handle null/undefined
  if (val === null || val === undefined) return false;

  // Handle boolean type
  if (typeof val === 'boolean') return val;

  // Handle number type
  if (typeof val === 'number') return val !== 0;

  // Handle string type with special cases
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();

    // Explicit false values
    if (lower === 'false' || lower === 'no' || lower === 'off' || lower === 'disabled' || lower === '0') {
      return false;
    }

    // Explicit true values
    if (lower === 'true' || lower === 'yes' || lower === 'on' || lower === 'enabled' || lower === '1') {
      return true;
    }

    // Empty string is falsy
    if (lower === '') return false;

    // Any other non-empty string is truthy
    return true;
  }

  // For objects/arrays, use JavaScript's built-in truthiness
  return Boolean(val);
}

/**
 * Parse JSON string
 *
 * Safely parses a JSON string into its JavaScript equivalent.
 * Throws an error if the JSON is invalid.
 *
 * @param val - JSON string to parse
 * @returns Parsed JavaScript value
 * @throws {SyntaxError} If JSON string is invalid
 *
 * @example
 * ```typescript
 * json('{"name": "Alice"}')  // { name: "Alice" }
 * json('[1, 2, 3]')          // [1, 2, 3]
 * json('"hello"')            // "hello"
 * json('42')                 // 42
 * json('true')               // true
 * json('null')               // null
 * ```
 */
export function json(val: string): unknown {
  try {
    return JSON.parse(val);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Invalid JSON string'}\nInput: ${val.substring(0, 100)}${val.length > 100 ? '...' : ''}`
    );
  }
}

/**
 * Type coercion helpers available in expression contexts
 *
 * This object is exposed to expression evaluation contexts so helpers
 * can be used directly in expressions without imports.
 */
export const typeCoercionHelpers = {
  int,
  float,
  bool,
  json
};
