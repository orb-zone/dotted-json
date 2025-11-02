---
"@orb-zone/dotted-json": minor
---

Add proxy-wrapped object returns from `.get()` method for consistent API access

- `.get()` now returns proxy-wrapped objects with `.get()`, `.set()`, and `.has()` methods
- Objects and arrays returned from `.get()` are now equivalent to property access behavior
- Enables chaining: `(await data.get('user')).get('name')` now works
- All proxies remain bound to root DottedJson instance for consistent data access
- Property access on returned objects works identically: `user.name`, `items[0]`
- Arrays are also proxy-wrapped while preserving element access

**Example**:
```typescript
const data = dotted({
  user: {
    name: 'Alice',
    '.greeting': 'Hello, ${name}!'
  }
});

// Both now work identically:
const user1 = data.user;                    // Proxy-wrapped
const user2 = await data.get('user');       // Proxy-wrapped (NEW!)

await user1.get('greeting');  // 'Hello, Alice!' ✅
await user2.get('greeting');  // 'Hello, Alice!' ✅ (NEW!)
```

**Note**: While this is backward compatible for property access, code using `toEqual()` assertions on returned objects may need updating to compare properties individually instead of the proxy wrapper directly.
