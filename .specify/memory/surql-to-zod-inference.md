# SurrealQL to Zod Schema Inference

**Created**: 2025-10-06
**Status**: Design Phase
**Target**: v0.7.0+ (SurrealDB Storage Provider)

---

## Vision

**Goal**: Parse `.surql` schema files to automatically generate Zod schemas, eliminating manual duplication and ensuring database schema and runtime validation stay in sync.

**Single Source of Truth**: Write schema once in SurrealQL → Auto-generate Zod → Auto-infer TypeScript types.

```
┌─────────────────────────────────────────────────────────┐
│ surrealdb-schema.surql (SOURCE OF TRUTH)                │
│ ------------------------------------------------        │
│ DEFINE TABLE user SCHEMAFULL;                           │
│ DEFINE FIELD name ON user TYPE string;                  │
│ DEFINE FIELD email ON user TYPE string                  │
│   ASSERT string::is::email($value);                     │
│ DEFINE FIELD age ON user TYPE int                       │
│   ASSERT $value >= 18 AND $value <= 120;                │
│ DEFINE FIELD role ON user TYPE string                   │
│   VALUE $value OR 'user';                               │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (auto-generate)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ schemas.ts (AUTO-GENERATED)                             │
│ ------------------------------------------------        │
│ export const UserSchema = z.object({                    │
│   name: z.string(),                                     │
│   email: z.string().email(),                            │
│   age: z.number().int().min(18).max(120),               │
│   role: z.string().default('user')                      │
│ });                                                      │
│                                                          │
│ export type User = z.infer<typeof UserSchema>;          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (used everywhere)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Application Code (TYPE-SAFE + VALIDATED)                │
│ ------------------------------------------------        │
│ const loader = new SurrealDBLoader({                    │
│   schemas: { user: UserSchema }                         │
│ });                                                      │
│                                                          │
│ const user: User = await loader.load('user');           │
│ // TypeScript knows: { name, email, age, role }         │
│ // Zod validates at runtime                             │
└─────────────────────────────────────────────────────────┘
```

---

## Motivation

### Current Problem: Manual Duplication

**SurrealDB Schema** (surrealdb-schema.surql):
```sql
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD email ON user TYPE string
  ASSERT string::is::email($value);
DEFINE FIELD age ON user TYPE int
  ASSERT $value >= 18 AND $value <= 120;
```

**Zod Schema** (schemas.ts) - **Manually written, can drift!**:
```typescript
export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(120)
});
```

**Problems**:
1. ❌ Duplication: Same schema defined twice
2. ❌ Drift risk: Database and validation can become inconsistent
3. ❌ Maintenance: Every schema change requires updates in two places
4. ❌ Error-prone: Easy to forget constraints or make typos

### Desired Solution: Auto-Generation

**SurrealDB Schema** (surrealdb-schema.surql) - **SINGLE SOURCE OF TRUTH**:
```sql
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD email ON user TYPE string
  ASSERT string::is::email($value);
DEFINE FIELD age ON user TYPE int
  ASSERT $value >= 18 AND $value <= 120;
```

**Generated Zod Schema** (schemas.generated.ts) - **AUTO-GENERATED**:
```typescript
// ⚠️ AUTO-GENERATED - DO NOT EDIT
// Source: surrealdb-schema.surql
// Generated: 2025-10-06T14:23:45Z

import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(120)
});

export type User = z.infer<typeof UserSchema>;
```

**Benefits**:
- ✅ Single source of truth (SurrealQL)
- ✅ No drift possible (auto-generated)
- ✅ Zero maintenance overhead
- ✅ Constraints automatically enforced client-side

---

## Analysis: SurrealQL Type System

### Type Mapping: SurrealDB → Zod

| SurrealDB Type | Zod Equivalent | Notes |
|----------------|----------------|-------|
| `string` | `z.string()` | |
| `int` | `z.number().int()` | |
| `float` | `z.number()` | |
| `decimal` | `z.number()` | Or custom Decimal class |
| `number` | `z.number()` | Generic number type |
| `bool` | `z.boolean()` | |
| `datetime` | `z.string().datetime()` | ISO 8601 string |
| `duration` | `z.string()` | Duration string (e.g., "1h30m") |
| `array` | `z.array(...)` | Requires element type |
| `array<T>` | `z.array(T)` | Typed array |
| `set<T>` | `z.array(T)` | Sets become arrays in JSON |
| `object` | `z.record(z.unknown())` | Flexible object |
| `option<T>` | `T.optional()` | Nullable field |
| `record<table>` | `z.string()` | Record ID as string |
| `geometry<point>` | `z.object({ type, coordinates })` | GeoJSON |
| `bytes` | `z.instanceof(Uint8Array)` | Binary data |
| `uuid` | `z.string().uuid()` | |
| `any` | `z.unknown()` | No validation |

### ASSERT Clause Mapping

| ASSERT Pattern | Zod Equivalent |
|----------------|----------------|
| `string::is::email($value)` | `.email()` |
| `string::is::url($value)` | `.url()` |
| `string::is::uuid($value)` | `.uuid()` |
| `$value >= 18` | `.min(18)` |
| `$value <= 120` | `.max(120)` |
| `$value >= 18 AND $value <= 120` | `.min(18).max(120)` |
| `array::len($value) >= 3` | `.array(...).min(3)` |
| `array::len($value) <= 10` | `.array(...).max(10)` |
| `string::len($value) >= 3` | `.string().min(3)` |
| `string::len($value) <= 100` | `.string().max(100)` |
| `$value IN ['a', 'b', 'c']` | `.enum(['a', 'b', 'c'])` |
| Custom expression | **Comment + manual validation** |

### VALUE Clause (Defaults)

```sql
DEFINE FIELD role ON user TYPE string
  VALUE $value OR 'user';

DEFINE FIELD createdAt ON user TYPE datetime
  VALUE $value OR time::now();
```

→ Zod:
```typescript
role: z.string().default('user'),
createdAt: z.string().datetime().default(() => new Date().toISOString())
```

---

## Design: Schema Introspection & Generation

### Approach 1: Parse .surql Files

**Concept**: Parse `.surql` files directly to extract schema definitions.

```typescript
interface SurqlParser {
  /**
   * Parse .surql file to extract table schemas
   */
  parse(surqlContent: string): TableSchema[];
}

interface TableSchema {
  name: string;
  schemafull: boolean;
  fields: FieldSchema[];
}

interface FieldSchema {
  name: string;
  type: SurrealType;
  optional: boolean;
  default?: string;
  assertions: Assertion[];
}

interface Assertion {
  type: 'email' | 'url' | 'uuid' | 'min' | 'max' | 'length' | 'enum' | 'custom';
  value?: any;
  raw: string; // Original ASSERT clause
}

/**
 * Parse SurrealQL schema file
 */
function parseSurql(surqlContent: string): TableSchema[] {
  const tables: TableSchema[] = [];
  const lines = surqlContent.split('\n');

  let currentTable: TableSchema | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // DEFINE TABLE
    if (trimmed.startsWith('DEFINE TABLE')) {
      const match = /DEFINE TABLE (\w+)\s*(SCHEMAFULL|SCHEMALESS)?/.exec(trimmed);
      if (match) {
        currentTable = {
          name: match[1],
          schemafull: match[2] === 'SCHEMAFULL',
          fields: []
        };
        tables.push(currentTable);
      }
    }

    // DEFINE FIELD
    if (trimmed.startsWith('DEFINE FIELD') && currentTable) {
      const match = /DEFINE FIELD (\w+) ON (\w+) TYPE (.+?)(?:\s|;|$)/.exec(trimmed);
      if (match) {
        const fieldName = match[1];
        const tableName = match[2];
        const typeStr = match[3];

        if (tableName === currentTable.name) {
          const field: FieldSchema = {
            name: fieldName,
            type: parseType(typeStr),
            optional: typeStr.startsWith('option<'),
            assertions: []
          };

          // Parse ASSERT clause (may be on next line)
          // ... (complex parsing logic)

          currentTable.fields.push(field);
        }
      }
    }
  }

  return tables;
}

function parseType(typeStr: string): SurrealType {
  // Remove option<> wrapper
  const unwrapped = typeStr.replace(/^option<(.+)>$/, '$1');

  // Parse type
  if (unwrapped === 'string') return { kind: 'string' };
  if (unwrapped === 'int') return { kind: 'int' };
  if (unwrapped === 'float') return { kind: 'float' };
  if (unwrapped === 'bool') return { kind: 'bool' };
  if (unwrapped === 'datetime') return { kind: 'datetime' };

  // Array type: array<T>
  const arrayMatch = /^array<(.+)>$/.exec(unwrapped);
  if (arrayMatch) {
    return { kind: 'array', element: parseType(arrayMatch[1]) };
  }

  // Record type: record<table>
  const recordMatch = /^record<(\w+)>$/.exec(unwrapped);
  if (recordMatch) {
    return { kind: 'record', table: recordMatch[1] };
  }

  // Object type
  if (unwrapped === 'object') return { kind: 'object' };

  // Unknown/any
  return { kind: 'any' };
}
```

**Pros**:
- ✅ Works offline (no database connection needed)
- ✅ Fast (simple string parsing)
- ✅ Can generate before deploying schema

**Cons**:
- ❌ Complex parsing logic (multi-line ASSERT clauses, etc.)
- ❌ Fragile (breaks if SurrealQL syntax changes)
- ❌ Doesn't handle computed fields or complex logic

---

### Approach 2: Introspect from Running Database

**Concept**: Use `INFO FOR TABLE ... STRUCTURE` to get schema metadata from SurrealDB.

```typescript
interface SchemaIntrospector {
  /**
   * Introspect schema from running SurrealDB instance
   */
  introspect(db: Surreal, tables: string[]): Promise<TableSchema[]>;
}

async function introspectSchema(
  db: Surreal,
  tables: string[]
): Promise<TableSchema[]> {
  const schemas: TableSchema[] = [];

  for (const table of tables) {
    const [result] = await db.query(`INFO FOR TABLE ${table} STRUCTURE`);

    const schema: TableSchema = {
      name: table,
      schemafull: true, // Can check from result
      fields: []
    };

    // Parse field definitions
    for (const [fieldName, fieldInfo] of Object.entries(result.fields || {})) {
      const field: FieldSchema = {
        name: fieldName,
        type: parseSurrealType(fieldInfo.type),
        optional: fieldInfo.type?.startsWith('option<'),
        default: fieldInfo.value, // VALUE clause
        assertions: parseAssertions(fieldInfo.assert) // ASSERT clause
      };

      schema.fields.push(field);
    }

    schemas.push(schema);
  }

  return schemas;
}

function parseAssertions(assertClause?: string): Assertion[] {
  if (!assertClause) return [];

  const assertions: Assertion[] = [];

  // string::is::email($value)
  if (assertClause.includes('string::is::email')) {
    assertions.push({ type: 'email', raw: assertClause });
  }

  // string::is::url($value)
  if (assertClause.includes('string::is::url')) {
    assertions.push({ type: 'url', raw: assertClause });
  }

  // $value >= N
  const minMatch = /\$value\s*>=\s*(\d+)/.exec(assertClause);
  if (minMatch) {
    assertions.push({ type: 'min', value: Number(minMatch[1]), raw: assertClause });
  }

  // $value <= N
  const maxMatch = /\$value\s*<=\s*(\d+)/.exec(assertClause);
  if (maxMatch) {
    assertions.push({ type: 'max', value: Number(maxMatch[1]), raw: assertClause });
  }

  // $value IN [...]
  const enumMatch = /\$value\s+IN\s+\[([^\]]+)\]/.exec(assertClause);
  if (enumMatch) {
    const values = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
    assertions.push({ type: 'enum', value: values, raw: assertClause });
  }

  return assertions;
}
```

**Pros**:
- ✅ Always accurate (reflects actual database schema)
- ✅ Handles all SurrealDB features (computed fields, etc.)
- ✅ Simpler than parsing (SurrealDB does the work)

**Cons**:
- ❌ Requires running database instance
- ❌ Requires admin privileges (INFO FOR TABLE)
- ❌ Can't generate before deploying schema

---

### Approach 3: Hybrid (Recommended)

**Concept**: Parse `.surql` for development, introspect for production validation.

```typescript
/**
 * Generate Zod schemas from SurrealDB schema
 */
async function generateZodSchemas(options: {
  /**
   * Parse .surql file (development mode)
   */
  surqlFile?: string;

  /**
   * Introspect from database (production validation)
   */
  database?: {
    db: Surreal;
    tables: string[];
  };

  /**
   * Output file path
   */
  output: string;
}): Promise<void> {
  let schemas: TableSchema[];

  if (options.surqlFile) {
    // Development: Parse .surql file
    const surqlContent = await readFile(options.surqlFile, 'utf-8');
    schemas = parseSurql(surqlContent);
  } else if (options.database) {
    // Production: Introspect from database
    schemas = await introspectSchema(options.database.db, options.database.tables);
  } else {
    throw new Error('Must provide either surqlFile or database');
  }

  // Generate Zod schemas
  const zodCode = generateZodCode(schemas);

  // Write to file
  await writeFile(options.output, zodCode);
}
```

---

## Implementation: Zod Code Generation

### Generator

```typescript
function generateZodCode(schemas: TableSchema[]): string {
  const lines: string[] = [];

  // Header
  lines.push('// ⚠️ AUTO-GENERATED - DO NOT EDIT');
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push("import { z } from 'zod';");
  lines.push('');

  // Generate schema for each table
  for (const table of schemas) {
    lines.push(`// ${table.name} table`);
    lines.push(`export const ${capitalize(table.name)}Schema = z.object({`);

    for (const field of table.fields) {
      const zodType = generateZodType(field);
      lines.push(`  ${field.name}: ${zodType},`);
    }

    lines.push('});');
    lines.push('');

    // Generate TypeScript type
    lines.push(`export type ${capitalize(table.name)} = z.infer<typeof ${capitalize(table.name)}Schema>;`);
    lines.push('');
  }

  // Export all schemas
  lines.push('export const Schemas = {');
  for (const table of schemas) {
    lines.push(`  ${table.name}: ${capitalize(table.name)}Schema,`);
  }
  lines.push('};');

  return lines.join('\n');
}

function generateZodType(field: FieldSchema): string {
  let zodType = '';

  // Base type
  switch (field.type.kind) {
    case 'string':
      zodType = 'z.string()';
      break;
    case 'int':
      zodType = 'z.number().int()';
      break;
    case 'float':
    case 'decimal':
    case 'number':
      zodType = 'z.number()';
      break;
    case 'bool':
      zodType = 'z.boolean()';
      break;
    case 'datetime':
      zodType = 'z.string().datetime()';
      break;
    case 'array':
      const elementType = generateZodType({ ...field, type: field.type.element! });
      zodType = `z.array(${elementType})`;
      break;
    case 'object':
      zodType = 'z.record(z.unknown())';
      break;
    case 'record':
      // Record ID as string
      zodType = 'z.string()';
      break;
    case 'uuid':
      zodType = 'z.string().uuid()';
      break;
    default:
      zodType = 'z.unknown()';
  }

  // Apply assertions
  for (const assertion of field.assertions) {
    switch (assertion.type) {
      case 'email':
        zodType += '.email()';
        break;
      case 'url':
        zodType += '.url()';
        break;
      case 'uuid':
        zodType += '.uuid()';
        break;
      case 'min':
        zodType += `.min(${assertion.value})`;
        break;
      case 'max':
        zodType += `.max(${assertion.value})`;
        break;
      case 'enum':
        // Replace base type with enum
        zodType = `z.enum([${assertion.value.map((v: string) => `'${v}'`).join(', ')}])`;
        break;
      case 'custom':
        // Add as comment
        zodType += ` /* ASSERT: ${assertion.raw} */`;
        break;
    }
  }

  // Apply default value
  if (field.default) {
    // Parse default value
    if (field.default === 'time::now()') {
      zodType += `.default(() => new Date().toISOString())`;
    } else if (field.default.startsWith("'") || field.default.startsWith('"')) {
      // String literal
      const value = field.default.slice(1, -1);
      zodType += `.default('${value}')`;
    } else if (!isNaN(Number(field.default))) {
      // Number literal
      zodType += `.default(${field.default})`;
    } else {
      // Complex expression - add as comment
      zodType += ` /* DEFAULT: ${field.default} */`;
    }
  }

  // Apply optional
  if (field.optional) {
    zodType += '.optional()';
  }

  return zodType;
}
```

---

## Example: Generated Output

### Input: surrealdb-schema.surql

```sql
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD email ON user TYPE string
  ASSERT string::is::email($value);
DEFINE FIELD age ON user TYPE int
  ASSERT $value >= 18 AND $value <= 120;
DEFINE FIELD role ON user TYPE string
  VALUE $value OR 'user';
DEFINE FIELD avatar ON user TYPE option<string>;
DEFINE FIELD createdAt ON user TYPE datetime
  VALUE $value OR time::now();

DEFINE TABLE post SCHEMAFULL;
DEFINE FIELD title ON post TYPE string
  ASSERT string::len($value) >= 3 AND string::len($value) <= 200;
DEFINE FIELD content ON post TYPE string;
DEFINE FIELD likes ON post TYPE int
  VALUE $value OR 0;
DEFINE FIELD tags ON post TYPE array<string>;
DEFINE FIELD authorId ON post TYPE record<user>;
DEFINE FIELD createdAt ON post TYPE datetime
  VALUE $value OR time::now();
```

### Output: schemas.generated.ts

```typescript
// ⚠️ AUTO-GENERATED - DO NOT EDIT
// Source: surrealdb-schema.surql
// Generated: 2025-10-06T14:23:45Z

import { z } from 'zod';

// user table
export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.string().default('user'),
  avatar: z.string().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type User = z.infer<typeof UserSchema>;

// post table
export const PostSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string(),
  likes: z.number().int().default(0),
  tags: z.array(z.string()),
  authorId: z.string(), // record<user>
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type Post = z.infer<typeof PostSchema>;

export const Schemas = {
  user: UserSchema,
  post: PostSchema,
};
```

---

## CLI Tool: surql-to-zod

### Usage

```bash
# Generate from .surql file
bunx surql-to-zod \
  --input surrealdb-schema.surql \
  --output src/schemas.generated.ts

# Generate from running database
bunx surql-to-zod \
  --url ws://localhost:8000/rpc \
  --namespace app \
  --database main \
  --auth root:root \
  --tables user,post,comment \
  --output src/schemas.generated.ts

# Watch mode (regenerate on .surql changes)
bunx surql-to-zod \
  --input surrealdb-schema.surql \
  --output src/schemas.generated.ts \
  --watch
```

### Integration with dotted-json

```typescript
// Import auto-generated schemas
import { Schemas, User, Post } from './schemas.generated';

// Use with SurrealDBLoader
const loader = new SurrealDBLoader({
  url, namespace, database,
  schemas: Schemas // ← Auto-generated!
});

// Type-safe loading
const user: User = await loader.load('user', { userId: 'user:123' });
user.email; // Type: string
user.age;   // Type: number

// Type-safe saving (validated by Zod)
await loader.save('user', {
  name: 'Alice',
  email: 'alice@example.com',
  age: 25,
  role: 'admin'
}); // ✅ Valid

await loader.save('user', {
  name: 'Bob',
  email: 'invalid-email', // ❌ Zod validation error!
  age: 15 // ❌ Zod validation error (min 18)!
});
```

---

## Benefits

### 1. Single Source of Truth

**Before** (manual):
- Define schema in SurrealDB `.surql`
- Manually write matching Zod schema
- Manually write TypeScript types
- ❌ 3 places to update, can drift

**After** (auto-generated):
- Define schema in SurrealDB `.surql` only
- Auto-generate Zod schema
- Auto-infer TypeScript types
- ✅ 1 place to update, cannot drift

### 2. Zero Maintenance Overhead

Schema changes:
```sql
-- Add new field to user table
DEFINE FIELD phone ON user TYPE option<string>
  ASSERT string::is::phone($value);
```

Re-generate:
```bash
bunx surql-to-zod --input schema.surql --output schemas.ts
```

Done! Zod schema and TypeScript types automatically updated.

### 3. Consistency Guaranteed

Generated Zod schema **exactly matches** database schema:
- Same field types
- Same constraints (ASSERT)
- Same defaults (VALUE)
- Same optionality (option<T>)

### 4. Better DX

```typescript
// Import everything from one place
import { Schemas, User, Post, Comment } from './schemas.generated';

// Use everywhere
const loader = new SurrealDBLoader({ schemas: Schemas });
const user: User = await loader.load('user');
const post: Post = await loader.load('post');
```

---

## Implementation Checklist

### v0.7.0 - Zod Schema Generation (CLI Tool)

- [ ] Create `surql-to-zod` package
  - [ ] SurrealQL parser (parse DEFINE statements)
  - [ ] Type mapper (SurrealDB → Zod)
  - [ ] Assertion parser (ASSERT → Zod methods)
  - [ ] Default value handler (VALUE → Zod defaults)
  - [ ] Code generator (generate .ts file)

- [ ] CLI tool
  - [ ] `--input` flag (parse .surql file)
  - [ ] `--url` flag (introspect from database)
  - [ ] `--output` flag (output file path)
  - [ ] `--watch` flag (watch mode)
  - [ ] `--tables` flag (filter tables)

- [ ] Write comprehensive tests
  - [ ] Parse all SurrealDB types
  - [ ] Parse ASSERT clauses
  - [ ] Parse VALUE clauses
  - [ ] Parse option<T> (optional fields)
  - [ ] Parse array<T> (typed arrays)
  - [ ] Parse record<table> (record IDs)
  - [ ] Generate valid Zod code

- [ ] Document usage
  - [ ] Installation guide
  - [ ] CLI reference
  - [ ] Integration examples
  - [ ] Watch mode workflow

---

## Advanced Features (Future)

### 1. Custom Type Mappings

```typescript
// surql-to-zod.config.ts
export default {
  typeMap: {
    // Custom mapping for decimal → Decimal class
    decimal: 'Decimal',
    // Custom mapping for datetime → Date object
    datetime: 'z.coerce.date()'
  }
};
```

### 2. Function Schema Generation

Generate Zod schemas for function parameters/returns:

```sql
DEFINE FUNCTION fn::createUser($name: string, $email: string, $age: int) {
  -- ...
};
```

→ Generated:
```typescript
export const CreateUserParamsSchema = z.object({
  name: z.string(),
  email: z.string(),
  age: z.number().int()
});
```

### 3. Schema Versioning

Track schema changes over time:
```bash
bunx surql-to-zod --input schema.surql --output schemas.v2.ts --version 2
```

### 4. Migration Generation

Generate Zod schema migrations:
```typescript
// Compare schemas.v1.ts and schemas.v2.ts
// Generate migration code
```

---

## Success Metrics

- [ ] Parse 100% of SurrealDB type definitions
- [ ] Support all common ASSERT patterns
- [ ] Generate valid Zod code (passes type-check)
- [ ] < 1 second to parse and generate schemas
- [ ] Watch mode with < 100ms regeneration
- [ ] Production example: Full app using auto-generated schemas

---

**Document Status**: ✅ Complete (pending review)
**Last Updated**: 2025-10-06
**Next Steps**: Implement parser, CLI tool, test with real schemas
