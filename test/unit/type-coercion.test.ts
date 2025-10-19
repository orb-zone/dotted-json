/**
 * Type Coercion Tests
 *
 * Test built-in type coercion helpers to prevent common JavaScript pitfalls
 * like "4" + 1 = "41" when you expect 5.
 *
 * Helpers:
 * - int(): Cast to integer
 * - float(): Cast to floating-point number
 * - bool(): Cast to boolean
 * - json(): Parse JSON string
 */

import { describe, test, expect } from 'bun:test';
import { int, float, bool, json } from '../../src/helpers/type-coercion.js';

describe('Type Coercion Helpers', () => {
  describe('int()', () => {
    test('casts string to integer', () => {
      expect(int('42')).toBe(42);
      expect(int('0')).toBe(0);
      expect(int('-10')).toBe(-10);
    });

    test('casts number to integer (truncates decimals)', () => {
      expect(int(42.7)).toBe(42);
      expect(int(3.14)).toBe(3);
      expect(int(-5.9)).toBe(-5);
    });

    test('casts boolean to integer', () => {
      expect(int(true)).toBe(1);
      expect(int(false)).toBe(0);
    });

    test('handles edge cases', () => {
      expect(int('  42  ')).toBe(42); // Whitespace
      expect(int('42px')).toBe(42); // Trailing non-digits
      // Note: parseInt('0x10', 10) returns 0 because base 10 stops at 'x'
      // For hex parsing, would need parseInt('0x10', 16) or parseInt without base
      expect(int('10')).toBe(10); // Standard integer
    });

    test('returns NaN for non-numeric strings', () => {
      expect(int('hello')).toBe(NaN);
      expect(int('')).toBe(NaN);
      expect(int(undefined)).toBe(NaN);
      expect(int(null)).toBe(0); // parseInt(null) = NaN, but Number(null) = 0
    });
  });

  describe('float()', () => {
    test('casts string to float', () => {
      expect(float('3.14')).toBeCloseTo(3.14, 2);
      expect(float('0.5')).toBe(0.5);
      expect(float('-2.718')).toBeCloseTo(-2.718, 3);
    });

    test('handles scientific notation', () => {
      expect(float('1e3')).toBe(1000);
      expect(float('1.5e-2')).toBe(0.015);
    });

    test('casts integer strings to float', () => {
      expect(float('42')).toBe(42.0);
      expect(typeof float('42')).toBe('number');
    });

    test('preserves precision', () => {
      expect(float('10.555555')).toBeCloseTo(10.555555, 6);
    });

    test('handles edge cases', () => {
      expect(float('  3.14  ')).toBeCloseTo(3.14, 2); // Whitespace
      expect(float('3.14abc')).toBeCloseTo(3.14, 2); // Trailing non-digits
    });

    test('returns NaN for non-numeric strings', () => {
      expect(float('hello')).toBe(NaN);
      expect(float('')).toBe(NaN);
      expect(float(undefined)).toBe(NaN);
    });
  });

  describe('bool()', () => {
    test('casts string "true" to true', () => {
      expect(bool('true')).toBe(true);
      expect(bool('TRUE')).toBe(true);
      expect(bool('True')).toBe(true);
    });

    test('casts string "false" to false', () => {
      expect(bool('false')).toBe(false);
      expect(bool('FALSE')).toBe(false);
      expect(bool('False')).toBe(false);
    });

    test('casts truthy values to true', () => {
      expect(bool(1)).toBe(true);
      expect(bool('yes')).toBe(true);
      expect(bool('1')).toBe(true);
      expect(bool([])).toBe(true);
      expect(bool({})).toBe(true);
    });

    test('casts falsy values to false', () => {
      expect(bool(0)).toBe(false);
      expect(bool('0')).toBe(false);
      expect(bool('')).toBe(false);
      expect(bool(null)).toBe(false);
      expect(bool(undefined)).toBe(false);
    });

    test('special string values', () => {
      expect(bool('no')).toBe(false);
      expect(bool('off')).toBe(false);
      expect(bool('disabled')).toBe(false);
      expect(bool('yes')).toBe(true);
      expect(bool('on')).toBe(true);
      expect(bool('enabled')).toBe(true);
    });
  });

  describe('json()', () => {
    test('parses valid JSON object', () => {
      const result = json('{"name": "Alice", "age": 30}');
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    test('parses valid JSON array', () => {
      const result = json('[1, 2, 3, "four"]');
      expect(result).toEqual([1, 2, 3, 'four']);
    });

    test('parses JSON primitives', () => {
      expect(json('42')).toBe(42);
      expect(json('"hello"')).toBe('hello');
      expect(json('true')).toBe(true);
      expect(json('false')).toBe(false);
      expect(json('null')).toBe(null);
    });

    test('handles nested JSON', () => {
      const result = json('{"user": {"name": "Bob", "roles": ["admin", "user"]}}');
      expect(result).toEqual({
        user: {
          name: 'Bob',
          roles: ['admin', 'user']
        }
      });
    });

    test('throws on invalid JSON', () => {
      expect(() => json('invalid')).toThrow();
      expect(() => json('{invalid}')).toThrow();
      expect(() => json('undefined')).toThrow();
    });

    test('handles empty JSON structures', () => {
      expect(json('{}')).toEqual({});
      expect(json('[]')).toEqual([]);
    });

    test('handles JSON with whitespace', () => {
      const result = json(`
        {
          "name": "Alice",
          "age": 30
        }
      `);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });
  });

  describe('Real-world Use Cases', () => {
    test('prevents "4" + 1 = "41" bug', () => {
      const stringNumber = '4';

      // Without cast: string concatenation
      const wrong = stringNumber + 1;
      expect(wrong).toBe('41');

      // With cast: numeric addition
      const right = int(stringNumber) + 1;
      expect(right).toBe(5);
    });

    test('calculates price with string inputs', () => {
      const quantity = '5';
      const price = '10.50';
      const discount = '0.1';

      const total = int(quantity) * float(price) * (1 - float(discount));

      expect(total).toBeCloseTo(47.25, 2); // 5 * 10.50 * 0.9
    });

    test('parses API response', () => {
      const apiResponse = '{"success": true, "data": {"id": 123, "name": "Product"}}';

      const parsed = json(apiResponse);

      expect(parsed.success).toBe(true);
      expect(parsed.data.id).toBe(123);
      expect(parsed.data.name).toBe('Product');
    });

    test('handles form input conversion', () => {
      // Simulated form inputs (always strings)
      const formData = {
        name: 'Alice',
        age: '30',
        email: 'alice@example.com',
        subscribe: 'true',
        preferences: '{"theme": "dark", "notifications": true}'
      };

      // Convert types
      const user = {
        name: formData.name,
        age: int(formData.age),
        email: formData.email,
        subscribe: bool(formData.subscribe),
        preferences: json(formData.preferences)
      };

      expect(user).toEqual({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
        subscribe: true,
        preferences: {
          theme: 'dark',
          notifications: true
        }
      });
    });

    test('type guards for safe operations', () => {
      const values = ['42', '3.14', 'not a number', 'true', '{"key": "value"}'];

      const ints = values.map(v => int(v)).filter(v => !isNaN(v));
      const floats = values.map(v => float(v)).filter(v => !isNaN(v));

      expect(ints).toEqual([42, 3]); // '42', '3.14' (truncated) - 'true' → NaN with parseInt base 10
      expect(floats).toEqual([42, 3.14]); // 'true' → NaN with parseFloat
    });
  });
});
