# v0.14 Feature Specification: Hierarchical Context & Parent References

**Status**: Design Phase (Target: v0.14.0)
**Created**: 2025-10-19
**Dependencies**: Hierarchical Context Design (Phase 1)
**Constitutional Impact**: None (fully backward compatible)

## Executive Summary

This specification defines two complementary features for v0.14:

1. **Hierarchical `.context` Support**: Automatic merging of `.context` objects from root to leaf, enabling per-entity variant contexts (gender, locale, custom dimensions)
2. **Parent Path References**: Expression syntax for accessing values from parent scopes using `..` notation (filesystem-inspired traversal)

**Combined value**: These features enable natural data modeling patterns where entity-specific contexts (gender, tenant, tier) merge with parent contexts, and expressions can reference both scoped and parent values without resolver gymnastics.

## Motivation & Use Cases

### Problem Statement

Current limitations create friction in common patterns:

**Global context inflexibility**:
```typescript
// Current: ONE gender for entire tree
const data = dotted(schema, { variants: { gender: 'm' } });

// Want: Per-user gender
const users = {
  alice: { gender: 'f', '.greeting': 'I am ${:subject}' },  // Want "she"
  bob: { gender: 'm', '.greeting': 'I am ${:subject}' }     // Want "he"
};
// ❌ Can't do this - global gender applies to both
```

**No parent value access**:
```typescript
const company = {
  name: 'Acme Corp',
  employees: {
    alice: {
      firstName: 'Alice',
      '.fullName': '${firstName} at ${..name}'  // ❌ Can't access parent's name
    }
  }
};
```

### Use Case #1: Multi-User Profiles with Gender

**Requirement**: Different users have different genders, affecting pronoun resolution

**Solution with hierarchical context**:
```typescript
const data = dotted({
  '.context': { lang: 'en' },  // Global language
  users: {
    alice: {
      '.context': { gender: 'f' },
      name: 'Alice',
      '.greeting': 'Hello, I am ${:subject}',      // "I am she"
      '.bio': '${:subject} works at Acme'          // "She works"
    },
    bob: {
      '.context': { gender: 'm' },
      name: 'Bob',
      '.greeting': 'Hello, I am ${:subject}',      // "I am he"
      '.bio': '${:subject} works at Acme'          // "He works"
    }
  }
});

await data.get('users.alice.greeting');  // "Hello, I am she"
await data.get('users.bob.greeting');    // "Hello, I am he"
```

**Effective context for `users.alice.greeting`**:
```typescript
{ lang: 'en', gender: 'f' }  // Merged root + alice contexts
```

### Use Case #2: Parent References for Scoped Data

**Requirement**: Employee records need to reference company-wide data

**Solution with parent references**:
```typescript
const data = dotted({
  company: {
    name: 'Acme Corp',
    location: 'San Francisco',
    employees: {
      alice: {
        firstName: 'Alice',
        '.fullName': '${firstName} at ${..name}',           // Reference parent's name
        '.location': 'Works in ${...location}'             // Reference grandparent
      },
      bob: {
        firstName: 'Bob',
        '.fullName': '${firstName} at ${..name}'
      }
    }
  }
});

await data.get('company.employees.alice.fullName');  // "Alice at Acme Corp"
await data.get('company.employees.alice.location');  // "Works in San Francisco"
```

**Parent traversal rules**:
- `..name` - Go up 1 level, get `name`
- `...location` - Go up 2 levels, get `location`
- `....foo` - Go up 3 levels, get `foo`

### Use Case #3: Multi-Tenant SaaS Configuration

**Requirement**: Tenant-specific contexts with shared base configuration

**Solution combining both features**:
```typescript
const config = dotted({
  '.context': { env: 'production', region: 'us-east' },  // Base context
  tenants: {
    acme: {
      '.context': { tenant: 'acme', tier: 'enterprise' },
      '.welcome': 'Welcome to Acme Corp (${tier})',
      features: {
        '.maxUsers': '${limits.acme.users}',    // Scoped lookup
        '.storage': '${..tier === "enterprise" ? "unlimited" : "1TB"}'  // Parent ref
      }
    },
    startup: {
      '.context': { tenant: 'startup', tier: 'basic' },
      '.welcome': 'Welcome to Startup Inc (${tier})',
      features: {
        '.maxUsers': '${limits.startup.users}',
        '.storage': '${..tier === "enterprise" ? "unlimited" : "1TB"}'
      }
    }
  }
});

await config.get('tenants.acme.welcome');           // "Welcome to Acme Corp (enterprise)"
await config.get('tenants.acme.features.storage');  // "unlimited"
await config.get('tenants.startup.features.storage'); // "1TB"
```

**Effective context for `tenants.acme.features.storage`**:
```typescript
{ 
  env: 'production', 
  region: 'us-east', 
  tenant: 'acme', 
  tier: 'enterprise' 
}
```

### Use Case #4: Localized Game Content with Character Variants

**Requirement**: Character-specific gender/formality with game-wide language

**Solution**:
```typescript
const game = dotted({
  '.context': { version: '2.0', lang: 'es' },
  meta: {
    title: 'La Aventura',
    studio: 'Juegos Épicos'
  },
  characters: {
    warrior: {
      '.context': { gender: 'm', form: 'casual' },
      '.intro': '${:subject} lucha con honor',             // "Él lucha"
      '.credits': 'Creado por ${...meta.studio}'          // Access grandparent
    },
    mage: {
      '.context': { gender: 'f', form: 'formal' },
      '.intro': '${:subject} domina la magia arcana',      // "Ella domina"
      '.credits': 'Creado por ${...meta.studio}'
    }
  }
});

await game.get('characters.warrior.intro');    // "Él lucha con honor"
await game.get('characters.mage.intro');       // "Ella domina la magia arcana"
await game.get('characters.warrior.credits');  // "Creado por Juegos Épicos"
```

## Feature 1: Hierarchical Context Support

### Design Philosophy

**Key principles**:
- ✅ **Explicit over implicit**: Use `.context` marker (not auto-inference)
- ✅ **Merge inheritance**: Child contexts extend parent contexts (additive)
- ✅ **Backward compatible**: Existing global `variants` option still works
- ✅ **Opt-in complexity**: Only pay cost if you use hierarchical contexts
- ✅ **Constitutional alignment**: No core modifications, pure extension

### API Specification

#### Context Declaration

**Syntax**: Use dot-prefixed `.context` key at any depth

```typescript
{
  '.context': VariantContext,  // Object with variant dimensions
  // ... other properties
}
```

**Valid context types**:
- `{ lang: 'es' }` - Well-known variant (language)
- `{ gender: 'f' }` - Well-known variant (pronoun gender)
- `{ tier: 'premium', region: 'eu' }` - Custom variants
- `{ ...parentContext, override: 'value' }` - Explicit merge

**Invalid contexts** (ignored):
- `{ '.context': 'invalid' }` - Not an object
- `{ '.context': null }` - Null value
- `{ '.context': [] }` - Array value

#### Context Merge Strategy

**Rule**: Child contexts MERGE with parent contexts (additive)

**Merge algorithm**:
```typescript
effectiveContext = {
  ...globalVariants,     // From options.variants
  ...rootContext,        // From root .context
  ...parentContext,      // From parent .context
  ...childContext        // From current .context
}
```

**Example**:
```typescript
{
  '.context': { lang: 'es', region: 'us' },  // Root context
  products: {
    premium: {
      '.context': { tier: 'premium', region: 'eu' },  // Child context
      '.description': '...'
    }
  }
}

// Effective context at products.premium.description:
// { lang: 'es', region: 'eu', tier: 'premium' }
//   ↑ inherited  ↑ overridden  ↑ added
```

**Merge rules**:
1. **Override**: Child keys replace parent keys (e.g., `region: 'eu'` wins)
2. **Add**: Child keys not in parent are added (e.g., `tier: 'premium'`)
3. **Inherit**: Parent keys not in child are inherited (e.g., `lang: 'es'`)

#### Context Resolution Algorithm

**Input**: Path `users.alice.greeting`

**Steps**:
1. Parse path segments: `['users', 'alice', 'greeting']`
2. Initialize context with global variants: `{ ...options.variants }`
3. Walk segments, collecting `.context` objects:
   - Check `users` for `.context` → merge if found
   - Check `users.alice` for `.context` → merge if found
   - Stop at `greeting` (target property)
4. Return merged context

**Pseudocode**:
```typescript
function collectPathContexts(path: string): VariantContext {
  const segments = path.split('.');
  let merged: VariantContext = { ...this.options.variants };

  for (let i = 0; i < segments.length - 1; i++) {  // Exclude last segment
    const partialPath = segments.slice(0, i + 1).join('.');
    const contextPath = `${partialPath}..context`;  // Escaped dot-prefix

    const segmentContext = dotGet(this.data, contextPath);
    if (isValidContext(segmentContext)) {
      merged = { ...merged, ...segmentContext };
    }
  }

  return merged;
}

function isValidContext(value: any): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

**Performance**: O(depth) where depth = number of path segments

### Implementation Details

#### Modified Files

**1. `src/dotted-json.ts`** (DottedJson class)

Add context collection method:
```typescript
private collectPathContexts(path: string): VariantContext {
  const segments = path.split('.');
  let mergedContext: VariantContext = { ...this.options.variants };

  for (let i = 0; i < segments.length; i++) {
    const partialPath = segments.slice(0, i + 1).join('.');
    const contextPath = `${partialPath}..context`;

    const segmentContext = dotGet(this.data, contextPath);
    if (typeof segmentContext === 'object' && segmentContext !== null && !Array.isArray(segmentContext)) {
      mergedContext = { ...mergedContext, ...segmentContext };
    }
  }

  return mergedContext;
}
```

Modify expression evaluation to use path-based context:
```typescript
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
    variants: pathContext,  // Use path-based context instead of global
    path: targetPath.split('.'),
    options: this.options
  };

  // ... rest of evaluation logic
}
```

**2. No changes to `src/expression-evaluator.ts`**

Expression evaluator already receives context via `ExpressionContext.variants`. No modifications needed - it just consumes the merged context.

**3. No changes to `src/types.ts`**

Existing `VariantContext` interface already supports arbitrary dimensions. No new types needed.

#### Backward Compatibility

**Global variants still work**:
```typescript
// v0.13 code - no changes needed
const data = dotted(schema, {
  variants: { lang: 'es', gender: 'm' }
});
```

**Mixed usage**:
```typescript
// Global + hierarchical (merge)
const data = dotted({
  '.context': { region: 'us' },  // Root context
  users: {
    alice: { '.context': { gender: 'f' } }  // Extends root
  }
}, {
  variants: { lang: 'es' }  // Global base
});

// Effective context for users.alice.greeting:
// { lang: 'es', region: 'us', gender: 'f' }
```

## Feature 2: Parent Path References

### Design Philosophy

**Key principles**:
- ✅ **Filesystem-inspired syntax**: `..` for parent, `...` for grandparent
- ✅ **Works with scoped resolution**: Complements existing `.property` scoping
- ✅ **Clear error messages**: Helpful errors when parent doesn't exist
- ✅ **Composition-friendly**: Works in all expression contexts (templates, function calls)

### Syntax Specification

**Parent traversal syntax**:
- `${..property}` - Go up 1 level, get `property`
- `${...property}` - Go up 2 levels, get `property`
- `${....property}` - Go up 3 levels, get `property`
- And so on...

**Examples**:
```typescript
// Given path: company.employees.alice.fullName
${..name}         // company.employees.name
${...name}        // company.name
${....name}       // (root).name (if exists)

// Nested properties
${..manager.name}    // company.employees.manager.name
${...location.city}  // company.location.city
```

**Mixed with scoped resolution**:
```typescript
// Current scoped resolution (existing)
${firstName}      // Tries: company.employees.alice.firstName → company.employees.firstName → firstName

// Parent references (new)
${..companyName}  // Tries: company.employees.companyName
${...founded}     // Tries: company.founded
```

### Resolution Algorithm

**Input**: Variable path `..name` at expression path `company.employees.alice.fullName`

**Steps**:
1. Count leading dots: `..` = 1 parent level
2. Get current path segments: `['company', 'employees', 'alice', 'fullName']`
3. Remove last segment (property name): `['company', 'employees', 'alice']`
4. Remove N segments (parent levels): `['company', 'employees']`
5. Append variable name: `['company', 'employees', 'name']`
6. Resolve path: `company.employees.name`

**Pseudocode**:
```typescript
function resolveParentReference(varPath: string, currentPath: string[]): any {
  // Count leading dots
  const leadingDots = varPath.match(/^\.+/)?.[0].length || 0;
  if (leadingDots === 0) {
    return this.resolveScopedValue(varPath);  // Not a parent reference
  }

  // Extract property name
  const propertyPath = varPath.substring(leadingDots);
  
  // Calculate parent path
  const pathSegments = currentPath.slice(0, -1);  // Exclude current property
  const parentLevels = leadingDots - 1;  // .. = 1 level, ... = 2 levels
  
  if (pathSegments.length < parentLevels) {
    throw new Error(
      `Parent reference '${varPath}' goes beyond root (current path: ${currentPath.join('.')})`
    );
  }
  
  const parentSegments = pathSegments.slice(0, -parentLevels);
  const resolvedPath = [...parentSegments, ...propertyPath.split('.')].join('.');
  
  return dotGet(this.data, resolvedPath);
}
```

### Implementation Details

#### Modified Files

**1. `src/expression-evaluator.ts`** (ExpressionEvaluator class)

Modify `resolveScopedValue` to handle parent references:

```typescript
private resolveScopedValue(varPath: string): any {
  // Handle parent references (.. syntax)
  const leadingDots = varPath.match(/^\.+/)?.[0].length || 0;
  
  if (leadingDots > 1) {
    // Parent reference: .., ..., ....
    return this.resolveParentReference(varPath, leadingDots);
  }
  
  // Handle single leading dot (expression prefix) - actual data is stored without the dot
  const actualPath = varPath.startsWith('.') ? varPath.substring(1) : varPath;
  
  // Existing scoped resolution logic...
  if (this.context.path && this.context.path.length > 0) {
    const parentPath = this.context.path.slice(0, -1);
    
    if (parentPath.length > 0) {
      const scopedPath = `${parentPath.join('.')}.${actualPath}`;
      const scopedValue = dotGet(this.context.data, scopedPath);
      
      if (scopedValue !== undefined) {
        return scopedValue;
      }
    }
  }
  
  return dotGet(this.context.data, actualPath);
}

private resolveParentReference(varPath: string, leadingDots: number): any {
  const propertyPath = varPath.substring(leadingDots);
  const pathSegments = this.context.path.slice(0, -1);  // Exclude current property
  const parentLevels = leadingDots - 1;  // .. = 1, ... = 2, etc.
  
  // Validate parent levels don't exceed path depth
  if (pathSegments.length < parentLevels) {
    const currentPathStr = this.context.path.join('.');
    throw new Error(
      `Parent reference '${varPath}' at '${currentPathStr}' goes beyond root (requires ${parentLevels} parent levels, only ${pathSegments.length} available)`
    );
  }
  
  // Calculate target path
  const parentSegments = pathSegments.slice(0, -parentLevels);
  const targetSegments = propertyPath ? [...parentSegments, ...propertyPath.split('.')] : parentSegments;
  const targetPath = targetSegments.join('.');
  
  const value = dotGet(this.context.data, targetPath);
  
  if (value === undefined) {
    const currentPathStr = this.context.path.join('.');
    throw new Error(
      `Parent reference '${varPath}' at '${currentPathStr}' resolved to undefined path '${targetPath}'`
    );
  }
  
  return value;
}
```

**2. No changes to other files**

Parent reference resolution is fully contained in `ExpressionEvaluator`. No type changes, no API changes.

### Error Handling

**Error case 1: Too many parent levels**

```typescript
// Path: company.employees.alice.fullName
'.....name'  // Tries to go up 4 levels, but only 3 segments available

// Error message:
// "Parent reference '.....name' at 'company.employees.alice.fullName' goes beyond root 
//  (requires 4 parent levels, only 3 available)"
```

**Error case 2: Parent path doesn't exist**

```typescript
// Path: company.employees.alice.fullName
'..nonExistent'  // company.employees.nonExistent doesn't exist

// Error message:
// "Parent reference '..nonExistent' at 'company.employees.alice.fullName' resolved to 
//  undefined path 'company.employees.nonExistent'"
```

**Error case 3: Mixed with undefined value**

```typescript
// Path: company.employees.alice.salary
'${..tier} - ${...budget}'  // tier exists, budget doesn't

// Behavior: Template evaluation catches undefined, returns 'undefined' string
// Result: "premium - undefined"
```

### Expression Context Support

**Works in all expression types**:

**1. Template literals**:
```typescript
'.fullName': '${firstName} ${lastName} at ${..companyName}'
```

**2. JavaScript expressions**:
```typescript
'.isManager': '${..managerId} === ${id}'
'.bonus': '${salary} * (${..tier} === "premium" ? 0.2 : 0.1)'
```

**3. Function calls with parent refs**:
```typescript
'.email': 'formatEmail(${firstName}, ${..domain})'
'.url': 'buildUrl(${..baseUrl}, ${slug})'
```

**4. Complex expressions**:
```typescript
'.description': '${firstName} works in ${..department} (${...location}) since ${startDate}'
```

## Feature Interaction & Edge Cases

### Q1: How do parent references interact with variant resolution?

**Answer**: They are orthogonal and complementary.

**Example**:
```typescript
const data = dotted({
  '.context': { lang: 'en' },
  company: {
    name: 'Acme Corp',
    employees: {
      '.context': { gender: 'f' },
      alice: {
        '.greeting': '${:subject} works at ${..name}'  // Uses both
      }
    }
  }
});

await data.get('company.employees.alice.greeting');
// "She works at Acme Corp"
//  ↑ from context     ↑ from parent ref
```

**Effective context**: `{ lang: 'en', gender: 'f' }` (merged)
**Parent reference**: `..name` → `company.name` → `"Acme Corp"`

### Q2: Should `..` syntax work in all expression contexts?

**Answer**: Yes, for consistency and composability.

**Supported contexts**:
- ✅ Template literals: `'${..name}'`
- ✅ JavaScript expressions: `'${..tier} === "premium"'`
- ✅ Function arguments: `'formatName(${..prefix}, ${firstName})'`
- ✅ Nested expressions: `'${..manager.${..role}}'` (double traversal)

**Rationale**: Limiting to only template literals would create unexpected restrictions and reduce usefulness.

### Q3: Error handling for too many parent levels?

**Answer**: Throw clear, actionable error with context.

**Error message template**:
```
Parent reference '{varPath}' at '{currentPath}' goes beyond root 
(requires {requiredLevels} parent levels, only {availableLevels} available)
```

**Example**:
```
Parent reference '....name' at 'company.employees.alice.fullName' goes beyond root 
(requires 3 parent levels, only 2 available)
```

**Rationale**: Fail-fast with helpful debugging info. Silent fallback would hide configuration errors.

### Q4: Should we support absolute paths like `${/company/name}`?

**Answer**: Not in v0.14 - defer to future version if needed.

**Rationale**:
- Parent references solve 90% of use cases
- Absolute paths introduce ambiguity with root-level data
- Can be added later without breaking changes
- Scoped resolution already provides fallback to root

**Future syntax option** (if needed):
```typescript
${/company/name}      // Absolute path from root
${./localProperty}    // Explicit current scope
${../parent/sibling}  // Relative path (filesystem style)
```

### Q5: Performance benchmarks - acceptable overhead?

**Answer**: O(depth) acceptable for typical nesting (< 10 levels).

**Hierarchical context overhead**:
- Worst case: Walk N segments, merge N contexts
- Typical case: 3-5 levels deep = 3-5 object spreads
- Estimated overhead: < 0.1ms per expression

**Parent reference overhead**:
- Worst case: String manipulation + path lookup
- Typical case: Split string, slice array, join segments
- Estimated overhead: < 0.05ms per reference

**Performance budget**:
- Total overhead per expression: < 0.2ms
- Acceptable for typical use (1000s of expressions/second)
- Monitored via performance regression tests

**Benchmark scenarios**:
```typescript
// Scenario 1: Deep nesting (10 levels)
root.a.b.c.d.e.f.g.h.i.property

// Scenario 2: Multiple contexts (5 levels with contexts at each)
// Scenario 3: Multiple parent refs (5 parent refs in one expression)
// Scenario 4: Mixed (contexts + parent refs + scoped resolution)
```

## Edge Cases & Validation

### Edge Case Matrix

| Case | Behavior | Example | Result |
|------|----------|---------|--------|
| **Empty `.context`** | Ignored (no-op) | `{ '.context': {} }` | No context added |
| **Invalid `.context` type** | Ignored | `{ '.context': 'invalid' }` | Skipped |
| **Null `.context`** | Ignored | `{ '.context': null }` | Skipped |
| **`.context` with expressions** | Evaluated first | `{ '.context': '${defaultCtx}' }` | Expression resolved, then used as context |
| **Parent ref at root** | Error | `${..name}` at `greeting` | Throws: beyond root |
| **Parent ref to undefined** | Error | `${..missing}` | Throws: undefined path |
| **Circular parent refs** | Cycle detection | `a: '${..a}'` | Throws: circular dependency |
| **Deep nesting (100+ levels)** | O(depth) acceptable | 100-level path | < 1ms overhead |
| **No `.context` found** | Use global variants | No `.context` keys | Falls back to `options.variants` |

### Validation Tests Required

**Hierarchical Context**:
1. ✅ Context inheritance (root → child)
2. ✅ Context override (child replaces parent key)
3. ✅ Context merge (child adds new keys)
4. ✅ Multi-level nesting (3+ levels deep)
5. ✅ Mixed with global variants option
6. ✅ Invalid context types (string, null, array)
7. ✅ Empty context object
8. ✅ Performance (< 1ms overhead for 10-level nesting)

**Parent References**:
1. ✅ Single parent (`..property`)
2. ✅ Multiple parents (`...property`, `....property`)
3. ✅ Nested properties (`..manager.name`)
4. ✅ Error: Too many levels
5. ✅ Error: Parent path doesn't exist
6. ✅ Mixed with scoped resolution
7. ✅ Template literals with parent refs
8. ✅ JavaScript expressions with parent refs
9. ✅ Function calls with parent refs
10. ✅ Performance (< 0.1ms overhead per reference)

**Integration**:
1. ✅ Parent refs + hierarchical context (both features)
2. ✅ Parent refs + variant resolution (pronouns)
3. ✅ Parent refs + existing scoped resolution
4. ✅ Circular dependency detection
5. ✅ Deep nesting + parent refs + contexts

## Implementation Plan

### Phase 1: Hierarchical Context (~100 LOC + 15 tests)

**Files to modify**:
- `src/dotted-json.ts` - Add `collectPathContexts()` method
- `test/unit/hierarchical-context.test.ts` - New test file

**Implementation steps**:
1. Add `collectPathContexts()` private method
2. Modify `evaluateExpression()` to use path-based context
3. Write 15 unit tests (inheritance, override, merge, edge cases)
4. Verify performance (< 1ms overhead benchmark)

**Acceptance criteria**:
- ✅ All tests passing (100% pass rate)
- ✅ Backward compatible with global variants
- ✅ Per-user gender use case working
- ✅ Multi-tenant use case working
- ✅ Performance acceptable (< 1ms for 10 levels)

### Phase 2: Parent References (~80 LOC + 15 tests)

**Files to modify**:
- `src/expression-evaluator.ts` - Modify `resolveScopedValue()`, add `resolveParentReference()`
- `test/unit/parent-references.test.ts` - New test file

**Implementation steps**:
1. Add `resolveParentReference()` private method
2. Modify `resolveScopedValue()` to detect parent refs
3. Write 15 unit tests (single parent, multiple, errors, edge cases)
4. Verify performance (< 0.1ms overhead benchmark)

**Acceptance criteria**:
- ✅ All tests passing (100% pass rate)
- ✅ Clear error messages for invalid refs
- ✅ Works in all expression contexts
- ✅ Employee name use case working
- ✅ Performance acceptable (< 0.1ms per reference)

### Phase 3: Integration Testing (~10 tests)

**Files to modify**:
- `test/integration/hierarchical-context-parent-refs.test.ts` - New test file

**Test scenarios**:
1. Multi-user profiles (context + parent refs)
2. Multi-tenant SaaS (context + parent refs + custom variants)
3. Localized game content (context + pronouns + parent refs)
4. Complex nesting (5+ levels with contexts at each)
5. Error scenarios (too many levels, undefined paths)

**Acceptance criteria**:
- ✅ All integration tests passing
- ✅ All use cases from spec working
- ✅ Performance within budget (< 0.2ms total overhead)

### Phase 4: Documentation (~200 LOC)

**Files to update**:
- `.specify/memory/hierarchical-context-design.md` - Update status to "Implemented"
- `README.md` - Add examples for both features
- `docs/API.md` - Document `.context` marker and parent ref syntax
- `CHANGELOG.md` - Add v0.14.0 entry with changeset

**Documentation checklist**:
- ✅ Update design doc status
- ✅ Add use case examples to README
- ✅ Document API syntax and behavior
- ✅ Create migration guide (if needed)
- ✅ Update AGENTS.md with v0.14 info

### Phase 5: Release (~30 min)

**Changeset creation**:
```bash
bun run changeset:add
# Select: minor (new features)
# Summary: "Add hierarchical .context support and parent path references (..)"
```

**Pre-release checks**:
- ✅ All tests passing (`bun test`)
- ✅ Lint passing (`bun run lint`)
- ✅ Typecheck passing (`bun run typecheck`)
- ✅ Build successful (`bun run build`)
- ✅ Bundle size check (core < 50 kB)

**Release workflow**:
1. Merge feature PR to main
2. Review "Version Packages" PR
3. Merge "Version Packages" PR
4. Monitor automated publish to JSR

## Success Criteria

**v0.14.0 release is successful when**:

1. ✅ Hierarchical `.context` support implemented and tested
2. ✅ Parent path references (`..`) implemented and tested
3. ✅ All use cases from spec working
4. ✅ 100% test pass rate (40+ new tests)
5. ✅ Performance acceptable (< 0.2ms total overhead)
6. ✅ Backward compatible (v0.13 code works unchanged)
7. ✅ Documentation complete (README, API docs, design doc)
8. ✅ Bundle size under 50 kB (constitutional limit)
9. ✅ Changeset created and released
10. ✅ Published to JSR successfully

## Open Questions & Decisions

### Answered in Spec

- [x] **Q1**: How do parent references interact with variant resolution?
  - **A**: Orthogonal and complementary - variants use context, parent refs use path
  
- [x] **Q2**: Should `..` syntax work in all expression contexts?
  - **A**: Yes, for consistency and composability
  
- [x] **Q3**: Error handling for too many parent levels?
  - **A**: Throw clear error with context and available levels
  
- [x] **Q4**: Should we support absolute paths like `${/company/name}`?
  - **A**: Not in v0.14 - defer to future version if needed
  
- [x] **Q5**: Performance benchmarks - acceptable overhead?
  - **A**: O(depth) acceptable for typical nesting (< 10 levels), budget < 0.2ms

### Implementation Decisions

- [x] **Context collection timing**: On expression evaluation (lazy)
- [x] **Parent ref resolution**: During variable interpolation
- [x] **Error strategy**: Fail-fast with helpful messages
- [x] **Performance optimization**: No caching in Phase 1 (defer if needed)
- [x] **Test coverage target**: >95% for both features

## Related Documentation

- `.specify/memory/hierarchical-context-design.md` - Original design (Phase 1)
- `.specify/memory/variant-system-design.md` - Base variant system
- `src/expression-evaluator.ts` - Expression evaluation logic
- `src/dotted-json.ts` - Core DottedJson class
- `.specify/memory/constitution.md` - Project principles

## Constitutional Compliance

**Principle I: Minimal Core, Optional Plugins**
- ✅ Both features in core (variant/expression features)
- ✅ Estimated bundle impact: +2-3 kB (well under 50 kB limit)

**Principle II: Security Through Transparency**
- ✅ No new security risks (same expression evaluator)
- ✅ Existing trusted schema requirement applies

**Principle III: Test-First Development**
- ✅ TDD workflow (tests → fail → implement → pass)
- ✅ 40+ new tests planned

**Principle IV: Lazy Evaluation with Explicit Caching**
- ✅ Context collected lazily on expression eval
- ✅ No caching changes (uses existing cache)

**Principle V: Plugin Architecture with Clear Boundaries**
- ✅ No plugin modifications needed
- ✅ Features work with all existing plugins

**Principle VI: Cycle Detection and Safeguards**
- ✅ Existing cycle detection applies
- ✅ Parent ref depth validation added

**Principle VII: Framework-Agnostic Core**
- ✅ No framework dependencies
- ✅ Pure data structure features

**Compliance verdict**: ✅ Fully compliant with constitution

---

**Status**: Design Phase (Ready for Implementation)
**Next Steps**:
1. Review this specification
2. Use `/plan` to create implementation plan
3. Use `/tasks` to break down into TDD tasks
4. Use `/implement` to execute with test-first workflow

**Priority**: High - Powerful feature enabling natural data modeling patterns

**Target Release**: v0.14.0 (Q4 2025)
