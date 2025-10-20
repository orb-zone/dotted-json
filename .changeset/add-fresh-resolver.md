---
"@orb-zone/dotted-json": minor
---

feat: Add fresh() resolver for live re-evaluation

- Rename live() resolver to fresh() to avoid confusion with SurrealDB LIVE queries
- Add fresh() function that forces re-evaluation of expressions with { fresh: true }
- Update expression evaluator to support fresh() calls in expressions
- Prevent caching of expressions containing fresh() calls to ensure live updates
- Update tests and documentation to use fresh() syntax