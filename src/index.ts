/**
 * dotted-json (jsön) - Dynamic JSON data expansion using dot-prefixed property keys
 *
 * @module @orb-zone/dotted-json
 * @license MIT
 * @see https://github.com/orb-zone/dotted-json
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
  ValidationResult,
  ValidationConfig
} from './schema-validator.js';

export {
  validateSchema,
  assertValidSchema
} from './schema-validator.js';

export type {
  LogLevel,
  LogEntry,
  LoggerConfig
} from './logger.js';

export {
  getLogger,
  logWarn,
  logError,
  logDebug,
  logInfo
} from './logger.js';

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
// import { FileLoader } from '@orb-zone/dotted-json/loaders/file'
// import { SurrealDBLoader } from '@orb-zone/dotted-json/loaders/surrealdb'
//
// Plugins are available via separate export paths:
// import { withZod } from '@orb-zone/dotted-json/plugins/zod'
// import { withSurrealDB } from '@orb-zone/dotted-json/plugins/surrealdb'
// import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada'
// import { withSurrealDBPinia } from '@orb-zone/dotted-json/plugins/surrealdb-pinia'

import { DottedJson } from './dotted-json.js';
import type { DottedOptions } from './types.js';
import { createScopedProxy } from './scoped-proxy.js';

/**
 * Create a dotted JSON object with lazy expression evaluation.
 *
 * Dotted JSON allows you to define JSON schemas with special dot-prefixed property keys
 * that contain expressions. These expressions are evaluated lazily when accessed, with
 * results cached for performance.
 *
 * @param schema - JSON object with optional dot-prefixed expression keys
 * @param options - Configuration options
 * @returns DottedJson proxy object for lazy evaluation
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { dotted } from '@orb-zone/dotted-json';
 *
 * const data = dotted({
 *   user: {
 *     name: 'Alice',
 *     '.greeting': 'Hello, ${user.name}!'
 *   }
 * });
 *
 * await data.get('user.greeting');  // "Hello, Alice!"
 * ```
 *
 * @example
 * With resolvers:
 * ```typescript
 * const data = dotted({
 *   user: { id: 123 },
 *   '.profile': 'db.users.findById(${user.id})'
 * }, {
 *   resolvers: {
 *     db: {
 *       users: {
 *         findById: async (id: number) => ({
 *           id,
 *           email: `user${id}@example.com`
 *         })
 *       }
 *     }
 *   }
 * });
 *
 * await data.get('profile.email');  // "user123@example.com"
 * ```
 *
 * @example
 * With variants (i18n):
 * ```typescript
 * const data = dotted({
 *   '.strings': 'extends("strings")'
 * }, {
 *   resolvers: {
 *     extends: async (baseName: string) => {
 *       return await loader.load(baseName, { lang: 'es', form: 'formal' });
 *     }
 *   }
 * });
 *
 * await data.get('strings.welcome');  // "¡Bienvenido!"
 * ```
 *
 * @see {@link DottedOptions} for configuration options
 * @see {@link DottedJson} for instance methods
 */

export function dotted(schema: Record<string, any>, options?: DottedOptions): any {
  const instance = new DottedJson(schema, options);

  // Create the root proxy with scoped access
  return createScopedProxy(instance);
}
