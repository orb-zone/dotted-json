# Generate Zod Schemas from SurrealQL

Auto-generate Zod validation schemas from SurrealQL DEFINE FIELD statements.

## Usage

```
/zod-from-surql [schema-file or table-name]
```

## Examples

### Generate from Entire Schema File

```
/zod-from-surql test/integration/fixtures/test-schema.surql
```

Generates Zod schemas for all tables in the file.

### Generate for Specific Table

```
/zod-from-surql app_config
```

Looks up table definition and generates Zod schema.

### Generate from Inline Schema

```
/zod-from-surql
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD name ON user TYPE string
  ASSERT string::len($value) >= 2 AND string::len($value) <= 100;
DEFINE FIELD email ON user TYPE string
  ASSERT string::is::email($value);
DEFINE FIELD role ON user TYPE string
  ASSERT $value IN ['user', 'admin']
  VALUE $value OR 'user';
```

## Type Mapping

### SurrealDB → Zod

| SurrealDB Type | Zod Schema |
|---------------|------------|
| `string` | `z.string()` |
| `int` | `z.number().int()` |
| `float` | `z.number()` |
| `bool` | `z.boolean()` |
| `datetime` | `z.string().datetime()` or `z.date()` |
| `duration` | `z.string()` |
| `option<T>` | `T.optional()` |
| `array<T>` | `z.array(T)` |
| `record<table>` | `z.string()` (Record ID) |
| `object` | `z.object({})` (generic) or specific shape |
| `geometry<point>` | `z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) })` |

### ASSERT → Zod Constraints

| ASSERT Clause | Zod Method |
|--------------|------------|
| `string::len($value) >= 2` | `.min(2)` |
| `string::len($value) <= 100` | `.max(100)` |
| `string::is::email($value)` | `.email()` |
| `string::is::url($value)` | `.url()` |
| `string::is::uuid($value)` | `.uuid()` |
| `$value >= 18` | `.min(18)` |
| `$value <= 120` | `.max(120)` |
| `$value > 0` | `.positive()` |
| `$value IN ['a', 'b']` | `z.enum(['a', 'b'])` |
| `$value ~ "pattern"` | `.regex(/pattern/)` |

### VALUE → Zod Defaults

| VALUE Clause | Zod Method |
|-------------|------------|
| `VALUE $value OR 'default'` | `.default('default')` |
| `VALUE $value OR 0` | `.default(0)` |
| `VALUE time::now()` | `.default(new Date())` |

## Output Format

```typescript
// Generated from: [schema-file]
// Date: [timestamp]
// Generator: zod-from-surql

import { z } from 'zod';

// ============================================================================
// [TABLE_NAME] Schema
// ============================================================================

/**
 * Zod schema for [table_name] table
 *
 * Source: DEFINE TABLE [table_name] SCHEMAFULL;
 */
export const [TableName]Schema = z.object({
  // Field: name
  // Type: string
  // Constraints: length 2-100
  name: z.string().min(2).max(100),

  // Field: email
  // Type: string
  // Constraints: valid email format
  email: z.string().email(),

  // Field: role
  // Type: string
  // Constraints: enum ['user', 'admin']
  // Default: 'user'
  role: z.enum(['user', 'admin']).default('user'),

  // Field: created_at
  // Type: datetime
  // Default: time::now()
  created_at: z.date().default(() => new Date())
});

/**
 * TypeScript type inferred from Zod schema
 */
export type [TableName] = z.infer<typeof [TableName]Schema>;

/**
 * Input type (before defaults applied)
 */
export type [TableName]Input = z.input<typeof [TableName]Schema>;

/**
 * Output type (after defaults and transforms)
 */
export type [TableName]Output = z.output<typeof [TableName]Schema>;

// ============================================================================
// Function Schemas
// ============================================================================

/**
 * Schema for fn::getProfile function parameters
 *
 * Source: DEFINE FUNCTION fn::getProfile($userId: string)
 */
export const GetProfileParamsSchema = z.object({
  userId: z.string()
});

/**
 * Schema for fn::getProfile function return value
 *
 * Returns: User profile object
 */
export const GetProfileReturnSchema = [TableName]Schema;

// ============================================================================
// Exports
// ============================================================================

export const schemas = {
  user: [TableName]Schema,
  // ... other table schemas
};

export const functions = {
  getProfile: {
    params: GetProfileParamsSchema,
    returns: GetProfileReturnSchema
  },
  // ... other function schemas
};
```

## Workflow

When invoked:

1. **Parse .surql file** - Extract DEFINE TABLE and DEFINE FIELD statements
2. **Map types** - Convert SurrealDB types → Zod schemas
3. **Parse ASSERT** - Convert validation clauses → Zod constraints
4. **Parse VALUE** - Convert defaults → Zod defaults
5. **Parse functions** - Generate param/return schemas for DEFINE FUNCTION
6. **Generate code** - Output TypeScript file with Zod schemas
7. **Validate** - Ensure generated schemas compile and work

## Options

```
/zod-from-surql [file] --output [path] --format [esm|cjs] --include-comments
```

- `--output` - Where to save generated file (default: `src/schemas.generated.ts`)
- `--format` - Module format (default: `esm`)
- `--include-comments` - Add detailed comments (default: true)
- `--watch` - Watch .surql file for changes (for development)

## Integration

### With SurrealDBLoader

```typescript
import { SurrealDBLoader } from '@orb-zone/dotted/loaders/surrealdb';
import { UserSchema } from './schemas.generated';

const loader = new SurrealDBLoader({
  schemas: {
    user: UserSchema  // Auto-validated on load/save
  }
});

// Type-safe and validated
const user = await loader.load('user', userId);
// user: User (TypeScript knows the type!)
```

### With Function Resolvers

```typescript
import { GetProfileParamsSchema, GetProfileReturnSchema } from './schemas.generated';

const resolvers = {
  'db.getProfile': {
    input: GetProfileParamsSchema,
    output: GetProfileReturnSchema,
    resolve: async (params) => {
      // params is typed and validated
      return await db.query('fn::getProfile', params);
    }
  }
};
```

## Advanced: Custom Type Mapping

For complex SurrealDB types not in the default mapping:

```typescript
// Custom geometry type
DEFINE FIELD location ON venue TYPE geometry<point>;

// Generated Zod schema
location: z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()])
})

// Custom record type with constraints
DEFINE FIELD author_id ON post TYPE record<user>
  ASSERT record::exists($value);

// Generated Zod schema
author_id: z.string().refine(
  async (id) => await db.select(id),
  { message: 'User does not exist' }
)
```

## Success Criteria

Generated schemas are ready when:
- ✅ All tables have Zod schemas
- ✅ All ASSERT clauses mapped to Zod constraints
- ✅ TypeScript types are correctly inferred
- ✅ Schemas validate correctly in tests
- ✅ Integration with SurrealDBLoader works
- ✅ Function parameter/return schemas generated

## Related Commands

- `/surql-review` - Review schema before generating Zod
- `/surql` - Generate new SurrealQL schema
- `/implement` - Implement feature using generated schemas
