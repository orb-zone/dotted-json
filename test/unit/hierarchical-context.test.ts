/**
 * Hierarchical context support tests
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('Tree-walking variant resolution', () => {
  test('crawls up hierarchy to find variant values for pronoun resolution', async () => {
    const data = dotted({
      lang: 'en',
      users: {
        alice: {
          gender: 'f',
          '.greeting': 'Hello, I am ${:subject}'
        },
        bob: {
          gender: 'm',
          '.greeting': 'Hello, I am ${:subject}'
        }
      }
    });

    expect(await data.get('users.alice.greeting')).toBe('Hello, I am she');
    expect(await data.get('users.bob.greeting')).toBe('Hello, I am he');
  });

  test('selects variants using global context (tree-walking removed)', async () => {
    const data = dotted({
      lang: 'es',
      users: {
        alice: {
          '.greeting': '${..lang === "es" ? "Hola" : "Hello"}'
        },
        bob: {
          '.greeting': '${..lang === "es" ? "Hola" : "Hello"}'
        }
      }
    });

    expect(await data.get('users.alice.greeting')).toBe('Hola');
    expect(await data.get('users.bob.greeting')).toBe('Hola');
  });

  test('uses tree-walking for variant resolution in expressions', async () => {
    const data = dotted({
      users: {
        alice: {
          gender: 'f',
          form: 'formal',
          '.salutation': '${.form === "formal" ? "Good day" : "Hi"}',
          '.bio': '${:subject} is ready'
        }
      }
    });

    expect(await data.get('users.alice.salutation')).toBe('Good day');
    expect(await data.get('users.alice.bio')).toBe('she is ready');
  });

  test('uses tree-walking to find variants in data hierarchy', async () => {
    const data = dotted({
      gender: 'm',
      user: {
        '.greeting': 'Hello, I am ${:subject}'
      }
    });

    expect(await data.get('user.greeting')).toBe('Hello, I am he');
  });

  test('supports tree-walking for dynamic variant lookup', async () => {
    const data = dotted(
      {
        lang: 'en',
        user: {
          gender: 'f',
          '.greeting': 'Hello, I am ${:subject}'
        }
      }
    );

    expect(await data.get('user.greeting')).toBe('Hello, I am she');
  });
});
