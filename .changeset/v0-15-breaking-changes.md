---
"@orb-zone/dotted-json": major
---

**Breaking Changes for v0.15.0**

- Remove `ignoreCache` option from `GetOptions` and `HasOptions`. Use `fresh: true` instead to re-evaluate expressions and update the cache.
- Enable nested expression evaluation (feature was already working, test now enabled)

**New Features**

- Nested expressions now fully supported: `.sum` can reference `.count`, etc.

**Improvements**

- ESLint cleanup: Reduced warnings from 589 to 6 (99% reduction)
- Added targeted ESLint overrides for files that legitimately need `any` types
- Updated all documentation to use `fresh` instead of `ignoreCache`

**Migration Guide**

```typescript
// ❌ Old API (no longer works)
await data.get('counter', { ignoreCache: true });

// ✅ New API
await data.get('counter', { fresh: true });
```

The `fresh` option re-evaluates the expression AND updates the cache with the new value, which is more useful than the old `ignoreCache` behavior.
