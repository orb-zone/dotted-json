/**
 * File Loader Example: Variant-aware i18n file loading
 *
 * Demonstrates:
 * - Loading external JSON files with variant resolution
 * - Language-specific files (es, ja)
 * - Formality levels (formal, polite)
 * - Automatic fallback to base files
 * - Caching and performance optimization
 */

import { FileLoader } from '../src/loaders/file.js';

console.log('🌍 File Loader i18n Example\n');

// Example 1: Direct FileLoader usage
console.log('═══ Example 1: Basic File Loading with Variants ═══\n');

const loader = new FileLoader({
  baseDir: './examples/i18n-data',
  allowedVariants: {
    lang: ['en', 'es', 'ja'],
    form: ['casual', 'polite', 'formal']
  },
  preload: true,  // Pre-scan for better performance
  cache: true     // Cache loaded files
});

// Initialize (pre-scans directory)
await loader.init();

// Load English (base file)
const enStrings = await loader.load('strings');
console.log('English (base):', enStrings.greeting);

// Load Spanish
const esStrings = await loader.load('strings', { lang: 'es' });
console.log('Spanish:', esStrings.greeting);

// Load Spanish formal
const esFormalStrings = await loader.load('strings', { lang: 'es', form: 'formal' });
console.log('Spanish (formal):', esFormalStrings.greeting);

// Load Japanese
const jaStrings = await loader.load('strings', { lang: 'ja' });
console.log('Japanese:', jaStrings.greeting);

// Load Japanese polite (keigo)
const jaPoliteStrings = await loader.load('strings', { lang: 'ja', form: 'polite' });
console.log('Japanese (polite):', jaPoliteStrings.greeting);

console.log('\n═══ Example 2: Fallback Behavior ═══\n');

// When exact variant doesn't exist, falls back to closest match
const jaFormalStrings = await loader.load('strings', { lang: 'ja', form: 'formal' });
console.log('Japanese formal (falls back to casual):', jaFormalStrings.greeting);

// When language doesn't exist, falls back to base
const frStrings = await loader.load('strings', { lang: 'fr' });
console.log('French (falls back to English):', frStrings.greeting);

console.log('\n═══ Example 3: Multiple Dimensions ═══\n');

// Demonstrating how the scoring system prioritizes matches
console.log('Requesting: lang=es (no form specified)');
const esOnly = await loader.load('strings', { lang: 'es' });
console.log('  Result:', esOnly.greeting);
console.log('  (Chose strings:es.jsön over strings:es:formal.jsön)');

console.log('\nRequesting: lang=es, form=formal');
const esFormal = await loader.load('strings', { lang: 'es', form: 'formal' });
console.log('  Result:', esFormal.greeting);
console.log('  (Exact match: strings:es:formal.jsön)');

console.log('\n═══ Example 4: Cache Performance ═══\n');

const stats1 = loader.getCacheStats();
console.log('Cache entries after loading:', stats1.size);
console.log('Cache keys:', stats1.keys);

// Second load is instant (from cache)
console.time('Cached load');
await loader.load('strings', { lang: 'ja', form: 'polite' });
console.timeEnd('Cached load');

// Clear cache
loader.clearCache();
const stats2 = loader.getCacheStats();
console.log('Cache entries after clear:', stats2.size);

console.log('\n═══ Example 5: Security - Whitelist Protection ═══\n');

// Non-allowed language is filtered out, falls back to base
const ruStrings = await loader.load('strings', { lang: 'ru' });
console.log('Russian (not allowed, uses base):', ruStrings.greeting);
console.log('✅ Non-allowed language safely filtered');

// Path traversal attempt is filtered out, falls back to base
const attackStrings = await loader.load('strings', { lang: '../../../etc/passwd' });
console.log('Path traversal attempt (filtered, uses base):', attackStrings.greeting);
console.log('✅ Path traversal attempt safely blocked');

console.log('\n✅ All examples completed!');
