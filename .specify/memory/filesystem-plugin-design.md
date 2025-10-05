# Filesystem Plugin Design - Schema Inheritance with Self-Reference

**Status**: Conceptual Design (Pre-Implementation)
**Priority**: High - Core use case for dotted-json
**Constitution Alignment**: Principle I (Optional Plugin), Principle V (Plugin Architecture)

## Problem Statement

Users need to compose JSON schemas from multiple files to avoid duplication. Example use case:
- Base card definitions (hero-card.json, villain-card.json)
- Specific instances that extend bases (superman.json extends hero-card.json)
- Deep inheritance chains (superman.json → hero-card.json → card-base.json)

## Solution: `@orbzone/dotted-json/plugins/filesystem`

### Core Concepts

1. **`"."` as Self-Reference** - Special dot-prefix meaning "this document/object"
2. **`extends()` Resolver** - Load and merge JSON files (no reserved properties)
3. **Recursive loading** - Bases can extend other bases
4. **Path resolution** - Relative paths, absolute paths, URLs
5. **Circular dependency detection** - Prevent infinite loops
6. **Deep merge strategy** - Configurable merge behavior

### Design Philosophy

**No Reserved Properties**: Unlike the initial design with `.extends`, we use the self-reference
pattern `"."` combined with the `extends()` resolver. This keeps the architecture clean:
- ✅ All special behavior goes through resolvers (consistent with plugin architecture)
- ✅ `"."` has clear semantics: "replace/merge this object with expression result"
- ✅ No magic property names to avoid conflicts

## API Design

### Installation

```bash
bun add @orbzone/dotted-json
# No extra dependencies - uses Node.js fs module
```

### Basic Usage

```typescript
import { dotted } from '@orbzone/dotted-json';
import { withFileSystem } from '@orbzone/dotted-json/plugins/filesystem';

const schema = {
  ".": "extends('hero-card')",  // Smart resolution: auto-appends .jsön/.json
  "name": "Superman",
  "power": 9000
};

const data = dotted(schema, {
  ...withFileSystem({
    // Path Resolution (see: .specify/memory/path-resolution-design.md)
    baseDir: './data/cards',       // Base directory for relative paths
    extensions: ['.jsön', '.json'], // Auto-append extensions (tries .jsön first)
    searchPaths: [],                // Additional search locations
    aliases: {},                    // Path aliases (e.g., '@cards': './data/cards')

    // File Loading
    encoding: 'utf-8',              // File encoding (default: utf-8)
    mergeStrategy: 'deep',          // 'deep' | 'shallow' | 'custom'
    cache: true,                    // Cache loaded files (default: true)

    // Security
    allowUrls: false,               // Enable HTTP(S) URLs (default: false)
    trustedDomains: []              // Whitelist for URL loading
  })
});

// Access triggers "." evaluation and merge
const result = await data.get('name');
// Result: { type: "card", layout: "standard", name: "Superman", power: 9000 }

// Path resolution:
// - Tries: ./data/cards/hero-card.jsön
// - Tries: ./data/cards/hero-card.json
// - Uses first match
```

### Self-Reference Semantics

The `"."` key has special meaning:

```json
{
  ".": "extends('./base.json')",  // "Replace/merge THIS object with result"
  "name": "Override"               // Properties defined here override base
}
```

**Evaluation behavior**:
1. Detect `"."` key at object level
2. Evaluate the expression (`extends('./base.json')`)
3. Deep merge expression result with sibling properties
4. Remove `"."` from final result (it's consumed during merge)

### Nested Self-References

Each object can have its own `"."` self-reference:

```typescript
const schema = {
  "hero": {
    ".": "extends('./hero-base.json')",  // Merge into hero object
    "name": "Superman"
  },
  "villain": {
    ".": "extends('./villain-base.json')", // Merge into villain object
    "name": "Lex Luthor"
  }
};

const data = dotted(schema, {
  ...withFileSystem({ baseDir: './data' })
});

// Each object independently merges its base
await data.get('hero.name');    // "Superman" (with hero-base properties)
await data.get('villain.name'); // "Lex Luthor" (with villain-base properties)
```

### Alternative: Named Base Property

If you don't want self-reference, use a regular dot-prefix:

```typescript
const schema = {
  "hero": {
    ".base": "extends('./hero-base.json')",  // Creates hero.base property
    "name": "Superman"
  }
};

await data.get('hero.base');  // Returns base object (not merged)
await data.get('hero.name');  // "Superman" (base NOT merged into hero)
```

### Recursive Inheritance

```json
// cards/base.json
{
  "type": "card",
  "version": 1
}

// cards/hero-base.json
{
  ".": "extends('./base.json')",
  "category": "hero",
  "alignment": "good"
}

// cards/superman.json
{
  ".": "extends('./hero-base.json')",
  "name": "Superman",
  "power": 9000
}
```

After evaluation, `superman.json` contains:
```json
{
  "type": "card",          // from base.json (via hero-base.json)
  "version": 1,            // from base.json (via hero-base.json)
  "category": "hero",      // from hero-base.json
  "alignment": "good",     // from hero-base.json
  "name": "Superman",      // own property
  "power": 9000           // own property
}
```

**Inheritance chain**: superman.json → hero-base.json → base.json

### URL Support (Opt-in for Security)

```typescript
const schema = {
  ".": "extends('https://schemas.example.com/hero-card.json')",
  "name": "Superman"
};

const data = dotted(schema, {
  ...withFileSystem({
    allowUrls: true,              // MUST explicitly enable
    urlCache: true,                // Cache remote schemas
    urlTimeout: 5000,              // Timeout for HTTP requests
    trustedDomains: [              // Whitelist domains
      'schemas.example.com'
    ]
  })
});
```

**Security Note**: URL loading is **disabled by default** and requires explicit opt-in.
This aligns with Constitution Principle II (Security Through Transparency).

### Custom Merge Strategy

```typescript
import { withFileSystem, type MergeStrategy } from '@orbzone/dotted-json/plugins/filesystem';

const customMerge: MergeStrategy = (base, override) => {
  // Custom logic: arrays concat, objects deep merge
  return deepMergeWithArrayConcat(base, override);
};

const data = dotted(schema, {
  ...withFileSystem({
    mergeStrategy: customMerge
  })
});
```

## Implementation Details

### Core Algorithm

```typescript
/**
 * The extends() resolver function
 */
async function extends(
  path: string,
  options: FileSystemOptions,
  visitedPaths: Set<string> = new Set()
): Promise<Record<string, any>> {

  // Circular dependency check
  const absolutePath = resolvePath(path, options.baseDir);
  if (visitedPaths.has(absolutePath)) {
    throw new CircularDependencyError(`Circular extends() detected: ${absolutePath}`);
  }
  visitedPaths.add(absolutePath);

  // Load base schema
  const baseContent = await loadFile(absolutePath, options);
  const baseSchema = JSON.parse(baseContent);

  // Recursive: if base has "." self-reference, resolve it first
  if (baseSchema['.']) {
    const grandparentPath = extractPath(baseSchema['.']); // Extract path from expression
    const grandparent = await extends(grandparentPath, options, visitedPaths);
    const { '.': _, ...rest } = baseSchema;
    return mergeDeep(grandparent, rest, options.mergeStrategy);
  }

  return baseSchema;
}

/**
 * Self-reference evaluation hook (called before other expressions)
 */
async function evaluateSelfReference(
  obj: Record<string, any>,
  context: EvaluationContext
): Promise<Record<string, any>> {

  if (!obj['.']) return obj;

  // Evaluate the "." expression (e.g., extends('./base.json'))
  const baseResult = await context.evaluateExpression(obj['.']);

  // Merge base with current object (excluding ".")
  const { '.': _, ...currentProperties } = obj;
  return mergeDeep(baseResult, currentProperties, context.mergeStrategy);
}
```

### Path Resolution

```typescript
function resolvePath(path: string, baseDir: string): string {
  // URL (if allowed)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (!options.allowUrls) {
      throw new SecurityError('URL loading disabled. Set allowUrls: true to enable.');
    }
    return path;
  }

  // Absolute path
  if (path.startsWith('/')) {
    return path;
  }

  // Relative path
  return join(baseDir, path);
}
```

### Circular Dependency Detection

Uses a `Set<string>` to track visited paths during recursive resolution:

```typescript
// This would trigger CircularDependencyError:
// a.json: { ".extends": "./b.json" }
// b.json: { ".extends": "./a.json" }
```

## Plugin Architecture Integration

### Extension Points Used

- ✅ `resolvers.extends` - File loading function
- ✅ Pre-evaluation hook - Detect and process `.extends` before other expressions
- ✅ Error handling - Custom error types (CircularDependencyError, FileLoadError)

### Constitution Compliance

| Principle | Compliance |
|-----------|-----------|
| I. Minimal Core | ✅ Plugin is optional peer dependency |
| II. Security Through Transparency | ✅ URL loading disabled by default, explicit opt-in |
| III. Test-First Development | ✅ Comprehensive tests required before implementation |
| V. Plugin Architecture | ✅ Uses documented extension points (resolvers) |
| VI. Cycle Detection | ✅ Built-in circular dependency detection |

## Testing Requirements (TDD)

### Unit Tests

```typescript
describe('Filesystem Plugin', () => {
  test('should load and merge single .extends file');
  test('should resolve relative paths from baseDir');
  test('should handle recursive .extends chains');
  test('should throw CircularDependencyError on cycles');
  test('should respect mergeStrategy option');
  test('should handle missing files gracefully');
  test('should validate file encoding');
});
```

### Integration Tests

```typescript
describe('Filesystem Plugin Integration', () => {
  test('should work with Zod plugin for validation');
  test('should cache loaded files for performance');
  test('should support URL loading when enabled');
  test('should respect trustedDomains whitelist');
  test('should handle network errors for URLs');
});
```

### Security Tests

```typescript
describe('Filesystem Plugin Security', () => {
  test('should block URL loading by default');
  test('should reject URLs from untrusted domains');
  test('should prevent path traversal attacks');
  test('should validate file paths before loading');
});
```

## Performance Considerations

### Caching Strategy

```typescript
interface FileSystemOptions {
  cache?: boolean;           // Cache loaded files (default: true)
  cacheMaxSize?: number;     // Max cache entries (default: 100)
  cacheTTL?: number;         // TTL in ms (default: 5 minutes)
}
```

**Cache Key**: Absolute file path
**Cache Invalidation**: TTL-based or manual via `clearCache()` method

### Optimization: Lazy Loading

Only load `.extends` files when their paths are accessed:

```typescript
const schema = {
  "hero": {
    ".extends": "./hero-card.json",
    "name": "Superman"
  },
  "villain": {
    ".extends": "./villain-card.json",
    "name": "Lex Luthor"
  }
};

// Only loads hero-card.json, NOT villain-card.json
await data.get('hero.name');
```

## Bundle Size Impact

**Estimated Size**: 2-3 kB (minified)

**Dependencies**:
- Node.js `fs/promises` (built-in, no bundle cost)
- Path resolution utilities (< 500 bytes)

**Constitution Check**: Core library remains < 15 kB (plugin is optional)

## Migration Path from __DRAFT__

The current draft doesn't have this feature. This is a **new capability** inspired by
the user's use case. Implementation should:

1. Create `src/plugins/filesystem.ts`
2. Write tests first (TDD principle)
3. Implement resolver and merge logic
4. Add documentation: `docs/FILESYSTEM-INTEGRATION.md`
5. Update README.md with usage examples

## Example Use Cases

### 1. Card Game Definitions

```
cards/
├── base.json              # { "type": "card", "version": 1 }
├── hero-base.json         # { ".extends": "./base.json", "category": "hero" }
├── villain-base.json      # { ".extends": "./base.json", "category": "villain" }
├── superman.json          # { ".extends": "./hero-base.json", "name": "Superman" }
└── lex-luthor.json        # { ".extends": "./villain-base.json", "name": "Lex" }
```

### 2. Configuration Management

```
config/
├── defaults.json          # { "timeout": 5000, "retries": 3 }
├── production.json        # { ".extends": "./defaults.json", "timeout": 10000 }
└── development.json       # { ".extends": "./defaults.json", "debug": true }
```

### 3. API Schema Composition

```
schemas/
├── base-response.json     # { "status": "ok", "version": "1.0" }
├── user-response.json     # { ".extends": "./base-response.json", "data": {...} }
└── error-response.json    # { ".extends": "./base-response.json", "error": {...} }
```

## Future Enhancements (v2.0+)

- **Partial imports**: `".extends": "./base.json#/definitions/hero"` (JSON Pointer)
- **Multiple inheritance**: `".extends": ["./base.json", "./mixin.json"]`
- **Remote schema registry**: `".extends": "registry://hero-card@1.0.0"`
- **Watch mode**: Auto-reload on file changes
- **Build-time compilation**: Pre-resolve `.extends` during build

## Related Patterns

### JSON Schema `$ref`

Similar to JSON Schema's `$ref` but with **merge semantics** instead of replacement:

```json
// JSON Schema (replacement)
{ "$ref": "./base.json" }  // Entire object replaced

// dotted-json (merge)
{ ".extends": "./base.json", "name": "Override" }  // Base + overrides
```

### Webpack/Rollup Module Resolution

Similar to JavaScript module imports but for **declarative data**:

```typescript
// JavaScript
import base from './base.json';
const merged = { ...base, name: 'Override' };

// dotted-json (declarative)
{ ".extends": "./base.json", "name": "Override" }
```

## Open Questions

1. **Merge conflicts**: How to handle array merging? (concat vs replace vs merge by index)
2. **Type safety**: Should we validate merged schemas against TypeScript types?
3. **Cross-plugin**: How does `.extends` interact with Zod validation?
4. **Performance**: Should we pre-load all `.extends` or lazy-load on access?

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-05 | Use optional plugin | Keeps core minimal (Principle I) |
| 2025-10-05 | Disable URLs by default | Security first (Principle II) |
| 2025-10-05 | Deep merge default | Matches user expectations |
| 2025-10-05 | Circular dependency detection | Required by Principle VI |

---

**Next Steps**:
1. Get user feedback on API design
2. Write comprehensive test suite (TDD)
3. Implement core resolver logic
4. Add to plugin ecosystem documentation
5. Create examples for common use cases

**Related Files**:
- Constitution: `.specify/memory/constitution.md`
- Plugin Template: `CONTRIBUTING.md` § Plugin Development
- Reference: `__DRAFT__/` (does not contain this feature yet)
