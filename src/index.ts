/**
 * dotted-json (jsön) - Dynamic JSON data expansion using dot-prefixed property keys
 *
 * @module @orbzone/dotted-json
 * @license MIT
 * @see https://github.com/orbzone/dotted-json
 */

export type {
  DottedOptions,
  GetOptions,
  SetOptions,
  HasOptions,
  DottedJson,
  VariantContext
} from './types.js';

export type {
  Gender,
  PronounForm
} from './pronouns.js';

export {
  resolvePronoun,
  isPronounPlaceholder,
  extractPronounForm,
  PRONOUNS
} from './pronouns.js';

import { DottedJson } from './dotted-json.js';
import type { DottedOptions } from './types.js';

/**
 * Create a dotted JSON object with lazy expression evaluation
 */
export function dotted(schema: Record<string, any>, options?: DottedOptions): any {
  return new DottedJson(schema, options);
}
