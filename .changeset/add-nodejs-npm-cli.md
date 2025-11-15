---
"@orb-zone/dotted-json": patch
---

Fix npm OIDC trusted publishing and restore automatic git tagging:
- Add Node.js setup to ensure npm CLI v11.5.1+ is available
- Remove registry-url from setup-node to allow pure OIDC authentication
- Enable createGithubReleases to automatically create git tags and releases
