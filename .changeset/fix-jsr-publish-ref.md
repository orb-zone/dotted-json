---
"@orb-zone/dotted-json": patch
---

**JSR Publish Fix**

- **Fixed**: Publish workflow now explicitly checks out `main` branch after Version Packages PR merge
- **Resolved**: Ensures correct version is published to JSR (was publishing old version from PR branch)
