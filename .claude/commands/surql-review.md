# SurrealQL Schema Review

Review SurrealQL schema definitions, queries, and functions for best practices, performance, and security issues.

## Usage

```
/surql-review [file-path or inline-code]
```

## Examples

### Review Schema File

```
/surql-review test/integration/fixtures/test-schema.surql
```

### Review Inline Schema

```
/surql-review
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD email ON user TYPE string;
DEFINE FIELD role ON user TYPE string;
```

## What Gets Reviewed

### 1. Syntax Validation
- ✅ Correct SurrealQL syntax
- ✅ Proper type definitions
- ✅ Valid ASSERT clauses
- ✅ Correct function signatures

### 2. Performance Analysis
- 🚀 Missing indexes on frequently queried fields
- 🚀 Opportunities for array Record IDs
- 🚀 Full table scans in queries
- 🚀 N+1 query patterns (suggest FETCH)

### 3. Security Review
- 🔒 Missing PERMISSIONS clauses
- 🔒 Overly permissive access
- 🔒 Field-level permission opportunities
- 🔒 SQL injection risks

### 4. Best Practices
- 📋 Use SCHEMAFULL in production
- 📋 Add ASSERT validation
- 📋 Use VALUE for defaults
- 📋 Consistent naming conventions
- 📋 Proper type usage (option<T>, record<table>, etc.)

### 5. Type Safety
- 🎯 All fields have explicit types
- 🎯 Proper use of option<T> for nullable
- 🎯 Validation via ASSERT clauses
- 🎯 Type mapping (SurrealDB → Zod → TypeScript)

## Review Output Format

```markdown
# SurrealQL Schema Review

## Summary
- Tables: X
- Functions: Y
- Issues Found: Z (Critical: A, High: B, Medium: C, Low: D)
- Optimization Opportunities: E

## Critical Issues ❌
1. [Issue description]
   - Location: [table/function name]
   - Impact: [description]
   - Fix: [recommended solution]

## Performance Opportunities 🚀
1. [Optimization description]
   - Current: [current approach]
   - Recommended: [better approach]
   - Impact: [expected improvement]

## Security Recommendations 🔒
1. [Security issue]
   - Risk: [description]
   - Recommendation: [fix]

## Best Practice Improvements 📋
1. [Suggestion]
   - Rationale: [why this matters]
   - Example: [code example]

## Suggested Schema Changes

```sql
-- Add missing indexes
DEFINE INDEX user_email_idx ON user FIELDS email UNIQUE;

-- Add missing permissions
DEFINE FIELD role ON user TYPE string
  PERMISSIONS FOR update WHERE $auth.role = 'admin';

-- Use array Record IDs for variant-aware documents
-- Change from: jsön_documents:uuid
-- To: jsön_documents:['greetings', 'en', 'formal']
```

## Type Mappings (for Zod generation)

| Field | SurrealDB Type | Zod Schema | TypeScript Type |
|-------|---------------|------------|-----------------|
| email | string (ASSERT email) | z.string().email() | string |
| age | int (ASSERT >=18) | z.number().int().min(18) | number |
| role | string (IN ['user','admin']) | z.enum(['user','admin']) | 'user' \| 'admin' |
```

## Integration

This command integrates with:
- **SurrealDB Expert Agent** - Uses specialized subagent for deep analysis
- **Design Documents** - References project-specific patterns
- **/zod-from-surql** - Feeds into Zod schema generation
- **/resolver-from-fn** - Validates functions for resolver generation

## Workflow

When invoked:

1. **Read schema** - Load .surql file or parse inline code
2. **Invoke SurrealDB expert** - Get specialized analysis
3. **Check against designs** - Validate against project patterns:
   - Array Record IDs for variant-aware storage
   - Field-level permissions patterns
   - Function resolver patterns

4. **Generate report** - Comprehensive review with:
   - Issues by severity
   - Optimization opportunities
   - Security recommendations
   - Code examples for fixes

5. **Suggest next steps** - Point to related commands:
   - `/zod-from-surql` if schema is good
   - `/resolver-from-fn` for function validation
   - Re-run after fixes

## Success Criteria

Schema is ready when:
- ✅ Zero critical issues
- ✅ All production tables are SCHEMAFULL
- ✅ Permissions defined for sensitive operations
- ✅ Indexes on frequently queried fields
- ✅ Type safety enforced via ASSERT
- ✅ Ready for Zod generation

## Related Commands

- `/surql` - Generate new SurrealQL schema
- `/zod-from-surql` - Generate Zod schemas from validated schema
- `/resolver-from-fn` - Generate resolvers from validated functions
