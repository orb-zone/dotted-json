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
    const result = parseVariantPath('.bio:es:surfer');
    expect(result.variants.lang).toBe('es');
    expect(result.variants.surfer).toBe('surfer');
  });

  test('parses complex multi-dimensional variants', () => {
    const result = parseVariantPath('.bio:es-MX:f:formal:aws');
    expect(result.variants.lang).toBe('es-MX');
    expect(result.variants.gender).toBe('f');
    expect(result.variants.form).toBe('formal');  // Now a well-known variant
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

describe('Form (formality) variants', () => {
  test('parses form variant', () => {
    const parsed = parseVariantPath('.greeting:polite');
    expect(parsed.base).toBe('.greeting');
    expect(parsed.variants.form).toBe('polite');
  });

  test('parses combined lang and form variants', () => {
    const parsed = parseVariantPath('.greeting:ja:polite');
    expect(parsed.base).toBe('.greeting');
    expect(parsed.variants.lang).toBe('ja');
    expect(parsed.variants.form).toBe('polite');
  });

  test('recognizes standard form levels', () => {
    expect(parseVariantPath('.x:casual').variants.form).toBe('casual');
    expect(parseVariantPath('.x:informal').variants.form).toBe('informal');
    expect(parseVariantPath('.x:neutral').variants.form).toBe('neutral');
    expect(parseVariantPath('.x:polite').variants.form).toBe('polite');
    expect(parseVariantPath('.x:formal').variants.form).toBe('formal');
    expect(parseVariantPath('.x:honorific').variants.form).toBe('honorific');
  });

  test('scores form match correctly (50 points)', () => {
    const score = scoreVariantMatch(
      { form: 'polite' },
      { form: 'polite' }
    );
    expect(score).toBe(50);
  });

  test('prioritizes lang > gender > form > custom', () => {
    const langScore = scoreVariantMatch({ lang: 'ja' }, { lang: 'ja' });
    const genderScore = scoreVariantMatch({ gender: 'f' }, { gender: 'f' });
    const formScore = scoreVariantMatch({ form: 'polite' }, { form: 'polite' });
    const customScore = scoreVariantMatch({ tone: 'casual' }, { tone: 'casual' });

    expect(langScore).toBe(1000);
    expect(genderScore).toBe(100);
    expect(formScore).toBe(50);
    expect(customScore).toBe(10);
    expect(langScore > genderScore).toBe(true);
    expect(genderScore > formScore).toBe(true);
    expect(formScore > customScore).toBe(true);
  });

  test('combines lang + form + gender scoring', () => {
    const score = scoreVariantMatch(
      { lang: 'ja', gender: 'f', form: 'polite' },
      { lang: 'ja', gender: 'f', form: 'polite' }
    );
    expect(score).toBe(1150); // 1000 + 100 + 50
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
        variants: { lang: 'es', form: 'formal' }  // form is now a well-known variant
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

  test('supports Japanese formality levels (keigo)', async () => {
    const data = dotted(
      {
        '.greeting': 'Hello',
        '.greeting:ja': 'こんにちは',           // Casual
        '.greeting:ja:polite': 'おはようございます',    // Polite (teineigo)
        '.greeting:ja:honorific': 'いらっしゃいませ'    // Honorific (keigo)
      },
      {
        variants: { lang: 'ja', form: 'honorific' }
      }
    );

    expect(await data.get('.greeting')).toBe('いらっしゃいませ');
  });

  test('supports Korean formality (jondaemal)', async () => {
    const data = dotted(
      {
        '.question': 'How are you?',
        '.question:ko': '어떻게 지내?',        // Informal (banmal)
        '.question:ko:formal': '어떻게 지내세요?'  // Formal (jondaemal)
      },
      {
        variants: { lang: 'ko', form: 'formal' }
      }
    );

    expect(await data.get('.question')).toBe('어떻게 지내세요?');
  });

  test('supports German formality (Sie vs du)', async () => {
    const data = dotted(
      {
        '.you': 'you',
        '.you:de': 'du',              // Informal
        '.you:de:formal': 'Sie'        // Formal
      },
      {
        variants: { lang: 'de', form: 'formal' }
      }
    );

    expect(await data.get('.you')).toBe('Sie');
  });

  test('combines lang + form + gender for Japanese', async () => {
    const data = dotted(
      {
        '.title': 'Teacher',
        '.title:ja': '先生',
        '.title:ja:polite': '先生様',
        '.title:ja:polite:f': '女性先生様'
      },
      {
        variants: { lang: 'ja', form: 'polite', gender: 'f' }
      }
    );

    expect(await data.get('.title')).toBe('女性先生様');
  });

  test('form variant falls back gracefully', async () => {
    const data = dotted(
      {
        '.greeting': 'Hello',
        '.greeting:ja': 'こんにちは'
        // No :polite variant
      },
      {
        variants: { lang: 'ja', form: 'polite' }
      }
    );

    // Should fall back to .greeting:ja (lang match, no form match)
    expect(await data.get('.greeting')).toBe('こんにちは');
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
