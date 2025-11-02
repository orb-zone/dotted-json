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
      // Result is proxy-wrapped, access properties directly
      expect(user.id).toBe(123);
      expect(user.name).toBe('User123');
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

      const result = await data.get('.data');
      // Result is proxy-wrapped, access properties directly
      expect(result.id).toBe(1);
      expect(result.name).toBe('Alice');
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

    test('call-level fallback overrides instance fallback', async () => {
      const data = dotted(
        {
          '.a': 'fail()',
        },
        {
          fallback: 'instance-fallback',
          resolvers: {
            fail: () => {
              throw new Error('Test error');
            },
          },
        }
      );

      // Instance fallback
      expect(await data.get('.a')).toBe('instance-fallback');
      
      // Override with call-level fallback
      expect(await data.get('.a', { fallback: 'call-fallback' })).toBe('call-fallback');
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

  describe('Parent references (..)', () => {
    test('accesses parent property with .. notation', async () => {
      const data = dotted({
        x: 10,
        nested: {
          '.value': '${..x}',
        },
      });
      expect(await data.get('nested.value')).toBe(10);
    });

    test('accesses grandparent property with multiple .. levels', async () => {
      const data = dotted({
        root: 'ROOT',
        level1: {
          level2: {
            '.value': '${...root}',
          },
        },
      });
      expect(await data.get('level1.level2.value')).toBe('ROOT');
    });

    test('parent reference in array access', async () => {
      const data = dotted({
        items: [1, 2, 3],
        nested: {
          '.first': '${..items[0]}',
        },
      });
      expect(await data.get('nested.first')).toBe(1);
    });
  });

  describe('Array operations', () => {
    test('array indexing in expressions', async () => {
      const data = dotted({
        '.numbers': '[1, 2, 3, 4, 5]',
        '.third': '${.numbers[2]}',
      });
      expect(await data.get('.third')).toBe(3);
    });

    test('array spread operator', async () => {
      const data = dotted({
        '.original': '[1, 2, 3]',
        '.spread': '[0, ...${.original}, 4]',
      });
      expect(await data.get('.spread')).toEqual([0, 1, 2, 3, 4]);
    });

    test('chained array methods', async () => {
      const data = dotted({
        '.ids': '"12345"',
        '.sorted': '[...String(${.ids}).split("").sort()]',
      });
      const result = await data.get('.sorted');
      expect(result).toEqual(['1', '2', '3', '4', '5']);
    });

    test('array negative indexing', async () => {
      const data = dotted({
        '.arr': '[1, 2, 3, 4, 5]',
        '.last': '${.arr[.arr.length - 1]}',
      });
      expect(await data.get('.last')).toBe(5);
    });
  });

  describe('Complex template literals', () => {
    test('backtick templates with multiple interpolations', async () => {
      const data = dotted({
        x: 10,
        y: 20,
        '.path': '`M${x} ${y} L${x + 5} ${y + 5}`',
      });
      expect(await data.get('.path')).toBe('M10 20 L15 25');
    });

    test('nested template interpolations', async () => {
      const data = dotted({
        '.id': '42',
        '.nested': '`value-${`id-${.id}`}`',
      });
      expect(await data.get('.nested')).toBe('value-id-42');
    });

    test('template with parent reference', async () => {
      const data = dotted({
        value: 5,
        paths: {
          '.dynamic': '`M12 ${..value} L14 ${..value + 2}`',
        },
      });
      expect(await data.get('paths.dynamic')).toBe('M12 5 L14 7');
    });
  });

  describe('Method chaining', () => {
    test('chains array methods on expression results', async () => {
      const data = dotted({
        '.text': '"hello"',
        '.transformed': '${.text}.toUpperCase().split("").reverse().join("")',
      });
      expect(await data.get('.transformed')).toBe('OLLEH');
    });

    test('chains with intermediate computations', async () => {
      const data = dotted({
        '.num': '123',
        '.result': 'String(${.num}).split("").map(x => Number(x) * 2).join("")',
      });
      expect(await data.get('.result')).toBe('246');
    });
  });

  describe('Built-in resolvers', () => {
    test('Date.now() resolver', async () => {
      const data = dotted(
        {
          '.timestamp': 'Date.now()',
        },
        {
          resolvers: {
            Date: {
              now: () => 1234567890,
            },
          },
        }
      );
      expect(await data.get('.timestamp')).toBe(1234567890);
    });

    test('Math resolvers', async () => {
      const data = dotted(
        {
          '.random': 'Math.floor(Math.random() * 100)',
        },
        {
          resolvers: {
            Math: {
              floor: Math.floor,
              random: () => 0.5, // Mock for deterministic testing
            },
          },
        }
      );
      expect(await data.get('.random')).toBe(50);
    });
  });

  describe('Complex real-world patterns', () => {
    test('combines parent refs, array access, and templates', async () => {
      const data = dotted({
        '.id': '12345',
        '.dateDesc': '[...String(${.id}).split("").sort()]',
        paths: {
          star: 'M12 2 L15 10',
          '.starArm': '`M12 ${..dateDesc[1]} L14 12`',
        },
      });

      expect(await data.get('.dateDesc')).toEqual(['1', '2', '3', '4', '5']);
      expect(await data.get('paths.starArm')).toBe('M12 2 L14 12');
    });

    test('nested computed properties with mixed access', async () => {
      const data = dotted({
        config: {
          base: 10,
          '.computed': '${..config.base} * 2',
        },
      });
      expect(await data.get('config.computed')).toBe(20);
    });
  });

  describe('Advanced error handling', () => {
    test('throws on undefined parent reference', async () => {
      const data = dotted({
        nested: {
          '.invalid': '${..nonexistent}',
        },
      });
      await expect(data.get('nested.invalid')).rejects.toThrow();
    });

    test('handles array out of bounds gracefully', async () => {
      const data = dotted({
        '.arr': '[1, 2, 3]',
        '.outOfBounds': '${.arr[10]}',
      });
      const result = await data.get('.outOfBounds');
      expect(result).toBeUndefined();
    });
  });
});
