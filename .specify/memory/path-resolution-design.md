# Path Resolution System - Smart Defaults for `extends()`

**Status**: Design Enhancement (Pre-Implementation)
**Priority**: High - DX improvement for filesystem plugin
**Related**: `.specify/memory/filesystem-plugin-design.md`

## Problem Statement

Users shouldn't have to write verbose paths with `./` prefixes and `.json` extensions:

```json
// Verbose (current)
{ ".": "extends('./cards/hero-base.json')" }

// Desired (concise)
{ ".": "extends('hero-base')" }
```

**Goal**: Intelligent path resolution with sensible defaults and optional overrides.

## Solution: Multi-Strategy Path Resolution

### Configuration API

```typescript
import { dotted } from '@orbzone/dotted-json';
import { withFileSystem } from '@orbzone/dotted-json/plugins/filesystem';

const data = dotted(schema, {
  ...withFileSystem({
    // Path Resolution Options
    baseDir: './cards',              // Base directory for relative paths
    extensions: ['.jsön', '.json'],  // Auto-append extensions (order matters)
    pathPrefix: './',                // Default prefix for non-absolute paths
    searchPaths: [                   // Multiple search locations
      './cards',
      './shared',
      '../common-schemas'
    ],

    // Path Resolution Strategy
    resolveStrategy: 'waterfall',    // 'waterfall' | 'first-match' | 'custom'
    caseSensitive: false,            // Case-insensitive file matching (default: true)

    // Advanced Options
    aliases: {                       // Path aliases (like webpack)
      '@cards': './data/cards',
      '@shared': '../shared-schemas'
    },
    fallbackPath: null,              // Fallback file if not found (optional)
  })
});
```

### Usage Examples

#### Example 1: Minimal Path

```json
{ ".": "extends('hero-base')" }
```

**Resolution sequence** (with `extensions: ['.jsön', '.json']`, `baseDir: './cards'`):
1. `./cards/hero-base.jsön`  ✅ Found!
2. ~~`./cards/hero-base.json`~~ (not needed)

#### Example 2: Search Multiple Paths

```json
{ ".": "extends('common-card')" }
```

**Resolution sequence** (with `searchPaths: ['./cards', './shared']`):
1. `./cards/common-card.jsön`
2. `./cards/common-card.json`
3. `./shared/common-card.jsön`  ✅ Found!
4. ~~`./shared/common-card.json`~~ (not needed)

#### Example 3: Nested Paths

```json
{ ".": "extends('types/hero')" }
```

**Resolution** (preserves subdirectories):
- `./cards/types/hero.jsön`

#### Example 4: Absolute Path (Skip Resolution)

```json
{ ".": "extends('/data/schemas/hero.json')" }
```

**Resolution**: Use path as-is (absolute paths bypass smart resolution)

#### Example 5: Explicit Extension (Skip Auto-Append)

```json
{ ".": "extends('hero-base.jsön')" }
```

**Resolution**: Use path as-is (already has extension)

#### Example 6: Alias Usage

```json
{ ".": "extends('@shared/hero')" }
```

**Resolution** (with `aliases: { '@shared': '../common' }`):
- `../common/hero.jsön`

## Implementation Details

### Path Resolver Algorithm

```typescript
interface ResolverContext {
  baseDir: string;
  extensions: string[];
  pathPrefix: string;
  searchPaths: string[];
  aliases: Record<string, string>;
  caseSensitive: boolean;
  resolveStrategy: 'waterfall' | 'first-match' | 'custom';
}

async function resolvePath(
  inputPath: string,
  context: ResolverContext
): Promise<string> {

  // 1. Skip resolution for absolute paths
  if (isAbsolutePath(inputPath)) {
    return inputPath;
  }

  // 2. Skip resolution if explicit extension provided
  if (hasExtension(inputPath, context.extensions)) {
    return resolve(context.baseDir, inputPath);
  }

  // 3. Resolve aliases (if any)
  const aliasedPath = resolveAliases(inputPath, context.aliases);

  // 4. Generate candidate paths
  const candidates = generateCandidates(aliasedPath, context);

  // 5. Find first existing file
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  // 6. File not found - throw descriptive error
  throw new FileNotFoundError(
    `Could not resolve path: "${inputPath}"\n` +
    `Searched:\n${candidates.map(c => `  - ${c}`).join('\n')}`
  );
}

function generateCandidates(
  inputPath: string,
  context: ResolverContext
): string[] {

  const candidates: string[] = [];

  // Generate combinations of searchPaths × extensions
  const paths = context.searchPaths.length > 0
    ? context.searchPaths
    : [context.baseDir];

  for (const searchPath of paths) {
    for (const ext of context.extensions) {
      // Add prefix if not already present
      const prefixedPath = inputPath.startsWith(context.pathPrefix)
        ? inputPath
        : context.pathPrefix + inputPath;

      const fullPath = resolve(searchPath, prefixedPath + ext);
      candidates.push(fullPath);
    }
  }

  return candidates;
}

function resolveAliases(
  path: string,
  aliases: Record<string, string>
): string {

  for (const [alias, target] of Object.entries(aliases)) {
    if (path.startsWith(alias)) {
      return path.replace(alias, target);
    }
  }

  return path;
}

function isAbsolutePath(path: string): boolean {
  // Unix: starts with /
  // Windows: starts with C:\ or similar
  return path.startsWith('/') || /^[A-Z]:\\/.test(path);
}

function hasExtension(path: string, extensions: string[]): boolean {
  return extensions.some(ext => path.endsWith(ext));
}
```

### Resolution Strategies

#### `waterfall` (Default)

Try all search paths with all extensions in order:

```
./cards/hero.jsön
./cards/hero.json
./shared/hero.jsön
./shared/hero.json
```

**Use case**: Find file in any configured location.

#### `first-match`

Only try extensions for the first search path, then move to next:

```
./cards/hero.jsön
./cards/hero.json
(if not found) ./shared/hero.jsön
(if not found) ./shared/hero.json
```

**Use case**: Prefer first search path, fallback to others.

#### `custom`

User-provided function:

```typescript
const data = dotted(schema, {
  ...withFileSystem({
    resolveStrategy: (inputPath, context) => {
      // Custom logic: e.g., check environment-specific paths
      const env = process.env.NODE_ENV;
      return `./configs/${env}/${inputPath}.json`;
    }
  })
});
```

## Configuration Presets

### Preset 1: Minimal (Default)

```typescript
withFileSystem({
  baseDir: './',
  extensions: ['.json'],
  pathPrefix: './',
  searchPaths: []  // Only search baseDir
})

// Usage: extends('hero')
// Resolves: ./hero.json
```

### Preset 2: JSON with JSöN Fallback

```typescript
withFileSystem({
  baseDir: './data',
  extensions: ['.jsön', '.json'],  // Try .jsön first
  pathPrefix: './',
  searchPaths: ['./data']
})

// Usage: extends('hero')
// Tries: ./data/hero.jsön, ./data/hero.json
```

### Preset 3: Multi-Directory Search

```typescript
withFileSystem({
  baseDir: './cards',
  extensions: ['.jsön', '.json'],
  searchPaths: [
    './cards',
    './cards/shared',
    '../common-schemas'
  ]
})

// Usage: extends('hero')
// Tries: ./cards/hero.jsön, ./cards/hero.json,
//        ./cards/shared/hero.jsön, ./cards/shared/hero.json,
//        ../common-schemas/hero.jsön, ../common-schemas/hero.json
```

### Preset 4: Webpack-Style Aliases

```typescript
withFileSystem({
  baseDir: './src',
  extensions: ['.jsön', '.json'],
  aliases: {
    '@cards': './src/data/cards',
    '@shared': './src/data/shared',
    '@common': '../common-schemas'
  }
})

// Usage: extends('@cards/hero')
// Resolves: ./src/data/cards/hero.jsön (or .json)

// Usage: extends('@common/base')
// Resolves: ../common-schemas/base.jsön (or .json)
```

### Preset 5: Convention-Based (DRY)

```typescript
withFileSystem({
  baseDir: './data/cards',
  extensions: ['.jsön'],       // Only one extension
  pathPrefix: '',              // No prefix (cleaner)
  searchPaths: [],
  caseSensitive: false         // hero === Hero === HERO
})

// Usage: extends('hero')
// Resolves: ./data/cards/hero.jsön

// Usage: extends('Hero')  (case-insensitive)
// Resolves: ./data/cards/hero.jsön
```

## Helper Function: `withFileSystemPreset()`

```typescript
import { withFileSystemPreset } from '@orbzone/dotted-json/plugins/filesystem';

const data = dotted(schema, {
  ...withFileSystemPreset('json-only', {
    baseDir: './my-data'  // Override preset default
  })
});
```

**Available presets**:
- `'json-only'` - Standard `.json` files
- `'json-with-json-fallback'` - `.jsön` preferred, `.json` fallback
- `'multi-search'` - Search multiple directories
- `'aliased'` - Webpack-style aliases

## Edge Cases & Behavior

### Case 1: Ambiguous Paths

If multiple files match:

```
./cards/hero.jsön
./cards/hero.json
```

**Resolution**: Return first match (based on `extensions` order)

### Case 2: Subdirectory + Extension

```json
{ ".": "extends('types/hero.jsön')" }
```

**Behavior**: Use as-is (explicit extension skips auto-append)
- Result: `./cards/types/hero.jsön`

### Case 3: Missing File

```json
{ ".": "extends('nonexistent')" }
```

**Error message**:
```
FileNotFoundError: Could not resolve path: "nonexistent"
Searched:
  - ./cards/nonexistent.jsön
  - ./cards/nonexistent.json
  - ./shared/nonexistent.jsön
  - ./shared/nonexistent.json

Did you mean: "hero-base"?
```

**Optional**: Fuzzy matching suggestions (levenshtein distance)

### Case 4: Circular Resolution

```json
// a.jsön
{ ".": "extends('b')" }

// b.jsön
{ ".": "extends('a')" }
```

**Behavior**: Throw `CircularDependencyError` with full chain:
```
CircularDependencyError: Circular extends() detected:
  a.jsön -> b.jsön -> a.jsön
```

### Case 5: URL with Extension Auto-Append

```json
{ ".": "extends('https://example.com/schema')" }
```

**Behavior**:
- If `allowUrls: true` and URL has no extension, try extensions:
  - `https://example.com/schema.jsön`
  - `https://example.com/schema.json`
- If `allowUrls: false`, throw `SecurityError`

## Performance Optimizations

### File Existence Caching

```typescript
const existenceCache = new Map<string, boolean>();

async function fileExists(path: string): Promise<boolean> {
  if (existenceCache.has(path)) {
    return existenceCache.get(path)!;
  }

  try {
    await fs.access(path);
    existenceCache.set(path, true);
    return true;
  } catch {
    existenceCache.set(path, false);
    return false;
  }
}
```

**Cache invalidation**: TTL-based (5 minutes) or manual `clearCache()`

### Parallel Existence Checks

```typescript
async function resolvePath(inputPath: string, context: ResolverContext): Promise<string> {
  const candidates = generateCandidates(inputPath, context);

  // Check all candidates in parallel
  const results = await Promise.allSettled(
    candidates.map(async (path) => ({
      path,
      exists: await fileExists(path)
    }))
  );

  // Return first match
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.exists) {
      return result.value.path;
    }
  }

  throw new FileNotFoundError(/* ... */);
}
```

## Testing Requirements (TDD)

### Unit Tests

```typescript
describe('Path Resolution', () => {
  test('should resolve minimal path with default extension');
  test('should try multiple extensions in order');
  test('should search multiple search paths');
  test('should skip resolution for absolute paths');
  test('should skip auto-extension for explicit extensions');
  test('should resolve aliases correctly');
  test('should preserve subdirectory structure');
  test('should handle case-insensitive matching');
  test('should throw descriptive error for missing files');
  test('should suggest similar filenames on error');
});
```

### Integration Tests

```typescript
describe('Path Resolution Integration', () => {
  test('should work with extends() resolver');
  test('should cache file existence checks');
  test('should resolve circular dependencies');
  test('should work with URLs when enabled');
  test('should work with nested extends chains');
});
```

## Migration Guide

### Before (Verbose)

```json
{
  ".": "extends('./cards/hero-base.json')",
  ".": "extends('./cards/shared/common.json')",
  ".": "extends('../common-schemas/base-card.json')"
}
```

### After (Concise)

```typescript
// Configuration
withFileSystem({
  baseDir: './cards',
  extensions: ['.jsön', '.json'],
  searchPaths: ['./cards', './cards/shared', '../common-schemas']
})
```

```json
{
  ".": "extends('hero-base')",      // Resolves: ./cards/hero-base.jsön
  ".": "extends('common')",         // Resolves: ./cards/shared/common.jsön
  ".": "extends('base-card')"       // Resolves: ../common-schemas/base-card.jsön
}
```

## User Experience Examples

### Example 1: Game Card System

```typescript
const cards = dotted(schema, {
  ...withFileSystem({
    baseDir: './game/cards',
    extensions: ['.jsön'],
    searchPaths: [
      './game/cards/heroes',
      './game/cards/villains',
      './game/cards/shared'
    ]
  })
});
```

```json
// game/cards/heroes/superman.jsön
{
  ".": "extends('hero-base')",  // Finds: ./game/cards/shared/hero-base.jsön
  "name": "Superman",
  "power": 9000
}
```

### Example 2: Configuration Management

```typescript
const config = dotted(schema, {
  ...withFileSystem({
    baseDir: './config',
    extensions: ['.jsön', '.json'],
    aliases: {
      '@env': `./config/${process.env.NODE_ENV}`,
      '@base': './config/base'
    }
  })
});
```

```json
// config/production.jsön
{
  ".": "extends('@base/server')",     // Finds: ./config/base/server.jsön
  "port": 8080,
  "workers": 4
}
```

### Example 3: Schema Registry

```typescript
const schemas = dotted(schema, {
  ...withFileSystem({
    baseDir: './schemas',
    extensions: ['.schema.jsön', '.jsön', '.json'],  // Try .schema.jsön first
    searchPaths: [
      './schemas',
      './schemas/vendor',
      '~/.schema-cache'  // Global cache
    ]
  })
});
```

```json
// schemas/user.schema.jsön
{
  ".": "extends('base-model')",  // Finds: ./schemas/base-model.schema.jsön
  "properties": {
    "name": { "type": "string" }
  }
}
```

## Default Configuration Recommendation

```typescript
// Sensible defaults for most users
export const DEFAULT_FILESYSTEM_OPTIONS: FileSystemOptions = {
  baseDir: './',
  extensions: ['.jsön', '.json'],  // Try .jsön first (support both)
  pathPrefix: './',
  searchPaths: [],                  // Only search baseDir by default
  resolveStrategy: 'waterfall',
  caseSensitive: true,              // Platform default
  aliases: {},
  fallbackPath: null,
  allowUrls: false,
  cache: true
};
```

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-05 | Auto-append extensions | Reduce boilerplate, match user expectations |
| 2025-10-05 | Try `.jsön` before `.json` | Support custom extension, fallback to standard |
| 2025-10-05 | Multiple search paths | Support shared schemas across projects |
| 2025-10-05 | Webpack-style aliases | Familiar pattern for developers |
| 2025-10-05 | Waterfall default strategy | Most flexible, intuitive for multi-directory |
| 2025-10-05 | Case-sensitive default | Platform standard, explicit is better |
| 2025-10-05 | Parallel existence checks | Performance optimization for large search paths |

---

**Next Steps**:
1. Implement `resolvePath()` algorithm
2. Write comprehensive path resolution tests
3. Add to filesystem plugin
4. Create preset configurations
5. Document in README with examples

**Related Files**:
- Filesystem Plugin: `.specify/memory/filesystem-plugin-design.md`
- Self-Reference: `.specify/memory/self-reference-core-feature.md`
- Constitution: `.specify/memory/constitution.md`
