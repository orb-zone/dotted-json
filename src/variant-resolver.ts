/**
 * Variant resolution for localization and conditional content
 *
 * Supports flexible variant dimensions:
 * - Well-known: lang (ISO codes), gender (m/f/x), form (formality levels)
 * - Custom: dialect, tone, source, etc.
 *
 * @module @orbzone/dotted-json/variant-resolver
 */

import type { VariantContext } from './types.js';

/**
 * Parsed variant information from a property path
 */
export interface ParsedVariants {
  base: string;
  variants: VariantContext;
}

/**
 * Well-known variant patterns for auto-detection
 */
const VARIANT_PATTERNS = {
  // ISO 639-1 language codes (en, es) with optional region (en-US, es-MX)
  lang: /^[a-z]{2}(-[A-Z]{2})?$/,

  // Gender: m (masculine), f (feminine), x (neutral/non-binary)
  gender: /^[mfx]$/,

  // Formality/honorific level: casual, informal, neutral, polite, formal, honorific
  form: /^(casual|informal|neutral|polite|formal|honorific)$/,
};

/**
 * Parse a property path into base name and variant dimensions
 *
 * @example
 * ```typescript
 * parseVariantPath('.bio:es:f:formal')
 * // → { base: '.bio', variants: { lang: 'es', gender: 'f', formal: 'formal' } }
 *
 * parseVariantPath('.greeting:en:surfer')
 * // → { base: '.greeting', variants: { lang: 'en', surfer: 'surfer' } }
 * ```
 */
export function parseVariantPath(path: string): ParsedVariants {
  const parts = path.split(':');
  const base = parts[0] || '';
  const variants: VariantContext = {};

  // Parse each variant segment
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Check well-known patterns first
    if (VARIANT_PATTERNS.lang.test(part)) {
      variants.lang = part;
    } else if (VARIANT_PATTERNS.gender.test(part)) {
      variants.gender = part as 'm' | 'f' | 'x';
    } else if (VARIANT_PATTERNS.form.test(part)) {
      variants.form = part;
    } else {
      // Custom variant dimension (use value as both key and value)
      variants[part] = part;
    }
  }

  return { base, variants };
}

/**
 * Score how well a set of path variants matches the context
 *
 * Higher score = better match
 *
 * Scoring weights:
 * - lang match: 1000 points (highest - language is primary)
 * - gender match: 100 points (high - affects pronouns)
 * - form match: 50 points (medium - affects formality/honorifics)
 * - custom variant match: 10 points each (lower - domain-specific)
 */
export function scoreVariantMatch(
  pathVariants: VariantContext,
  contextVariants: VariantContext
): number {
  let score = 0;

  // Well-known variants (higher priority)
  if (pathVariants.lang && pathVariants.lang === contextVariants.lang) {
    score += 1000;
  }

  if (pathVariants.gender && pathVariants.gender === contextVariants.gender) {
    score += 100;
  }

  if (pathVariants.form && pathVariants.form === contextVariants.form) {
    score += 50;
  }

  // Custom variant dimensions
  for (const [key, value] of Object.entries(pathVariants)) {
    if (key !== 'lang' && key !== 'gender' && key !== 'form') {
      if (contextVariants[key] === value) {
        score += 10;
      }
    }
  }

  return score;
}

/**
 * Count how many variants are in pathVariants but not matching contextVariants
 *
 * Used as tiebreaker when scores are equal - prefer fewer mismatches/extras
 *
 * Counts as "extra" if:
 * 1. Variant exists in path but not in context
 * 2. Variant exists in both but values don't match (mismatch)
 *
 * @example
 * ```typescript
 * countExtraVariants({ lang: 'es', form: 'formal' }, { lang: 'es' })
 * // → 1 (form is extra - not in context)
 *
 * countExtraVariants({ lang: 'es', form: 'formal' }, { lang: 'es', form: 'casual' })
 * // → 1 (form is mismatch - different values)
 *
 * countExtraVariants({ lang: 'es' }, { lang: 'es' })
 * // → 0 (perfect match)
 * ```
 */
function countExtraVariants(
  pathVariants: VariantContext,
  contextVariants: VariantContext
): number {
  let count = 0;

  for (const [key, value] of Object.entries(pathVariants)) {
    const contextValue = contextVariants[key];

    // Not in context, or value mismatch
    if (contextValue === undefined || contextValue !== value) {
      count++;
    }
  }

  return count;
}

/**
 * Find the best matching property path from available candidates
 *
 * @param basePath - Base property name (e.g., '.bio')
 * @param context - Current variant context
 * @param availablePaths - All property paths in the data
 * @returns Best matching path, or basePath if no better match
 *
 * @example
 * ```typescript
 * const context = { lang: 'es', gender: 'f' };
 * const available = ['.bio', '.bio:es', '.bio:f', '.bio:es:f'];
 *
 * resolveVariantPath('.bio', context, available);
 * // → '.bio:es:f' (best match: lang + gender)
 * ```
 */
export function resolveVariantPath(
  basePath: string,
  context: VariantContext,
  availablePaths: string[]
): string {
  if (!context || Object.keys(context).length === 0) {
    return basePath;  // No context, return base path
  }

  // Find all paths that match the base
  const candidates = availablePaths
    .filter(p => {
      const { base } = parseVariantPath(p);
      return base === basePath;
    })
    .map(p => {
      const { variants } = parseVariantPath(p);
      return {
        path: p,
        variants,
        score: scoreVariantMatch(variants, context),
        // Count extra variants (in path but not in context)
        extraVariants: countExtraVariants(variants, context)
      };
    })
    .filter(c => c.score > 0)  // Only include paths with at least one matching variant
    .sort((a, b) => {
      // Primary sort: score (descending - higher is better)
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      // Tiebreaker: fewer extra variants (ascending - lower is better)
      return a.extraVariants - b.extraVariants;
    });

  // Return best match, or base path if no variants matched
  return candidates.length > 0 && candidates[0] ? candidates[0].path : basePath;
}

/**
 * Get all available property paths from data object
 *
 * Recursively collects all property paths including nested ones
 */
export function getAvailablePaths(data: Record<string, any>, prefix = ''): string[] {
  const paths: string[] = [];

  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    const fullPath = prefix ? `${prefix}.${key}` : key;
    paths.push(fullPath);

    // Recursively get nested paths (but not for dot-prefixed expressions)
    const value = data[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && !key.startsWith('.')) {
      paths.push(...getAvailablePaths(value, fullPath));
    }
  }

  return paths;
}
