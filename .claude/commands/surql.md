# SurrealQL Generator

Generate SurrealQL schema definitions, functions, and queries following best practices.

## Usage

```
/surql [type] [description]
```

Types:
- `schema` - Generate table schema with fields and permissions
- `function` - Generate custom function (fn::)
- `query` - Generate optimized query
- `permissions` - Generate permission clauses

## Examples

### Generate Table Schema

```
/surql schema user table with name, email, role fields and field-level permissions
```

Generates:
```sql
DEFINE TABLE user SCHEMAFULL;

DEFINE FIELD name ON user TYPE string
  ASSERT string::len($value) >= 2 AND string::len($value) <= 100;

DEFINE FIELD email ON user TYPE string
  ASSERT string::is::email($value);

DEFINE FIELD role ON user TYPE string
  ASSERT $value IN ['user', 'admin', 'moderator']
  VALUE $value OR 'user'
  PERMISSIONS FOR update WHERE $auth.role = 'admin';

DEFINE FIELD created_at ON user TYPE datetime
  VALUE time::now();

DEFINE INDEX user_email_idx ON user FIELDS email UNIQUE;
```

### Generate Custom Function

```
/surql function getActiveOrders that takes userId and returns orders with status=active
```

Generates:
```sql
DEFINE FUNCTION fn::getActiveOrders($userId: string) {
  RETURN SELECT * FROM order
    WHERE user_id = $userId
      AND status = 'active'
    ORDER BY created_at DESC;
};
```

### Generate Query

```
/surql query to find all posts by user with comments count
```

Generates optimized SurrealQL with:
- Proper indexing suggestions
- FETCH vs JOIN considerations
- Performance annotations

## Best Practices Applied

1. **Type Safety**
   - Always specify types for DEFINE FIELD
   - Use ASSERT for validation
   - Leverage option<T> for nullable fields

2. **Performance**
   - Suggest indexes for frequently queried fields
   - Use array Record IDs for variant-aware documents
   - Optimize range queries

3. **Security**
   - Add PERMISSIONS clauses by default
   - Follow principle of least privilege
   - Suggest row-level and field-level permissions

4. **Maintainability**
   - Include comments for complex logic
   - Use consistent naming (snake_case for fields)
   - Group related definitions

## Integration

Generated SurrealQL integrates with:
- `surql-to-zod` CLI (auto-generate Zod schemas)
- `surql-to-ts` CLI (auto-generate TypeScript types)
- SurrealDBLoader (array Record IDs for performance)
- Permission detection system

## References

- [SurrealDB Documentation](https://surrealdb.com/docs)
- [record-id-variants-design.md](../../.specify/memory/record-id-variants-design.md)
- [field-level-permissions-design.md](../../.specify/memory/field-level-permissions-design.md)
- [function-resolver-inference.md](../../.specify/memory/function-resolver-inference.md)
