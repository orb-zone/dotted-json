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

### 30-Second Example

```typescript
import { dotted } from '@orbzone/dotted-json';

const data = dotted({
  user: {
    name: 'Alice',
    '.greeting': 'Hello, ${user.name}!'  // Expression evaluated on access
  }
});

await data.get('user.greeting');  // "Hello, Alice!"
```

### Common Use Cases

#### 🌍 Internationalization (i18n)

```typescript
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });
await loader.init();

// Loads best match: strings:es:formal.jsön
const strings = await loader.load('strings', {
  lang: 'es',
  form: 'formal'
});

console.log(strings.welcome);  // "¡Bienvenido!"
```

#### 🚩 Feature Flags

```typescript
import { withSurrealDBPinia } from '@orbzone/dotted-json/plugins/surrealdb-pinia';

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
  // Show new feature
}
```

#### 🗄️ Database Queries

```typescript
import { withSurrealDB } from '@orbzone/dotted-json/plugins/surrealdb';

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

const profile = await data.get('user.profile');
const posts = await data.get('user.posts');
```

#### ⚙️ Configuration Management

```typescript
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './config' });
await loader.init();

// Loads: config:prod.jsön (or config:dev.jsön in development)
const config = await loader.load('config', {
  env: process.env.NODE_ENV || 'development'
});

console.log(config.apiUrl);   // "https://api.example.com"
console.log(config.timeout);  // 5000
```

### Full Example

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
  variants?: VariantContext;           // Variant context for i18n/localization (v0.2.0+)
  maxEvaluationDepth?: number;         // Maximum expression depth (default: 100)
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

## Variant System

**New in v0.2.0**: Flexible variant support for localization, gender-aware text, and multi-dimensional content adaptation.

### Language Variants

Support multiple languages with automatic resolution:

```typescript
const data = dotted(
  {
    '.title': 'Author',
    '.title:es': 'Autor',
    '.title:es:f': 'Autora',
    '.title:fr': 'Auteur',
    '.title:fr:f': 'Auteure'
  },
  {
    variants: { lang: 'es', gender: 'f' }
  }
);

await data.get('.title'); // → 'Autora'
```

### Gender-Aware Pronouns

Use pronoun placeholders that auto-resolve based on gender context:

```typescript
const data = dotted(
  {
    name: 'Alice',
    '.bio': '${name} is a developer. ${:subject} loves coding and ${:possessive} work is excellent.'
  },
  {
    variants: { gender: 'f' }
  }
);

await data.get('.bio');
// → 'Alice is a developer. she loves coding and her work is excellent.'
```

**Supported pronouns**:
- `${:subject}` → he/she/they
- `${:object}` → him/her/them
- `${:possessive}` → his/her/their
- `${:reflexive}` → himself/herself/themselves

### Multi-Dimensional Variants

Combine multiple variant dimensions for rich content adaptation:

```typescript
const data = dotted(
  {
    '.greeting': 'Hello',
    '.greeting:es': 'Hola',
    '.greeting:es:formal': 'Buenos días',
    '.greeting:es:casual': '¿Qué tal?',
    '.greeting:es:surfer': '¡Buenas olas!'
  },
  {
    variants: { lang: 'es', tone: 'surfer' }
  }
);

await data.get('.greeting'); // → '¡Buenas olas!'
```

### Order-Independent Syntax

Variant order doesn't matter - type inference handles matching:

```typescript
'.bio:es:f' === '.bio:f:es' // Both resolve the same way
```

### Custom Variant Dimensions

Define unlimited custom dimensions for your use case:

```typescript
const data = dotted(
  {
    '.error': 'An error occurred',
    '.error:aws': 'AWS service unavailable',
    '.error:gcp': 'GCP service timeout',
    '.error:azure': 'Azure service error'
  },
  {
    variants: { service: 'aws' }
  }
);
```

### Formality/Honorific Levels

Use the `form` variant for languages with grammatical register (Japanese keigo, Korean jondaemal, German Sie/du, etc.):

```typescript
// Japanese formality levels
const greetings = dotted(
  {
    '.greeting': 'Hello',
    '.greeting:ja': 'こんにちは',           // Casual
    '.greeting:ja:polite': 'おはようございます',    // Polite (teineigo)
    '.greeting:ja:honorific': 'いらっしゃいませ'    // Honorific (keigo)
  },
  {
    variants: { lang: 'ja', form: 'honorific' }
  }
);

await greetings.get('.greeting'); // → 'いらっしゃいませ'
```

**Standard form levels**: `casual`, `informal`, `neutral`, `polite`, `formal`, `honorific`

**More examples**:
```typescript
// Korean (jondaemal)
{ lang: 'ko', form: 'formal' }
'.question:ko:formal' // '어떻게 지내세요?'

// German (Sie vs du)
{ lang: 'de', form: 'formal' }
'.you:de:formal' // 'Sie'
```

### Variant Priority

When multiple variants exist, resolution follows priority scoring:
- **Language**: 1000 points (highest)
- **Gender**: 100 points
- **Form** (formality): 50 points
- **Custom dimensions**: 10 points each

Best matching variant wins. Falls back to base path if no variants match.

### Variant Options

```typescript
interface VariantContext {
  lang?: string;              // ISO 639-1 (e.g., 'en', 'es-MX', 'fr-CA')
  gender?: 'm' | 'f' | 'x';  // Gender for pronouns
  form?: string;              // Formality level (e.g., 'casual', 'polite', 'formal', 'honorific')
  [dimension: string]: string | undefined;  // Unlimited custom dimensions
}

interface DottedOptions {
  variants?: VariantContext;
  // ... other options
}
```

**Well-known variants** (higher priority in matching):
- `lang`: Language/locale codes
- `gender`: Pronoun gender (`m`/`f`/`x`)
- `form`: Formality/honorific level

**Custom variants** (lower priority): Any string dimension you define

## File Loader

Load external JSON files with automatic variant resolution for i18n workflows.

### Installation

The file loader is available as a separate import to keep the core bundle small:

```typescript
import { FileLoader, withFileSystem } from '@orbzone/dotted-json/loaders/file';
```

### Basic Usage

```typescript
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({
  baseDir: './i18n',
  allowedVariants: {
    lang: ['en', 'es', 'ja'],
    form: ['casual', 'polite', 'formal']
  },
  preload: true,  // Pre-scan directory for performance
  cache: true     // Cache loaded files
});

await loader.init();

// Load variant-specific files
const enStrings = await loader.load('strings');  // → strings.jsön
const esStrings = await loader.load('strings', { lang: 'es' });  // → strings:es.jsön
const jaPolite = await loader.load('strings', { lang: 'ja', form: 'polite' });  // → strings:ja:polite.jsön
```

### File Naming Convention

Files use colon-separated variant suffixes:

```
i18n/
  strings.jsön                  # Base (English)
  strings:es.jsön              # Spanish
  strings:es:formal.jsön       # Spanish formal
  strings:ja.jsön              # Japanese
  strings:ja:polite.jsön       # Japanese polite (keigo)
  profile:f.jsön               # Female profile
  profile:m.jsön               # Male profile
```

### Integration with dotted()

Use `withFileSystem()` to integrate with the resolver system:

```typescript
import { dotted } from '@orbzone/dotted-json';
import { withFileSystem } from '@orbzone/dotted-json/loaders/file';

const app = dotted(
  {
    '.strings': 'extends("app-strings")',
    '.greeting': '${strings.welcome}'
  },
  {
    variants: { lang: 'es', form: 'formal' },
    ...withFileSystem({
      baseDir: './i18n',
      allowedVariants: {
        lang: ['en', 'es', 'fr'],
        form: ['casual', 'polite', 'formal']
      }
    })
  }
);

// Automatically loads strings:es:formal.jsön
console.log(app.greeting);
```

### Variant Resolution

The file loader uses the same scoring system as variant properties:

1. **Exact match wins**: `strings:es:formal.jsön` when requesting `{ lang: 'es', form: 'formal' }`
2. **Tiebreaker**: When scores equal, prefer fewer extra variants
   - Request: `{ lang: 'es' }` → Chooses `strings:es.jsön` over `strings:es:formal.jsön`
3. **Fallback**: When no match, uses base file

### Security

**Whitelist mode** (recommended):
```typescript
allowedVariants: {
  lang: ['en', 'es', 'fr'],  // Only these values allowed
  form: ['polite', 'formal']
}
```

**Permissive mode**:
```typescript
allowedVariants: true  // Any variant (sanitized with regex)
```

**Strict mode**:
```typescript
allowedVariants: undefined  // No variants allowed (base files only)
```

Invalid variants are silently filtered out and fall back to base files.

### Performance

- **Pre-scanning**: O(n) directory scan once vs O(variants × extensions) per load
- **Caching**: Loaded files cached by `baseName + sorted variants`
- **Order-independent**: `strings:es:f.jsön` === `strings:f:es.jsön` (same cache key)

### Example

See [examples/file-loader-i18n.ts](examples/file-loader-i18n.ts) for a complete working example.

## Translation CLI

Generate translated variant files using local Ollama LLM (privacy-friendly, no external APIs).

### Installation

Install globally to get the `json-translate` command:

```bash
bun install -g @orbzone/dotted-json
# or
npm install -g @orbzone/dotted-json
```

Or use directly from the repo:

```bash
bun tools/translate/index.ts <file> --to <lang>
```

### Requirements

- **Ollama** must be running: `ollama serve`
- **Model** must be downloaded: `ollama pull llama3.3`

### Usage

```bash
# Check Ollama status
json-translate --check

# Translate to Spanish
json-translate strings.jsön --to es

# Translate to Japanese with polite formality (keigo)
json-translate strings.jsön --to ja --form polite

# Translate to Spanish formal
json-translate strings:es.jsön --to es --form formal

# Use specific model
json-translate strings.jsön --to fr --model mistral
```

### Options

```
-t, --to <lang>        Target language (required)
                       Examples: es, ja, fr, de, ko

-f, --form <level>     Formality level (optional)
                       Levels: casual, informal, neutral, polite, formal, honorific

-m, --model <name>     Ollama model to use (default: llama3.2)
                       Examples: llama3.3, mistral, gemma2

-o, --output <dir>     Output directory (default: same as source)

--check                Check Ollama status and exit

-h, --help             Show help message
```

### Environment Variables

Create a `.env` file to configure defaults:

```bash
OLLAMA_BASE_URL=http://localhost:11434   # Ollama API URL
OLLAMA_MODEL=llama3.3                    # Default model
OLLAMA_TEMPERATURE=0.3                   # Creativity (0-1)
```

### Output Files

The CLI automatically generates variant files with proper naming:

```
Input                    Output (--to es)           Output (--to ja --form polite)
strings.jsön         →   strings:es.jsön           strings:ja:polite.jsön
app.jsön             →   app:es.jsön               app:ja:polite.jsön
```

### Formality Support

Language-specific formality guidance is built-in:

- **Japanese**: Casual (だ), Polite (です/ます - keigo), Formal (でございます), Honorific (尊敬語)
- **Korean**: Casual (반말), Polite (존댓말), Formal, Honorific
- **German**: Casual (du), Formal (Sie)
- **Spanish**: Casual (tú), Formal (usted)
- **French**: Casual (tu), Formal (vous)

### Example

```bash
# Original file
$ cat strings.jsön
{
  "greeting": "Hello",
  "farewell": "Goodbye",
  "welcome": "Welcome to our application"
}

# Translate to Japanese polite
$ json-translate strings.jsön --to ja --form polite

# Generated file: strings:ja:polite.jsön
{
  "greeting": "こんにちはです",
  "farewell": "さようならです",
  "welcome": "私たちのアプリケーションへようこそです"
}
```

### Privacy

All translations happen **locally** on your machine using Ollama. No data is sent to external APIs.

## License

MIT © [orb.zone](https://orb.zone)

## Documentation

- 📚 [API Reference](docs/API.md) - Complete API documentation
- 🔄 [Migration Guide](docs/MIGRATION.md) - Migrate from i18next, react-intl, LaunchDarkly, etc.
- ⚡ [Performance Guide](docs/PERFORMANCE.md) - Optimization tips and best practices
- 📝 [Examples](examples/) - Production-ready examples:
  - [Feature Flag Manager](examples/feature-flag-manager.ts)
  - [i18n Translation Editor](examples/i18n-translation-editor.ts)
  - [Real-time Config Manager](examples/realtime-config-manager.ts)

## Links

- 🐙 [GitHub Repository](https://github.com/orbzone/dotted-json)
- 🐛 [Issue Tracker](https://github.com/orbzone/dotted-json/issues)
- 📋 [Changelog](CHANGELOG.md)
- 🗺️ [Roadmap](ROADMAP.md)
- ⚖️ [Constitution](.specify/memory/constitution.md)
