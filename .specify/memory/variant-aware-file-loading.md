# Variant-Aware File Loading Design

**Status**: Ready for Implementation
**Priority**: High - Extends filesystem plugin with i18n support
**Dependencies**: `filesystem-plugin-design.md`, variant resolver (implemented)
**Constitution Alignment**: Principle I (Optional Plugin), Principle II (Security)

## Problem Statement

Users need to load localized/variant-specific files based on variant context (language, formality, gender). Example use cases:
- i18n string files: `strings.jsön`, `strings:es.jsön`, `strings:es:formal.jsön`
- Localized card definitions: `hero-card:ja.jsön`, `hero-card:ja:polite.jsön`
- Gender-specific templates: `profile:f.jsön`, `profile:m.jsön`

## Solution: Variant-Aware File Resolution

Extend the filesystem plugin to automatically resolve variant files using the same scoring algorithm as in-memory variants.

### Key Design Principles

1. **Reuse Existing Variant Resolver** - Don't reimplement scoring logic
2. **Pre-Scanning for Performance** - Scan directory once, not per `extends()` call
3. **Security Through Allowed Variants** - Prevent path traversal via variant validation
4. **Smart Caching** - Cache by `baseName + variants` key
5. **Order Independence** - `hero:es:f.jsön` === `hero:f:es.jsön` (same scoring)

## File Naming Convention

### Format

```
baseName[:variant1][:variant2][...].extension
```

### Examples

```
strings.jsön                    # Base (0 points)
strings:es.jsön                 # Language (1000 points)
strings:es:f.jsön               # Language + gender (1100 points)
strings:es:formal.jsön          # Language + form (1050 points)
strings:es:f:formal.jsön        # Lang + gender + form (1150 points)
strings:ja:polite:f.jsön        # All three (1150 points)
```

### Order Independence

These are equivalent (parse to same variants, same score):
```
strings:es:f.jsön
strings:f:es.jsön
```

Both parse to: `{ lang: 'es', gender: 'f' }` → 1100 points

## API Design

### Basic Usage

```typescript
import { dotted } from '@orbzone/dotted-json';
import { withFileSystem } from '@orbzone/dotted-json/loaders/file';

const i18nData = dotted(
  {
    '.': 'extends("app-strings")',  // Auto-resolves to app-strings:es:formal.jsön
    customKey: 'override'
  },
  {
    variants: { lang: 'es', form: 'formal' },
    ...withFileSystem({
      baseDir: './i18n',
      extensions: ['.jsön', '.json'],

      // NEW: Allowed variants (security + performance)
      allowedVariants: {
        lang: ['en', 'es', 'fr', 'de', 'ja', 'ko'],
        gender: ['m', 'f', 'x'],
        form: ['casual', 'polite', 'formal', 'honorific']
      },

      // Performance options
      preload: true,   // Scan directory on init (recommended)
      cache: true      // Cache loaded files
    })
  }
);

await i18nData.get('welcomeMessage');
```

### Security: Allowed Variants Mode

**Problem**: User-supplied variants could be malicious
```typescript
// Attack attempt:
{ lang: '../../../etc/passwd' }
```

**Solution**: Allow only specific values per variant dimension
```typescript
allowedVariants: {
  lang: ['en', 'es', 'fr'],  // Only these values allowed
  form: ['casual', 'formal']
}
```

**Benefits**:
1. Prevents path traversal attacks
2. Reduces filesystem scans (only check allowed combinations)
3. Documents expected variants
4. Type safety for known variants

### Permissive Mode (Use with Caution)

```typescript
allowedVariants: true  // Allow any variant (still sanitized for path safety)
```

Applies regex sanitization: `/^[a-zA-Z0-9_-]+$/`

## Implementation Strategy

### Phase 1: Pre-Scanning (Recommended)

Scan directory once on initialization:

```typescript
class FileLoader {
  private availableFiles: Set<string> = new Set();

  async init() {
    // Scan directory once
    const files = await readdir(this.baseDir);

    for (const file of files) {
      // Remove extension: "strings:es:f.jsön" → "strings:es:f"
      const nameWithoutExt = this.removeExtension(file);
      this.availableFiles.add(nameWithoutExt);
    }
  }

  async load(baseName: string, variants: VariantContext) {
    // 1. Filter to files matching baseName
    const candidates = Array.from(this.availableFiles)
      .filter(file => {
        const parsed = parseVariantPath(file);
        return parsed.base === baseName;
      });

    // 2. Use existing variant resolver!
    const bestMatch = resolveVariantPath(
      baseName,
      variants,
      candidates
    );

    // 3. Load the file
    return this.loadFile(bestMatch);
  }
}
```

**Performance**:
- Init: **O(n)** where n = total files (done once)
- Load: **O(k)** where k = files matching baseName (typically < 10)
- No `stat()` calls per variant combination

### Phase 2: Variant Validation

```typescript
validateVariants(variants: VariantContext): VariantContext {
  if (this.allowedVariants === true) {
    // Permissive: sanitize only
    return this.sanitizeVariants(variants);
  }

  const validated: VariantContext = {};

  // Check lang
  if (variants.lang && this.allowedVariants.lang) {
    if (this.allowedVariants.lang.includes(variants.lang)) {
      validated.lang = variants.lang;
    }
  }

  // Check gender
  if (variants.gender && this.allowedVariants.gender) {
    if (this.allowedVariants.gender.includes(variants.gender)) {
      validated.gender = variants.gender;
    }
  }

  // Check form
  if (variants.form && this.allowedVariants.form) {
    if (this.allowedVariants.form.includes(variants.form)) {
      validated.form = variants.form;
    }
  }

  // Custom variants (if allowed)
  for (const [key, value] of Object.entries(variants)) {
    if (key === 'lang' || key === 'gender' || key === 'form') continue;

    if (this.allowedVariants[key]?.includes(value)) {
      validated[key] = value;
    }
  }

  return validated;
}

sanitizeVariants(variants: VariantContext): VariantContext {
  const sanitized: VariantContext = {};

  for (const [key, value] of Object.entries(variants)) {
    // Only alphanumeric, dash, underscore
    if (typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

### Phase 3: Smart Caching

Cache by `baseName + sorted variants`:

```typescript
getCacheKey(baseName: string, variants: VariantContext): string {
  // Sort keys for consistency
  const sorted = Object.keys(variants).sort();
  const variantStr = sorted.map(k => `${k}:${variants[k]}`).join('|');
  return `${baseName}|${variantStr}`;
}

// Examples:
"strings|lang:es|form:formal"
"hero-card|gender:f|lang:ja"
```

**Benefits**:
- Different variant combinations cache separately
- Order-independent (sorted keys)
- Invalidation by pattern: `cache.delete(/^strings\|/)`

## Resolution Examples

### Example 1: Language-Only

```
Files:
  strings.jsön
  strings:es.jsön
  strings:fr.jsön

Context: { lang: 'es' }

Resolution:
  1. Parse "strings:es" → { lang: 'es' }
  2. Score: 1000 (lang match)
  3. Load: strings:es.jsön
```

### Example 2: Language + Form

```
Files:
  strings.jsön
  strings:es.jsön
  strings:es:formal.jsön
  strings:es:casual.jsön

Context: { lang: 'es', form: 'formal' }

Resolution:
  1. Parse all candidates
  2. Score "strings:es:formal" → 1050 (lang + form)
  3. Load: strings:es:formal.jsön
```

### Example 3: Partial Match Fallback

```
Files:
  strings.jsön
  strings:es.jsön
  (no strings:es:f.jsön)

Context: { lang: 'es', gender: 'f' }

Resolution:
  1. No exact match for lang + gender
  2. Fallback to "strings:es" (1000 points > 100 points)
  3. Load: strings:es.jsön
```

### Example 4: Order Independence

```
Files:
  hero:es:f.jsön
  hero:f:es.jsön  (same as above, different name)

Context: { lang: 'es', gender: 'f' }

Resolution:
  1. Both parse to { lang: 'es', gender: 'f' }
  2. Both score 1100 points
  3. Load: First match (hero:es:f.jsön)
```

## URL Loading (Future)

For HTTP(S) URLs, we can't pre-scan. Strategy:

```typescript
class UrlLoader {
  private checkedUrls = new Map<string, boolean>();

  async load(baseName: string, variants: VariantContext) {
    // Generate candidates in priority order
    const candidates = this.getCandidates(baseName, variants);

    for (const candidate of candidates) {
      // Optimistic: Try HEAD first, then GET
      if (await this.exists(candidate)) {
        return this.fetch(candidate);
      }

      // Cache 404s to avoid retries
      this.checkedUrls.set(candidate, false);
    }

    throw new Error(`No variant found for ${baseName}`);
  }

  async exists(url: string): Promise<boolean> {
    if (this.checkedUrls.has(url)) {
      return this.checkedUrls.get(url)!;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      const exists = response.ok;
      this.checkedUrls.set(url, exists);
      return exists;
    } catch {
      this.checkedUrls.set(url, false);
      return false;
    }
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
describe('Variant-Aware File Loading', () => {
  test('resolves best matching variant file');
  test('falls back to base when no variant matches');
  test('handles order-independent filenames');
  test('validates variants against allowed list');
  test('sanitizes variants in permissive mode');
  test('prevents path traversal attacks');
  test('caches by baseName + variants');
  test('pre-scans directory on init');
  test('combines with expression evaluation');
});
```

### Integration Tests

```typescript
describe('Variant File Loading Integration', () => {
  test('loads Japanese polite strings');
  test('loads Spanish formal + female variants');
  test('falls back through variant hierarchy');
  test('works with nested extends()');
  test('respects extension priority (.jsön before .json)');
  test('handles missing base file gracefully');
});
```

### Security Tests

```typescript
describe('Variant File Loading Security', () => {
  test('blocks path traversal in variant values');
  test('only loads allowed variants');
  test('sanitizes special characters');
  test('prevents directory escape attempts');
});
```

## Performance Benchmarks

Target performance:

```
Pre-scan 1000 files: < 50ms
Resolve variant: < 1ms (with pre-scan)
Cache lookup: < 0.1ms
```

## Example File Structure

```
i18n/
├── strings.jsön                    # Base English
├── strings:es.jsön                 # Spanish
├── strings:es:formal.jsön          # Spanish formal
├── strings:ja.jsön                 # Japanese
├── strings:ja:polite.jsön          # Japanese polite
├── strings:ja:polite:f.jsön        # Japanese polite female
├── strings:ja:honorific.jsön       # Japanese honorific
├── errors.jsön                     # Base errors
├── errors:es.jsön                  # Spanish errors
└── errors:es:formal.jsön           # Spanish formal errors
```

## Constitution Compliance

| Principle | Compliance |
|-----------|-----------|
| I. Minimal Core | ✅ Optional plugin, not in core bundle |
| II. Security | ✅ Allowed variants by default, sanitization, no path traversal |
| III. Test-First | ✅ Comprehensive test suite required |
| V. Plugin Architecture | ✅ Extends filesystem plugin cleanly |
| VI. Cycle Detection | ✅ Inherits from filesystem plugin |

## Bundle Size Impact

**Estimated Addition**: +1-2 kB to filesystem plugin
- Variant validation: ~500 bytes
- Pre-scanning logic: ~800 bytes
- Caching utilities: ~500 bytes

**Total Plugin Size**: ~4-5 kB (filesystem + variants)

## Migration from Existing Design

The filesystem-plugin-design.md already exists. This enhances it with:

1. Add `allowedVariants` option
2. Add pre-scanning on `init()`
3. Use `resolveVariantPath()` for file selection
4. Add variant validation/sanitization
5. Update caching to include variants in key

## Related Patterns

### Webpack i18n-loader

Similar to how webpack resolves locale-specific bundles:
```
app.js
app.de.js     // German bundle
app.fr.js     // French bundle
```

### Next.js i18n Routing

Similar to Next.js automatic locale detection:
```
pages/index.js          // Default
pages/index.es.js       // Spanish
pages/index.ja.js       // Japanese
```

## Future Enhancements

1. **Glob patterns**: `strings*.jsön` to load multiple files
2. **Build-time optimization**: Pre-resolve variants during build
3. **Watch mode**: Auto-reload on file changes with variants
4. **CDN integration**: Load variants from CDN with smart caching
5. **Fallback chains**: `es-MX → es → en` (region → lang → default)

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-05 | Reuse variant resolver | Avoid duplicating scoring logic |
| 2025-10-05 | Pre-scan by default | O(n) once vs O(variants) per load |
| 2025-10-05 | Allowed variants | Prevent attacks, document expectations |
| 2025-10-05 | Order-independent filenames | User convenience, matches in-memory |
| 2025-10-05 | Cache by baseName+variants | Different variants cache separately |

---

**Status**: Ready for implementation
**Next Steps**:
1. Implement `FileLoader` class with variant support
2. Write comprehensive test suite (TDD)
3. Create i18n example with variant files
4. Document in README and plugin docs
5. Benchmark performance with 1000+ files

**Related Files**:
- Base design: `.specify/memory/filesystem-plugin-design.md`
- Variant resolver: `src/variant-resolver.ts`
- Constitution: `.specify/memory/constitution.md`
