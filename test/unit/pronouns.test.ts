/**
 * Pronoun placeholder tests
 *
 * Tests for gender-aware pronoun resolution in expressions
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';
import { resolvePronoun, isPronounPlaceholder, extractPronounForm } from '../../src/pronouns.js';

describe('Pronoun helper functions', () => {
  test('detects pronoun placeholders', () => {
    expect(isPronounPlaceholder(':subject')).toBe(true);
    expect(isPronounPlaceholder(':object')).toBe(true);
    expect(isPronounPlaceholder(':possessive')).toBe(true);
    expect(isPronounPlaceholder(':reflexive')).toBe(true);
    expect(isPronounPlaceholder('subject')).toBe(false);
    expect(isPronounPlaceholder(':invalid')).toBe(false);
  });

  test('extracts pronoun forms', () => {
    expect(extractPronounForm(':subject')).toBe('subject');
    expect(extractPronounForm(':object')).toBe('object');
    expect(extractPronounForm(':possessive')).toBe('possessive');
    expect(extractPronounForm(':reflexive')).toBe('reflexive');
    expect(extractPronounForm(':invalid')).toBeNull();
    expect(extractPronounForm('subject')).toBeNull();
  });

  test('resolves masculine pronouns', () => {
    expect(resolvePronoun('subject', 'm')).toBe('he');
    expect(resolvePronoun('object', 'm')).toBe('him');
    expect(resolvePronoun('possessive', 'm')).toBe('his');
    expect(resolvePronoun('reflexive', 'm')).toBe('himself');
  });

  test('resolves feminine pronouns', () => {
    expect(resolvePronoun('subject', 'f')).toBe('she');
    expect(resolvePronoun('object', 'f')).toBe('her');
    expect(resolvePronoun('possessive', 'f')).toBe('her');
    expect(resolvePronoun('reflexive', 'f')).toBe('herself');
  });

  test('resolves non-binary pronouns', () => {
    expect(resolvePronoun('subject', 'x')).toBe('they');
    expect(resolvePronoun('object', 'x')).toBe('them');
    expect(resolvePronoun('possessive', 'x')).toBe('their');
    expect(resolvePronoun('reflexive', 'x')).toBe('themselves');
  });

  test('defaults to non-binary when gender not specified', () => {
    expect(resolvePronoun('subject')).toBe('they');
    expect(resolvePronoun('object')).toBe('them');
  });
});

describe('Pronoun placeholders in expressions', () => {
  test('resolves subject pronoun in template literal', async () => {
    const data = dotted(
      {
        name: 'Alice',
        '.bio': '${name} is a developer. ${:subject} loves coding.'
      },
      {
        variants: { gender: 'f' }
      }
    );

    expect(await data.get('.bio')).toBe('Alice is a developer. she loves coding.');
  });

  test('resolves possessive pronoun', async () => {
    const data = dotted(
      {
        name: 'Bob',
        '.bio': '${name} is known for ${:possessive} work in AI.'
      },
      {
        variants: { gender: 'm' }
      }
    );

    expect(await data.get('.bio')).toBe('Bob is known for his work in AI.');
  });

  test('resolves object pronoun', async () => {
    const data = dotted(
      {
        name: 'Charlie',
        '.bio': 'Everyone respects ${name}. We admire ${:object}.'
      },
      {
        variants: { gender: 'x' }
      }
    );

    expect(await data.get('.bio')).toBe('Everyone respects Charlie. We admire them.');
  });

  test('resolves reflexive pronoun', async () => {
    const data = dotted(
      {
        name: 'Dana',
        '.bio': '${name} taught ${:reflexive} to code.'
      },
      {
        variants: { gender: 'f' }
      }
    );

    expect(await data.get('.bio')).toBe('Dana taught herself to code.');
  });

  test('resolves multiple pronouns in one expression', async () => {
    const data = dotted(
      {
        name: 'Eve',
        '.bio': '${name} is brilliant. ${:subject} created ${:possessive} own framework by ${:reflexive}.'
      },
      {
        variants: { gender: 'f' }
      }
    );

    expect(await data.get('.bio')).toBe('Eve is brilliant. she created her own framework by herself.');
  });

  test('defaults to they/them when no gender specified', async () => {
    const data = dotted({
      name: 'Alex',
      '.bio': '${name} is talented. ${:subject} built ${:possessive} startup ${:reflexive}.'
    });

    expect(await data.get('.bio')).toBe('Alex is talented. they built their startup themselves.');
  });

  test('works with variant + pronoun combination', async () => {
    const data = dotted(
      {
        name: 'María',
        '.bio': '${name} is an author. ${:subject} writes ${:possessive} books.',
        '.bio:es': '${name} es autora. ${:subject} escribe ${:possessive} libros.'
      },
      {
        variants: { lang: 'es', gender: 'f' }
      }
    );

    // Note: Currently pronoun resolution is English-only
    // Spanish variant is selected, but pronouns resolve to English
    expect(await data.get('.bio')).toBe('María es autora. she escribe her libros.');
  });

  test('handles capitalization via custom wrapper', async () => {
    const data = dotted(
      {
        name: 'Frank',
        '.bio': '${name} codes. ${:subject} is great.'
      },
      {
        variants: { gender: 'm' }
      }
    );

    const bio = await data.get('.bio');
    // Capitalize first letter after period
    const formatted = bio.replace(/\.\s+(\w)/g, (match: string, letter: string) => `. ${letter.toUpperCase()}`);

    expect(formatted).toBe('Frank codes. He is great.');
  });
});

describe('Pronoun edge cases', () => {
  test('handles invalid pronoun placeholder gracefully', async () => {
    const data = dotted(
      {
        '.bio': 'Test ${:invalid} placeholder'
      },
      {
        variants: { gender: 'f' }
      }
    );

    // Invalid placeholders should be left as-is
    expect(await data.get('.bio')).toBe('Test ${:invalid} placeholder');
  });

  test('handles pronoun with no colon prefix', async () => {
    const data = dotted(
      {
        subject: 'topic',
        '.bio': 'The ${subject} is interesting'
      },
      {
        variants: { gender: 'f' }
      }
    );

    // Regular variable, not a pronoun placeholder
    expect(await data.get('.bio')).toBe('The topic is interesting');
  });

  test('handles nested pronoun references', async () => {
    const data = dotted(
      {
        author: 'Grace',
        '.title': '${author}',
        '.bio': '${.title} is amazing. ${:subject} inspires others.'
      },
      {
        variants: { gender: 'f' }
      }
    );

    expect(await data.get('.bio')).toBe('Grace is amazing. she inspires others.');
  });
});
