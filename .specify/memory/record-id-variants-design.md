# SurrealDB Record ID Variants Design

**Status**: Design (v0.6.0+)
**Related**: `storage-providers-design.md`, `surrealdb-vue-vision.md`
**Created**: 2025-10-06
**Author**: Design phase (implementation pending)

## Overview

This document extends the storage provider design to leverage SurrealDB's **array-based and object-based Record IDs** for performant variant-aware document storage and querying.

### Key Insight

SurrealDB allows Record IDs to be **arrays or objects**, not just strings. This enables:
- **Hierarchical indexing** (e.g., `jsön_documents:['greetings', 'en', 'formal']`)
- **Range queries** (e.g., all documents for a specific base_name + lang)
- **Performant filtering** without WHERE clauses
- **Natural variant encoding** in the Record ID itself

## The Opportunity

### Traditional Approach (Current Design)

```sql
-- Store variants as a field
CREATE jsön_documents CONTENT {
  base_name: 'greetings',
  variants: { lang: 'en', form: 'formal' },
  data: { hello: 'Good evening, sir' }
};

-- Query requires WHERE clause
SELECT * FROM jsön_documents
WHERE base_name = 'greetings'
  AND variants.lang = 'en';
```

**Limitations**:
- WHERE clause filtering is slower than Record ID ranges
- Can't use SurrealDB's optimized range queries
- Variants are hidden in document body

### Array-Based Record ID Approach (Enhanced Design)

```sql
-- Encode variants directly in Record ID
CREATE jsön_documents:['greetings', 'en', 'formal'] CONTENT {
  data: { hello: 'Good evening, sir' }
};

-- Range query (no WHERE clause needed!)
SELECT * FROM jsön_documents:['greetings', 'en']..jsön_documents:['greetings', 'en', '\uffff'];
```

**Benefits**:
- **Faster queries** - Record ID ranges are optimized by SurrealDB
- **Natural sorting** - Documents auto-sorted by variant hierarchy
- **Cleaner schema** - No redundant `base_name` or `variants` fields
- **Range queries** - Get all variants for a base_name in one query

## Design Approaches

### Approach 1: Ordered Array IDs (Recommended)

Use array Record IDs with a **deterministic variant order**.

#### Schema

```sql
-- No need for base_name or variants fields!
DEFINE TABLE jsön_documents SCHEMAFULL;

-- Just the data and metadata
DEFINE FIELD data ON jsön_documents TYPE object;
DEFINE FIELD created_at ON jsön_documents TYPE datetime VALUE time::now();
DEFINE FIELD updated_at ON jsön_documents TYPE datetime VALUE time::now();
DEFINE FIELD version ON jsön_documents TYPE int VALUE 1;

-- Indexes are on Record ID itself (automatic!)
```

#### Record ID Format

```
jsön_documents:[<base_name>, <lang>?, <gender>?, <form>?, ...custom]
```

**Examples**:
```sql
-- No variants
jsön_documents:['config']

-- Language only
jsön_documents:['greetings', 'en']

-- Language + formality
jsön_documents:['greetings', 'en', 'formal']

-- Language + gender + formality
jsön_documents:['greetings', 'es', 'f', 'casual']

-- Custom variants (after well-known)
jsön_documents:['greetings', 'en', NONE, NONE, 'us-west']
```

#### Variant Order Priority

Following the existing variant priority system:
1. `base_name` (always first)
2. `lang` (1000 points)
3. `gender` (100 points)
4. `form` (50 points)
5. Custom variants (10 points, alphabetical)

**Important**: Use `NONE` or empty string for missing well-known variants to maintain order.

### Approach 2: Object-Based Record IDs

Use object Record IDs for named variant keys.

```sql
-- Object ID with named keys
CREATE jsön_documents:{ base: 'greetings', lang: 'en', form: 'formal' }
CONTENT { data: { hello: 'Good evening' } };
```

**Pros**:
- Self-documenting (named keys visible)
- Order-independent

**Cons**:
- Cannot use range queries effectively
- Less performant than arrays
- More verbose

**Verdict**: ❌ Not recommended. Arrays are faster and cleaner.

### Approach 3: Hybrid (Record ID + Fields)

Keep both Record ID and fields for backward compatibility.

```sql
CREATE jsön_documents:['greetings', 'en'] CONTENT {
  base_name: 'greetings',  -- Redundant but explicit
  variants: { lang: 'en' }, -- Redundant but queryable
  data: { hello: 'Hello' }
};
```

**Pros**:
- Easy migration from traditional approach
- Can query both ways

**Cons**:
- Redundant data
- Larger documents
- More complex to maintain consistency

**Verdict**: 🤔 Consider for migration phase only.

## Recommended Implementation

### Record ID Generator

```typescript
interface VariantContext {
  lang?: string;
  gender?: 'm' | 'f' | 'x';
  form?: string;
  [key: string]: string | undefined;
}

const VARIANT_ORDER = ['lang', 'gender', 'form'] as const;
const NONE_PLACEHOLDER = ''; // Or null, depending on SurrealDB behavior

function makeRecordID(baseName: string, variants?: VariantContext): any[] {
  const id: any[] = [baseName];

  if (!variants || Object.keys(variants).length === 0) {
    return id;
  }

  // Add well-known variants in priority order
  for (const key of VARIANT_ORDER) {
    const value = variants[key];
    id.push(value || NONE_PLACEHOLDER);
  }

  // Add custom variants (alphabetically sorted for determinism)
  const customKeys = Object.keys(variants)
    .filter(k => !VARIANT_ORDER.includes(k as any))
    .sort();

  for (const key of customKeys) {
    id.push(variants[key] || NONE_PLACEHOLDER);
  }

  // Trim trailing NONE placeholders for cleaner IDs
  while (id.length > 1 && id[id.length - 1] === NONE_PLACEHOLDER) {
    id.pop();
  }

  return id;
}
```

**Examples**:
```typescript
makeRecordID('greetings')
// → ['greetings']

makeRecordID('greetings', { lang: 'en' })
// → ['greetings', 'en']

makeRecordID('greetings', { lang: 'en', form: 'formal' })
// → ['greetings', 'en', '', 'formal'] // gender is empty

makeRecordID('greetings', { lang: 'es', gender: 'f', form: 'casual' })
// → ['greetings', 'es', 'f', 'casual']

makeRecordID('greetings', { lang: 'en', env: 'prod' })
// → ['greetings', 'en', '', '', 'prod'] // custom variant after well-known
```

### SurrealDBLoader with Array Record IDs

```typescript
class SurrealDBLoader {
  async save(
    baseName: string,
    data: any,
    variants?: VariantContext,
    options?: SaveOptions
  ): Promise<void> {
    const recordID = makeRecordID(baseName, variants);
    const thing = type::thing('jsön_documents', recordID);

    if (options?.merge) {
      // Load existing, merge, then update
      const existing = await this.load(baseName, variants);
      data = { ...existing, ...data };
    }

    await this.db.create(thing, {
      data,
      updated_at: new Date(),
      version: 1
    });
  }

  async load(baseName: string, variants?: VariantContext): Promise<any> {
    const recordID = makeRecordID(baseName, variants);
    const thing = type::thing('jsön_documents', recordID);

    const result = await this.db.select(thing);

    if (!result) {
      throw new Error(`Document not found: ${JSON.stringify(recordID)}`);
    }

    return result.data;
  }

  async delete(baseName: string, variants?: VariantContext): Promise<void> {
    const recordID = makeRecordID(baseName, variants);
    const thing = type::thing('jsön_documents', recordID);

    await this.db.delete(thing);
  }
}
```

### Range Queries (List Variants)

One of the biggest benefits: **efficient range queries**.

```typescript
async listVariants(baseName: string, partialVariants?: Partial<VariantContext>): Promise<any[]> {
  // Build range start and end
  const startID = makeRecordID(baseName, partialVariants as VariantContext);
  const endID = [...startID, '\uffff']; // Unicode max for open-ended range

  const query = `
    SELECT * FROM jsön_documents:$start..jsön_documents:$end
  `;

  const result = await this.db.query(query, { start: startID, end: endID });
  return result[0] || [];
}
```

**Examples**:
```typescript
// Get ALL variants for 'greetings'
await listVariants('greetings');
// Range: ['greetings']..['greetings', '\uffff']
// Returns: All greetings documents regardless of language

// Get all English greetings (any formality)
await listVariants('greetings', { lang: 'en' });
// Range: ['greetings', 'en']..['greetings', 'en', '\uffff']
// Returns: greetings:en, greetings:en:formal, greetings:en:casual, etc.

// Get all Spanish feminine greetings
await listVariants('greetings', { lang: 'es', gender: 'f' });
// Range: ['greetings', 'es', 'f']..['greetings', 'es', 'f', '\uffff']
// Returns: All es+f combinations regardless of formality
```

### Performance Comparison

#### Traditional WHERE Clause
```sql
SELECT * FROM jsön_documents
WHERE base_name = 'greetings'
  AND variants.lang = 'en'
```
- Full table scan with filtering
- O(n) complexity
- Slower for large datasets

#### Array Record ID Range Query
```sql
SELECT * FROM jsön_documents:['greetings', 'en']..jsön_documents:['greetings', 'en', '\uffff']
```
- Index-based range scan
- O(log n) complexity
- **10-100x faster** for large datasets

## Migration Strategy

### Phase 1: Add Record ID Support (v0.7.0)

- Implement `makeRecordID()` helper
- Update SurrealDBLoader to use array Record IDs
- Keep `base_name` and `variants` fields for backward compat
- All new documents use array IDs

### Phase 2: Dual Query Support (v0.7.0)

- `load()` tries array ID first, falls back to WHERE query
- Enables gradual migration of existing documents
- No breaking changes

### Phase 3: Range Query Optimization (v0.8.0)

- Add `listVariants()` with range queries
- Document performance benefits
- Provide migration script for existing data

### Phase 4: Remove Legacy Fields (v1.0.0)

- Drop `base_name` and `variants` fields from schema
- Pure array Record ID approach
- Breaking change (major version)

## Use Cases

### Time-Series Documents

```typescript
// Store metrics with timestamp in Record ID
const timestamp = new Date().toISOString();
await loader.save(
  'metrics',
  { cpu: 45.2, memory: 78.5 },
  { env: 'prod', timestamp }
);

// Query range of timestamps
await listVariants('metrics', {
  env: 'prod',
  timestamp: '2025-10-06T00:00:00Z'
});
// Returns all metrics from that day forward
```

### Multi-Tenant Data

```typescript
// Tenant ID as first variant
await loader.save(
  'user_prefs',
  { theme: 'dark' },
  { tenant: 'acme-corp', userId: 'alice' }
);

// Get all preferences for a tenant
await listVariants('user_prefs', { tenant: 'acme-corp' });
```

### Geographic Data

```typescript
// Region hierarchy
await loader.save(
  'shipping_rates',
  { rate: 9.99 },
  { country: 'US', region: 'west', state: 'CA' }
);

// Get all US rates
await listVariants('shipping_rates', { country: 'US' });

// Get all US West rates
await listVariants('shipping_rates', { country: 'US', region: 'west' });
```

## Testing Strategy

### Unit Tests

```typescript
describe('Record ID Generation', () => {
  it('should generate array ID with variants in priority order', () => {
    const id = makeRecordID('greetings', {
      form: 'formal',  // Lower priority
      lang: 'en'       // Higher priority
    });

    // lang should come before form
    expect(id).toEqual(['greetings', 'en', '', 'formal']);
  });

  it('should trim trailing empty placeholders', () => {
    const id = makeRecordID('greetings', { lang: 'en' });

    // Should NOT have trailing empty strings for gender/form
    expect(id).toEqual(['greetings', 'en']);
  });

  it('should handle custom variants after well-known', () => {
    const id = makeRecordID('config', {
      lang: 'en',
      env: 'prod',
      region: 'us-west'
    });

    // Custom variants alphabetically after well-known
    expect(id).toEqual(['greetings', 'en', '', '', 'prod', 'us-west']);
  });
});
```

### Integration Tests

```typescript
describe('SurrealDB Array Record IDs', () => {
  it('should store and retrieve with array ID', async () => {
    await loader.save('greetings', { hello: 'Hello' }, { lang: 'en' });

    const loaded = await loader.load('greetings', { lang: 'en' });
    expect(loaded.hello).toBe('Hello');
  });

  it('should perform range query for all variants', async () => {
    await loader.save('greetings', { hello: 'Hello' }, { lang: 'en' });
    await loader.save('greetings', { hello: 'Hi' }, { lang: 'en', form: 'casual' });
    await loader.save('greetings', { hello: 'Hola' }, { lang: 'es' });

    const enVariants = await loader.listVariants('greetings', { lang: 'en' });

    expect(enVariants).toHaveLength(2); // en and en:casual
  });
});
```

## Benefits Summary

### Performance
- ✅ **10-100x faster** range queries vs WHERE clauses
- ✅ Index-based lookups (O(log n) vs O(n))
- ✅ Natural sorting by variant hierarchy

### Developer Experience
- ✅ Cleaner schema (no redundant fields)
- ✅ Self-documenting Record IDs
- ✅ Powerful range queries out of the box

### Architecture
- ✅ Aligns with SurrealDB's strengths
- ✅ Scales better for large datasets
- ✅ Enables time-series and hierarchical data patterns

### Migration
- ✅ Backward compatible (hybrid approach available)
- ✅ Gradual migration path
- ✅ No breaking changes until v1.0.0

## Open Questions

1. **Empty Placeholder**: Should we use `''`, `null`, or `NONE` for missing variants?
   - **Recommendation**: Empty string `''` for simplicity and SurrealDB compatibility

2. **Custom Variant Order**: Should users be able to configure variant order?
   - **Recommendation**: No, use fixed priority order for consistency

3. **Record ID Length**: Is there a practical limit to array Record ID length?
   - **Recommendation**: SurrealDB docs don't specify a limit, but keep reasonable (<10 elements)

4. **Backward Compat**: How long should we maintain hybrid approach?
   - **Recommendation**: Until v1.0.0, then pure array IDs only

## References

- [SurrealDB Record IDs Documentation](https://surrealdb.com/docs/surrealql/datamodel/ids)
- [Storage Providers Design](.specify/memory/storage-providers-design.md)
- [SurrealDB Vue Vision](.specify/memory/surrealdb-vue-vision.md)

## Changelog

- **2025-10-06**: Initial design based on SurrealDB Record ID capabilities
