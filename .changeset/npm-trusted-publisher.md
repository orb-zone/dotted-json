---
"@orb-zone/dotted-json": patch
---

Configure npm trusted publishing with OIDC

- Implement OIDC-based npm publishing (eliminates long-lived tokens)
- Consolidate package.json and package.npm.json into single file
- Fix CLI bin entries to reference compiled dist files
- Pin peer dependency versions for stability and clarity
- Add ESLint suppressions for SurrealDB type stub
- Update README installation instructions for npm registry
- Remove unnecessary build workflow steps
