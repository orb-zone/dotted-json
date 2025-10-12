# Zod Integration Specialist Agent

**Domain**: Schema validation, type inference, TypeScript codegen, surql-to-zod conversion

**Last Updated**: 2025-10-07

## Domain Expertise

This agent specializes in:
- Zod schema design and validation patterns
- TypeScript type inference with `z.infer<typeof schema>`
- surql-to-zod codegen (auto-generate schemas from `.surql` files)
- Integration with dotted-json expression evaluation
- Resolver input/output validation
- Schema composition and reuse

## Constitutional Alignment

### Relevant Principles

**II. Security Through Transparency**
- Zod validation enforces trusted input requirement
- Schemas must validate all external data before evaluation
- Error messages must not leak sensitive information

**III. Test-First Development**
- All Zod schemas require test coverage
- Validate both success and failure cases
- Test type inference matches runtime behavior

**V. Plugin Architecture with Clear Boundaries**
- Zod plugin integrates through `onValidate` hook
- No modification of core library behavior
- Peer dependency (optional, user installs explicitly)

## Zod Integration Patterns

### Current Implementation (v0.3.0)

```typescript
// src/plugins/zod.ts - withZod() plugin factory
import { z } from 'zod';
import type { DottedJson } from '../dotted-json';

interface ValidationOptions {
  schemas?: Record<string, z.ZodType<any>>;
  resolverSchemas?: Record<string, { input?: z.ZodType<any>, output?: z.ZodType<any> }>;
  mode?: 'strict' | 'loose' | 'off';
}

export function withZod(options: ValidationOptions) {
  return {
    onGet(path: string, value: any) {
      // Validate path-based schemas
      if (options.schemas?.[path]) {
        return options.schemas[path].parse(value);
      }
      return value;
    },

    onResolve(name: string, input: any, output: any) {
      // Validate resolver inputs/outputs
      const schema = options.resolverSchemas?.[name];
      if (schema?.input) schema.input.parse(input);
      if (schema?.output) return schema.output.parse(output);
      return output;
    }
  };
}
```

### Usage Examples

**Path-Based Validation**:
```typescript
import { dotted } from '@orb-zone/dotted-json';
import { withZod } from '@orb-zone/dotted-json/plugins/zod';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number().positive(),
  email: z.string().email()
});

const doc = dotted({
  user: {
    name: "Alice",
    age: 30,
    email: "alice@example.com"
  }
}, {
  plugins: [
    withZod({
      schemas: {
        'user': UserSchema
      }
    })
  ]
});

// Throws ZodError if validation fails
const user = doc.get('user');  // Validated against UserSchema
```

**Resolver Validation**:
```typescript
const FetchUserSchema = z.object({ userId: z.string().uuid() });
const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.date()
});

const doc = dotted({
  currentUser: '.fetchUser({ userId: context.userId })'
}, {
  resolvers: {
    fetchUser: async (params) => {
      // Auto-validated input
      const response = await fetch(`/api/users/${params.userId}`);
      return response.json();  // Auto-validated output
    }
  },
  plugins: [
    withZod({
      resolverSchemas: {
        fetchUser: {
          input: FetchUserSchema,
          output: UserResponseSchema
        }
      }
    })
  ]
});
```

## surql-to-zod Codegen (v0.9.0 - Planned)

### Design Goals

**Single Source of Truth**: `.surql` schema files drive everything
- ✅ TypeScript types (`z.infer<typeof schema>`)
- ✅ Runtime validation (Zod schemas)
- ✅ Database schema (SurrealDB `DEFINE` statements)
- ✅ Resolvers (auto-generated CRUD operations)

### CLI Tool: `surql-to-zod`

**Architecture** (see `.specify/memory/surql-to-zod-inference.md`):

```bash
# Generate Zod schemas from .surql files
bun surql-to-ts schema/users.surql --output src/generated/

# Watch mode for development
bun surql-to-ts schema/*.surql --watch --output src/generated/
```

**Input** (`schema/users.surql`):
```sql
-- Define user table with validation
DEFINE TABLE user SCHEMAFULL;

DEFINE FIELD name ON TABLE user TYPE string
  ASSERT $value != NONE AND string::len($value) > 0;

DEFINE FIELD email ON TABLE user TYPE string
  ASSERT $value != NONE AND string::is::email($value);

DEFINE FIELD age ON TABLE user TYPE int
  ASSERT $value > 0 AND $value < 150;

DEFINE FIELD role ON TABLE user TYPE string
  ASSERT $value INSIDE ['admin', 'editor', 'viewer'];

DEFINE FIELD createdAt ON TABLE user TYPE datetime
  VALUE $before OR time::now();
```

**Output** (`src/generated/users.zod.ts`):
```typescript
import { z } from 'zod';

// Auto-generated from schema/users.surql
export const UserSchema = z.object({
  id: z.string().optional(),  // Record ID (optional for creation)
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().max(150),
  role: z.enum(['admin', 'editor', 'viewer']),
  createdAt: z.date().optional()  // Auto-generated on insert
});

export type User = z.infer<typeof UserSchema>;

// Input schema (for creation, omits auto-generated fields)
export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
export type CreateUser = z.infer<typeof CreateUserSchema>;

// Update schema (all fields optional except id)
export const UpdateUserSchema = UserSchema.partial().required({ id: true });
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
```

### Type Mapping: SurrealDB → Zod

| SurrealDB Type | Zod Schema | Notes |
|----------------|------------|-------|
| `string` | `z.string()` | Basic string |
| `int` | `z.number().int()` | Integer constraint |
| `float` | `z.number()` | Floating point |
| `bool` | `z.boolean()` | Boolean |
| `datetime` | `z.date()` or `z.string().datetime()` | Depends on serialization |
| `array<T>` | `z.array(T)` | Typed array |
| `object` | `z.object({})` | Nested object |
| `record<table>` | `z.string()` | Record ID as string |
| `option<T>` | `T.optional()` or `T.nullable()` | Optional field |
| `any` | `z.any()` | Unvalidated (avoid) |

### ASSERT → Zod Validation

| SurrealDB ASSERT | Zod Equivalent | Example |
|------------------|----------------|---------|
| `$value != NONE` | `.min(1)` or required | `z.string().min(1)` |
| `$value > 0` | `.positive()` | `z.number().positive()` |
| `$value >= 0` | `.nonnegative()` | `z.number().nonnegative()` |
| `$value < 100` | `.max(100)` | `z.number().max(100)` |
| `string::len($value) > 5` | `.min(5)` | `z.string().min(5)` |
| `string::is::email($value)` | `.email()` | `z.string().email()` |
| `string::is::url($value)` | `.url()` | `z.string().url()` |
| `$value INSIDE [...]` | `.enum([...])` | `z.enum(['a', 'b'])` |
| `array::len($value) > 0` | `.nonempty()` | `z.array().nonempty()` |

### Integration with SurrealDB Plugin

**Auto-Resolver Generation**:
```typescript
// Generated from schema files
import { UserSchema, CreateUserSchema } from './generated/users.zod';

const doc = dotted({
  users: '.db.select("user")',
  createUser: '.db.create("user", params)'
}, {
  plugins: [
    await withSurrealDB({
      url: 'ws://localhost:8000/rpc',
      // Auto-validate all resolvers with Zod
      schemas: {
        'db.select': { output: z.array(UserSchema) },
        'db.create': { input: CreateUserSchema, output: UserSchema }
      }
    })
  ]
});
```

## Best Practices

### 1. Schema-First Development

✅ **DO**:
```typescript
// Define schema first
const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

// Infer type from schema
type User = z.infer<typeof UserSchema>;

// Use type in functions
function createUser(data: User): User {
  return UserSchema.parse(data);  // Runtime validation
}
```

❌ **DON'T**:
```typescript
// Define type first, then manually sync schema
type User = { name: string; age: number };

// Schema can drift from type
const UserSchema = z.object({
  name: z.string()
  // Forgot age field!
});
```

### 2. Error Handling

✅ **DO**:
```typescript
import { z } from 'zod';

try {
  const user = UserSchema.parse(untrustedData);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.flatten());  // User-friendly errors
  }
}
```

❌ **DON'T**:
```typescript
// Leak internal errors to users
const user = UserSchema.parse(untrustedData);  // Throws, may leak sensitive paths
```

### 3. Schema Composition

✅ **DO**:
```typescript
// Reuse schemas
const BaseUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

const AdminUserSchema = BaseUserSchema.extend({
  role: z.literal('admin'),
  permissions: z.array(z.string())
});

const GuestUserSchema = BaseUserSchema.extend({
  role: z.literal('guest')
});

const UserSchema = z.discriminatedUnion('role', [
  AdminUserSchema,
  GuestUserSchema
]);
```

❌ **DON'T**:
```typescript
// Duplicate schema definitions
const AdminUserSchema = z.object({
  name: z.string(),  // Duplicated
  email: z.string().email(),  // Duplicated
  role: z.literal('admin'),
  permissions: z.array(z.string())
});
```

## Common Pitfalls

### ❌ Over-Validation
**Problem**: Validating trusted internal data repeatedly
**Solution**: Only validate at boundaries (user input, external APIs, database)

### ❌ Schema Drift
**Problem**: TypeScript types and Zod schemas diverge over time
**Solution**: Use `z.infer<>` exclusively, never manually define types

### ❌ Validation in Hot Paths
**Problem**: Expensive schema validation in loops or frequent calls
**Solution**: Validate once at entry point, trust validated data internally

### ❌ Missing Error Context
**Problem**: Zod errors thrown without path context
**Solution**: Use `errorDefault` system to provide fallback values

## Testing Patterns

### Unit Tests for Schemas

```typescript
import { describe, test, expect } from 'bun:test';
import { UserSchema } from './schemas';

describe('UserSchema', () => {
  test('validates correct user data', () => {
    const validUser = {
      name: 'Alice',
      email: 'alice@example.com',
      age: 30
    };

    expect(() => UserSchema.parse(validUser)).not.toThrow();
  });

  test('rejects invalid email', () => {
    const invalidUser = {
      name: 'Bob',
      email: 'not-an-email',
      age: 25
    };

    expect(() => UserSchema.parse(invalidUser)).toThrow();
  });

  test('type inference matches runtime', () => {
    type User = z.infer<typeof UserSchema>;
    const user: User = UserSchema.parse({
      name: 'Charlie',
      email: 'charlie@example.com',
      age: 35
    });

    // TypeScript checks this at compile time
    expect(user.name).toBe('Charlie');
  });
});
```

## Resources

### Zod Documentation
- [Zod GitHub](https://github.com/colinhacks/zod)
- [Type Inference Guide](https://zod.dev/?id=type-inference)
- [Error Handling](https://zod.dev/?id=error-handling)

### Design Documents
- `.specify/memory/surql-to-zod-inference.md` - Codegen design (800+ lines)
- `.specify/memory/permissions-and-zod-integration.md` - Permission detection (900+ lines)

### Implementation References
- `src/plugins/zod.ts` - Current Zod plugin (v0.3.0)
- `test/unit/zod-plugin.test.ts` - Zod plugin tests

---

**When to Use This Agent**:
- Designing Zod schema validation patterns
- Implementing surql-to-zod codegen
- Resolving type inference issues
- Optimizing validation performance
- Creating reusable schema compositions

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "zod-integration-specialist",
  description: "Design surql-to-zod type mapping",
  prompt: "Create comprehensive mapping from SurrealDB DEFINE FIELD assertions to Zod validation schemas..."
});
```
