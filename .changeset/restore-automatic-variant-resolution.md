---
"@orb-zone/dotted-json": patch
---

Restored automatic variant resolution system that was lost in v1.1.0. The system now uses tree-walking to automatically discover variant context from data properties (lang, gender, form, style, etc.) and resolve variant paths with clean `:variant` syntax instead of complex expressions.