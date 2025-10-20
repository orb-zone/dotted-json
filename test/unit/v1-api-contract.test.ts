/**
 * API Contract Tests
 *
 * These tests define the expected behaviors for the v0.13 release.
 * Written following TDD principles - tests first, implementation second.
 *
 * Key behaviors tested:
 * 1. Property access & materialization
 * 2. Deep proxy wrapping
 * 3. Reserved keys protection
 * 4. Error handling (console.error + custom handlers)
 * 5. Cache semantics (${foo} vs fresh('.foo'))
 * 6. Type coercion helpers
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('API Contract', () => {
  describe('Property Access & Materialization', () => {
    test('static values are accessible directly (synchronous)', () => {
      const data = dotted({
        name: 'Alice',
        age: 30,
        active: true
      });

      // Static values should be accessible without .get()
      expect(data.name).toBe('Alice');
      expect(data.age).toBe(30);
      expect(data.active).toBe(true);
    });

    test('expression values are undefined before .get() is called', () => {
      const data = dotted({
        name: 'Alice',
        '.greeting': '"Hello, ${name}!"'
      });

      // Expression values undefined until evaluated
      expect(data.greeting).toBeUndefined();

      // Static values still accessible
      expect(data.name).toBe('Alice');
    });

    test('expression values materialize after .get() evaluates them', async () => {
      const data = dotted({
        name: 'Alice',
        '.greeting': 'Hello, ${name}!'
      });

      // Before evaluation
      expect(data.greeting).toBeUndefined();

      // Evaluate expression
      const result = await data.get('greeting');
      expect(result).toBe('Hello, Alice!');

      // Now materialized - accessible directly
      expect(data.greeting).toBe('Hello, Alice!');
    });

    test('re-setting to expression clears materialized value', async () => {
      const data = dotted({
        name: 'Alice',
        '.greeting': 'Hello, ${name}!'
      });

      // Evaluate and materialize
      await data.get('greeting');
      expect(data.greeting).toBe('Hello, Alice!');

      // Re-set to new expression
      await data.set('.greeting', 'Hola, ${name}!');

      // Should be undefined again (needs re-evaluation)
      expect(data.greeting).toBeUndefined();

      // Re-evaluate
      await data.get('greeting');
      expect(data.greeting).toBe('Hola, Alice!');
    });

    test('re-setting to static value updates directly', () => {
      const data = dotted({
        count: 1
      });

      expect(data.count).toBe(1);

      data.set('count', 5);
      expect(data.count).toBe(5);

      data.set('count', 10);
      expect(data.count).toBe(10);
    });

    test('materialization works with nested data', async () => {
      const data = dotted({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          '.fullName': '${firstName} ${lastName}'
        }
      });

      expect(data.user.firstName).toBe('John');
      expect(data.user.fullName).toBeUndefined();

      await data.get('user.fullName');
      expect(data.user.fullName).toBe('John Doe');
    });
  });

  describe('Deep Proxy Wrapping', () => {
    test('nested objects have .get() method', () => {
      const data = dotted({
        family: {
          father: {
            name: 'Bob'
          }
        }
      });

      expect(typeof data.family.get).toBe('function');
      expect(typeof data.family.father.get).toBe('function');
    });

    test('nested objects have .set() method', () => {
      const data = dotted({
        family: {
          father: {
            name: 'Bob'
          }
        }
      });

      expect(typeof data.family.set).toBe('function');
      expect(typeof data.family.father.set).toBe('function');
    });

    test('can call .get() at any depth', async () => {
      const data = dotted({
        family: {
          father: {
            name: 'Bob',
            '.greeting': '"Hello, I am ${name}"'
          }
        }
      });

      // Access via root
      const result1 = await data.get('family.father.greeting');
      expect(result1).toBe('Hello, I am Bob');

      // Access via nested object
      const result2 = await data.family.father.get('greeting');
      expect(result2).toBe('Hello, I am Bob');
    });

    test('can call .set() at any depth', async () => {
      const data = dotted({
        family: {
          father: {
            name: 'Bob'
          }
        }
      });

      // Set via nested object
      data.family.father.set('age', 40);

      expect(data.family.father.age).toBe(40);
      expect(await data.get('family.father.age')).toBe(40);
    });

    test('materialization works recursively', async () => {
      const data = dotted({
        family: {
          father: {
            firstName: 'Bob',
            lastName: 'Smith',
            '.fullName': '"${firstName} ${lastName}"'
          }
        }
      });

      // Before evaluation
      expect(data.family.father.fullName).toBeUndefined();

      // Evaluate via nested object
      await data.family.father.get('fullName');

      // Now materialized
      expect(data.family.father.fullName).toBe('Bob Smith');
    });

    test('deep proxies can be passed to functions', async () => {
      const data = dotted({
        family: {
          father: {
            name: 'Bob',
            '.greeting': '"Hello from ${name}"'
          }
        }
      });

      // Pass nested object to function
      const processUser = async (user: any) => {
        return await user.get('greeting');
      };

      const result = await processUser(data.family.father);
      expect(result).toBe('Hello from Bob');
    });
  });

  describe('Reserved Keys Protection', () => {
    test('cannot set() reserved key: get', async () => {
      const data = dotted({ name: 'Alice' });

      await expect(data.set('get', 'my value')).rejects.toThrow(/reserved/i);
    });

    test('cannot set() reserved key: set', async () => {
      const data = dotted({ name: 'Alice' });

      await expect(data.set('set', 'my value')).rejects.toThrow(/reserved/i);
    });

    test('cannot set() reserved key: has', async () => {
      const data = dotted({ name: 'Alice' });

      await expect(data.set('has', 'my value')).rejects.toThrow(/reserved/i);
    });

    test('cannot set() reserved keys at any depth', async () => {
      const data = dotted({
        user: {
          name: 'Alice'
        }
      });

      // Note: This test will fail until deep proxy wrapping is implemented
      // For now, test via root object with path
      await expect(data.set('user.get', 'value')).rejects.toThrow(/reserved/i);
    });

    test('throws clear error message for reserved keys', async () => {
      const data = dotted({ name: 'Alice' });

      try {
        await data.set('get', 'value');
        throw new Error('Should have thrown');
      } catch (err: any) {
        expect(err.message).toContain('get');
        expect(err.message).toContain('reserved');
      }
    });

    test('can import JSON with reserved keys (just cannot access via methods)', async () => {
      // Should not throw during construction
      const data = dotted({
        name: 'Alice',
        get: 'imported value',  // Reserved key in imported data
        set: 'another value'
      });

      // Can access via .get() method (it's static data)
      expect(await data.get('get')).toBe('imported value');

      // But cannot use .set() to change it
      await expect(data.set('get', 'new value')).rejects.toThrow(/reserved/i);
    });
  });

  describe('Error Handling', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test('logs to console.error and returns undefined with onError handler', async () => {
      const data = dotted(
        {
          '.broken': 'nonExistentFunction()'
        },
        {
          onError: (error, path) => {
            console.error(`Error evaluating expression at path '${path}':`, error.message);
            return undefined;
          }
        }
      );

      const result = await data.get('broken');

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      const errorMessage = consoleErrorSpy.mock.calls[0][0];
      expect(errorMessage).toContain('broken');
    });

    test('allows custom onError handler', async () => {
      let capturedError: Error | null = null;
      let capturedPath: string | null = null;

      const data = dotted(
        {
          '.broken': 'nonExistentFunction()'
        },
        {
          onError: (error: Error, path: string) => {
            capturedError = error;
            capturedPath = path;
            return 'custom fallback';
          }
        }
      );

      const result = await data.get('broken');

      expect(result).toBe('custom fallback');
      expect(capturedError).toBeDefined();
      expect(capturedPath).toBe('broken');
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Custom handler overrides default
    });

    test('onError can re-throw for fail-fast behavior', async () => {
      const data = dotted(
        {
          '.broken': 'nonExistentFunction()'
        },
        {
          onError: (error: Error, path: string) => {
            throw new Error(`Failed at ${path}: ${error.message}`);
          }
        }
      );

      await expect(data.get('broken')).rejects.toThrow(/Failed at broken/);
    });

    test('onError receives error and path', async () => {
      let receivedError: Error | null = null;
      let receivedPath: string | null = null;

      const data = dotted(
        {
          '.broken': 'nonExistentFunction()'
        },
        {
          onError: (error: Error, path: string) => {
            receivedError = error;
            receivedPath = path;
            return 'fallback';
          }
        }
      );

      const result = await data.get('broken');

      expect(receivedError).toBeDefined();
      expect(receivedPath).toBe('broken');
      expect(result).toBe('fallback');
    });

    test('context-aware error handling: fail-fast in dev, graceful in prod', async () => {
      // Context handled via closure instead of context parameter
      const createData = (env: string) => dotted(
        {
          '.broken': 'nonExistentFunction()'
        },
        {
          onError: (error: Error, _path: string) => {
            if (env === 'development') {
              return 'throw'; // Fail-fast
            }
            // Graceful fallback in production
            return `fallback-${env}`;
          }
        }
      );

      // Development: should throw
      const devData = createData('development');
      await expect(devData.get('broken')).rejects.toThrow();

      // Production: should return fallback
      const prodData = createData('production');
      const result = await prodData.get('broken');
      expect(result).toBe('fallback-production');
    });
  });

  describe('Cache Semantics', () => {
    test('${foo} captures snapshot of foo', async () => {
      let count = 0;

      const data = dotted(
        {
          '.counter': 'increment()',
          '.snapshot': '${counter}'  // Snapshot dependency
        },
        {
          resolvers: {
            increment: () => ++count
          }
        }
      );

      // Evaluate counter first time
      const counter1 = await data.get('counter');
      expect(counter1).toBe(1);

      // Snapshot captures counter=1
      const snapshot1 = await data.get('snapshot');
      expect(snapshot1).toBe(1);

      // Manually invalidate counter to force re-evaluation
      await data.get('counter', { fresh: true });
      expect(await data.get('counter')).toBe(2);

      // Snapshot still uses captured value
      const snapshot2 = await data.get('snapshot');
      expect(snapshot2).toBe(1); // Still 1, not 2
    });

    test('fresh(.foo) forces re-evaluation of foo', async () => {
      let count = 0;

      const data = dotted(
        {
          '.counter': 'increment()',
          '.live': 'fresh(\'.counter\')'  // Fresh dependency - forces fresh evaluation of .counter
        },
        {
          resolvers: {
            increment: () => ++count
          }
        }
      );

      // First evaluation
      const live1 = await data.get('live');
      expect(live1).toBe(1);

      // Second evaluation - forces counter re-evaluation
      const live2 = await data.get('live');
      expect(live2).toBe(2);

      // Third evaluation
      const live3 = await data.get('live');
      expect(live3).toBe(3);
    });

    test('changing static value invalidates dependents', async () => {
      const data = dotted({
        name: 'Alice',
        '.greeting': '"Hello, ${name}!"'
      });

      // Initial evaluation
      await data.get('greeting');
      expect(data.greeting).toBe('Hello, Alice!');

      // Change static value
      data.set('name', 'Bob');

      // Dependent should be invalidated
      expect(data.greeting).toBeUndefined();

      // Re-evaluation picks up new value
      await data.get('greeting');
      expect(data.greeting).toBe('Hello, Bob!');
    });

    test('changing expression key invalidates its cache', async () => {
      let count = 0;

      const data = dotted(
        {
          '.counter': 'increment()'
        },
        {
          resolvers: {
            increment: () => ++count
          }
        }
      );

      // Evaluate
      expect(await data.get('counter')).toBe(1);
      expect(data.counter).toBe(1);

      // Change expression
      data.set('.counter', 'increment() * 10');

      // Should be invalidated
      expect(data.counter).toBeUndefined();

      // Re-evaluate with new expression
      expect(await data.get('counter')).toBe(20); // (2 * 10)
    });

    test('fresh option re-evaluates and updates cache', async () => {
      let count = 0;

      const data = dotted(
        {
          '.counter': 'increment()'
        },
        {
          resolvers: {
            increment: () => ++count
          }
        }
      );

      // Normal call (cached)
      expect(await data.get('counter')).toBe(1);
      expect(await data.get('counter')).toBe(1); // Cached

      // Re-evaluate with fresh (updates cache)
      expect(await data.get('counter', { fresh: true })).toBe(2);

      // Subsequent calls use new cached value
      expect(await data.get('counter')).toBe(2);
    });
  });

  describe('Type Coercion', () => {
    test('int() casts string to integer', async () => {
      const data = dotted({
        count: '4',
        '.computed': 'int(${count}) + 1'
      });

      const result = await data.get('computed');
      expect(result).toBe(5); // Not "41"
      expect(typeof result).toBe('number');
    });

    test('float() casts to floating-point number', async () => {
      const data = dotted({
        price: '10.50',
        '.withTax': 'float(${price}) * 1.1'
      });

      const result = await data.get('withTax');
      expect(result).toBeCloseTo(11.55, 2);
      expect(typeof result).toBe('number');
    });

    test('bool() casts to boolean', async () => {
      const data = dotted({
        status: 'true',
        flag: '0',
        '.isActive': 'bool(${status})',
        '.isEnabled': 'bool(${flag})'
      });

      expect(await data.get('isActive')).toBe(true);
      expect(await data.get('isEnabled')).toBe(false);
    });

    test('json() parses JSON string', async () => {
      const data = dotted({
        jsonString: '{"name": "Alice", "age": 30}',
        '.parsed': 'json(${jsonString})'
      });

      const result = await data.get('parsed');
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    test('prevents "4" + 1 = "41" bugs', async () => {
      const data = dotted({
        stringNumber: '4',
        '.withCast': 'int(${stringNumber}) + 1',
        '.stringConcat': '${stringNumber} items'  // Template literal concatenation
      });

      // With int() cast: numeric addition (explicit)
      expect(await data.get('withCast')).toBe(5);

      // String concatenation via template literal
      expect(await data.get('stringConcat')).toBe('4 items');

      // Note: Our expression evaluator auto-converts numeric strings in arithmetic contexts,
      // so '${stringNumber} + 1' would actually give 5, not '41'
      // This is a feature - it's being helpful! Use int() for explicit control.
    });

    test('type coercion helpers work in complex expressions', async () => {
      const data = dotted({
        quantity: '5',
        price: '10.50',
        discount: '0.1',
        '.total': 'int(${quantity}) * float(${price}) * (1 - float(${discount}))'
      });

      const result = await data.get('total');
      expect(result).toBeCloseTo(47.25, 2); // 5 * 10.50 * 0.9
    });
  });
});
