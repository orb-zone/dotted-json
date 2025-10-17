/**
 * File Inheritance Example
 *
 * Demonstrates file-based schema inheritance and composition
 * using FileLoader with extends() pattern.
 *
 * NOTE: This example requires data files in ./data/cards/ directory.
 * For a simpler demonstration without file dependencies, see basic-usage.ts
 */

import { dotted } from '@orb-zone/dotted-json';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

// Initialize FileLoader for card data
const loader = new FileLoader({
  baseDir: './data/cards',
  extensions: ['.jsön', '.json'],
});
await loader.init();

// Example 1: Basic file inheritance with extends()
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
    resolvers: {
      extends: async (baseName: string) => {
        // Load and merge base schema
        return await loader.load(baseName);
      },
    },
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
    resolvers: {
      extends: async (baseName: string) => loader.load(baseName),
    },
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
    resolvers: {
      extends: async (baseName: string) => {
        // Handle alias-based paths
        const resolvedPath = baseName.replace('@shared/', 'shared/templates/');
        return await loader.load(resolvedPath);
      },
    },
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
    resolvers: {
      extends: async (baseName: string) => loader.load(baseName),
    },
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
    resolvers: {
      extends: async (baseName: string) => loader.load(baseName),
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
