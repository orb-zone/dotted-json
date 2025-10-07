/**
 * Storage provider types for JSÖN document persistence
 *
 * @module @orbzone/dotted-json/types/storage
 */

import type { VariantContext } from '../types.js';

// Optional Zod import (peer dependency)
// Will be properly typed if zod is installed
type ZodType = any;

/**
 * Merge strategy for save operations
 */
export type MergeStrategy = 'replace' | 'merge' | 'deep-merge';

/**
 * Storage provider interface for JSÖN documents
 *
 * All storage backends (filesystem, SurrealDB, etc.) implement this interface
 * for consistent load/save operations with variant resolution.
 */
export interface StorageProvider {
  /**
   * Initialize provider (connect, authenticate, pre-scan, etc.)
   */
  init(): Promise<void>;

  /**
   * Load JSÖN document with variant resolution
   *
   * @param baseName - Document identifier (e.g., 'app-settings', 'strings')
   * @param variants - Variant context for resolution (lang, env, userId, etc.)
   * @returns Parsed JSÖN document
   *
   * @example
   * ```typescript
   * // Loads best matching file: strings:es:formal.jsön
   * const data = await loader.load('strings', { lang: 'es', form: 'formal' });
   * ```
   */
  load(baseName: string, variants?: VariantContext): Promise<any>;

  /**
   * Save JSÖN document
   *
   * @param baseName - Document identifier
   * @param data - JSÖN document to save
   * @param variants - Variant context for storage
   * @param options - Provider-specific save options
   *
   * @example
   * ```typescript
   * // Saves to: strings:es:formal.jsön
   * await loader.save('strings', data, { lang: 'es', form: 'formal' });
   * ```
   */
  save(baseName: string, data: any, variants?: VariantContext, options?: SaveOptions): Promise<void>;

  /**
   * List available documents (optional)
   *
   * @param filter - Filter criteria (e.g., { baseName: 'strings' })
   * @returns Array of document identifiers with variants
   *
   * @example
   * ```typescript
   * // List all 'strings' documents
   * const docs = await loader.list({ baseName: 'strings' });
   * // [{ baseName: 'strings', variants: { lang: 'en' }, ... }]
   * ```
   */
  list?(filter?: ListFilter): Promise<DocumentInfo[]>;

  /**
   * Delete document (optional)
   *
   * @param baseName - Document identifier
   * @param variants - Variant context
   *
   * @example
   * ```typescript
   * // Deletes: strings:es:formal.jsön
   * await loader.delete('strings', { lang: 'es', form: 'formal' });
   * ```
   */
  delete?(baseName: string, variants?: VariantContext): Promise<void>;

  /**
   * Subscribe to document changes (optional, for real-time providers)
   *
   * @param baseName - Document identifier
   * @param variants - Variant context
   * @param callback - Called when document changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = await loader.subscribe('config', { env: 'prod' }, (data) => {
   *   console.log('Config updated:', data);
   * });
   *
   * // Later: stop listening
   * await unsubscribe();
   * ```
   */
  subscribe?(
    baseName: string,
    variants: VariantContext | undefined,
    callback: (data: any) => void
  ): Promise<() => void>;

  /**
   * Cleanup resources (close connections, clear caches, etc.)
   */
  close(): Promise<void>;
}

/**
 * Options for save operations
 */
export interface SaveOptions {
  /**
   * Create if doesn't exist, update if exists
   * @default true
   */
  upsert?: boolean;

  /**
   * Validate document before saving (with Zod schema)
   *
   * @example
   * ```typescript
   * import { z } from 'zod';
   *
   * const ConfigSchema = z.object({
   *   apiUrl: z.string().url(),
   *   timeout: z.number().positive()
   * });
   *
   * await loader.save('config', data, { env: 'prod' }, {
   *   schema: ConfigSchema  // Validates before saving
   * });
   * ```
   */
  schema?: ZodType;

  /**
   * Merge with existing document or replace entirely
   * @default 'replace'
   *
   * - `replace`: Overwrite entire document
   * - `merge`: Shallow merge (Object.assign)
   * - `deep-merge`: Deep merge (recursive)
   */
  strategy?: MergeStrategy;

  /**
   * Provider-specific metadata
   *
   * Examples:
   * - File: { permissions: 0o644 }
   * - SurrealDB: { created_by: 'user:alice', tags: ['production'] }
   */
  metadata?: Record<string, any>;

  /**
   * Pretty-print JSON output (filesystem only)
   * @default true
   */
  pretty?: boolean;
}

/**
 * Document metadata returned by list()
 */
export interface DocumentInfo {
  /**
   * Base document name (without variants)
   */
  baseName: string;

  /**
   * Variant context
   */
  variants: VariantContext;

  /**
   * Full document name (e.g., 'strings:es:formal')
   */
  fullName: string;

  /**
   * File path (filesystem) or Record ID (SurrealDB)
   */
  identifier: string;

  /**
   * Optional metadata
   */
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
    author?: string;
    size?: number;
    [key: string]: any;
  };
}

/**
 * Filter criteria for list()
 */
export interface ListFilter {
  /**
   * Filter by base name
   */
  baseName?: string;

  /**
   * Filter by specific variant values
   *
   * @example
   * ```typescript
   * // Find all Spanish documents
   * await loader.list({ variants: { lang: 'es' } });
   * ```
   */
  variants?: Partial<VariantContext>;

  /**
   * Filter by metadata
   *
   * @example
   * ```typescript
   * // Find documents created by user:alice
   * await loader.list({ metadata: { author: 'user:alice' } });
   * ```
   */
  metadata?: Record<string, any>;
}
