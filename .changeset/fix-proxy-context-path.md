---
"@orb-zone/dotted-json": patch
---

fix: correct proxy context path for expression evaluation

Fixed a critical bug in proxy-wrapped .get() results where the context path was incorrectly including the property being evaluated. This caused expression evaluation, parent references, and scoped variable lookups to fail.

**What was fixed:**
- Expression evaluator now receives the correct context path (container object, not the property itself)
- Parent reference calculations (`..property`) now work correctly with proxy-wrapped objects
- Scoped `.get()`, `.set()`, and `.has()` methods on returned proxies now use the correct paths
- Proxy target is now the actual data object, eliminating property descriptor conflicts
- All arrays (including primitive arrays) are now consistently wrapped in proxies

**Impact:**
- All 330 tests now pass (was 13 failures)
- No breaking changes to the API
- Proxy behavior is now consistent with the original design intent

This fixes issues introduced in commit 7ea54d3 when proxy wrapping was initially implemented.
