/**
 * Scoped proxy for nested object access in dotted-json
 *
 * Creates a proxy wrapper that:
 * - Provides .get(), .set(), .has() methods at any depth
 * - Automatically wraps nested objects in proxies
 * - Resolves paths relative to the current scope
 * - Remains bound to the root DottedJson instance
 *
 * @module scoped-proxy
 */

import type { DottedJson } from './dotted-json.js';
import { getProperty as dotGet, setProperty as dotSet } from 'dot-prop';

/**
 * Create a scoped proxy for nested object access
 *
 * This allows nested objects to have .get(), .set(), etc. methods
 * and resolves paths relative to the nested context.
 *
 * All proxies created by this function share the same root DottedJson
 * instance, ensuring consistent data access and cache behavior.
 *
 * @param instance - The root DottedJson instance
 * @param path - Path array representing the current scope
 * @returns Proxy-wrapped object with method access
 *
 * @example
 * ```typescript
 * const data = dotted({ user: { name: 'Alice' } });
 *
 * // Both return equivalent proxies:
 * const user1 = data.user;                    // via property access
 * const user2 = await data.get('user');       // via .get() method
 *
 * // Both can call nested methods:
 * await user1.get('name');  // 'Alice'
 * await user2.get('name');  // 'Alice'
 * ```
 */
export function createScopedProxy(instance: DottedJson, path: string[] = [], data?: any): any {
  // Get the actual data at this path to determine the proxy target type
  const currentPath = path.length > 0 ? path.join('.') : '';
  const actualData = data ?? (currentPath ? dotGet(instance.data, currentPath) : instance.data);

  // Use the actual data as the proxy target
  // This ensures proxy invariants are satisfied (e.g., property descriptors match the target)
  const target = actualData;

  // Create a proxy that intercepts property access
  return new Proxy(target, {
    get(_target: any, prop: string | symbol) {
      // Handle symbols and special properties
      if (typeof prop === 'symbol' || prop === 'constructor' || prop === 'then') {
        return undefined;
      }

      // For arrays, handle numeric indices and array properties/methods
      if (Array.isArray(actualData)) {
        const isNumericIndex = typeof prop === 'string' && /^\d+$/.test(prop);
        const isArrayProperty = ['length', 'forEach', 'map', 'filter', 'reduce', 'find', 'includes', 'indexOf', 'join', 'slice', 'concat', 'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'every', 'some'].includes(prop as string);

        if (isNumericIndex || isArrayProperty) {
          const value = actualData[prop as any];
          // Bind array methods to actualData
          return typeof value === 'function' ? value.bind(actualData) : value;
        }
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

      // Use the actualData which was already resolved (either passed in or fetched)
      // This ensures we work with the correct object even when path is empty
      if (!actualData || typeof actualData !== 'object') {
        return undefined;
      }

      // Get the value of this property
      const value = actualData[prop];

      // If value is an object (including arrays), wrap it in a scoped proxy
      if (value !== null && typeof value === 'object') {
        return createScopedProxy(instance, [...path, prop], value);
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
    },

    // No need for ownKeys or getOwnPropertyDescriptor traps
    // since we're using actualData as the target
  });
}
