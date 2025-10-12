/**
 * Variant System Examples
 *
 * Demonstrates language variants, gender-aware pronouns, and multi-dimensional
 * content adaptation using the dotted-json variant system.
 */

import { dotted } from '../src/index.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('  Variant System Examples - @orb-zone/dotted-json v0.2.0');
console.log('═══════════════════════════════════════════════════════════\n');

// ============================================================================
// Example 1: Basic Language Variants
// ============================================================================
console.log('Example 1: Basic Language Variants\n');

const greetings = dotted({
  '.greeting': 'Hello, World!',
  '.greeting:es': '¡Hola, Mundo!',
  '.greeting:fr': 'Bonjour, le Monde!',
  '.greeting:de': 'Hallo, Welt!'
});

console.log('English (default):', await greetings.get('.greeting'));

const greetingsES = dotted(
  {
    '.greeting': 'Hello, World!',
    '.greeting:es': '¡Hola, Mundo!',
    '.greeting:fr': 'Bonjour, le Monde!',
    '.greeting:de': 'Hallo, Welt!'
  },
  { variants: { lang: 'es' } }
);

console.log('Spanish:', await greetingsES.get('.greeting'));

const greetingsFR = dotted(
  {
    '.greeting': 'Hello, World!',
    '.greeting:es': '¡Hola, Mundo!',
    '.greeting:fr': 'Bonjour, le Monde!',
    '.greeting:de': 'Hallo, Welt!'
  },
  { variants: { lang: 'fr' } }
);

console.log('French:', await greetingsFR.get('.greeting'));

// ============================================================================
// Example 2: Gender-Aware Pronouns
// ============================================================================
console.log('\n\nExample 2: Gender-Aware Pronouns\n');

const profiles = {
  '.bio': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
  name: 'Alex',
  role: 'developer'
};

const bioMale = dotted(profiles, { variants: { gender: 'm' } });
console.log('Male pronouns:', await bioMale.get('.bio'));

const bioFemale = dotted(profiles, { variants: { gender: 'f' } });
console.log('Female pronouns:', await bioFemale.get('.bio'));

const bioNeutral = dotted(profiles, { variants: { gender: 'x' } });
console.log('Neutral pronouns:', await bioNeutral.get('.bio'));

// ============================================================================
// Example 3: Combined Language + Gender Variants
// ============================================================================
console.log('\n\nExample 3: Combined Language + Gender Variants\n');

const authorTitles = dotted(
  {
    '.title': 'Author',
    '.title:es': 'Autor',
    '.title:es:f': 'Autora',
    '.title:es:m': 'Autor',
    '.title:fr': 'Auteur',
    '.title:fr:f': 'Auteure',
    '.title:de': 'Autor',
    '.title:de:f': 'Autorin'
  },
  { variants: { lang: 'es', gender: 'f' } }
);

console.log('Spanish Female:', await authorTitles.get('.title'));

const authorTitlesFR = dotted(
  {
    '.title': 'Author',
    '.title:es': 'Autor',
    '.title:es:f': 'Autora',
    '.title:fr': 'Auteur',
    '.title:fr:f': 'Auteure'
  },
  { variants: { lang: 'fr', gender: 'f' } }
);

console.log('French Female:', await authorTitlesFR.get('.title'));

// ============================================================================
// Example 4: Multi-Dimensional Variants (Language + Custom Dimension)
// ============================================================================
console.log('\n\nExample 4: Multi-Dimensional Variants\n');

const contextualGreetings = dotted(
  {
    '.greeting': 'Hello',
    '.greeting:es': 'Hola',
    '.greeting:es:surfer': '¡Buenas olas!',
    '.greeting:fr': 'Bonjour',
    '.greeting:fr:formal': 'Bonjour, comment allez-vous?',
    '.greeting:fr:casual': 'Salut!'
  },
  { variants: { lang: 'es', surfer: 'surfer' } }
);

console.log('Spanish Surfer:', await contextualGreetings.get('.greeting'));

const greetingsFormal = dotted(
  {
    '.greeting': 'Hello',
    '.greeting:es': 'Hola',
    '.greeting:es:formal': 'Buenos días',
    '.greeting:es:casual': '¿Qué tal?'
  },
  { variants: { lang: 'es', formal: 'formal' } }
);

console.log('Spanish Formal:', await greetingsFormal.get('.greeting'));

// ============================================================================
// Example 5: Custom Dimension - Cloud Provider Messages
// ============================================================================
console.log('\n\nExample 5: Custom Dimension (Cloud Provider)\n');

const errorMessages = dotted(
  {
    '.error': 'Service unavailable',
    '.error:aws': 'AWS Lambda timeout - check CloudWatch logs',
    '.error:gcp': 'GCP Cloud Functions error - check Stackdriver',
    '.error:azure': 'Azure Functions error - check Application Insights'
  },
  { variants: { aws: 'aws' } }
);

console.log('AWS Error:', await errorMessages.get('.error'));

const errorGCP = dotted(
  {
    '.error': 'Service unavailable',
    '.error:aws': 'AWS Lambda timeout - check CloudWatch logs',
    '.error:gcp': 'GCP Cloud Functions error - check Stackdriver',
    '.error:azure': 'Azure Functions error - check Application Insights'
  },
  { variants: { gcp: 'gcp' } }
);

console.log('GCP Error:', await errorGCP.get('.error'));

// ============================================================================
// Example 6: Order-Independent Variant Syntax
// ============================================================================
console.log('\n\nExample 6: Order-Independent Variant Syntax\n');

const orderTest = dotted(
  {
    '.bio': 'Default bio',
    '.bio:es:f': 'Bio en español para mujer',
    '.bio:f:es': 'This variant should match the same as :es:f'
  },
  { variants: { lang: 'es', gender: 'f' } }
);

console.log('Order test (:es:f vs :f:es):', await orderTest.get('.bio'));

// ============================================================================
// Example 7: Real-World Blog Post
// ============================================================================
console.log('\n\nExample 7: Real-World Blog Post Example\n');

const blogPost = dotted(
  {
    author: {
      name: 'María García',
      '.title': 'Author',
      '.title:es:f': 'Autora',
      '.bio': '${author.name} is a writer. ${:subject} has published ${bookCount} books.',
      '.bio:es': '${author.name} es escritora. ${:subject} ha publicado ${bookCount} libros.',
      '.bio:es:f': '${author.name} es una escritora destacada. ${:subject} ha publicado ${bookCount} libros y ${:possessive} trabajo es reconocido internacionalmente.'
    },
    bookCount: 12
  },
  { variants: { lang: 'es', gender: 'f' } }
);

console.log('Title:', await blogPost.get('author.title'));
console.log('Bio:', await blogPost.get('author.bio'));

// ============================================================================
// Example 8: Fallback Behavior
// ============================================================================
console.log('\n\nExample 8: Fallback Behavior\n');

const fallbackTest = dotted(
  {
    '.message': 'Default message',
    '.message:es': 'Mensaje en español',
    '.message:fr': 'Message en français'
  },
  { variants: { lang: 'de' } } // German not available
);

console.log('German not available, falls back to default:', await fallbackTest.get('.message'));

// ============================================================================
// Example 9: Programmatic Pronoun Resolution
// ============================================================================
console.log('\n\nExample 9: Programmatic Pronoun Resolution\n');

import { resolvePronoun } from '../src/index.js';

console.log('Manual pronoun resolution:');
console.log('  he (subject, m):', resolvePronoun('subject', 'm'));
console.log('  her (possessive, f):', resolvePronoun('possessive', 'f'));
console.log('  themselves (reflexive, x):', resolvePronoun('reflexive', 'x'));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  All examples completed successfully!');
console.log('═══════════════════════════════════════════════════════════\n');
