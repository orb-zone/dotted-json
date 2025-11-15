---
"@orb-zone/dotted-json": minor
---

Add comprehensive security, testing, and quality improvements for v1.1.0 release

## Security Enhancements
- Add runtime schema validation with `validateSchema()` - prevents DoS attacks via deep nesting, circular references, and oversized payloads
- Implement structured logging system to replace scattered console calls with configurable, production-aware logging

## Testing & Performance
- Add performance regression benchmark suite (9 tests) tracking expression evaluation, caching, and variant resolution
- Establish baseline metrics for detecting performance degradations

## Code Quality
- Tighten ESLint rules: upgrade from v0.9.x warnings to v1.0+ strict enforcement (12 type-safety rules)
- Maintain backward compatibility with justified file-specific overrides for dynamic patterns

## Build & Documentation
- Generate minified production bundles alongside unminified
- Add automatic gzip size tracking (39KB unminified → 19KB minified → 6.5KB gzipped)
- Enhance README with prominent experimental/risk disclaimer
- Update documentation links (API, Examples, Getting Started, Performance, Contributing)
- Update ROADMAP to reflect v1.1.0 improvements and timeline

## Testing
- All 339 tests passing (including 9 new performance benchmarks)
- Zero regressions, maintained backward compatibility
- TypeScript strict mode verified
