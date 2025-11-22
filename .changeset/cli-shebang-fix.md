---
"@orb-zone/dotted-json": patch
---

Fix CLI binaries failing with syntax error when installed globally via npm. Removed duplicate shebang lines that were causing Node.js to fail parsing the built CLI files.
