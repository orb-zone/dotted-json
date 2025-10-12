/**
 * Pronoun resolution for gender-aware text
 *
 * Supports pronoun placeholders in expressions:
 * - ${:subject} → he/she/they
 * - ${:object} → him/her/them
 * - ${:possessive} → his/her/their
 * - ${:reflexive} → himself/herself/themselves
 *
 * @module @orb-zone/dotted-json/pronouns
 */

export type Gender = 'm' | 'f' | 'x';
export type PronounForm = 'subject' | 'object' | 'possessive' | 'reflexive';

/**
 * Pronoun map by language and gender
 */
export const PRONOUNS: Record<string, Record<Gender, Record<PronounForm, string>>> = {
  en: {
    m: {
      subject: 'he',
      object: 'him',
      possessive: 'his',
      reflexive: 'himself'
    },
    f: {
      subject: 'she',
      object: 'her',
      possessive: 'her',
      reflexive: 'herself'
    },
    x: {
      subject: 'they',
      object: 'them',
      possessive: 'their',
      reflexive: 'themselves'
    }
  },
  // Add more languages as needed
  // es, fr, etc. would go here
};

/**
 * Resolve a pronoun placeholder
 *
 * @param form - Pronoun form (subject, object, possessive, reflexive)
 * @param gender - Gender context (m/f/x)
 * @param lang - Language code (default: 'en')
 * @returns Resolved pronoun
 *
 * @example
 * ```typescript
 * resolvePronoun('subject', 'f', 'en')  // → 'she'
 * resolvePronoun('possessive', 'x', 'en')  // → 'their'
 * ```
 */
export function resolvePronoun(
  form: PronounForm,
  gender: Gender = 'x',
  lang = 'en'
): string {
  const langPronouns = PRONOUNS[lang] || PRONOUNS.en;
  if (!langPronouns) return 'they';  // Fallback if no pronouns found
  const genderPronouns = langPronouns[gender] || langPronouns.x;
  if (!genderPronouns) return 'they';  // Fallback if no gender pronouns found
  return genderPronouns[form] || 'they';  // Fallback to neutral
}

/**
 * Check if a string is a pronoun placeholder
 *
 * Matches patterns like: :subject, :object, :possessive, :reflexive
 */
export function isPronounPlaceholder(value: string): boolean {
  return /^:(subject|object|possessive|reflexive)$/.test(value);
}

/**
 * Extract pronoun form from placeholder
 *
 * @example
 * ':subject' → 'subject'
 * ':possessive' → 'possessive'
 */
export function extractPronounForm(placeholder: string): PronounForm | null {
  const match = placeholder.match(/^:(subject|object|possessive|reflexive)$/);
  return match ? (match[1] as PronounForm) : null;
}
