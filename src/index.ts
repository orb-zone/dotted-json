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

export type {
  StorageProvider,
  SaveOptions,
  DocumentInfo,
  ListFilter,
  MergeStrategy
} from './types/storage.js';

export type {
  LiveAction,
  LiveUpdateEvent,
  PerformanceMetrics
} from './loaders/surrealdb.js';

// Note: Loaders are available via separate export paths to keep core bundle small
// import { FileLoader } from '@orbzone/dotted-json/loaders/file'
// import { SurrealDBLoader } from '@orbzone/dotted-json/loaders/surrealdb'
//
// Plugins are available via separate export paths:
// import { withZod } from '@orbzone/dotted-json/plugins/zod'
// import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb'
// import { withPiniaColada } from '@orbzone/dotted-json/plugins/pinia-colada'
// import { withSurrealDBPinia } from '@orbzone/dotted-json/plugins/surrealdb-pinia'

import { DottedJson } from './dotted-json.js';
import type { DottedOptions } from './types.js';

/**
 * Create a dotted JSON object with lazy expression evaluation
 */
export function dotted(schema: Record<string, any>, options?: DottedOptions): any {
  return new DottedJson(schema, options);
}
