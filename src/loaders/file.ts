/**
 * Filesystem loader with variant-aware file resolution
 *
 * Automatically resolves variant-specific files based on context:
 * - Language: strings:es.jsön, strings:ja.jsön
 * - Formality: strings:ja:polite.jsön, strings:de:formal.jsön
 * - Gender: profile:f.jsön, profile:m.jsön
 * - Custom: strings:aws.jsön, strings:gcp.jsön
 *
 * @module @orbzone/dotted-json/loaders/file
 */

import { readFile, readdir, writeFile, unlink, stat } from 'fs/promises';
import { readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { resolveVariantPath, parseVariantPath, serializeVariantPath } from '../variant-resolver.js';
import type { VariantContext } from '../types.js';
import type { StorageProvider, SaveOptions, DocumentInfo, ListFilter } from '../types/storage.js';

/**
 * Allowed variants configuration
 *
 * Security: Prevents path traversal attacks via malicious variant values
 * Performance: Reduces unnecessary file system scans
 */
export interface AllowedVariants {
  lang?: string[];       // e.g., ['en', 'es', 'fr', 'de', 'ja', 'ko']
  gender?: ('m' | 'f' | 'x')[];
  form?: string[];       // e.g., ['casual', 'polite', 'formal', 'honorific']
  [key: string]: string[] | undefined;
}

export interface FileLoaderOptions {
  /**
   * Base directory for file resolution
   */
  baseDir: string;

  /**
   * File extensions to try (in order)
   * @default ['.jsön', '.json']
   */
  extensions?: string[];

  /**
   * Allowed variants for security and performance
   *
   * - Object: Allow specific values per variant dimension
   * - `true`: Allow any variant (sanitized for path safety)
   * - `undefined`: No variants allowed (base files only)
   *
   * @default undefined
   */
  allowedVariants?: AllowedVariants | true;

  /**
   * Pre-scan directory on initialization for performance
   *
   * Recommended: true (O(n) once vs O(variants) per load)
   * @default true
   */
  preload?: boolean;

  /**
   * Cache loaded file contents
   * @default true
   */
  cache?: boolean;

  /**
   * File encoding
   * @default 'utf-8'
   */
  encoding?: BufferEncoding;
}

/**
 * File loader with variant-aware resolution
 *
 * Implements StorageProvider interface for filesystem storage.
 *
 * @example
 * ```typescript
 * const loader = new FileLoader({
 *   baseDir: './i18n',
 *   allowedVariants: {
 *     lang: ['en', 'es', 'fr'],
 *     form: ['casual', 'polite', 'formal']
 *   }
 * });
 *
 * await loader.init();
 *
 * // Load: Loads best matching file: strings:es:formal.jsön
 * const data = await loader.load('strings', { lang: 'es', form: 'formal' });
 *
 * // Save: Writes to strings:es:formal.jsön
 * await loader.save('strings', data, { lang: 'es', form: 'formal' });
 *
 * // List: Get all documents
 * const docs = await loader.list();
 *
 * // Delete: Remove specific variant
 * await loader.delete('strings', { lang: 'es', form: 'formal' });
 * ```
 */
export class FileLoader implements StorageProvider {
  private availableFiles: Set<string> = new Set();
  private fileCache = new Map<string, any>();
  private options: Required<Omit<FileLoaderOptions, 'allowedVariants'>> & { allowedVariants?: AllowedVariants | true };
  private initialized = false;

  constructor(options: FileLoaderOptions) {
    this.options = {
      extensions: ['.jsön', '.json'],
      allowedVariants: undefined,
      preload: true,
      cache: true,
      encoding: 'utf-8',
      ...options
    };
  }

  /**
   * Initialize loader (pre-scan directory if enabled)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.options.preload) {
      await this.scanDirectory();
    }

    this.initialized = true;
  }

  /**
   * Pre-scan directory to find all available files
   *
   * Performance: O(n) once vs O(variants × extensions) per load
   */
  private async scanDirectory(): Promise<void> {
    try {
      const files = await readdir(this.options.baseDir);

      for (const file of files) {
        // Store filename without extension for variant matching
        const nameWithoutExt = this.removeExtension(file);
        if (nameWithoutExt) {
          this.availableFiles.add(nameWithoutExt);
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
      // Continue anyway - will fail on actual load
    }
  }

  /**
   * Synchronous scan for on-demand loading (when preload: false)
   */
  private scanDirectorySync(): void {
    try {
      const files = readdirSync(this.options.baseDir);

      for (const file of files) {
        const nameWithoutExt = this.removeExtension(file);
        if (nameWithoutExt) {
          this.availableFiles.add(nameWithoutExt);
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
      // Continue anyway - will fail on actual load
    }
  }

  /**
   * Load file with variant resolution
   *
   * @param baseName - Base filename without extension or variants
   * @param variants - Variant context for resolution
   * @returns Parsed file contents
   *
   * @example
   * ```typescript
   * // Tries: strings:es:f.jsön, strings:es.jsön, strings.jsön
   * await loader.load('strings', { lang: 'es', gender: 'f' })
   * ```
   */
  async load(baseName: string, variants: VariantContext = {}): Promise<any> {
    if (!this.initialized) {
      await this.init();
    }

    // 1. Validate variants against allowed list
    const validatedVariants = this.validateVariants(variants);

    // 2. Check cache
    const cacheKey = this.getCacheKey(baseName, validatedVariants);
    if (this.options.cache && this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey);
    }

    // 3. Resolve best matching file
    const resolvedFile = this.resolveFile(baseName, validatedVariants);
    if (!resolvedFile) {
      throw new Error(
        `File not found: ${baseName} (variants: ${JSON.stringify(validatedVariants)})`
      );
    }

    // 4. Load and parse file
    const data = await this.loadFile(resolvedFile);

    // 5. Cache result
    if (this.options.cache) {
      this.fileCache.set(cacheKey, data);
    }

    return data;
  }

  /**
   * Resolve which file to load based on available files and variant context
   *
   * Uses variant-resolver.ts scoring algorithm
   */
  private resolveFile(baseName: string, variants: VariantContext): string | null {
    // If no pre-scan, scan directory on-demand
    if (this.availableFiles.size === 0 && !this.options.preload) {
      this.scanDirectorySync();
    }

    // Get candidates matching this base name
    const candidates = Array.from(this.availableFiles).filter(file => {
      const parsed = parseVariantPath(file);
      return parsed.base === baseName;
    });

    if (candidates.length === 0) {
      return null;
    }

    // Use variant resolver to pick best match
    const bestMatch = resolveVariantPath(baseName, variants, candidates);

    // Find actual file with extension
    return this.findFileWithExtension(bestMatch);
  }

  /**
   * Find file on disk with one of the configured extensions
   */
  private findFileWithExtension(nameWithoutExt: string): string | null {
    for (const ext of this.options.extensions) {
      const filename = `${nameWithoutExt}${ext}`;
      const fullPath = join(this.options.baseDir, filename);

      // Check if file exists on disk
      if (existsSync(fullPath)) {
        return filename;
      }
    }

    return null;
  }

  /**
   * Validate variants against allowed list
   *
   * Security: Prevents path traversal like { lang: '../../../etc/passwd' }
   */
  private validateVariants(variants: VariantContext): VariantContext {
    if (this.options.allowedVariants === undefined) {
      // No variants allowed - return empty
      return {};
    }

    if (this.options.allowedVariants === true) {
      // Permissive mode - sanitize only
      return this.sanitizeVariants(variants);
    }

    const validated: VariantContext = {};
    const allowed = this.options.allowedVariants;

    // Check well-known variants
    if (variants.lang && allowed.lang?.includes(variants.lang)) {
      validated.lang = variants.lang;
    }

    if (variants.gender && allowed.gender?.includes(variants.gender)) {
      validated.gender = variants.gender;
    }

    if (variants.form && allowed.form?.includes(variants.form)) {
      validated.form = variants.form;
    }

    // Check custom variants
    for (const [key, value] of Object.entries(variants)) {
      if (key === 'lang' || key === 'gender' || key === 'form') continue;

      if (typeof value === 'string' && allowed[key]?.includes(value)) {
        validated[key] = value;
      }
    }

    return validated;
  }

  /**
   * Sanitize variant values to prevent path traversal
   *
   * Only allows alphanumeric, dash, and underscore
   */
  private sanitizeVariants(variants: VariantContext): VariantContext {
    const sanitized: VariantContext = {};

    for (const [key, value] of Object.entries(variants)) {
      if (typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value)) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate cache key from base name + sorted variants
   *
   * Order-independent: { lang: 'es', gender: 'f' } === { gender: 'f', lang: 'es' }
   */
  private getCacheKey(baseName: string, variants: VariantContext): string {
    const sorted = Object.keys(variants).sort();
    const variantStr = sorted.map(k => `${k}:${variants[k]}`).join('|');
    return variantStr ? `${baseName}|${variantStr}` : baseName;
  }

  /**
   * Load and parse file from disk
   */
  private async loadFile(filename: string): Promise<any> {
    const fullPath = resolve(this.options.baseDir, filename);
    const content = await readFile(fullPath, this.options.encoding);
    return JSON.parse(content);
  }

  /**
   * Remove known extension from filename
   */
  private removeExtension(filename: string): string | null {
    for (const ext of this.options.extensions) {
      if (filename.endsWith(ext)) {
        return filename.slice(0, -ext.length);
      }
    }
    return null;  // Unknown extension
  }

  /**
   * Clear file cache
   */
  clearCache(): void {
    this.fileCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.fileCache.size,
      keys: Array.from(this.fileCache.keys())
    };
  }

  /**
   * Save JSöN document to filesystem
   *
   * @param baseName - Base file name (without extension or variants)
   * @param data - JSöN document to save
   * @param variants - Variant context for file naming
   * @param options - Save options (merge strategy, validation, etc.)
   *
   * @example
   * ```typescript
   * // Saves to: strings:es:formal.jsön
   * await loader.save('strings', { hello: 'Hola' }, { lang: 'es', form: 'formal' });
   *
   * // With validation
   * await loader.save('config', data, { env: 'prod' }, {
   *   schema: ConfigSchema,
   *   strategy: 'merge'
   * });
   * ```
   */
  async save(
    baseName: string,
    data: any,
    variants: VariantContext = {},
    options: SaveOptions = {}
  ): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const {
      upsert = true,
      schema,
      strategy = 'replace',
      pretty = true
    } = options;

    // 1. Validate variants
    const validatedVariants = this.validateVariants(variants);

    // 2. Validate data with schema if provided
    if (schema) {
      schema.parse(data);  // Throws ZodError if validation fails
    }

    // 3. Generate filename
    const fileNameWithoutExt = serializeVariantPath(baseName, validatedVariants);
    const extension = this.options.extensions[0];  // Use first extension (.jsön by default)
    const fileName = `${fileNameWithoutExt}${extension}`;
    const fullPath = resolve(this.options.baseDir, fileName);

    // 4. Handle upsert and merge strategies
    let dataToSave = data;
    const fileExists = existsSync(fullPath);

    // Check upsert requirement
    if (!upsert && !fileExists) {
      throw new Error(`File does not exist: ${fileName} (upsert: false)`);
    }

    // Handle merge strategies for existing files
    if (strategy !== 'replace' && fileExists) {
      try {
        const existing = await this.loadFile(fileName);

        if (strategy === 'merge') {
          // Shallow merge
          dataToSave = { ...existing, ...data };
        } else if (strategy === 'deep-merge') {
          // Deep merge (recursive)
          dataToSave = this.deepMerge(existing, data);
        }
      } catch (error) {
        // File exists but invalid JSON - replace with new data
        dataToSave = data;
      }
    }

    // 5. Write file
    const content = pretty
      ? JSON.stringify(dataToSave, null, 2)
      : JSON.stringify(dataToSave);

    await writeFile(fullPath, content, this.options.encoding);

    // 6. Update available files cache
    this.availableFiles.add(fileNameWithoutExt);

    // 7. Update file content cache
    const cacheKey = this.getCacheKey(baseName, validatedVariants);
    if (this.options.cache) {
      this.fileCache.set(cacheKey, dataToSave);
    }
  }

  /**
   * List available JSöN documents
   *
   * @param filter - Filter criteria (baseName, variants, metadata)
   * @returns Array of document metadata
   *
   * @example
   * ```typescript
   * // List all documents
   * const all = await loader.list();
   *
   * // List all 'strings' documents
   * const strings = await loader.list({ baseName: 'strings' });
   *
   * // List all Spanish documents
   * const spanish = await loader.list({ variants: { lang: 'es' } });
   * ```
   */
  async list(filter: ListFilter = {}): Promise<DocumentInfo[]> {
    if (!this.initialized) {
      await this.init();
    }

    const results: DocumentInfo[] = [];

    // Iterate through available files
    for (const fileNameWithoutExt of this.availableFiles) {
      const parsed = parseVariantPath(fileNameWithoutExt);

      // Apply baseName filter
      if (filter.baseName && parsed.base !== filter.baseName) {
        continue;
      }

      // Apply variants filter (partial match)
      if (filter.variants) {
        let matchesVariants = true;
        for (const [key, value] of Object.entries(filter.variants)) {
          if (parsed.variants[key] !== value) {
            matchesVariants = false;
            break;
          }
        }
        if (!matchesVariants) continue;
      }

      // Find file with extension
      const fileName = this.findFileWithExtension(fileNameWithoutExt);
      if (!fileName) continue;

      const fullPath = join(this.options.baseDir, fileName);

      // Get file metadata
      let metadata;
      try {
        const stats = await stat(fullPath);
        metadata = {
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          size: stats.size
        };
      } catch (error) {
        // File no longer exists or not readable
        continue;
      }

      // Apply metadata filter
      if (filter.metadata) {
        let matchesMetadata = true;
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (metadata[key as keyof typeof metadata] !== value) {
            matchesMetadata = false;
            break;
          }
        }
        if (!matchesMetadata) continue;
      }

      results.push({
        baseName: parsed.base,
        variants: parsed.variants,
        fullName: fileNameWithoutExt,
        identifier: fullPath,
        metadata
      });
    }

    return results;
  }

  /**
   * Delete JSöN document from filesystem
   *
   * @param baseName - Base file name
   * @param variants - Variant context identifying specific document
   *
   * @example
   * ```typescript
   * // Deletes: strings:es:formal.jsön
   * await loader.delete('strings', { lang: 'es', form: 'formal' });
   * ```
   */
  async delete(baseName: string, variants: VariantContext = {}): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    // 1. Validate variants
    const validatedVariants = this.validateVariants(variants);

    // 2. Generate filename
    const fileNameWithoutExt = serializeVariantPath(baseName, validatedVariants);
    const fileName = this.findFileWithExtension(fileNameWithoutExt);

    if (!fileName) {
      throw new Error(`File not found: ${fileNameWithoutExt}`);
    }

    const fullPath = resolve(this.options.baseDir, fileName);

    // 3. Delete file
    await unlink(fullPath);

    // 4. Update caches
    this.availableFiles.delete(fileNameWithoutExt);

    const cacheKey = this.getCacheKey(baseName, validatedVariants);
    this.fileCache.delete(cacheKey);
  }

  /**
   * Cleanup resources (implements StorageProvider)
   *
   * Clears caches but does not delete files.
   */
  async close(): Promise<void> {
    this.clearCache();
    this.availableFiles.clear();
    this.initialized = false;
  }

  /**
   * Deep merge two objects recursively
   *
   * Used for 'deep-merge' save strategy
   */
  private deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null ||
        typeof source !== 'object' || source === null) {
      return source;  // Primitive or null - return source
    }

    if (Array.isArray(source)) {
      return source;  // Arrays replaced entirely (not merged)
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
          typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        // Recursive merge for nested objects
        result[key] = this.deepMerge(result[key], value);
      } else {
        // Replace value
        result[key] = value;
      }
    }

    return result;
  }
}

/**
 * Plugin factory for filesystem support with variant resolution
 *
 * @example
 * ```typescript
 * import { dotted } from '@orbzone/dotted-json';
 * import { withFileSystem } from '@orbzone/dotted-json/loaders/file';
 *
 * const data = dotted(
 *   {
 *     '.': 'extends("app-strings")'
 *   },
 *   {
 *     variants: { lang: 'es', form: 'formal' },
 *     ...withFileSystem({
 *       baseDir: './i18n',
 *       allowedVariants: {
 *         lang: ['en', 'es', 'fr'],
 *         form: ['casual', 'polite', 'formal']
 *       }
 *     })
 *   }
 * );
 * ```
 */
export function withFileSystem(options: FileLoaderOptions) {
  const loader = new FileLoader(options);
  let initPromise: Promise<void> | null = null;

  return {
    resolvers: {
      /**
       * Load and merge file with variant resolution
       *
       * @param baseName - Base filename without extension
       * @returns File contents
       */
      async extends(this: any, baseName: string) {
        // Lazy initialization
        if (!initPromise) {
          initPromise = loader.init();
        }
        await initPromise;

        // Get variant context from evaluation context
        // Note: 'this' will be the evaluation context in the resolver
        const variants = this?.variants || {};

        return await loader.load(baseName, variants);
      }
    },

    // Expose loader for advanced usage
    __loader: loader
  };
}
