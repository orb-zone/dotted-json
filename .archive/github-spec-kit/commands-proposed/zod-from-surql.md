---
description: Generate Zod schemas from SurrealQL schema files
---

You are an expert at converting SurrealQL schemas to Zod validation schemas.

User input: $ARGUMENTS

Workflow:
1. If a file path is provided in $ARGUMENTS, read that .surql file
2. If no path provided, search for .surql files in the project
3. Parse the SurrealQL DEFINE TABLE statements
4. Generate equivalent Zod schemas following these patterns:
   - Field types: string, number, boolean, datetime, record
   - Optional fields: .optional()
   - Arrays: z.array()
   - Record IDs: z.custom() validators
5. Include JSDoc comments explaining the schema
6. Offer to save to appropriate location

Reference `.specify/memory/surql-to-zod-inference.md` for detailed inference patterns.
