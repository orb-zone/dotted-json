/**
 * Utility for generating .jsön files with variant naming
 */

import { writeFile, readFile } from 'fs/promises';
import { dirname, basename, extname, join } from 'path';
import { existsSync } from 'fs';

export interface VariantFileOptions {
  sourcePath: string;
  targetLang: string;
  formality?: string;
  outputDir?: string;
}

/**
 * Generate output filename with variant suffix
 *
 * @example
 * generateVariantFilename('strings.jsön', { targetLang: 'es' })
 * // → 'strings:es.jsön'
 *
 * generateVariantFilename('strings.jsön', { targetLang: 'ja', formality: 'polite' })
 * // → 'strings:ja:polite.jsön'
 */
export function generateVariantFilename(sourcePath: string, options: Omit<VariantFileOptions, 'sourcePath'>): string {
  const ext = extname(sourcePath);
  const base = basename(sourcePath, ext);

  const variants: string[] = [];

  if (options.targetLang) {
    variants.push(options.targetLang);
  }

  if (options.formality) {
    variants.push(options.formality);
  }

  const variantSuffix = variants.length > 0 ? `:${variants.join(':')}` : '';
  return `${base}${variantSuffix}${ext}`;
}

/**
 * Read source .jsön file and parse
 */
export async function readSourceFile(path: string): Promise<Record<string, any>> {
  if (!existsSync(path)) {
    throw new Error(`Source file not found: ${path}`);
  }

  const content = await readFile(path, 'utf-8');

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write translated data to variant file
 */
export async function writeVariantFile(
  data: Record<string, any>,
  options: VariantFileOptions
): Promise<string> {
  const { sourcePath, outputDir } = options;

  const sourceDir = dirname(sourcePath);
  const targetDir = outputDir || sourceDir;
  const filename = generateVariantFilename(sourcePath, options);
  const targetPath = join(targetDir, filename);

  // Pretty-print JSON with 2-space indentation
  const content = JSON.stringify(data, null, 2) + '\n';

  await writeFile(targetPath, content, 'utf-8');

  return targetPath;
}

/**
 * Translate all string values in a nested object structure
 */
export async function translateObjectValues(
  obj: Record<string, any>,
  translator: (text: string) => Promise<string>,
  options: {
    preserveKeys?: boolean;
    onProgress?: (key: string, translated: string) => void;
  } = {}
): Promise<Record<string, any>> {
  const { preserveKeys = true, onProgress } = options;
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Translate string values
      const translated = await translator(value);
      result[key] = translated;

      if (onProgress) {
        onProgress(key, translated);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively translate nested objects
      result[key] = await translateObjectValues(value, translator, options);
    } else {
      // Keep non-string values as-is (numbers, booleans, arrays, null)
      result[key] = value;
    }
  }

  return result;
}

/**
 * Batch translate all string values efficiently
 */
export async function translateObjectValuesBatch(
  obj: Record<string, any>,
  batchTranslator: (texts: string[]) => Promise<string[]>,
  options: {
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Record<string, any>> {
  // Collect all string values with their paths
  const strings: Array<{ path: string[]; value: string }> = [];

  function collectStrings(current: any, path: string[] = []) {
    for (const [key, value] of Object.entries(current)) {
      if (typeof value === 'string') {
        strings.push({ path: [...path, key], value });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        collectStrings(value, [...path, key]);
      }
    }
  }

  collectStrings(obj);

  // Batch translate all strings
  const texts = strings.map(s => s.value);
  const translated = await batchTranslator(texts);

  if (options.onProgress) {
    options.onProgress(translated.length, strings.length);
  }

  // Reconstruct object with translations
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone

  strings.forEach((item, i) => {
    let current = result;
    for (let j = 0; j < item.path.length - 1; j++) {
      current = current[item.path[j]];
    }
    current[item.path[item.path.length - 1]] = translated[i];
  });

  return result;
}
