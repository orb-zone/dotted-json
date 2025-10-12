/**
 * Core dotted-json functionality tests
 *
 * Following TDD principle - these tests should be written BEFORE implementation
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('dotted-json core', () => {
  describe('Basic functionality', () => {
    test('creates a dotted object from plain JSON', async () => {
      const data = dotted({ name: 'Alice', age: 30 });
      expect(await data.get('name')).toBe('Alice');
      expect(await data.get('age')).toBe(30);
    });

    test('returns undefined for non-existent keys', async () => {
      const data = dotted({ name: 'Alice' });
      expect(await data.get('missing')).toBeUndefined();
    });

    test('supports nested property access with dot notation', async () => {
      const data = dotted({
        user: {
          profile: {
            name: 'Bob',
          },
        },
      });
      expect(await data.get('user.profile.name')).toBe('Bob');
    });

    test('has() checks for property existence', async () => {
      const data = dotted({ name: 'Charlie' });
      expect(await data.has('name')).toBe(true);
      expect(await data.has('missing')).toBe(false);
    });

    test('set() updates values', async () => {
      const data = dotted({ count: 1 });
      await data.set('count', 5);
      expect(await data.get('count')).toBe(5);
    });
  });

  describe('Expression evaluation', () => {
    test('evaluates template literal expressions', async () => {
      const data = dotted({
        firstName: 'John',
        lastName: 'Doe',
        '.fullName': '${firstName} ${lastName}',
      });
      expect(await data.get('.fullName')).toBe('John Doe');
    });

    test('evaluates nested expressions', async () => {
      const data = dotted({
        a: 1,
        b: 2,
        '.sum': '${a + b}',
        '.double': '${.sum * 2}',
      });
      expect(await data.get('.sum')).toBe(3);
      expect(await data.get('.double')).toBe(6);
    });

    test('only evaluates expressions when accessed (lazy evaluation)', async () => {
      let called = false;
      const data = dotted(
        {
          '.computed': 'sideEffect()',
        },
        {
          resolvers: {
            sideEffect: () => {
              called = true;
              return 'value';
            },
          },
        }
      );

      // Not accessed yet
      expect(called).toBe(false);

      // Now access it
      await data.get('.computed');
      expect(called).toBe(true);
    });

    test('caches evaluated expressions by default', async () => {
      let callCount = 0;
      const data = dotted(
        {
          '.expensive': 'compute()',
        },
        {
          resolvers: {
            compute: () => {
              callCount++;
              return 'result';
            },
          },
        }
      );

      await data.get('.expensive');
      await data.get('.expensive');
      await data.get('.expensive');

      expect(callCount).toBe(1); // Only called once due to caching
    });
  });

  describe('Resolver functions', () => {
    test('calls resolver functions with arguments', async () => {
      const data = dotted(
        {
          userId: 123,
          '.user': 'fetchUser(${userId})',
        },
        {
          resolvers: {
            fetchUser: async (id: number) => ({ id, name: 'User' + id }),
          },
        }
      );

      const user = await data.get('.user');
      expect(user).toEqual({ id: 123, name: 'User123' });
    });

    test('supports nested resolver namespaces', async () => {
      const data = dotted(
        {
          '.data': 'db.users.find(1)',
        },
        {
          resolvers: {
            db: {
              users: {
                find: async (id: number) => ({ id, name: 'Alice' }),
              },
            },
          },
        }
      );

      expect(await data.get('.data')).toEqual({ id: 1, name: 'Alice' });
    });

    test('passes multiple arguments to resolvers', async () => {
      const data = dotted(
        {
          x: 5,
          y: 10,
          '.sum': 'add(${x}, ${y})',
        },
        {
          resolvers: {
            add: (a: number, b: number) => a + b,
          },
        }
      );

      expect(await data.get('.sum')).toBe(15);
    });
  });

  describe('Error handling', () => {
    test('returns errorDefault when expression throws', async () => {
      const data = dotted(
        {
          '.failing': 'fail()',
        },
        {
          errorDefault: 'fallback',
          resolvers: {
            fail: () => {
              throw new Error('Test error');
            },
          },
        }
      );

      expect(await data.get('.failing')).toBe('fallback');
    });

    test('returns property-level default over errorDefault', async () => {
      const data = dotted(
        {
          '.a': 'fail()',
        },
        {
          errorDefault: 'global',
          default: 'property-default',
          resolvers: {
            fail: () => {
              throw new Error('Test error');
            },
          },
        }
      );

      expect(await data.get('.a')).toBe('property-default');
    });

    test('propagates errors when no errorDefault is set', async () => {
      const data = dotted(
        {
          '.failing': 'fail()',
        },
        {
          resolvers: {
            fail: () => {
              throw new Error('Expected error');
            },
          },
        }
      );

      await expect(data.get('.failing')).rejects.toThrow('Expected error');
    });
  });

  describe('Cycle detection (Constitution Principle VI)', () => {
    test('detects direct cycles', async () => {
      const data = dotted({
        '.a': '${.a}',
      });

      await expect(data.get('.a')).rejects.toThrow(/cycle|circular/i);
    });

    test('detects indirect cycles', async () => {
      const data = dotted({
        '.a': '${.b}',
        '.b': '${.c}',
        '.c': '${.a}',
      });

      await expect(data.get('.a')).rejects.toThrow(/cycle|circular/i);
    });

    test('allows same property accessed multiple times in different branches', async () => {
      const data = dotted({
        x: 5,
        '.a': '${x}',
        '.b': '${x}',
        '.c': '${.a} + ${.b}',
      });

      expect(await data.get('.c')).toBe('5 + 5');
    });
  });

  describe('Evaluation depth limit (Constitution Principle VI)', () => {
    test('enforces maxEvaluationDepth', async () => {
      const data = dotted(
        {
          '.a': '${.b}',
          '.b': '${.c}',
          '.c': '${.d}',
          '.d': '${.e}',
          '.e': 'final',
        },
        {
          maxEvaluationDepth: 3,
        }
      );

      await expect(data.get('.a')).rejects.toThrow(/depth|recursion/i);
    });

    test('allows deep nesting within limit', async () => {
      const data = dotted(
        {
          '.a': '${.b}',
          '.b': '${.c}',
          '.c': 'final',
        },
        {
          maxEvaluationDepth: 10,
        }
      );

      expect(await data.get('.a')).toBe('final');
    });
  });

  describe('Initial values and defaults', () => {
    test('accepts initial values in options', () => {
      const data = dotted(
        {
          '.computed': '${x} * 2',
        },
        {
          initial: { x: 5 },
        }
      );

      expect(data.get('.computed')).resolves.toBe(10);
    });

    test('uses default value for missing properties', async () => {
      const data = dotted(
        {
          name: 'Alice',
        },
        {
          default: 'N/A',
        }
      );

      expect(await data.get('missing')).toBe('N/A');
    });
  });
});
