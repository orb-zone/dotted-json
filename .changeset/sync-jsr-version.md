---
"@orb-zone/dotted-json": patch
---

**Version Sync Fix**

- **Fixed**: Sync version from package.json to jsr.json automatically during `changeset version`
- **Added**: `tools/sync-jsr-version.ts` script to keep jsr.json version in sync
- **Resolved**: JSR was publishing old version (0.10.1) because jsr.json wasn't being updated by changesets
