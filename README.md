# dotted-json (jsön)

> Dynamic JSON data expansion using dot-prefixed property keys as expression triggers

[![npm version](https://img.shields.io/npm/v/@orbzone/dotted-json.svg)](https://www.npmjs.com/package/@orbzone/dotted-json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚨 Security Warning

**IMPORTANT**: This library uses dynamic expression evaluation (`new Function()`). Schemas
containing dot-prefixed expressions MUST come from **trusted sources only** (your
application code, configuration files you control). **NEVER** pass user-supplied JSON
directly to the `dotted()` constructor without sanitization.

**Trust Model**: This library assumes schemas are written by developers, not end-users.
See [Security](#security) section for details.

## Overview

`dotted-json` allows you to define JSON schemas with special dot-prefixed property keys
that contain expressions. These expressions are evaluated lazily when accessed, with
results cached for performance. Perfect for dynamic data loading, API calls, database
queries, and computed values.

## Installation

```bash
# Using bun (recommended)
bun add @orbzone/dotted-json

# Using npm
npm install @orbzone/dotted-json

# Using yarn
yarn add @orbzone/dotted-json
```

## Quick Start

```typescript
import { dotted } from '@orbzone/dotted-json';

// Define a schema with dot-prefixed expression keys
const schema = {
  user: {
    id: 123,
    name: "John",
    ".profile": "db.users.findProfile(${user.id})",
    ".posts": "api.get('/posts?userId=${user.id}&limit=${limit}')"
  },
  config: {
    ".settings": "loadUserSettings(${user.id})"
  }
};

// Create an instance with resolvers
const data = dotted(schema, {
  initial: { limit: 10 },
  resolvers: {
    db: { users: { findProfile: async (id) => ({ email: `user${id}@example.com` }) } },
    api: { get: async (url) => [{ title: "Post 1" }] },
    loadUserSettings: async (userId) => ({ theme: "dark" })
  }
});

// Access data - expressions evaluate automatically
const email = await data.get('user.profile.email'); // Triggers .profile evaluation
const posts = await data.get('user.posts');         // Triggers .posts evaluation
const theme = await data.get('config.settings.theme'); // Triggers .settings evaluation
```

## Core Concepts

### Dot-Prefixed Expression Keys

Property keys starting with `.` contain expressions that are evaluated when their paths
are accessed:

```json
{
  "user": {
    "id": 123,
    ".profile": "db.users.findById(${user.id})",
    ".computed": "calculateScore(${user.id}, ${config.multiplier})"
  }
}
```

### Template Literal Expressions

Expressions use template literal syntax with `${}` for variable interpolation:

```javascript
".userPosts": "api.get('/posts?userId=${user.id}&limit=${pagination.limit}')"
".computed": "math.multiply(${revenue}, ${config.taxRate})"
".nested": "processData(${user.profile.settings})" // Can reference other evaluated results
```

### Caching Strategy

- **Dot-prefixed keys**: Preserved for future re-evaluation
- **Plain keys**: Created/updated with cached results
- **Cache invalidation**: Use `ignoreCache` option to force re-evaluation

```javascript
// First access - evaluates expression and caches result
await data.get('user.profile.email');

// Subsequent access - returns cached result
await data.get('user.profile.email');

// Force re-evaluation
await data.get('user.profile.email', { ignoreCache: true });
```

## API Reference

### Constructor

```typescript
dotted(schema: object, options?: DottedOptions): DottedJson
```

#### Options

```typescript
interface DottedOptions {
  initial?: object;                    // Initial data to merge with schema
  default?: any;                       // Default value for missing values
  errorDefault?: any;                  // Default value for failed evaluations
  resolvers?: Record<string, any>;     // Function registry for expressions
}
```

### Instance Methods

#### `get(path: string, options?: GetOptions): Promise<any>`

Get value at path, evaluating dot-prefixed expressions as needed.

```typescript
await data.get('user.profile.email');
await data.get('user.posts.0.title');
await data.get('config.theme', { errorDefault: 'light' });
```

#### `set(path: string, value: any, options?: SetOptions): Promise<void>`

Set value at path. May trigger re-evaluation of dependent expressions.

```typescript
await data.set('user.id', 456);
await data.set('pagination.limit', 20);
```

#### `has(path: string, options?: HasOptions): Promise<boolean>`

Check if path exists, evaluating expressions as needed.

```typescript
const hasProfile = await data.has('user.profile');
const hasSettings = await data.has('config.settings.theme');
```

## Security

### Trust Model

This library uses `new Function()` for expression evaluation, which provides flexibility
but requires **trusted input**. Follow these guidelines:

✅ **Safe Usage**:
- Schemas defined in your application code
- Configuration files you control (committed to version control)
- Server-side data structures built by your backend

❌ **Unsafe Usage**:
- User-submitted JSON from web forms
- Data from external APIs you don't control
- Any untrusted third-party sources

### Resolver Safety

**Recommended: Use Zod Plugin for Automatic Validation**

```typescript
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

const data = dotted(schema, {
  ...withZod({
    schemas: {
      resolvers: {
        'db.findUser': {
          input: z.tuple([z.number().positive()]),
          output: z.object({ id: z.number(), name: z.string() })
        }
      }
    }
  }),
  resolvers: {
    db: {
      // ✅ Inputs/outputs automatically validated by Zod
      findUser: async (id) => {
        return await db.query('SELECT * FROM users WHERE id = $1', [id]);
      }
    }
  }
});
```

**Manual Validation (if not using Zod):**

```typescript
const data = dotted(schema, {
  resolvers: {
    db: {
      findUser: async (id) => {
        // ✅ Validate input
        if (typeof id !== 'number' || id <= 0) {
          throw new Error('Invalid user ID');
        }

        // ✅ Use parameterized queries (prevent SQL injection)
        return await db.query('SELECT * FROM users WHERE id = $1', [id]);
      }
    }
  }
});
```

### Error Message Safety

Use `errorDefault` to prevent leaking sensitive information in errors:

```typescript
const data = dotted(schema, {
  errorDefault: 'N/A', // Don't leak internal error details
});
```

## Plugins

All plugins are optional peer dependencies. Install only what you need:

### Zod Integration

Runtime validation with Zod schemas.

```bash
bun add zod
```

```typescript
import { dotted } from '@orbzone/dotted-json';
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

const data = dotted(schema, {
  ...withZod({
    schemas: {
      paths: {
        'user.profile': z.object({ email: z.string().email() })
      }
    },
    mode: 'strict'
  })
});
```

### Vue Integration

Vue 3 composables with reactive data.

```bash
bun add vue
```

```typescript
import { useDottedJSON } from '@orbzone/dotted-json/vue';

const { data, isLoading, error } = useDottedJSON(schema, { resolvers });
```

### React Integration

React hooks with TanStack Query.

```bash
bun add react @tanstack/react-query
```

```typescript
import { useTanstackDottedJSON } from '@orbzone/dotted-json/react';

function UserProfile({ userId }) {
  const { data, isLoading } = useTanstackDottedJSON({
    user: { id: userId, '.profile': 'api.getUser(${user.id})' }
  });
}
```

## TypeScript Support

Full TypeScript support with generic schema typing:

```typescript
interface UserSchema {
  user: {
    id: number;
    name: string;
    profile?: {
      email: string;
      settings: Record<string, any>;
    };
  };
}

const data = dotted<UserSchema>(schema, options);
// Type-safe access with IntelliSense support
```

## Performance

- **Lazy Evaluation**: Expressions only execute when their paths are accessed
- **Result Caching**: Evaluated results are cached until explicitly invalidated
- **Bundle Size**: Core library < 15 kB minified (plugins are optional)
- **Memory Efficient**: Only caches results that have been accessed

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and the project
[constitution](.specify/memory/constitution.md) for core principles.

## License

MIT © [orb.zone](https://orb.zone)

## Links

- [GitHub Repository](https://github.com/orbzone/dotted-json)
- [Issue Tracker](https://github.com/orbzone/dotted-json/issues)
- [Changelog](CHANGELOG.md)
- [Constitution](.specify/memory/constitution.md)
