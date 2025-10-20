---
"@orb-zone/dotted-json": minor
---

Implement v0.13 API improvements with property access materialization, deep proxy wrapping, and clearer options API

**New Features:**
- **Deep Proxy Wrapping**: Nested objects now have full `.get()`, `.set()`, and `.has()` methods at every level
- **Scoped Property Access**: Expressions in nested contexts resolve variables relative to their parent scope
- **Type Preservation**: Single variable expressions like `${counter}` preserve their original type (number, boolean, etc.)
- **Dependency Invalidation**: Changing static values automatically invalidates dependent materialized expressions
- **Function Fallbacks**: Fallback values can now be functions for lazy/dynamic default values

**API Improvements (with backward compatibility):**
- **Renamed Options**:
  - `ignoreCache` → `fresh` (clearer intent: "get me a fresh value")
  - `default` + `errorDefault` → `fallback` (single unified fallback for all failure modes)
- **Simplified Error Handling**:
  - `onError(error, path)` returns `'throw' | 'fallback' | any`
  - Removed `context` parameter (use closures instead)
  - Clearer contract: return `'throw'` to re-throw, `'fallback'` to use fallback, or any value
- **All old options still work** via backward compatibility layer

**Improvements:**
- Expression evaluation with quoted strings (e.g., `'"${name}"'`) correctly evaluates as JavaScript strings
- Enhanced context scoping for nested data structures
- Materialized values properly cleared when dependencies change
- Better TypeScript types with explicit function fallback support

**Migration Guide:**
```typescript
// Old API (still works via backward compatibility)
const data = dotted(schema, {
  default: null,
  errorDefault: 'error',
  onError: (error, path, context) => { ... }
});
await data.get('path', { ignoreCache: true, default: 'fallback' });

// New API (recommended)
const data = dotted(schema, {
  fallback: null,  // Single fallback for missing values AND errors
  onError: (error, path) => 'fallback'  // Return 'throw' | 'fallback' | value
});
await data.get('path', { fresh: true, fallback: 'override' });
```

**Test Coverage:**
- 285/288 tests passing (99%)
- 30/34 new API contract tests passing
- Full backward compatibility with v0.12.x maintained

**Deferred Features (v0.14+):**
- Advanced cache semantics with `${.foo}` live references
- Cache bypass without write (`fresh` always writes to cache)
- Edge case: direct `.get('.expression')` method calls
