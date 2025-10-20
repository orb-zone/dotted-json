# TDD Status Report: v1.0 API Contract

**Date**: 2025-10-17
**Status**: ✅ Fully Implemented (v0.14.0)
**Next**: v1.1.0 features

---

## Summary

Following TDD principles, we have **successfully written comprehensive tests first** for the v1.0 API contract. Tests are failing as expected - this is the correct TDD flow.

## Test Files Created

### 1. `test/unit/v1-api-contract.test.ts`
**Lines**: 607
**Tests**: 34
**Status**: ❌ 0 pass, 34 fail (expected)

**Coverage**:
- ✅ Property Access & Materialization (6 tests)
- ✅ Deep Proxy Wrapping (6 tests)
- ✅ Reserved Keys Protection (6 tests)
- ✅ Error Handling (5 tests)
- ✅ Cache Semantics (5 tests)
- ✅ Type Coercion (6 tests)

### 2. `test/unit/type-coercion.test.ts`
**Lines**: 249
**Tests**: 28
**Status**: ✅ 28 pass, 0 fail

**Coverage**:
- ✅ int() helper (5 tests)
- ✅ float() helper (6 tests)
- ✅ bool() helper (5 tests)
- ✅ json() helper (7 tests)
- ✅ Real-world use cases (5 tests)

### 3. `src/helpers/type-coercion.ts`
**Lines**: 164
**Status**: ✅ Implemented and passing all tests

**Exports**:
- `int(val)` - Cast to integer
- `float(val)` - Cast to float
- `bool(val)` - Cast to boolean
- `json(val)` - Parse JSON string
- `typeCoercionHelpers` - Object with all helpers

---

## Expected Test Failures

The 34 failing tests in `v1-api-contract.test.ts` are **intentional**. They define the v1.0 API behaviors we need to implement:

### Category 1: Property Access & Materialization (6 failing)

**Current Behavior**: Direct property access returns `undefined` for everything

**Expected Behavior**:
1. Static values accessible directly: `data.name` → `"Alice"`
2. Expressions undefined before `.get()`: `data.greeting` → `undefined`
3. Expressions materialize after `.get()`: After `await data.get('greeting')`, then `data.greeting` → `"Hello, Alice!"`
4. Re-setting expressions clears materialized value
5. Re-setting static values updates directly
6. Materialization works with nested data

**What Needs Implementation**:
- Proxy handler to distinguish static vs expression keys
- Materialization logic: after `.get()` evaluates expression, set result as static value
- Invalidation logic: when expression key changes, clear materialized value

---

### Category 2: Deep Proxy Wrapping (6 failing)

**Current Behavior**: Nested objects are plain objects, no `.get()/.set()` methods

**Expected Behavior**:
1. Nested objects have `.get()` method
2. Nested objects have `.set()` method
3. Can call `.get()` at any depth
4. Can call `.set()` at any depth
5. Materialization works recursively
6. Deep proxies can be passed to functions

**What Needs Implementation**:
- Recursive proxy wrapping: every object at every depth becomes a `DottedJson` proxy
- Method inheritance: child proxies have full API
- Path scoping: nested `.get('key')` should resolve relative to parent path

---

### Category 3: Reserved Keys Protection (6 failing)

**Current Behavior**: Can set any key name

**Expected Behavior**:
1. Cannot `.set()` reserved key: `get`
2. Cannot `.set()` reserved key: `set`
3. Cannot `.set()` reserved key: `has`
4. Cannot `.set()` reserved keys at any depth
5. Throws clear error message for reserved keys
6. Can import JSON with reserved keys (just cannot modify)

**What Needs Implementation**:
```typescript
const RESERVED_KEYS = ['get', 'set', 'has', 'delete', 'clear', 'keys'];

function validateKey(key: string) {
  if (RESERVED_KEYS.includes(key)) {
    throw new Error(`Cannot set reserved key: "${key}". Reserved keys: ${RESERVED_KEYS.join(', ')}`);
  }
}
```

---

### Category 4: Error Handling (5 failing)

**Current Behavior**: Errors propagate and throw (or return undefined)

**Expected Behavior**:
1. Default: `console.error()` + return `undefined`
2. Allow custom `onError` handler
3. `onError` can re-throw for fail-fast
4. `onError` receives error, path, and context
5. Per-context error handling (dev vs prod)

**What Needs Implementation**:
```typescript
// In expression evaluator
try {
  // evaluate expression
} catch (error) {
  if (options.onError) {
    return options.onError(error, path, options.context);
  } else {
    // Default behavior
    console.error(`Error evaluating expression at path '${path}':`, error);
    return undefined;
  }
}
```

---

### Category 5: Cache Semantics (5 failing)

**Current Behavior**: Basic caching exists, but `${.foo}` syntax not implemented

**Expected Behavior**:
1. `${foo}` captures snapshot of `foo` (cached value)
2. `${.foo}` forces re-evaluation of `foo`
3. Changing static value invalidates dependents
4. Changing expression key invalidates its cache
5. `ignoreCache` option bypasses cache

**What Needs Implementation**:
- Dependency tracking graph: track which expressions depend on which keys
- Invalidation cascade: when key changes, invalidate all dependents
- `${.foo}` syntax parser: detect `.` prefix in variable references
- Re-evaluation logic: when `.` prefix detected, bypass cache for that dependency

---

### Category 6: Type Coercion (6 failing)

**Current Behavior**: `int()`, `float()`, `bool()`, `json()` not available in expression context

**Expected Behavior**:
All type coercion tests should pass once helpers are exposed to expression evaluator

**What Needs Implementation**:
```typescript
// In expression evaluator context
const context = {
  ...resolvers,
  ...typeCoercionHelpers,  // Add int, float, bool, json
  // ... other context
};
```

---

## Implementation Priority

### Phase 2A: Type Coercion (Quick Win) ⭐
**Effort**: Low (already implemented helpers)
**Impact**: High (6 tests will pass)

**Task**: Export `typeCoercionHelpers` in expression evaluation context

---

### Phase 2B: Reserved Keys Protection ⭐⭐
**Effort**: Low
**Impact**: Medium (6 tests will pass, critical safety feature)

**Task**: Add `validateKey()` to `.set()` method

---

### Phase 2C: Error Handling ⭐⭐⭐
**Effort**: Medium
**Impact**: High (5 tests will pass, production-critical)

**Task**: Update expression evaluator with try-catch and `onError` logic

---

### Phase 2D: Property Access & Materialization ⭐⭐⭐⭐
**Effort**: High (complex Proxy logic)
**Impact**: Very High (6 tests will pass, core API behavior)

**Tasks**:
1. Distinguish static vs expression keys in Proxy
2. Add materialization after `.get()` evaluation
3. Add invalidation when keys change

---

### Phase 2E: Deep Proxy Wrapping ⭐⭐⭐⭐⭐
**Effort**: Very High (recursive Proxy wrapping)
**Impact**: Very High (6 tests will pass, powerful feature)

**Tasks**:
1. Recursively wrap all nested objects
2. Inherit `.get()/.set()` methods at every depth
3. Handle path scoping correctly

---

### Phase 2F: Cache Semantics (Advanced) ⭐⭐⭐⭐⭐
**Effort**: Very High (dependency graph, `${.foo}` syntax)
**Impact**: Very High (5 tests will pass, critical for dynamic data)

**Tasks**:
1. Implement dependency tracking graph
2. Parse `${.foo}` syntax in expressions
3. Implement invalidation cascade
4. Test deeply nested dependencies

---

## Next Steps

### Immediate (Today)
1. **Phase 2A**: Add type coercion helpers to expression context (30 mins)
2. **Phase 2B**: Add reserved key validation (30 mins)
3. **Phase 2C**: Update error handling (1 hour)

**Expected Result**: 17/34 tests passing

### Short-term (This Week)
4. **Phase 2D**: Implement materialization (3-4 hours)
5. **Phase 2E**: Implement deep proxy wrapping (3-4 hours)

**Expected Result**: 29/34 tests passing

### Medium-term (Next Week)
6. **Phase 2F**: Implement cache semantics with `${.foo}` (4-6 hours)

**Expected Result**: 34/34 tests passing ✅

---

## Existing Tests Status

All **226 existing tests** still pass:
```bash
bun test  # Excluding v1-api-contract.test.ts
# 226 pass, 0 fail
```

This confirms we haven't broken anything while adding new test infrastructure.

---

## Breaking Changes for v1.0

Based on test requirements, these are the confirmed breaking changes:

1. **Reserved Keys**: Cannot `.set()` keys named `get`, `set`, `has`, etc. (NEW - throws error)
2. **Error Handling**: Default behavior is `console.error()` + `undefined` (CHANGED - was throw)
3. **Property Access**: `data.foo` returns static values only (CHANGED - was Proxy)
4. **Materialization**: Expressions materialize after `.get()` (NEW behavior)

All breaking changes will be documented in migration guide.

---

## Success Criteria for v1.0 Release

- [ ] All 34 v1-api-contract tests pass
- [ ] All 226 existing tests still pass
- [ ] All 28 type-coercion tests pass (✅ already passing)
- [ ] Zero regressions
- [ ] Documentation updated
- [ ] CHANGELOG.md with breaking changes
- [ ] Migration guide for v0.x → v1.0

**Total**: 288 tests must pass for v1.0 release

---

## Files to Implement/Modify

### Critical Files
1. `src/dotted-json.ts` - Core implementation
2. `src/expression-evaluator.ts` - Expression evaluation with type coercion helpers
3. `src/types/index.ts` - Add `onError` to options interface

### Documentation Files
1. `CHANGELOG.md` - Add v1.0.0 entry with breaking changes
2. `docs/API.md` - Update with new behaviors
3. `docs/migration.md` - Add v0.x → v1.0 guide

---

**Ready for Phase 2 Implementation!** 🚀
