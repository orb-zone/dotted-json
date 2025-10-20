/**
 * Hierarchical context support tests
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('Hierarchical context support', () => {
  test('merges root and child contexts for pronoun resolution', async () => {
    const data = dotted({
      '.context': { lang: 'en' },
      users: {
        alice: {
          '.context': { gender: 'f' },
          '.greeting': 'Hello, I am ${:subject}'
        },
        bob: {
          '.context': { gender: 'm' },
          '.greeting': 'Hello, I am ${:subject}'
        }
      }
    });

    expect(await data.get('users.alice.greeting')).toBe('Hello, I am she');
    expect(await data.get('users.bob.greeting')).toBe('Hello, I am he');
  });

  test('selects variants using path-specific context', async () => {
    const data = dotted({
      users: {
        alice: {
          '.context': { lang: 'es' },
          '.greeting': 'Hello',
          '.greeting:es': 'Hola'
        },
        bob: {
          '.context': { lang: 'en' },
          '.greeting': 'Hello',
          '.greeting:es': 'Hola'
        }
      }
    });

    expect(await data.get('users.alice.greeting')).toBe('Hola');
    expect(await data.get('users.bob.greeting')).toBe('Hello');
  });

  test('merges global variants with hierarchical context', async () => {
    const data = dotted(
      {
        '.context': { lang: 'en' },
        users: {
          alice: {
            '.context': { gender: 'f' },
            '.salutation': 'Hi',
            '.salutation:formal': 'Good day',
            '.bio': '${:subject} is ready'
          }
        }
      },
      {
        variants: { form: 'formal' }
      }
    );

    expect(await data.get('users.alice.salutation')).toBe('Good day');
    expect(await data.get('users.alice.bio')).toBe('she is ready');
  });

  test('ignores invalid context values', async () => {
    const data = dotted(
      {
        user: {
          '.context': 'invalid',
          '.greeting': 'Hello, I am ${:subject}'
        }
      },
      {
        variants: { gender: 'm' }
      }
    );

    expect(await data.get('user.greeting')).toBe('Hello, I am he');
  });

  test('supports expression-based context values', async () => {
    const data = dotted(
      {
        '.context': { lang: 'en' },
        user: {
          '.context': '${makeContext()}',
          '.greeting': 'Hello, I am ${:subject}'
        }
      },
      {
        resolvers: {
          makeContext: () => ({ gender: 'f' })
        }
      }
    );

    expect(await data.get('user.greeting')).toBe('Hello, I am she');
  });
});
