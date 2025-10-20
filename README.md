# dotted-json (jsön)

> Spreadsheet formulas for JSON - dynamic data expansion with lazy evaluation and intelligent caching

[![npm version](https://img.shields.io/npm/v/@orb-zone/dotted-json.svg)](https://www.npmjs.com/package/@orb-zone/dotted-json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why dotted-json?

**The Problem**: Modern applications need dynamic data that adapts to user context (language, permissions, feature flags), but traditional approaches create messy code:


```typescript
// ❌ Traditional approach: Hard-coded, brittle, no caching
const greeting = user.lang === 'es'
  ? (user.formality === 'formal' ? 'Buenos días' : 'Hola')
  : 'Hello';

const profile = await fetchUserProfile(user.id); // No caching, manual management
```

**The Solution**: dotted-json treats JSON like a spreadsheet - define expressions once, evaluate on-demand, cache automatically:

```typescript
// ✅ dotted-json: Declarative, variant-aware, auto-cached
const data = dotted({
  '.greeting': 'Hello',
  '.greeting:es': 'Hola',
  '.greeting:es:formal': 'Buenos días',
  '.profile': 'api.getUser(${user.id})'  // Auto-cached
}, {
  variants: { lang: user.lang, form: user.formality },
  resolvers: { api }
});

await data.get('.greeting');  // Automatic variant resolution
await data.get('.profile');   // Automatic caching
```

**Core Benefits**:

- **Lazy Evaluation**: Expressions only run when accessed

- **Intelligent Caching**: Results cached automatically, invalidate on demand
- **Variant System**: Multi-dimensional content (language, gender, formality, custom dimensions)
- **Framework-Agnostic**: Works with React, Vue, Node, Deno, Bun
- **Type-Safe**: Full TypeScript support with generics
- **Secure**: Zod plugin for automatic input/output validation

## Installation

```bash

# Using bun (recommended)
bun add @orb-zone/dotted-json

# Using npm
npm install @orb-zone/dotted-json

# Using yarn
yarn add @orb-zone/dotted-json
```

## Quick Start

### 30-Second Example

```typescript

import { dotted } from '@orb-zone/dotted-json';

const data = dotted({
  user: {
    name: 'Alice',
    '.greeting': 'Hello, ${user.name}!'  // Template literal expression
  }
});

await data.get('user.greeting');  // "Hello, Alice!"
```

**[👉 Continue with the Getting Started Guide](docs/getting-started.md)**

## Real-World Use Cases

### 🌍 Internationalization (i18n)

Multi-language support with automatic variant resolution:

```typescript

import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });
await loader.init();

// Automatically loads best match: strings:es:formal.jsön
const strings = await loader.load('strings', {
  lang: 'es',
  form: 'formal'
});

console.log(strings.welcome);  // "¡Bienvenido!" (formal Spanish)
```

**File structure**:

```text
locales/
  strings.jsön              # Base (English)
  strings:es.jsön           # Spanish
  strings:es:formal.jsön    # Spanish formal
  strings:ja:polite.jsön    # Japanese polite (keigo)
```

**[📖 Learn more](docs/getting-started.md#progressive-examples)**

### 🚩 Feature Flags

Real-time feature management with database sync:

```typescript

import { withSurrealDBPinia } from '@orb-zone/dotted-json/plugins/surrealdb-pinia';

const plugin = await withSurrealDBPinia({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  ions: { 'flags': { staleTime: 60_000 } },
  live: { enabled: true, ions: ['flags'] }  // Real-time updates!
});

const data = dotted({
  '.flags': 'db.loadIon("flags", { env: "prod" })'
}, { resolvers: plugin.resolvers });

const flags = await data.get('flags');
if (flags.newFeature?.enabled) {
  // Feature automatically updates when database changes
}
```

**[📖 Feature flags guide](docs/feature-flags.md)**

### 🗄️ Database Queries

Type-safe database access with automatic caching:

```typescript

import { withSurrealDB } from '@orb-zone/dotted-json/plugins/surrealdb';

const plugin = await withSurrealDB({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  tables: ['user', 'post']
});

const data = dotted({
  user: {
    id: 'user:alice',
    '.profile': 'db.user.select(${user.id})',
    '.posts': 'db.post.select(${user.id})'
  }
}, { resolvers: plugin.resolvers });

const profile = await data.get('user.profile');  // Cached
const posts = await data.get('user.posts');      // Cached
```

**[📖 Getting started guide](docs/getting-started.md)**

### ⚙️ Configuration Management

Environment-aware config with variant support:

```typescript

import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './config' });
await loader.init();

// Loads: config:prod.jsön (or config:dev.jsön in development)
const config = await loader.load('config', {
  env: process.env.NODE_ENV || 'development'
});

console.log(config.apiUrl);   // Environment-specific
console.log(config.timeout);  // Auto-cached
```

**[📖 Examples directory](examples/)**

## Core Features

### Dot-Prefixed Expressions

Property keys starting with `.` contain expressions evaluated on access:

```typescript

const data = dotted({
  user: { id: 123, name: 'Alice' },
  '.profile': 'api.getProfile(${user.id})',        // API call
  '.posts': 'db.posts.where({ userId: ${user.id} })',  // Database query
  '.greeting': 'Hello, ${user.name}!'              // Template literal
});
```

### Variant System

Multi-dimensional content adaptation (language, gender, formality, custom):

```typescript

const data = dotted({
  '.title': 'Author',
  '.title:es': 'Autor',
  '.title:es:f': 'Autora',           // Spanish female
  '.title:ja:polite': '著者です',      // Japanese polite (keigo)
}, {
  variants: { lang: 'es', gender: 'f' }
});

await data.get('.title');  // "Autora" (auto-selected best match)
```

**Supported dimensions**: `lang`, `gender`, `form` (formality), + unlimited custom dimensions

### Automatic Caching

Results cached until explicitly invalidated:

```typescript

await data.get('user.profile');  // Evaluates expression, caches result
await data.get('user.profile');  // Returns cached value
await data.get('user.profile', { fresh: true });  // Force re-evaluation
```

## Security

### Trust Model

This library uses `new Function()` for expression evaluation. **Only use with trusted input**:

✅ **Safe**:


- Application code and config files you control
- Server-side schemas built by your backend
- Version-controlled configuration

❌ **Unsafe**:

- User-submitted JSON from forms

- External APIs you don't control
- Any untrusted third-party input

### Automatic Validation (Recommended)

Use the Zod plugin for runtime validation:

```typescript

import { withZod } from '@orb-zone/dotted-json/plugins/zod';
import { z } from 'zod';

const data = dotted(schema, {
  ...withZod({
    schemas: {
      resolvers: {
        'api.getUser': {
          input: z.tuple([z.number().positive()]),
          output: z.object({ id: z.number(), name: z.string() })
        }
      }
    }
  }),
  resolvers: {
    api: {
      getUser: async (id) => {
        // Inputs/outputs automatically validated
        return await db.query('SELECT * FROM users WHERE id = $1', [id]);
      }
    }
  }
});
```

**[📖 Security best practices](docs/getting-started.md#core-concepts)**

## API Reference

### Core Methods

```typescript

// Get value (evaluates expressions, caches results)
await data.get('user.profile.email');

// Set value (may trigger dependent re-evaluation)
await data.set('user.id', 456);

// Check existence
const exists = await data.has('user.profile');

// Force re-evaluation
await data.get('user.profile', { fresh: true });
```

### Constructor Options

```typescript

interface DottedOptions {
  initial?: object;                 // Initial data to merge
  fallback?: any;                   // Default for missing values and errors
  resolvers?: Record<string, any>;  // Function registry
  variants?: VariantContext;        // Variant context (lang, gender, form, custom)
  maxEvaluationDepth?: number;      // Max depth (default: 100)
  onError?: (error: Error, path: string) => 'throw' | 'fallback' | any;
  validation?: ValidationConfig;    // Zod validation (via plugin)
}

// Note: Old API (default, errorDefault, ignoreCache) still works via backward compatibility
```

**[📖 Complete API documentation](docs/API.md)**

## Plugins

All plugins are optional peer dependencies:

### Zod - Runtime Validation

```bash

bun add zod
```

Automatic input/output validation for resolvers

### SurrealDB - Database Integration

```bash

bun add surrealdb
```

Real-time database queries with LIVE updates

### Pinia Colada - Intelligent Caching

```bash

bun add @pinia/colada pinia vue
```

Advanced caching with stale-while-revalidate

**[📖 Plugin documentation](docs/getting-started.md#next-steps)**

## Performance

- **Bundle Size**: Core < 20 kB minified (plugins optional)

- **Lazy Evaluation**: Expressions only run when accessed
- **Intelligent Caching**: Results cached automatically
- **Memory Efficient**: Only caches accessed values

**[📖 Performance optimization guide](docs/performance.md)**

## Translation CLI

Generate translated variant files using local Ollama (privacy-friendly, no external APIs):

```bash

# Install globally
bun install -g @orb-zone/dotted-json

# Translate to Spanish
dotted-translate strings.jsön --to es

# Translate to Japanese polite (keigo)
dotted-translate strings.jsön --to ja --form polite
```

All translations happen **locally** on your machine. No data sent to external services.

**[📖 Translation CLI guide](docs/getting-started.md#translation-cli)**

## Documentation

### Getting Started

- **[📚 Getting Started Guide](docs/getting-started.md)** - Complete beginner-to-expert tutorial

- **[🔄 Migration Guide](docs/migration.md)** - Migrate from i18next, react-intl, LaunchDarkly
- **[📖 API Reference](docs/API.md)** - Complete API documentation

### Advanced Topics

- **[⚡ Performance Guide](docs/performance.md)** - Optimization tips and benchmarks

- **[🚩 Feature Flags Guide](docs/feature-flags.md)** - Production feature flag patterns
- **[💡 Examples](examples/)** - Production-ready code examples

### Project Info

- **[📋 Changelog](CHANGELOG.md)** - Version history

- **[🗺️ Roadmap](ROADMAP.md)** - Future features
- **[⚖️ Constitution](.specify/memory/constitution.md)** - Core principles
- **[🤝 Contributing](CONTRIBUTING.md)** - Development guidelines

## Examples

Production-ready examples you can copy and adapt:

- **[Feature Flag Manager](examples/feature-flag-manager.ts)** - Real-time flags with targeting

- **[i18n Translation Editor](examples/i18n-translation-editor.ts)** - Live translation management
- **[Realtime Config Manager](examples/realtime-config-manager.ts)** - Environment-aware config
- **[Complete Workflow](examples/complete-workflow.ts)** - End-to-end integration

**[📁 Browse all examples](examples/)**

## TypeScript Support

Full TypeScript support with generic schema typing:

```typescript

interface UserSchema {
  user: {
    id: number;
    name: string;
    profile?: { email: string };
  };
}

const data = dotted<UserSchema>(schema, options);
// Type-safe access with IntelliSense
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup

- Test-first development (TDD) workflow
- Code style guidelines
- Pull request process

All contributions must follow the [Project Constitution](.specify/memory/constitution.md).

## License

MIT © [orb.zone](https://orb.zone)

## Links

- **[GitHub Repository](https://github.com/orb-zone/dotted-json)**

- **[Issue Tracker](https://github.com/orb-zone/dotted-json/issues)**
- **[NPM Package](https://www.npmjs.com/package/@orb-zone/dotted-json)**
