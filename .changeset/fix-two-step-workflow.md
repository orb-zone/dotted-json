---
"@orb-zone/dotted-json": patch
---

**Changesets Workflow Fix**

- **Fixed**: Split changesets workflow into proper two-step process (version PR → publish)
- **Changed**: Moved JSR publishing to separate workflow triggered only after Version Packages PR is merged
- **Improved**: Publish step now runs `bun run build` before publishing to ensure package is ready
