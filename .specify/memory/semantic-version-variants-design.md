# Semantic Version Variants Design

**Status**: Design (v0.10.0 or v1.1.0)
**Strategy**: Minimal (prefix matching + highest wins)
**Created**: 2025-10-08
**Author**: Personal use case driven

## Overview

This document extends the variant system to support **semantic version variants**, enabling version-aware file and document resolution. The design uses a minimal approach focused on prefix matching and returning the highest matching version.

### Motivation

**Personal use cases**:
- **Game logic versioning**: Old clients use v1.x rules, new clients use v2.x rules
- **API schema evolution**: Different API versions coexist, clients request specific versions
- **Configuration versioning**: Manage config changes across releases

**Why extend the variant system?**
- Natural fit with existing architecture (lang, gender, form variants)
- SurrealDB array Record IDs already support numeric segments
- File naming convention already uses colon separators
- Scoring system easily accommodates version priority

## Design Philosophy

**Minimal Approach** (No operators):
- ❌ No range operators: `>=3.0`, `<5.0`, `^3.4.0`, `~3.4.0`
- ✅ Simple prefix matching: Request `3.4` → matches any `3.4.x`
- ✅ Highest wins: Always return highest matching version
- ✅ Clean DX: Colon shorthand syntax matches file names

**Rationale**: Start simple, add operators later if needed (v1.2+). Most use cases just need "give me the latest 3.4.x version".

## API Design

### Primary Syntax: Colon Shorthand (Recommended)

**The loader path can include variants directly**, matching the file naming convention:

```typescript
// ✅ Recommended: Clean shorthand (matches file names)
loader.load('game-logic:3.4')
loader.load('api-schema:3')
loader.load('strings:2.0:es')
loader.load('config:1.5:prod')
loader.load('game-rules:2.5:en:formal')
```

**Why this is better**:
- Consistent with file naming: `game-logic:3.4.100.jsön`
- Matches existing variant shorthand: `loader.load('strings:es')`
- Cleaner than object syntax
- Natural and intuitive

### Secondary Syntax: Explicit Options (When Programmatic)

```typescript
// ✅ Also works: Explicit options (useful for dynamic versions)
const version = { major: 3, minor: 4 };
loader.load('game-logic', { version })

// ✅ Programmatic variant construction
const variants = { version: { major: userVersion }, lang: userLanguage };
loader.load('game-logic', variants)
```

### Mixed Syntax: Best of Both Worlds

```typescript
// ✅ Combine shorthand path with options
loader.load('game-logic:3.4', { lang: 'es' })
// Equivalent to: loader.load('game-logic:3.4:es')

// Path variants merged with options (options override)
loader.load('game-logic:3.4', { version: { major: 2, minor: 0 } })
// Result: version 2.0 (options win)
```

### Implementation: Path Parsing

```typescript
// src/loaders/file.ts and surrealdb.ts

async load(
  pathOrBaseName: string,          // Can include variants!
  variantsOrOptions?: VariantContext
): Promise<any> {
  // Parse path for embedded variants
  const { base, variants: pathVariants } = parseVariantPath(pathOrBaseName);

  // Merge with explicit options (explicit wins on conflicts)
  const mergedVariants = {
    ...pathVariants,          // From path: game-logic:3.4
    ...variantsOrOptions      // From options: { lang: 'es' }
  };

  return this.loadWithVariants(base, mergedVariants);
}
```

**Examples**:
```typescript
// Pure shorthand
parseVariantPath('game-logic:3.4')
// → { base: 'game-logic', variants: { version: { major: 3, minor: 4 } } }

// Mixed: path + options
load('game-logic:3.4', { lang: 'es' })
// → Merged: { version: { major: 3, minor: 4 }, lang: 'es' }

// Options override path (if conflict)
load('game-logic:3.4', { version: { major: 2, minor: 0 } })
// → Result: version 2.0 (options win)
```

## File Naming Convention

Files use colon-separated numeric version segments:

```
game-logic:2.5.jsön          # version 2.5
game-logic:100.2.jsön        # version 100.2 (major=100, minor=2)
game-logic:3.4.100.jsön      # version 3.4.100 (major=3, minor=4, patch=100)
api-schema:1.2.3.jsön        # version 1.2.3
config:2.0.jsön              # version 2.0

# Can combine with other variants
strings:2.0:es.jsön          # version 2.0 + Spanish
strings:2.0:es:formal.jsön   # version 2.0 + Spanish + formal
```

**Format**: `<baseName>:<major>.<minor>?.<patch>?:<otherVariants>?.jsön`

**Note**: Dots (`.`) separate version segments, colons (`:`) separate variant dimensions.

## SurrealDB Record ID Structure

Leverages **array-based Record IDs with numeric segments** for optimal performance.

### Record ID Format

```typescript
// Pure version variants
ion:['game-logic', 3, 4, 100]       // v3.4.100
ion:['game-logic', 100, 2]          // v100.2
ion:['config', 2, 0]                // v2.0

// Combined with other variants
ion:['strings', 2, 0, 'es', 'formal']  // v2.0 + Spanish + formal
ion:['game-logic', 3, 4, 'beta']       // v3.4 + beta (custom variant)
```

### Why Array Record IDs Are Perfect

**✅ Benefits** (per SurrealDB specialist analysis):

1. **Natural numeric sorting**: `[100, 2]` > `[3, 4]` (correct), unlike string sorting where `"100" < "3"` (wrong)
2. **Efficient range queries**: 10-100x faster than WHERE clauses (O(log n) vs O(n))
3. **Prefix matching built-in**: `[3, 4]` range matches `[3, 4, 100]`, `[3, 4, 5]`
4. **Type safety**: Numbers are numbers, not strings
5. **Composable**: Combine version with lang/gender/form seamlessly

### Query Pattern (SurrealDB)

```sql
-- Request: Get all 3.4.x versions (prefix match)
SELECT * FROM ion
WHERE id >= type::thing('ion', ['game-logic', 3, 4])
  AND id < type::thing('ion', ['game-logic', 3, 5])
ORDER BY id DESC  -- Highest version first
LIMIT 1;          -- Return latest match

-- Result: ion:['game-logic', 3, 4, 100] if it exists
```

**Array comparison rules**:
1. Compare element-by-element: `[3, 4, 100]` vs `[3, 4, 5]` → 100 > 5 at index 2
2. Shorter arrays are prefixes: `[3, 4]` < `[3, 4, 100]`
3. Natural sort order (DESC): `[100, 2, 5]`, `[100, 2]`, `[3, 4, 100]`, `[3, 4]`, `[2, 5]`

**Performance**: O(log n) index-based range scan (vs O(n) full table scan with WHERE clauses)

## Variant Detection & Parsing

### Pattern Recognition

```typescript
// Pattern: Numeric segments separated by dots
const VERSION_PATTERN = /^\d+(\.\d+)*$/;

isSemanticVersion('100.2')      // true
isSemanticVersion('3.4.100')    // true
isSemanticVersion('2')          // true (major only)
isSemanticVersion('v3.4')       // false (reject 'v' prefix)
isSemanticVersion('beta')       // false (not numeric)
isSemanticVersion('2.0.0-beta') // false (no pre-release in minimal)
```

### Parsing Versions

```typescript
/**
 * Parse semantic version string into numeric array
 *
 * @example
 * parseSemanticVersion('3.4.100') // [3, 4, 100]
 * parseSemanticVersion('100.2')   // [100, 2]
 * parseSemanticVersion('2')       // [2]
 */
function parseSemanticVersion(version: string): number[] {
  return version.split('.').map(Number);
}
```

## Comparison Algorithm (Minimal)

### Version Comparison

```typescript
/**
 * Compare two semantic versions (as numeric arrays)
 *
 * @returns 1 if a > b, -1 if a < b, 0 if equal/prefix
 *
 * @example
 * compareVersions([3, 4, 100], [3, 4, 5])  // 1 (100 > 5)
 * compareVersions([100, 2], [3, 4])        // 1 (100 > 3)
 * compareVersions([3, 4], [3, 4, 100])     // 0 (prefix match)
 * compareVersions([2, 5], [3, 4])          // -1 (2 < 3)
 */
function compareSemanticVersions(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    const segA = a[i] ?? 0;  // Treat missing as 0
    const segB = b[i] ?? 0;

    if (segA > segB) return 1;
    if (segA < segB) return -1;
  }

  return 0;  // Equal or prefix match
}
```

### Prefix Matching Logic

```typescript
/**
 * Check if version matches prefix
 *
 * @example
 * matchesPrefix([3, 4, 100], [3, 4])     // true (3.4.100 matches 3.4)
 * matchesPrefix([3, 4, 5], [3, 4])       // true (3.4.5 matches 3.4)
 * matchesPrefix([3, 5], [3, 4])          // false (3.5 does not match 3.4)
 */
function matchesVersionPrefix(
  candidateVersion: number[],
  requestedPrefix: number[]
): boolean {
  for (let i = 0; i < requestedPrefix.length; i++) {
    if (candidateVersion[i] !== requestedPrefix[i]) {
      return false;
    }
  }
  return true;  // All prefix segments match
}
```

### Resolution Example

```typescript
// Request: { version: { major: 3, minor: 4 } }  // Prefix: [3, 4]
// Available versions:
//   - [3, 4, 100]  ✅ Matches prefix [3, 4], highest patch
//   - [3, 4, 5]    ✅ Matches prefix [3, 4]
//   - [3, 4, 0]    ✅ Matches prefix [3, 4]
//   - [3, 3, 0]    ❌ Does not match (3.3.x)
//   - [3, 5, 0]    ❌ Does not match (3.5.x)

// Result: [3, 4, 100] (highest matching version)
```

## Integration with Existing Variant System

### Type System Updates

```typescript
// src/types.ts

/**
 * Semantic version variant (major.minor.patch)
 */
export interface VersionVariant {
  major: number;
  minor?: number;
  patch?: number;
}

/**
 * Extended VariantContext with version support
 */
export interface VariantContext {
  lang?: string;                     // Language (e.g., 'es', 'ja')
  gender?: 'm' | 'f' | 'x';          // Pronoun gender
  form?: string;                     // Formality level
  version?: VersionVariant;          // NEW: Semantic version
  [key: string]: string | VersionVariant | undefined;
}
```

### Scoring System

**Version as well-known variant** (75 points, between `form` and `gender`):

| Variant | Points | Rationale |
|---------|--------|-----------|
| `lang` | 1000 | Highest priority (i18n) |
| `gender` | 100 | Second tier (pronouns) |
| **`version`** | **75** | **NEW: Third tier (versioning)** |
| `form` | 50 | Fourth tier (formality) |
| `custom` | 10 | Lowest tier (domain-specific) |

**Why 75 points?**
- Higher than `form` (50) - Versions more critical than formality
- Lower than `gender` (100) - Pronouns more critical than versions
- Allows combining: `lang + version = 1075 points` (beats `lang + form = 1050`)

### Variant Parsing Extension

```typescript
// src/variant-resolver.ts

// Add to VARIANT_PATTERNS
const VARIANT_PATTERNS = {
  lang: /^[a-z]{2}(-[A-Z]{2})?$/,
  gender: /^[mfx]$/,
  form: /^(casual|informal|neutral|polite|formal|honorific)$/,
  version: /^\d+(\.\d+)*$/,  // NEW: Semantic version pattern
};

// Extend parseVariantPath()
export function parseVariantPath(path: string): ParsedVariants {
  const parts = path.split(':');
  const base = parts[0] || '';
  const variants: VariantContext = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (VARIANT_PATTERNS.lang.test(part)) {
      variants.lang = part;
    } else if (VARIANT_PATTERNS.gender.test(part)) {
      variants.gender = part as 'm' | 'f' | 'x';
    } else if (VARIANT_PATTERNS.form.test(part)) {
      variants.form = part;
    } else if (VARIANT_PATTERNS.version.test(part)) {
      // NEW: Parse semantic version
      const [major, minor, patch] = part.split('.').map(Number);
      variants.version = { major, minor, patch };
    } else {
      // Custom variant
      variants[part] = part;
    }
  }

  return { base, variants };
}
```

### Scoring Extension

```typescript
// src/variant-resolver.ts

export function scoreVariantMatch(
  pathVariants: VariantContext,
  contextVariants: VariantContext
): number {
  let score = 0;

  // Well-known variants
  if (pathVariants.lang && pathVariants.lang === contextVariants.lang) {
    score += 1000;
  }

  if (pathVariants.gender && pathVariants.gender === contextVariants.gender) {
    score += 100;
  }

  // NEW: Version scoring
  if (pathVariants.version && contextVariants.version) {
    const pathVer = [
      pathVariants.version.major,
      pathVariants.version.minor ?? 0,
      pathVariants.version.patch ?? 0,
    ];
    const contextVer = [
      contextVariants.version.major,
      contextVariants.version.minor ?? 0,
      contextVariants.version.patch ?? 0,
    ];

    // Check if path version matches context version prefix
    if (matchesVersionPrefix(pathVer, contextVer)) {
      score += 75;  // Version match points

      // Add fractional bonus for higher versions (tiebreaker)
      // Ensures 3.4.100 beats 3.4.5 when both match prefix 3.4
      const versionBonus = calculateVersionBonus(pathVer, contextVer);
      score += versionBonus;  // Max 0.999 (never crosses to next tier)
    }
  }

  if (pathVariants.form && pathVariants.form === contextVariants.form) {
    score += 50;
  }

  // Custom variants
  for (const [key, value] of Object.entries(pathVariants)) {
    if (key !== 'lang' && key !== 'gender' && key !== 'form' && key !== 'version') {
      if (contextVariants[key] === value) {
        score += 10;
      }
    }
  }

  return score;
}

/**
 * Calculate fractional bonus for higher version (tiebreaker)
 * Ensures higher versions win when multiple candidates match prefix
 *
 * @example
 * calculateVersionBonus([3, 4, 100], [3, 4]) // 0.100 (patch bonus)
 * calculateVersionBonus([3, 4, 5], [3, 4])   // 0.005 (patch bonus)
 *
 * Result: 75.100 > 75.005 (3.4.100 beats 3.4.5)
 */
function calculateVersionBonus(
  pathVersion: number[],
  contextVersion: number[]
): number {
  let bonus = 0;

  // Add fractional bonus for each segment beyond requested prefix
  for (let i = contextVersion.length; i < pathVersion.length; i++) {
    const segment = pathVersion[i] ?? 0;
    bonus += segment / Math.pow(1000, i - contextVersion.length + 1);
  }

  return Math.min(bonus, 0.999);  // Cap at 0.999 to never cross tier
}
```

## FileLoader Changes

### File Discovery

```typescript
// src/loaders/file.ts

/**
 * List all available versions for a base name
 *
 * @example
 * // Files: game-logic:3.4.100.jsön, game-logic:3.4.5.jsön, game-logic:2.5.jsön
 * listVersions('game-logic')
 * // → [
 * //   { major: 3, minor: 4, patch: 100 },
 * //   { major: 3, minor: 4, patch: 5 },
 * //   { major: 2, minor: 5 }
 * // ]
 */
async function listVersions(baseName: string): Promise<VersionVariant[]> {
  const files = await readdir(this.baseDir);
  const versions: VersionVariant[] = [];

  for (const file of files) {
    const parsed = parseVariantPath(file.replace(/\.jsön$/, ''));
    if (parsed.base === baseName && parsed.variants.version) {
      versions.push(parsed.variants.version);
    }
  }

  // Sort descending (highest first)
  return versions.sort((a, b) => {
    const arrA = [a.major, a.minor ?? 0, a.patch ?? 0];
    const arrB = [b.major, b.minor ?? 0, b.patch ?? 0];
    return compareSemanticVersions(arrB, arrA);  // Reverse for DESC
  });
}
```

### Version Resolution

```typescript
// src/loaders/file.ts

/**
 * Load file with version prefix matching
 *
 * @example
 * // Files: game-logic:3.4.100.jsön, game-logic:3.4.5.jsön
 * load('game-logic', { version: { major: 3, minor: 4 } })
 * // → Loads game-logic:3.4.100.jsön (highest 3.4.x)
 */
async load(
  baseName: string,
  variants: VariantContext = {}
): Promise<any> {
  // If version variant specified, find highest matching version
  if (variants.version) {
    const availableVersions = await this.listVersions(baseName);
    const requestedPrefix = [
      variants.version.major,
      variants.version.minor ?? null,
      variants.version.patch ?? null,
    ].filter((v) => v !== null) as number[];

    // Find all matching versions
    const matches = availableVersions.filter((v) => {
      const candidate = [v.major, v.minor ?? 0, v.patch ?? 0];
      return matchesVersionPrefix(candidate, requestedPrefix);
    });

    if (matches.length === 0) {
      // No version match, fall back to base (no version)
      return this.loadBase(baseName, variants);
    }

    // Use highest matching version (already sorted DESC)
    const bestMatch = matches[0];
    const resolvedVariants = { ...variants, version: bestMatch };
    return this.loadExact(baseName, resolvedVariants);
  }

  // No version specified, use existing resolution
  return this.loadBase(baseName, variants);
}
```

## SurrealDBLoader Advantages

### Performance Comparison

**Traditional WHERE approach** (O(n) full table scan):
```sql
SELECT * FROM ion
WHERE base_name = 'game-logic'
  AND version_major = 3
  AND version_minor = 4
ORDER BY version_patch DESC
LIMIT 1;
```

**Array Record ID approach** (O(log n) index range scan):
```sql
SELECT * FROM ion
WHERE id >= type::thing('ion', ['game-logic', 3, 4])
  AND id < type::thing('ion', ['game-logic', 3, 5])
ORDER BY id DESC
LIMIT 1;
```

**Speed improvement**: 10-100x faster (per existing design doc benchmarks)

### Listing All Versions

```sql
-- List all versions of 'game-logic' (sorted descending)
SELECT * FROM ion
WHERE id >= type::thing('ion', ['game-logic'])
  AND id < type::thing('ion', ['game-logic', '\uffff'])
ORDER BY id DESC;

-- Result (natural numeric sort):
-- ion:['game-logic', 100, 2]
-- ion:['game-logic', 3, 4, 100]
-- ion:['game-logic', 3, 4, 5]
-- ion:['game-logic', 2, 5]
```

### Combined Variant Queries

```sql
-- Get version 2.x in Spanish
SELECT * FROM ion
WHERE id >= type::thing('ion', ['strings', 2, 'es'])
  AND id < type::thing('ion', ['strings', 3, 'es'])
ORDER BY id DESC;

-- Matches: ['strings', 2, 5, 'es'], ['strings', 2, 0, 'es']
```

## Use Cases

### 1. Game Logic Versioning

**Problem**: Old game clients use different rule sets than new clients.

**Solution** (shorthand syntax):
```typescript
// ✅ Recommended: Clean shorthand
const rulesV1 = await loader.load('game-rules:1');      // v1.x
const rulesV2 = await loader.load('game-rules:2');      // v2.x
const rulesV25 = await loader.load('game-rules:2.5');   // v2.5.x
// Request 2.5 → matches 2.5.10, 2.5.3, 2.5.0 → returns 2.5.10

// Also works: Explicit options (if version is dynamic)
const version = clientVersion;  // e.g., { major: 2, minor: 5 }
const rules = await loader.load('game-rules', { version });
```

**Files**:
```
game-rules:1.0.jsön
game-rules:1.5.jsön
game-rules:2.0.jsön
game-rules:2.5.0.jsön
game-rules:2.5.10.jsön  ← Loaded for 'game-rules:2.5'
```

### 2. API Schema Evolution

**Problem**: API contracts change over time, clients need specific versions.

**Solution** (shorthand syntax):
```typescript
// ✅ Recommended: Clean shorthand
const schemaV3 = await loader.load('api-schema:3');      // Latest 3.x
const schemaV35 = await loader.load('api-schema:3.5');   // Latest 3.5.x
// Matches: 3.9.2, 3.5.0, 3.0.0 → returns 3.9.2 for :3
// Matches: 3.5.3, 3.5.0 → returns 3.5.3 for :3.5
```

**Files**:
```
api-schema:3.0.0.jsön
api-schema:3.5.0.jsön
api-schema:3.5.3.jsön  ← Loaded for version { major: 3, minor: 5 }
api-schema:3.9.2.jsön  ← Loaded for version { major: 3 }
```

### 3. Configuration Versioning

**Problem**: Config format changes across releases, need environment-specific + versioned configs.

**Solution** (shorthand syntax):
```typescript
// ✅ Recommended: Clean shorthand
const configProd = await loader.load('config:2.0:prod');  // v2.0 + prod
const configDev = await loader.load('config:2.1:dev');    // v2.1 + dev
```

**Files**:
```
config:2.0:prod.jsön    ← Loaded for 'config:2.0:prod'
config:2.0:dev.jsön
config:2.1:dev.jsön     ← Loaded for 'config:2.1:dev'
```

### 4. Localized Content Versioning

**Problem**: Translation quality improves over time, want versioned translations.

**Solution** (shorthand syntax):
```typescript
// ✅ Recommended: Clean shorthand
const stringsEs = await loader.load('strings:2.0:es:formal');
// v2.0 + Spanish + formal

// Mixed: Combine path and options
const lang = userLanguage;  // Dynamic from user preference
const strings = await loader.load('strings:2.0', { lang, form: 'formal' });
```

**Files**:
```
strings:1.0:es.jsön
strings:2.0:es.jsön
strings:2.0:es:formal.jsön  ← Loaded
```

## Edge Cases

| Case | Behavior | Example |
|------|----------|---------|
| **No matching version** | Fall back to base (no version) | Request `3.4` → no `3.4.x` found → load `game-logic.jsön` |
| **Exact match exists** | Return exact match | Request `3.4.100` → load `game-logic:3.4.100.jsön` |
| **Multiple patch versions** | Return highest patch | Request `3.4` → candidates `3.4.100`, `3.4.5` → load `3.4.100` |
| **Invalid version format** | Treat as custom variant (10 points) | `game-logic:v3.4.jsön` → `v3.4` treated as custom variant |
| **Mixed with lang/gender** | Combine scores | `strings:2.0:es.jsön` → 1075 points (1000+75) |
| **No version specified** | Ignore version variants | Request `{ lang: 'es' }` → skip version files, load `strings:es.jsön` |
| **Tiebreaker (same prefix)** | Higher version wins via fractional bonus | `3.4.100` (75.100) > `3.4.5` (75.005) |

## Implementation Phases

### Phase 1: v0.10.0 or v1.1.0 - Minimal (~150 LOC + 15 tests)

**Goal**: Basic semantic version support with prefix matching.

**Tasks**:
1. **Type System** (`src/types.ts`):
   - Add `VersionVariant` interface
   - Extend `VariantContext` with optional `version` field

2. **Variant Resolver** (`src/variant-resolver.ts`):
   - Add `version` pattern to `VARIANT_PATTERNS`
   - Extend `parseVariantPath()` to detect and parse versions
   - Extend `scoreVariantMatch()` with version scoring (75 points)
   - Add `compareSemanticVersions()` helper
   - Add `matchesVersionPrefix()` helper
   - Add `calculateVersionBonus()` for tiebreaker

3. **FileLoader** (`src/loaders/file.ts`):
   - Add `listVersions()` method
   - Extend `load()` with version prefix matching logic
   - Update file serialization for version variants

4. **SurrealDBLoader** (`src/loaders/surrealdb.ts`):
   - Update `buildRecordId()` to handle numeric version segments
   - Update `parseRecordId()` to extract version from numeric segments
   - Add `loadVersionPrefix()` method (range query)
   - Add `loadLatestVersion()` method (highest match)

5. **Tests** (`test/unit/version-variants.test.ts`):
   - Version detection and parsing (5 tests)
   - Version comparison and sorting (5 tests)
   - Prefix matching logic (5 tests)
   - FileLoader version resolution (10 tests)
   - SurrealDBLoader version queries (10 tests)
   - Combined variants (version + lang/gender/form) (5 tests)

**Success Criteria**:
- ✅ Request `{ version: { major: 3, minor: 4 } }` → matches `3.4.100`
- ✅ Returns highest patch version
- ✅ Works with FileLoader and SurrealDBLoader
- ✅ Combines with lang/gender/form variants
- ✅ All 40+ tests passing

### Phase 2: v1.2.0+ - Optional Enhancements (Future)

**If needed based on usage**:
- Range operators: `>=3.0`, `<5.0`, `3.0-5.0`
- Pre-release tags: `2.0.0-beta.1`, `2.0.0-rc.2`
- Build metadata: `2.0.0+20240108`
- Custom comparison functions
- Migration/upgrade detection

**Defer until real need emerges.**

## Migration & Backward Compatibility

### Current Behavior (Before Implementation)

**Numeric strings as custom variants**:
```
game-logic:100.2.jsön  → Custom variant "100.2" (10 points)
```

### New Behavior (After Implementation)

**Numeric strings as version variants**:
```
game-logic:100.2.jsön  → Version variant { major: 100, minor: 2 } (75 points)
```

### Breaking Changes

**None expected** - Numeric variant file names are unlikely in existing usage:
- ✅ Existing files: `strings:es.jsön`, `profile:f.jsön` → Unaffected
- ✅ Custom variants: `config:aws.jsön`, `theme:dark.jsön` → Unaffected
- ⚠️ Numeric custom variants: `cohort:2024.jsön` → **Becomes version variant**

**Migration**: If numeric custom variants exist, rename to non-numeric (e.g., `cohort:y2024.jsön`).

### Compatibility Guarantees

- ✅ All existing variant resolution works unchanged
- ✅ Files without version variants unaffected
- ✅ Version variants are **opt-in** (only activate when `version` in context)
- ✅ Scoring hierarchy preserved (lang > gender > version > form > custom)

## Open Questions

**For you to decide**:

- [ ] **4+ segment versions?** (e.g., `1.2.3.4.5`) - Support or limit to major.minor.patch?
- [ ] **Date-based versions?** (e.g., `2024.10.08`) - Should these work as semantic versions?
- [ ] **Pre-release suffixes?** (e.g., `2.0.0-beta`) - Defer to Phase 2 or never?
- [ ] **Version scoring?** - Confirm 75 points (between form and gender) feels right?
- [ ] **Fallback behavior?** - When no version matches, fall back to base or throw error?

**Current defaults** (adjust in design if preferences differ):
- ✅ Support unlimited segments (flexible)
- ✅ Date-based versions work naturally (2024.10.08 → [2024, 10, 8])
- ❌ No pre-release support (defer to Phase 2)
- ✅ 75 points (third tier, below gender)
- ✅ Fall back to base (graceful degradation)

## Related Documentation

- `variant-system-design.md` - Base variant system (lang, gender, form, custom)
- `record-id-variants-design.md` - SurrealDB array Record ID design and performance
- `storage-providers-design.md` - FileLoader and SurrealDBLoader implementation

## Success Criteria

**Minimal implementation is successful when**:

- ✅ Request `3.4` matches `3.4.100` (prefix matching works)
- ✅ Returns highest patch version (3.4.100 > 3.4.5)
- ✅ Works with FileLoader (file name parsing and resolution)
- ✅ Works with SurrealDBLoader (array Record ID queries)
- ✅ Combines with lang/gender/form variants (scoring additive)
- ✅ 10-100x faster queries in SurrealDB (range queries vs WHERE)
- ✅ All tests passing (40+ tests covering edge cases)
- ✅ DX feels natural (simple API, no surprises)

---

## Summary

This design extends the existing variant system with semantic versioning:

**API**:
- **Primary**: Shorthand syntax `loader.load('game-logic:3.4')`
- **Secondary**: Explicit options `loader.load('game-logic', { version: { major: 3, minor: 4 } })`
- **Mixed**: Combine both `loader.load('game-logic:3.4', { lang: 'es' })`

**Features**:
- Minimal scope: No operators, just prefix matching + highest wins
- Well-known variant: 75 points (third tier, between form and gender)
- Natural DX: Request `3.4` → get `3.4.100` (highest patch)
- SurrealDB optimized: Array Record IDs for 10-100x faster queries
- Backward compatible: No breaking changes to existing variant system

**Implementation**: ~150 LOC + 15 tests for Phase 1 (minimal)

---

**Status**: Ready for implementation when you decide to proceed.

**Next Steps**:
1. Review this design and adjust any preferences
2. Create spec "002-semantic-version-variants" when ready to implement
3. Use `/specify` workflow: spec → plan → tasks → implement
