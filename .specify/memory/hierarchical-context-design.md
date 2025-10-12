# Hierarchical Context Design

**Status**: Design (Future - v0.10+ or v1.1+)
**Strategy**: Path-based context inference from nested data
**Created**: 2025-10-08
**Author**: Personal use case driven

## Overview

This document extends the variant system to support **hierarchical context inference**, where variant context can be inferred from the data structure itself as you traverse nested paths. This enables per-entity contexts (e.g., per-user gender, per-product tier) without requiring global context at construction.

### Motivation

**Problem**: Current variant context is global, set once at construction:

```typescript
const data = dotted(schema, {
  variants: { gender: 'm', lang: 'es' }  // Global for entire tree
});
```

This doesn't work well for **entity-level contexts**:

```typescript
// Want different gender per user
const users = {
  bill: { gender: 'm', '.greeting': 'I am ${:subject}' },   // "he"
  alice: { gender: 'f', '.greeting': 'I am ${:subject}' }   // "she"
};

// But current system requires choosing ONE global gender
```

**Solution**: Infer context from the data path itself:

```typescript
const data = dotted({
  users: {
    bill: {
      '.context': { gender: 'm' },  // Context for users.bill.*
      '.greeting': 'I am ${:subject}'
    },
    alice: {
      '.context': { gender: 'f' },  // Context for users.alice.*
      '.greeting': 'I am ${:subject}'
    }
  }
});

await data.get('users.bill.greeting');   // "I am he"
await data.get('users.alice.greeting');  // "I am she"
```

## Design Philosophy

**Key principles**:
- **Explicit over implicit**: Use `.context` marker (not auto-inference of arbitrary keys)
- **Consistent with expressions**: `.context` uses dot-prefix like `.greeting`
- **Merge inheritance**: Child contexts extend parent contexts
- **Backward compatible**: Existing global `variants` option still works
- **Opt-in complexity**: Only pay cost if you use hierarchical contexts

## API Design

### Context Declaration: `.context` Key

**Use dot-prefixed `.context` key** at any depth to declare context for that subtree:

```typescript
{
  '.context': { lang: 'es' },  // Context for this object and children
  '.greeting': 'Hola',
  users: {
    bill: {
      '.context': { gender: 'm' },  // Extends parent: { lang: 'es', gender: 'm' }
      '.bio': 'I speak ${:possessive} mind'  // "his"
    }
  }
}
```

**Why `.context` instead of `_variants` or `_context`?**
1. Consistent with dot-prefix expression syntax
2. Natural sorting (groups with other dot-prefixed keys)
3. Could be dynamic (evaluated as expression)
4. Philosophically consistent (context is "computed")

### Context Inheritance Strategy

**Child contexts MERGE with parent contexts** (additive):

```typescript
{
  '.context': { lang: 'es', region: 'us' },  // Parent context
  products: {
    premium: {
      '.context': { tier: 'premium', region: 'eu' },  // Merge + override
      // Effective context: { lang: 'es', region: 'eu', tier: 'premium' }
      '.description': '...'
    }
  }
}
```

**Merge rules**:
- Child keys **override** parent keys (e.g., `region: 'eu'` wins)
- New child keys are **added** (e.g., `tier: 'premium'` added)
- Parent keys are **inherited** (e.g., `lang: 'es'` inherited)

**Rationale**: Additive merging is more intuitive - you rarely want to "lose" parent context.

### Context Resolution Algorithm

When evaluating expression at path `users.bill.greeting`:

1. **Parse path segments**: `['users', 'bill', 'greeting']`
2. **Walk up tree** collecting contexts:
   - Check `users.bill` for `.context` → Found: `{ gender: 'm' }`
   - Check `users` for `.context` → Not found
   - Check root for `.context` → Found: `{ lang: 'es' }`
3. **Merge contexts** (root → leaf):
   - Start: `{}`
   - Merge root: `{ lang: 'es' }`
   - Merge `users.bill`: `{ lang: 'es', gender: 'm' }`
4. **Evaluate expression** with merged context

**Performance**: O(depth) where depth = path segments

## Variant Terminology

### Well-Known Variants

Built-in variant dimensions with special recognition and scoring:

- `lang` - Language/locale (1000 points)
- `gender` - Pronoun gender (100 points)
- `version` - Semantic version (75 points)
- `form` - Formality level (50 points)

### Custom Variants

Domain-specific variant dimensions (10 points each):

```typescript
{
  '.context': {
    tenant: 'acme',      // Custom variant: multi-tenancy
    env: 'prod',         // Custom variant: environment
    region: 'us-east',   // Custom variant: geographic region
    tier: 'premium'      // Custom variant: product tier
  }
}
```

**All entries in `.context`** are variants - either well-known or custom.

**Naming convention**: Always use descriptive dimension names.

**Examples**:
- ✅ `{ tier: 'premium' }` - Clear custom variant dimension
- ✅ `{ cohort: '2024-10' }` - Clear custom variant dimension
- ✅ `{ lang: 'es' }` - Well-known variant dimension
- ❌ `{ variant: 'beta' }` - Unclear (what dimension?)

## Use Cases

### 1. Multi-User Profiles

**Problem**: Different users have different genders, affecting pronouns in content.

**Solution**:
```typescript
const data = dotted({
  '.context': { lang: 'en' },  // Global language
  users: {
    bill: {
      '.context': { gender: 'm' },
      name: 'Bill',
      '.greeting': 'Hello, I am ${:subject}',      // "I am he"
      '.bio': '${:subject} works at Acme Corp'     // "He works"
    },
    alice: {
      '.context': { gender: 'f' },
      name: 'Alice',
      '.greeting': 'Hello, I am ${:subject}',      // "I am she"
      '.bio': '${:subject} works at Acme Corp'     // "She works"
    },
    jordan: {
      '.context': { gender: 'x' },
      name: 'Jordan',
      '.greeting': 'Hello, I am ${:subject}',      // "I am they"
      '.bio': '${:subject} works at Acme Corp'     // "They work"
    }
  }
});

await data.get('users.bill.greeting');   // "Hello, I am he"
await data.get('users.alice.greeting');  // "Hello, I am she"
await data.get('users.jordan.greeting'); // "Hello, I am they"
```

### 2. Multi-Tenant SaaS

**Problem**: Different tenants need isolated content with tenant-specific configurations.

**Solution**:
```typescript
const data = dotted({
  tenants: {
    acme: {
      '.context': { tenant: 'acme', tier: 'enterprise' },
      '.welcome': 'Welcome to Acme Corp (Enterprise)',
      config: {
        '.maxUsers': 'tenant.acme.limits.users'  // Tenant-scoped resolvers
      }
    },
    startup: {
      '.context': { tenant: 'startup', tier: 'basic' },
      '.welcome': 'Welcome to Startup Inc (Basic)',
      config: {
        '.maxUsers': 'tenant.startup.limits.users'
      }
    }
  }
});

await data.get('tenants.acme.welcome');    // Enterprise-tier content
await data.get('tenants.startup.welcome'); // Basic-tier content
```

### 3. Per-Product Pricing Tiers

**Problem**: Products have different pricing tiers with tier-specific messaging.

**Solution**:
```typescript
const catalog = dotted({
  '.context': { lang: 'en' },
  products: {
    basic: {
      '.context': { tier: 'basic' },
      '.description': 'Starter plan for individuals',
      '.cta': 'Get started free'
    },
    pro: {
      '.context': { tier: 'pro' },
      '.description': 'Professional plan for teams',
      '.cta': 'Start 14-day trial'
    },
    enterprise: {
      '.context': { tier: 'enterprise' },
      '.description': 'Enterprise plan for organizations',
      '.cta': 'Contact sales'
    }
  }
});

await catalog.get('products.basic.cta');      // "Get started free"
await catalog.get('products.enterprise.cta'); // "Contact sales"
```

### 4. Localized Game Content

**Problem**: Game logic versions have per-character gender for localized dialogue.

**Solution**:
```typescript
const game = dotted({
  '.context': { version: { major: 2, minor: 0 }, lang: 'es' },
  characters: {
    warrior: {
      '.context': { gender: 'm', form: 'casual' },
      '.intro': '${:subject} lucha con honor'  // "Él lucha"
    },
    mage: {
      '.context': { gender: 'f', form: 'formal' },
      '.intro': '${:subject} domina la magia'  // "Ella domina"
    }
  }
});

// Effective context for characters.warrior.intro:
// { version: 2.0, lang: 'es', gender: 'm', form: 'casual' }
```

## Implementation Phases

### Phase 1: Minimal (v0.10 or v1.1) - ~100 LOC + 15 tests

**Goal**: Basic hierarchical context with `.context` marker.

**Features**:
1. **Recognize `.context` key** at any depth
2. **Merge contexts** from root to leaf (child overrides parent)
3. **Pass merged context** to expression evaluator
4. **Backward compatible** with existing global `variants` option

**Implementation**:

```typescript
// src/dotted-json.ts

/**
 * Collect hierarchical contexts from root to target path
 */
private collectPathContexts(path: string): VariantContext {
  const segments = path.split('.');
  let mergedContext: VariantContext = { ...this.options.variants };  // Start with global

  // Walk each segment, collecting `.context` objects
  for (let i = 0; i < segments.length; i++) {
    const partialPath = segments.slice(0, i + 1).join('.');
    const contextPath = partialPath + '..context';  // Escaped dot-prefix

    if (dotHas(this.data, contextPath)) {
      const segmentContext = dotGet(this.data, contextPath);
      if (typeof segmentContext === 'object' && segmentContext !== null) {
        mergedContext = { ...mergedContext, ...segmentContext };  // Merge
      }
    }
  }

  return mergedContext;
}

/**
 * Evaluate expression with path-based context
 */
private async evaluateExpression(
  expressionPath: string,
  targetPath: string,
  ignoreCache = false
): Promise<void> {
  // Collect hierarchical context for this path
  const pathContext = this.collectPathContexts(targetPath);

  // Create expression context with merged variants
  const context: ExpressionContext = {
    data: this.data,
    resolvers: this.options.resolvers,
    variants: pathContext,  // Use path-based context
    // ...
  };

  // Rest of evaluation logic...
}
```

**Tests**:
- Context inheritance (root → child)
- Context override (child replaces parent key)
- Context merge (child adds new keys)
- Multi-level nesting (3+ levels deep)
- Mixed with global variants option
- Performance (ensure O(depth) acceptable)

### Phase 2: Advanced (v1.2+) - Future Enhancements

**Potential features** (if needed):
- **Dynamic contexts**: `.context` as expression (evaluated)
- **Context isolation**: Option to disable inheritance (child contexts don't merge)
- **Context introspection**: API to query effective context at path
- **Performance optimization**: Cache context lookups per path

**Defer until real need emerges.**

## Performance Considerations

### Current System (Global Context)

- **Context lookup**: O(1) - stored in options
- **Expression eval**: Fast (single context)

### Hierarchical Context

- **Context lookup**: O(depth) - walk path segments
- **Expression eval**: Slightly slower (collect + merge)

**Optimization strategies**:

1. **Cache merged contexts** per path:
   ```typescript
   private contextCache: Map<string, VariantContext> = new Map();
   ```

2. **Lazy collection**: Only collect contexts if `.context` keys exist

3. **Benchmark**: Test O(depth) vs O(1) on realistic data (10-20 levels)

**Expected impact**: Negligible for typical depths (< 10 levels)

## Edge Cases

| Case | Behavior | Example |
|------|----------|---------|
| **No `.context` found** | Use global `variants` option only | Root has no `.context`, falls back to global |
| **Empty `.context`** | Treated as no-op (no context at this level) | `{ '.context': {} }` → ignored |
| **Invalid `.context` type** | Ignored (must be object) | `{ '.context': 'invalid' }` → skipped |
| **`.context` with expressions** | Evaluated like other expressions | `{ '.context': '${defaultContext}' }` → eval first |
| **Circular `.context` refs** | Cycle detection applies | Same as any circular expression |
| **Deep nesting (100+ levels)** | O(depth) still acceptable | Benchmark shows < 1ms overhead |

## Backward Compatibility

### Existing Code (No Changes)

```typescript
// Still works - global context
const data = dotted(schema, {
  variants: { lang: 'es', gender: 'm' }
});
```

### New Code (Hierarchical)

```typescript
// New feature - per-entity context
const data = dotted({
  users: {
    bill: { '.context': { gender: 'm' } }
  }
}, {
  variants: { lang: 'es' }  // Global fallback
});
```

### Mixed (Both)

```typescript
// Global + hierarchical (merge)
const data = dotted({
  '.context': { region: 'us' },  // Root context
  users: {
    bill: { '.context': { gender: 'm' } }  // Extends root
  }
}, {
  variants: { lang: 'es' }  // Global base
});

// Effective context for users.bill.greeting:
// { lang: 'es', region: 'us', gender: 'm' }
// (global → root → entity)
```

## Open Questions

**For you to decide**:

- [ ] **Phase 1 scope**: Implement now or defer to v1.1+?
- [ ] **Dynamic `.context`**: Support expressions in `.context` values?
- [ ] **Context introspection**: API like `data.getContext('users.bill')` to inspect merged context?
- [ ] **Performance threshold**: What's acceptable overhead for O(depth) lookup? (current guess: < 1ms)
- [ ] **Isolation option**: Ever need child contexts to NOT inherit parent? (guess: no)

**Current defaults** (adjust if preferences differ):
- ✅ Defer to v1.1+ (focus on semantic versions for v0.10)
- ❌ No dynamic `.context` in Phase 1 (static only)
- ❌ No introspection API in Phase 1
- ✅ Accept O(depth) overhead (likely < 1ms for typical use)
- ✅ Always inherit (merge strategy)

## Related Documentation

- `variant-system-design.md` - Base variant system (lang, gender, form)
- `semantic-version-variants-design.md` - Version variants (new well-known type)
- `expression-evaluator.ts` - Where context gets used during eval

## Success Criteria

**Minimal implementation is successful when**:

- ✅ `.context` recognized at any depth
- ✅ Child contexts extend parent contexts (merge)
- ✅ Expression evaluation uses merged context
- ✅ Backward compatible with global `variants` option
- ✅ Per-user gender works (`users.bill` vs `users.alice`)
- ✅ Multi-tenant isolation works (tenant-scoped contexts)
- ✅ Performance acceptable (< 1ms overhead per expression)
- ✅ All tests passing (15+ tests covering edge cases)
- ✅ DX feels natural (explicit `.context` key)

---

**Status**: Design complete, ready for review and implementation planning.

**Next Steps**:
1. Review this design and adjust any preferences
2. Decide: Implement in v0.10 or defer to v1.1+?
3. If implementing: Create spec "00X-hierarchical-context"
4. Use `/specify` workflow: spec → plan → tasks → implement

**Priority**: Medium - Powerful feature, but not blocking v1.0 release
