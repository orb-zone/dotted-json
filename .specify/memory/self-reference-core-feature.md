# Self-Reference Pattern: `"."` as Special Dot-Prefix

**Status**: Core Feature Design (Pre-Implementation)
**Priority**: CRITICAL - Foundational pattern for schema composition
**Constitution Alignment**: Principle IV (Lazy Evaluation), Principle VI (Cycle Detection)

## Overview

The `"."` (dot) key is a **special dot-prefix** that means "this object/document". It enables powerful composition patterns like inheritance, mixins, and computed object transformations.

## Core Semantics

```json
{
  ".": "expression",  // Self-reference: replace/merge THIS object with expression result
  "key": "value"      // Sibling properties (override or extend the result)
}
```

### Evaluation Behavior

1. **Detection**: Before evaluating other dot-prefixed keys, check for `"."` at object level
2. **Evaluation**: Evaluate the expression (e.g., `extends('./base.json')`, `transform(...)`)
3. **Merge**: Deep merge expression result with sibling properties
4. **Cleanup**: Remove `"."` from final result (it's consumed during merge)

### Merge Precedence

**Sibling properties ALWAYS win** over base properties:

```json
{
  ".": "extends('./base.json')",  // base.json: { "name": "Base", "type": "card" }
  "name": "Override"               // This overrides base.name
}
// Result: { "type": "card", "name": "Override" }
```

## Use Cases

### 1. File Inheritance (Filesystem Plugin)

```json
{
  ".": "extends('./hero-base.json')",
  "name": "Superman",
  "power": 9000
}
```

### 2. Object Transformation

```json
{
  "data": [1, 2, 3, 4, 5],
  ".": "transform.filter(${data}, item => item > 2)"
}
// Result: [3, 4, 5]
```

### 3. Computed Objects

```json
{
  "width": 100,
  "height": 200,
  ".": "geometry.rectangle({ width: ${width}, height: ${height} })"
}
// Result: { width: 100, height: 200, area: 20000, perimeter: 600, ... }
```

### 4. Mixin Composition

```json
{
  ".": "mixins.merge(['./logging.json', './validation.json'])",
  "name": "MyComponent"
}
```

## Implementation Requirements

### Core Library Changes

**File**: `src/dotted-json.ts`

Add self-reference evaluation **before** regular dot-prefix evaluation:

```typescript
class DottedJson {
  async get(path: string, options: GetOptions = {}): Promise<any> {
    // NEW: Check if the target object has "." self-reference
    const targetObject = this.getObjectAtPath(path);
    if (targetObject && targetObject['.'] && !this.isSelfReferenceEvaluated(path)) {
      await this.evaluateSelfReference(path);
    }

    // Existing: evaluate other dot-prefixed expressions in path
    await this.evaluateExpressionsInPath(path, options.ignoreCache);

    // Get the final value
    return dotGet(this.data, path);
  }

  private async evaluateSelfReference(objectPath: string): Promise<void> {
    const obj = dotGet(this.data, objectPath);
    if (!obj || !obj['.']) return;

    // Evaluate the "." expression
    const selfExpression = obj['.'];
    const baseResult = await this.evaluateExpressionString(selfExpression);

    // Merge base with current object (excluding ".")
    const { '.': _, ...currentProperties } = obj;
    const merged = this.mergeDeep(baseResult, currentProperties);

    // Replace object at path with merged result
    dotSet(this.data, objectPath, merged);

    // Mark as evaluated to prevent re-evaluation
    this.markSelfReferenceEvaluated(objectPath);
  }

  private mergeDeep(base: any, override: any): any {
    // Deep merge strategy: arrays replace, objects merge recursively
    if (typeof base !== 'object' || base === null) return override;
    if (typeof override !== 'object' || override === null) return override;
    if (Array.isArray(override)) return override; // Arrays replace

    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
        result[key] = this.mergeDeep(result[key], value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
```

### Type Definitions

**File**: `src/types.ts`

Document self-reference in JSDoc:

```typescript
/**
 * DottedJson schema object
 *
 * Special keys:
 * - ".": Self-reference - merges expression result with current object
 * - ".property": Regular dot-prefix - creates new property from expression
 * - "property": Regular property - static value
 */
export interface DottedSchema {
  /**
   * Self-reference: Merge expression result into this object
   *
   * Example:
   * ```json
   * {
   *   ".": "extends('./base.json')",
   *   "name": "Override"
   * }
   * ```
   */
  "."?: string;

  /**
   * Dot-prefixed properties: Expression-based property creation
   */
  [key: `.${string}`]: string;

  /**
   * Regular properties: Static values
   */
  [key: string]: any;
}
```

## Edge Cases & Behavior

### Nested Self-References

Each object level has independent `"."` evaluation:

```json
{
  ".": "extends('./root-base.json')",
  "child": {
    ".": "extends('./child-base.json')",
    "name": "Child Override"
  }
}
```

**Evaluation order**: Depth-first (child evaluated before parent when accessed)

### Self-Reference + Regular Dot-Prefix

```json
{
  ".": "extends('./base.json')",
  ".computed": "calculate(${value})",
  "value": 100
}
```

**Evaluation order**:
1. Evaluate `"."` first → merge base
2. Then evaluate `.computed` → create computed property
3. Result: `{ ...base, computed: <result>, value: 100 }`

### Circular Self-References

```json
// a.json
{ ".": "extends('./b.json')" }

// b.json
{ ".": "extends('./a.json')" }
```

**Behavior**: Throw `CircularDependencyError` (tracked via `visitedPaths` set)

### Empty Self-Reference

```json
{ ".": "" }  // Empty string
{ ".": null }  // Null
```

**Behavior**: Treat as no-op (skip evaluation)

## Testing Requirements (TDD)

### Unit Tests

```typescript
describe('Self-Reference Pattern', () => {
  test('should merge expression result into current object');
  test('should override base properties with sibling properties');
  test('should remove "." from final result');
  test('should handle nested self-references independently');
  test('should evaluate "." before other dot-prefixes');
  test('should detect circular self-references');
  test('should handle empty/null self-reference expressions');
});
```

### Integration Tests

```typescript
describe('Self-Reference + Plugins', () => {
  test('should work with extends() filesystem resolver');
  test('should work with Zod validation after merge');
  test('should work with nested objects containing self-references');
  test('should cache merged results correctly');
});
```

## Performance Considerations

### Caching Strategy

- **Self-reference results cached** like other expressions
- **Cache key**: `{objectPath}:.` (special key for self-reference)
- **Invalidation**: When object at path is mutated via `set()`

### Optimization: Lazy Evaluation

Self-reference only evaluated when:
1. Path accessed via `get()`
2. Object itself is returned (not just a child property)

Example:
```typescript
const schema = {
  "hero": {
    ".": "extends('./base.json')",  // NOT evaluated yet
    "name": "Superman"
  }
};

await data.get('hero.name');  // Evaluates hero's "." before accessing name
await data.get('hero');       // Returns fully merged hero object
```

## Migration from `.extends` to `"."`

**Old design** (reserved property):
```json
{ ".extends": "./base.json" }
```

**New design** (self-reference + resolver):
```json
{ ".": "extends('./base.json')" }
```

**Benefits of new design**:
- ✅ No reserved property names (consistent with plugin architecture)
- ✅ Works with any resolver (not just file loading)
- ✅ Clear semantics: `"."` = "this object"
- ✅ Extensible: `transform()`, `mixin()`, `compute()` all use same pattern

## Future Enhancements

### Multiple Inheritance (Array of Extends)

```json
{
  ".": "mixins.merge([
    extends('./base.json'),
    extends('./logging-mixin.json'),
    extends('./validation-mixin.json')
  ])",
  "name": "MyClass"
}
```

### Conditional Self-Reference

```json
{
  ".": "env.isDev ? extends('./dev-config.json') : extends('./prod-config.json')",
  "name": "Config"
}
```

### Partial Imports (JSON Pointer)

```json
{
  ".": "extends('./schema.json#/definitions/user')",
  "name": "Override"
}
```

## Related Patterns

### JavaScript Spread Operator

```typescript
// JavaScript
const merged = { ...base, name: "Override" };

// dotted-json equivalent
{ ".": "extends('./base.json')", "name": "Override" }
```

### Object.assign()

```typescript
// JavaScript
const result = Object.assign({}, base, current);

// dotted-json equivalent
{ ".": "base()", ...current }
```

### Prototypal Inheritance

```typescript
// JavaScript
const child = Object.create(parent);
child.name = "Override";

// dotted-json equivalent
{ ".": "parent()", "name": "Override" }
```

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-05 | Use `"."` instead of `.extends` | Avoid reserved properties, consistent with resolver pattern |
| 2025-10-05 | Sibling properties override base | Intuitive: local overrides win |
| 2025-10-05 | Deep merge by default | Matches user expectations for object composition |
| 2025-10-05 | Remove `"."` from final result | It's a directive, not data |
| 2025-10-05 | Evaluate `"."` before other dot-prefixes | Base must be established first |

---

**Next Steps**:
1. Update `src/types.ts` with `DottedSchema` interface
2. Implement `evaluateSelfReference()` in `src/dotted-json.ts`
3. Write comprehensive tests for self-reference pattern
4. Update filesystem plugin to use `"."` pattern
5. Document in README.md with examples

**Related Files**:
- Filesystem Plugin: `.specify/memory/filesystem-plugin-design.md`
- Constitution: `.specify/memory/constitution.md` (Principle IV, VI)
- Core Types: `src/types.ts`
