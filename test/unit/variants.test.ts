/**
 * Variant resolution tests
 *
 * Tests for flexible variant dimensions: lang, gender, and custom variants
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';
import { parseVariantPath, scoreVariantMatch, resolveVariantPath } from '../../src/variant-resolver.js';

describe('Variant parsing', () => {
  test('parses language variant', () => {
    const result = parseVariantPath('.bio:es');
    expect(result.base).toBe('.bio');
    expect(result.variants.lang).toBe('es');
  });

  test('parses language with region', () => {
    const result = parseVariantPath('.bio:es-MX');
    expect(result.base).toBe('.bio');
    expect(result.variants.lang).toBe('es-MX');
  });

  test('parses gender variant', () => {
    const result = parseVariantPath('.bio:f');
    expect(result.base).toBe('.bio');
    expect(result.variants.gender).toBe('f');
  });

  test('parses multiple variants (order-independent)', () => {
    const result1 = parseVariantPath('.bio:es:f');
    expect(result1.variants.lang).toBe('es');
    expect(result1.variants.gender).toBe('f');

    const result2 = parseVariantPath('.bio:f:es');
    expect(result2.variants.lang).toBe('es');
    expect(result2.variants.gender).toBe('f');
  });

  test('parses custom variants', () => {
    const result = parseVariantPath('.bio:es:formal');
    expect(result.variants.lang).toBe('es');
    expect(result.variants.formal).toBe('formal');
  });

  test('parses complex multi-dimensional variants', () => {
    const result = parseVariantPath('.bio:es-MX:f:formal:aws');
    expect(result.variants.lang).toBe('es-MX');
    expect(result.variants.gender).toBe('f');
    expect(result.variants.formal).toBe('formal');
    expect(result.variants.aws).toBe('aws');
  });
});

describe('Variant scoring', () => {
  test('scores exact lang match highly', () => {
    const score = scoreVariantMatch(
      { lang: 'es' },
      { lang: 'es' }
    );
    expect(score).toBe(1000);
  });

  test('scores gender match', () => {
    const score = scoreVariantMatch(
      { gender: 'f' },
      { gender: 'f' }
    );
    expect(score).toBe(100);
  });

  test('scores custom variant match', () => {
    const score = scoreVariantMatch(
      { formal: 'formal' },
      { formal: 'formal' }
    );
    expect(score).toBe(10);
  });

  test('scores multiple matches cumulatively', () => {
    const score = scoreVariantMatch(
      { lang: 'es', gender: 'f', formal: 'formal' },
      { lang: 'es', gender: 'f', formal: 'formal' }
    );
    expect(score).toBe(1110); // 1000 + 100 + 10
  });

  test('scores partial matches', () => {
    const score = scoreVariantMatch(
      { lang: 'es', gender: 'f' },
      { lang: 'es', gender: 'm' }  // Gender mismatch
    );
    expect(score).toBe(1000); // Only lang matches
  });

  test('scores no match as zero', () => {
    const score = scoreVariantMatch(
      { lang: 'es' },
      { lang: 'fr' }
    );
    expect(score).toBe(0);
  });
});

describe('Variant resolution', () => {
  test('resolves best matching variant', () => {
    const available = ['.bio', '.bio:es', '.bio:f', '.bio:es:f'];
    const result = resolveVariantPath(
      '.bio',
      { lang: 'es', gender: 'f' },
      available
    );
    expect(result).toBe('.bio:es:f');
  });

  test('falls back to partial match', () => {
    const available = ['.bio', '.bio:es'];
    const result = resolveVariantPath(
      '.bio',
      { lang: 'es', gender: 'f' },
      available
    );
    expect(result).toBe('.bio:es');
  });

  test('returns base path when no variants match', () => {
    const available = ['.bio', '.bio:fr'];
    const result = resolveVariantPath(
      '.bio',
      { lang: 'es' },
      available
    );
    expect(result).toBe('.bio');
  });

  test('handles custom variant dimensions', () => {
    const available = ['.greeting', '.greeting:en:surfer', '.greeting:en:formal'];
    const result = resolveVariantPath(
      '.greeting',
      { lang: 'en', surfer: 'surfer' },
      available
    );
    expect(result).toBe('.greeting:en:surfer');
  });

  test('prioritizes well-known variants over custom', () => {
    const available = ['.bio:es', '.bio:formal'];
    const result = resolveVariantPath(
      '.bio',
      { lang: 'es', formal: 'formal' },
      available
    );
    // lang match (1000 points) beats custom match (10 points)
    expect(result).toBe('.bio:es');
  });
});

describe('Variant integration in DottedJson', () => {
  test('resolves variant properties automatically', async () => {
    const data = dotted(
      {
        name: 'Default',
        'name:es': 'Español',
        'name:fr': 'Français'
      },
      {
        variants: { lang: 'es' }
      }
    );

    expect(await data.get('name')).toBe('Español');
  });

  test('supports gender variants', async () => {
    const data = dotted(
      {
        '.bio': 'The author is known',
        '.bio:f': 'She is known for her work',
        '.bio:m': 'He is known for his work',
        '.bio:x': 'They are known for their work'
      },
      {
        variants: { gender: 'f' }
      }
    );

    expect(await data.get('.bio')).toBe('She is known for her work');
  });

  test('supports multi-dimensional variants', async () => {
    const data = dotted(
      {
        '.greeting': 'Hello',
        '.greeting:es': 'Hola',
        '.greeting:es:formal': 'Buenos días',
        '.greeting:es:casual': '¡Ey!'
      },
      {
        variants: { lang: 'es', formal: 'formal' }
      }
    );

    expect(await data.get('.greeting')).toBe('Buenos días');
  });

  test('supports custom dimension variants', async () => {
    const data = dotted(
      {
        '.action': 'Attack',
        '.action:pirate': "Blast 'em!",
        '.action:cowboy': 'Draw!',
        '.action:surfer': 'Shred it!'
      },
      {
        variants: { pirate: 'pirate' }
      }
    );

    expect(await data.get('.action')).toBe("Blast 'em!");
  });

  test('falls back to default when variant not found', async () => {
    const data = dotted(
      {
        name: 'Default',
        'name:es': 'Español'
      },
      {
        variants: { lang: 'fr' }  // French not available
      }
    );

    expect(await data.get('name')).toBe('Default');
  });

  test('works without variant context', async () => {
    const data = dotted({
      name: 'Default',
      'name:es': 'Español'
    });

    expect(await data.get('name')).toBe('Default');
  });

  test('combines lang and gender variants', async () => {
    const data = dotted(
      {
        '.title': 'Author',
        '.title:es': 'Autor',
        '.title:es:f': 'Autora',
        '.title:es:m': 'Autor'
      },
      {
        variants: { lang: 'es', gender: 'f' }
      }
    );

    expect(await data.get('.title')).toBe('Autora');
  });

  test('variant resolution works with expressions', async () => {
    const data = dotted(
      {
        firstName: 'María',
        lastName: 'García',
        '.fullName': '${firstName} ${lastName}',
        '.fullName:es': '${firstName} ${lastName}',
        '.fullName:en': '${firstName} ${lastName}'
      },
      {
        variants: { lang: 'es' }
      }
    );

    expect(await data.get('.fullName')).toBe('María García');
  });
});
