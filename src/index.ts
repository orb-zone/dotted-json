/**
 * dotted-json (jsön) - Dynamic JSON data expansion using dot-prefixed property keys
 *
 * @module @orbzone/dotted-json
 * @license MIT
 * @see https://github.com/orbzone/dotted-json
 */

export type { DottedOptions, GetOptions, SetOptions, HasOptions, DottedJson } from './types.js';

import { DottedJson } from './dotted-json.js';
import type { DottedOptions } from './types.js';

/**
 * Create a dotted JSON object with lazy expression evaluation
 */
export function dotted(schema: Record<string, any>, options?: DottedOptions): any {
  return new DottedJson(schema, options);
}
