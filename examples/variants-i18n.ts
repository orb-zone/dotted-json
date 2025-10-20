/**
 * Variant System Examples
 *
 * Demonstrates language variants, gender-aware pronouns, and multi-dimensional
 * content adaptation using the dotted-json tree-walking variant system.
 */

import { dotted } from '../src/index.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('  Variant System Examples - @orb-zone/dotted-json v1.1.0');
console.log('═══════════════════════════════════════════════════════════\n');

// ============================================================================
// Example 1: Basic Language Variants with Automatic Resolution
// ============================================================================
console.log('Example 1: Basic Language Variants with Automatic Resolution\n');

// Store language as a regular data property, variants are resolved automatically
const greetings = dotted({
  lang: 'en', // Language stored as regular data
  '.greeting': 'Hello, World!',
  '.greeting:es': '¡Hola, Mundo!',
  '.greeting:fr': 'Bonjour, le Monde!',
  '.greeting:de': 'Hallo, Welt!'
});

console.log('English:', await greetings.get('.greeting'));

// Spanish version - just change the lang property
const greetingsES = dotted({
  lang: 'es',
  '.greeting': 'Hello, World!',
  '.greeting:es': '¡Hola, Mundo!',
  '.greeting:fr': 'Bonjour, le Monde!',
  '.greeting:de': 'Hallo, Welt!'
});

console.log('Spanish:', await greetingsES.get('.greeting'));

// French version
const greetingsFR = dotted({
  lang: 'fr',
  '.greeting': 'Hello, World!',
  '.greeting:es': '¡Hola, Mundo!',
  '.greeting:fr': 'Bonjour, le Monde!',
  '.greeting:de': 'Hallo, Welt!'
});

console.log('French:', await greetingsFR.get('.greeting'));

// ============================================================================
// Example 2: Gender-Aware Pronouns with Automatic Resolution
// ============================================================================
console.log('\n\nExample 2: Gender-Aware Pronouns with Automatic Resolution\n');

// Store gender as regular data property, variants resolved automatically
const profiles = {
  gender: 'm', // Default gender at root level
  '.bio': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
  '.bio:f': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
  name: 'Alex',
  role: 'developer',
  users: {
    alice: {
      gender: 'f', // Overrides root gender for this user
      '.bio': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
      '.bio:f': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
      name: 'Alice',
      role: 'engineer'
    },
    bob: {
      gender: 'm', // Same as root, but explicit
      '.bio': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
      '.bio:f': '${name} is a ${role}. ${:subject} loves coding and ${:possessive} work is excellent.',
      name: 'Bob',
      role: 'designer'
    }
  }
};

const bioDefault = dotted(profiles);
console.log('Default (male) pronouns:', await bioDefault.get('.bio'));

const bioAlice = dotted(profiles);
console.log('Alice (female) pronouns:', await bioAlice.get('users.alice.bio'));

const bioBob = dotted(profiles);
console.log('Bob (male) pronouns:', await bioBob.get('users.bob.bio'));

// ============================================================================
// Example 3: Combined Language + Gender Variants with Automatic Resolution
// ============================================================================
console.log('\n\nExample 3: Combined Language + Gender Variants with Automatic Resolution\n');

// Store language and gender as regular data properties, variants resolved automatically
const authorTitles = dotted({
  lang: 'es',
  gender: 'f',
  '.title': 'Author',
  '.title:es': 'Autor',
  '.title:es:f': 'Autora',
  '.title:fr': 'Auteur',
  '.title:fr:f': 'Auteure',
  '.title:de': 'Autor',
  '.title:de:f': 'Autorin'
});

console.log('Spanish Female:', await authorTitles.get('.title'));

const authorTitlesFR = dotted({
  lang: 'fr',
  gender: 'f',
  '.title': 'Author',
  '.title:es': 'Autor',
  '.title:es:f': 'Autora',
  '.title:fr': 'Auteur',
  '.title:fr:f': 'Auteure',
  '.title:de': 'Autor',
  '.title:de:f': 'Autorin'
});

console.log('French Female:', await authorTitlesFR.get('.title'));

// ============================================================================
// Example 4: Multi-Dimensional Variants with Automatic Resolution
// ============================================================================
console.log('\n\nExample 4: Multi-Dimensional Variants with Automatic Resolution\n');

// Multiple dimensions stored as regular properties, variants resolved automatically
const contextualGreetings = dotted({
  lang: 'es',
  context: 'surfer',
  '.greeting': 'Hello',
  '.greeting:es': 'Hola',
  '.greeting:es:surfer': '¡Buenas olas!',
  '.greeting:fr': 'Bonjour',
  '.greeting:fr:formal': 'Bonjour, comment allez-vous?',
  '.greeting:fr:casual': 'Salut!'
});

console.log('Spanish Surfer:', await contextualGreetings.get('.greeting'));

const greetingsFormal = dotted({
  lang: 'es',
  formality: 'formal',
  '.greeting': 'Hello',
  '.greeting:es': 'Hola',
  '.greeting:es:formal': 'Buenos días',
  '.greeting:es:casual': '¿Qué tal?'
});

console.log('Spanish Formal:', await greetingsFormal.get('.greeting'));

// ============================================================================
// Example 5: Custom Dimension with Automatic Resolution (Cloud Provider)
// ============================================================================
console.log('\n\nExample 5: Custom Dimension with Automatic Resolution (Cloud Provider)\n');

// Cloud provider stored as regular data property, variants resolved automatically
const errorMessages = dotted({
  provider: 'aws',
  '.error': 'Service unavailable',
  '.error:aws': 'AWS Lambda timeout - check CloudWatch logs',
  '.error:gcp': 'GCP Cloud Functions error - check Stackdriver',
  '.error:azure': 'Azure Functions error - check Application Insights'
});

console.log('AWS Error:', await errorMessages.get('.error'));

const errorGCP = dotted({
  provider: 'gcp',
  '.error': 'Service unavailable',
  '.error:aws': 'AWS Lambda timeout - check CloudWatch logs',
  '.error:gcp': 'GCP Cloud Functions error - check Stackdriver',
  '.error:azure': 'Azure Functions error - check Application Insights'
});

console.log('GCP Error:', await errorGCP.get('.error'));

// ============================================================================
// Example 6: Automatic Resolution Makes Order Irrelevant
// ============================================================================
console.log('\n\nExample 6: Automatic Resolution Makes Order Irrelevant\n');

// With automatic resolution, order doesn't matter - just reference the properties
const orderTest = dotted({
  lang: 'es',
  gender: 'f',
  '.bio': 'Default bio',
  '.bio:es:f': 'Bio en español para mujer'
});

console.log('Automatic resolution (no order dependency):', await orderTest.get('.bio'));

// ============================================================================
// Example 7: Real-World Blog Post with Automatic Resolution
// ============================================================================
console.log('\n\nExample 7: Real-World Blog Post with Automatic Resolution\n');

// Automatic resolution allows variants to be resolved from any ancestor
const blogPost = dotted({
  lang: 'es',
  author: {
    name: 'María García',
    gender: 'f',
    '.title': 'Author',
    '.title:es:f': 'Autora',
    '.bio': '${author.name} is a writer. ${:subject} has published ${bookCount} books.',
    '.bio:es': '${author.name} es escritora. ${:subject} ha publicado ${bookCount} libros.',
    '.bio:es:f': '${author.name} es una escritora destacada. ${:subject} ha publicado ${bookCount} libros y ${:possessive} trabajo es reconocido internacionalmente.'
  },
  bookCount: 12
});

console.log('Title:', await blogPost.get('author.title'));
console.log('Bio:', await blogPost.get('author.bio'));

// ============================================================================
// Example 8: Fallback Behavior with Automatic Resolution
// ============================================================================
console.log('\n\nExample 8: Fallback Behavior with Automatic Resolution\n');

// Automatic resolution provides fallback logic automatically
const fallbackTest = dotted({
  lang: 'de', // German not available
  '.message': 'Default message',
  '.message:es': 'Mensaje en español',
  '.message:fr': 'Message en français'
});

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
