/**
 * File Inheritance Example
 *
 * Demonstrates the self-reference pattern with extends() for
 * file-based schema inheritance and composition.
 */

import { dotted } from '@orbzone/dotted-json';
import { withFileSystem } from '@orbzone/dotted-json/plugins/filesystem';

// Example 1: Basic file inheritance with self-reference
const heroCard = dotted(
  {
    // Self-reference: merge base schema here
    '.': 'extends("base-hero")',

    // Override/add properties
    name: 'Superman',
    power: 9000,
    weakness: 'Kryptonite',
  },
  {
    ...withFileSystem({
      baseDir: './data/cards',
      extensions: ['.jsön', '.json'],
    }),
  }
);

console.log('=== Example 1: Basic File Inheritance ===');
console.log('Hero Card:', await heroCard.get('.'));
// Expected: Base properties merged with overrides

// Example 2: Multiple inheritance layers
const specialHero = dotted(
  {
    '.': 'extends("hero-with-powers")', // Itself extends base-hero
    specialAbility: 'Time Travel',
    team: 'Justice League',
  },
  {
    ...withFileSystem({
      baseDir: './data/cards',
    }),
  }
);

console.log('\n=== Example 2: Nested Inheritance ===');
console.log('Special Hero:', await specialHero.get('.'));

// Example 3: Path resolution with aliases
const cardData = dotted(
  {
    '.': 'extends("@shared/character-base")',
    character: 'Wonder Woman',
  },
  {
    ...withFileSystem({
      baseDir: './data',
      searchPaths: ['./cards', './shared'],
      aliases: {
        '@shared': './shared/templates',
        '@cards': './data/cards',
      },
    }),
  }
);

console.log('\n=== Example 3: Path Resolution with Aliases ===');
console.log('Card with Alias:', await cardData.get('.'));

// Example 4: Conditional extension
const dynamicCard = dotted(
  {
    cardType: 'villain',
    '.': 'extends(${cardType === "hero" ? "base-hero" : "base-villain"})',
    name: 'Lex Luthor',
  },
  {
    ...withFileSystem({
      baseDir: './data/cards',
    }),
  }
);

console.log('\n=== Example 4: Conditional Extension ===');
console.log('Dynamic Card:', await dynamicCard.get('.'));

// Example 5: Multiple self-references (composition)
const composedCard = dotted(
  {
    '.': 'merge(extends("base-hero"), extends("has-superpowers"))',
    name: 'Flash',
    speed: 'infinite',
  },
  {
    ...withFileSystem({
      baseDir: './data/cards',
    }),
    resolvers: {
      merge: (...objects: any[]) => {
        return Object.assign({}, ...objects);
      },
    },
  }
);

console.log('\n=== Example 5: Composition with Multiple Extends ===');
console.log('Composed Card:', await composedCard.get('.'));

/**
 * Example base files that would exist in ./data/cards/
 *
 * base-hero.jsön:
 * {
 *   "type": "hero",
 *   "alignment": "good",
 *   "health": 100,
 *   "abilities": []
 * }
 *
 * base-villain.jsön:
 * {
 *   "type": "villain",
 *   "alignment": "evil",
 *   "health": 100,
 *   "minions": []
 * }
 *
 * hero-with-powers.jsön:
 * {
 *   ".": "extends('base-hero')",
 *   "powers": ["flight", "strength"],
 *   "powerLevel": 5000
 * }
 */
