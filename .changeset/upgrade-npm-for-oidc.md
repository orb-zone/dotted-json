---
"@orb-zone/dotted-json": patch
---

Upgrade npm to v11+ in CI workflow for OIDC trusted publishing support. Node.js 20 ships with npm 10.8.2 which doesn't support OIDC authentication - explicitly upgrade to npm@latest (v11+) to enable provenance-based publishing.
