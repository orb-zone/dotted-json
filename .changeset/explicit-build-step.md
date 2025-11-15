---
"@orb-zone/dotted-json": patch
---

Fix npm publish workflow by adding explicit build step before Changesets publish action.

Previously, npm would fail during publish because it validates that bin files exist before running the `prepublishOnly` script. The workflow now explicitly runs `bun run build` before the Changesets action attempts to publish, ensuring all build artifacts (including `dist/cli/translate.js` and `dist/cli/surql-to-ts.js`) are present when npm performs its validation checks.

This complements the recent OIDC authentication fixes and ensures the complete publish workflow can succeed.
