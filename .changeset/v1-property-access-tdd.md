---
"@orb-zone/dotted-json": minor
---

**v0.13 Foundation: Property Access, Type Coercion, and Error Handling**

This release adds powerful new API features while maintaining backward compatibility (23/34 tests passing, 68% complete).

## New Features

### 🎯 Property Access & Materialization
- **Direct property access**: Access static values via `data.foo` instead of `await data.get('foo')`
- **Expression materialization**: After evaluating `.greeting` with `.get('greeting')`, access result via `data.greeting`
- **Cache invalidation**: Setting a new expression key (`.foo`) clears the materialized value
- **Proxy-based implementation**: Transparent property access using ES6 Proxy

### 🔢 Type Coercion Helpers
- **`int(value)`**: Parse integers with proper base-10 handling
- **`float(value)`**: Parse floating-point numbers
- **`bool(value)`**: Smart boolean conversion (handles "true"/"false", "yes"/"no", "on"/"off", etc.)
- **`json(value)`**: Safe JSON parsing with error handling
- All helpers available in expression context

### ⚠️ Error Handling
- **Custom handlers**: Configure via `options.onError(error, path, context)` for graceful error handling
- **Default behavior**: Throw errors (backward compatible)
- **Context support**: Pass arbitrary context for environment-based logic (dev vs prod)
- **Path tracking**: Error messages include the path where evaluation failed

### 🔒 Reserved Key Protection
- **Reserved keys**: `get`, `set`, `has`, `delete`, `clear`, `keys`
- **Validation**: Prevents setting reserved keys that would conflict with API methods
- **Clear errors**: Helpful error messages when attempting to use reserved keys

## Breaking Changes

None - all changes are additive and backward compatible.

## Implementation Details

- **23/34 tests passing** (68% of new API features)
- **607 lines** of API contract tests
- **249 lines** of type coercion tests
- **164 lines** of type coercion helper implementation
- **Proxy wrapper** for seamless property access

## Remaining Work for v0.13

- **Phase 2E**: Deep Proxy Wrapping (6 tests) - recursive proxy for `data.user.name`
- **Phase 2F**: Cache Semantics (4 tests) - `${foo}` vs `${.foo}` behavior
- **1 nested test** from Phase 2D requiring deep proxies

## Migration Guide

No migration needed - all features are opt-in and backward compatible. Existing code continues to work unchanged.

To use new features:

```typescript
// Property access (instead of .get())
const data = dotted({ name: 'Alice', age: 30 });
console.log(data.name); // "Alice"

// Type coercion in expressions
const data = dotted({
  count: '4',
  '.computed': 'int(${count}) + 1'
});
console.log(await data.get('computed')); // 5

// Custom error handling
const data = dotted(schema, {
  onError: (error, path, context) => {
    if (context.env === 'development') throw error;
    logger.error(`Failed at ${path}`, error);
    return null;
  },
  context: { env: 'production' }
});
```
