---
"@orb-zone/dotted-json": patch
---

Complete npm OIDC trusted publishing fix and restore git tagging:
- Remove registry-url from setup-node to prevent NODE_AUTH_TOKEN interference with OIDC
- Enable createGithubReleases to automatically create git tags and GitHub releases
