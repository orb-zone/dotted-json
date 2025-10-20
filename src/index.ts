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
import { getProperty as dotGet, setProperty as dotSet } from 'dot-prop';

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
/**
 * Create a scoped proxy for nested object access
 * This allows nested objects to have .get(), .set(), etc. methods
 * and resolves paths relative to the nested context
 */
function createScopedProxy(instance: DottedJson, path: string[] = []): any {
  // Create a proxy that intercepts property access
  return new Proxy({}, {
    get(_target: any, prop: string | symbol) {
      // Handle symbols and special properties
      if (typeof prop === 'symbol' || prop === 'constructor' || prop === 'then') {
        return undefined;
      }

      // If property is a DottedJson method, create a scoped version
      if (prop === 'get' || prop === 'set' || prop === 'has') {
        const method = (instance as any)[prop].bind(instance);
        return function(relativePath: string, ...args: any[]) {
          // Resolve path relative to current scope
          const fullPath = path.length > 0 
            ? `${path.join('.')}.${relativePath}` 
            : relativePath;
          
          // Call the method on the root instance
          return method(fullPath, ...args);
        };
      }

      // Get the current data value at this path
      const currentPath = path.length > 0 ? path.join('.') : '';
      const currentData = currentPath ? dotGet(instance.data, currentPath) : instance.data;
      
      if (!currentData || typeof currentData !== 'object') {
        return undefined;
      }

      // Get the value of this property
      const value = currentData[prop];
      
      // If value is an object (not null, not array), wrap it in a scoped proxy
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return createScopedProxy(instance, [...path, prop]);
      }
      
      return value;
    },

    set(_target: any, prop: string | symbol, value: any) {
      // Only allow setting data properties, not methods
      if (typeof prop === 'string') {
        const currentPath = path.length > 0 ? path.join('.') : '';
        const fullPath = currentPath ? `${currentPath}.${prop}` : prop;
        dotSet(instance.data, fullPath, value);
        return true;
      }
      return false;
    }
  });
}

export function dotted(schema: Record<string, any>, options?: DottedOptions): any {
  const instance = new DottedJson(schema, options);

  // Create the root proxy with scoped access
  return createScopedProxy(instance);
}
