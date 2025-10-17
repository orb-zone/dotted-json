---
"@orb-zone/dotted-json": minor
---

**CLI Rename & Example Fixes**

- **BREAKING**: Renamed CLI tool from `json-translate` to `dotted-translate` for better brand alignment
- **Fixed**: Corrected critical bugs in 5 example files (file-inheritance.ts, basic-usage.ts, feature-flag-manager.ts, realtime-config-manager.ts, i18n-translation-editor.ts)
- **Docs**: Comprehensive documentation audit with specialized agents (fixed 5 critical issues, 3 high-severity bugs)
- **Security**: Completed security audit - no secrets, comprehensive .gitignore, only 1 production dependency

**Migration**: If you installed the CLI globally, reinstall to get the new command name:
```bash
bun remove -g @orb-zone/dotted-json
bun add -g @orb-zone/dotted-json
dotted-translate strings.jsön --to es
```
