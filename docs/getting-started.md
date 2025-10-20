# Getting Started with dotted-json

A practical guide to building dynamic applications with lazy evaluation, intelligent caching, and zero waterfalls.

---

## Introduction

### What is dotted-json?

**dotted-json** (JSöN) is a framework-agnostic library for building applications that need dynamic data without the complexity of REST APIs, GraphQL, or manual caching strategies. It uses special dot-prefixed keys in JSON to define expressions that evaluate lazily when accessed.

Think of it as "spreadsheet formulas for JSON" - define relationships between data once, and let the library handle evaluation, caching, and updates automatically.

### The Problem It Solves

Modern applications often struggle with:

1. **Request waterfalls** - Fetching data sequentially creates slow, inefficient loading
2. **Manual cache management** - Writing cache invalidation logic is error-prone and tedious
3. **Tight coupling** - Components depend on specific API endpoints and data shapes
4. **State synchronization** - Keeping multiple components in sync with shared data

**dotted-json solves this by**:

- **Lazy evaluation** - Data loads only when accessed, eliminating unnecessary requests
- **Automatic caching** - Results cache transparently with smart invalidation
- **Declarative dependencies** - Express data relationships in JSON, not imperative code
- **Real-time updates** - Built-in support for live data synchronization (with SurrealDB)

### Why Choose dotted-json?

**Lazy Evaluation**

```typescript
// Only evaluates when accessed - no wasted work
const data = dotted({
  user: { id: 123 },
  '.profile': 'db.users.find(${user.id})'  // Not evaluated yet
});

await data.get('profile');  // NOW it evaluates and caches
```

**Automatic Caching**

```typescript
// First call: fetches data
await data.get('user.profile');

// Second call: returns cached result
await data.get('user.profile');

// Force refresh (re-evaluates and updates cache)
await data.get('user.profile', { fresh: true });
```

**Framework-Agnostic**

```typescript
// Works everywhere: Node.js, Bun, Deno, browser
// Integrates with: React, Vue, vanilla JS
// No lock-in: use as little or as much as you need
```

**Type-Safe**

```typescript
// Full TypeScript support with schema inference
const data = dotted<UserSchema>(schema);
// Get autocomplete and type checking for all paths
```

### Core Value Propositions

1. **Zero waterfalls** - All data dependencies resolve in parallel automatically
2. **Built-in caching** - No manual cache keys, invalidation, or state management
3. **Real-time ready** - Native support for live updates via SurrealDB LIVE queries
4. **Progressive adoption** - Start simple, add features as needed
5. **Production-tested** - Powers real applications with complex data needs

---

## Your First Project

### Prerequisites

- **Node.js 18+**, **Bun 1.0+**, or **Deno 1.30+**
- Basic knowledge of TypeScript/JavaScript
- Familiarity with async/await

### Installation

```bash
# Using bun (recommended - fastest)
bun add @orb-zone/dotted-json

# Using Deno
deno add jsr:@orb-zone/dotted-json

# Using npm (via JSR)
npx jsr add @orb-zone/dotted-json

# Using pnpm (via JSR)
pnpm dlx jsr add @orb-zone/dotted-json
```

### Minimal Working Example

Let's start with the simplest possible example and build up from there.

#### Step 1: Create a dotted schema

```typescript
import { dotted } from '@orb-zone/dotted-json';

// Define data with a special dot-prefixed key
const data = dotted({
  firstName: 'Alice',
  lastName: 'Johnson',
  '.fullName': '${firstName} ${lastName}'  // Expression evaluated on access
});

// Access the evaluated value
const name = await data.get('fullName');
console.log(name);  // "Alice Johnson"
```

**What happened?**

1. `firstName` and `lastName` are regular properties (no dot prefix)
2. `.fullName` is an **expression key** (starts with `.`)
3. The expression uses template literal syntax: `${firstName}`
4. When you call `data.get('fullName')`, the expression evaluates
5. The result caches automatically for future access

#### Step 2: Add nested data

```typescript
const data = dotted({
  user: {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@example.com',
    '.fullName': '${firstName} ${lastName}',
    '.greeting': 'Hello, ${.fullName}!'  // Reference another expression
  }
});

console.log(await data.get('user.fullName'));   // "Alice Johnson"
console.log(await data.get('user.greeting'));   // "Hello, Alice Johnson!"
```

**Notice**:

- You can nest expressions inside objects
- Expressions can reference other expressions (`.fullName`)
- Access nested paths with dot notation (`user.fullName`)

#### Step 3: Add resolver functions

Expressions can call custom functions you provide:

```typescript
const data = dotted({
  user: {
    id: 123,
    '.profile': 'fetchUserProfile(${id})'  // Call a custom function
  }
}, {
  // Define resolver functions
  resolvers: {
    fetchUserProfile: async (userId: number) => {
      // Simulate API call
      return {
        id: userId,
        bio: 'Software developer',
        avatar: 'https://example.com/avatar.jpg'
      };
    }
  }
});

const profile = await data.get('user.profile');
console.log(profile.bio);  // "Software developer"
```

**Key concepts**:

- **resolvers** is a registry of functions expressions can call
- Functions can be async (great for API calls, database queries)
- Arguments are interpolated from the schema using `${...}`

#### Step 4: Reference other parts of the schema

Expressions can access any part of the schema:

```typescript
const data = dotted({
  config: {
    apiUrl: 'https://api.example.com',
    timeout: 5000
  },
  user: {
    id: 123,
    '.profile': 'api.get("${config.apiUrl}/users/${user.id}")'
  }
}, {
  resolvers: {
    api: {
      get: async (url: string) => {
        console.log(`Fetching: ${url}`);
        // Simulate API response
        return { id: 123, name: 'Alice' };
      }
    }
  }
});

await data.get('user.profile');
// Fetches: https://api.example.com/users/123
```

**Notice**:

- `${config.apiUrl}` accesses a different part of the schema
- Resolvers can be nested objects (`api.get`)
- All dependencies resolve automatically

### Understanding Dot-Prefixed Keys

**Dot-prefixed keys are expression triggers**:

```typescript
{
  "name": "Alice",              // Plain key - static value
  ".greeting": "Hello, ${name}" // Dot key - evaluates expression
}
```

**Rules**:

1. **Dot prefix** (`.`) marks a key as an expression
2. **Template syntax** (`${...}`) interpolates values from the schema
3. **Lazy evaluation** - expressions don't run until accessed
4. **Automatic caching** - results cache after first evaluation
5. **Preserved in schema** - dot keys remain for re-evaluation

**Common patterns**:

```typescript
// Simple interpolation
'.fullName': '${firstName} ${lastName}'

// Function calls
'.profile': 'db.users.find(${userId})'

// Nested expressions
'.greeting': 'Hello, ${.fullName}!'

// Complex logic
'.discount': 'calculateDiscount(${cart.total}, ${user.tier})'
```

### Basic Resolver Functions

Resolvers are the "backend" of your expressions. They handle API calls, database queries, calculations, etc.

#### Defining resolvers

```typescript
const data = dotted(schema, {
  resolvers: {
    // Simple function
    greet: (name: string) => `Hello, ${name}!`,

    // Async function (API calls)
    fetchUser: async (id: number) => {
      const res = await fetch(`/api/users/${id}`);
      return res.json();
    },

    // Nested resolvers (namespacing)
    db: {
      users: {
        find: async (id: number) => { /* ... */ },
        create: async (data: any) => { /* ... */ }
      }
    },

    // Calculations
    math: {
      multiply: (a: number, b: number) => a * b,
      percentage: (value: number, total: number) =>
        ((value / total) * 100).toFixed(2) + '%'
    }
  }
});
```

#### Using resolvers in expressions

```typescript
const data = dotted({
  user: {
    firstName: 'Alice',
    id: 123,

    // Call simple resolver
    '.greeting': 'greet(${firstName})',

    // Call nested resolver
    '.profile': 'db.users.find(${id})',

    // Call with multiple args
    '.score': 'math.percentage(${points}, ${total})'
  }
}, { resolvers });
```

**Best practices**:

- **Namespace resolvers** by domain (`db`, `api`, `math`, `helpers`)
- **Keep resolvers pure** when possible (same input → same output)
- **Handle errors gracefully** with try/catch or `errorDefault`
- **Use TypeScript** for type safety on resolver parameters

### Running Your First Evaluation

Let's put it all together in a complete example:

```typescript
import { dotted } from '@orb-zone/dotted-json';

// 1. Define your schema with expressions
const appData = dotted({
  // Static config
  config: {
    apiUrl: 'https://api.example.com',
    timeout: 5000
  },

  // User data
  user: {
    id: 123,
    firstName: 'Alice',
    lastName: 'Johnson',

    // Computed full name
    '.fullName': '${firstName} ${lastName}',

    // Fetch profile from API
    '.profile': 'api.fetchProfile(${id})',

    // Compute greeting from profile
    '.greeting': 'Hello, ${.fullName}! You have ${.profile.unreadMessages} unread messages.'
  }
}, {
  // 2. Define resolver functions
  resolvers: {
    api: {
      fetchProfile: async (userId: number) => {
        console.log(`Fetching profile for user ${userId}...`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          userId,
          unreadMessages: 5,
          lastLogin: new Date().toISOString()
        };
      }
    }
  }
});

// 3. Access data - expressions evaluate automatically
console.log('User ID:', await appData.get('user.id'));  // 123
console.log('Full Name:', await appData.get('user.fullName'));  // "Alice Johnson"

// This triggers the API call
const profile = await appData.get('user.profile');
console.log('Unread Messages:', profile.unreadMessages);  // 5

// This uses cached profile data
const greeting = await appData.get('user.greeting');
console.log(greeting);  // "Hello, Alice Johnson! You have 5 unread messages."
```

**Output**:

```
User ID: 123
Full Name: Alice Johnson
Fetching profile for user 123...
Unread Messages: 5
Hello, Alice Johnson! You have 5 unread messages.
```

**What happened?**:

1. Accessing `user.id` returns the static value immediately
2. Accessing `user.fullName` evaluates the expression and caches the result
3. Accessing `user.profile` triggers the API call and caches the response
4. Accessing `user.greeting` reuses the cached profile (no second API call!)

---

## Progressive Examples

### Example 1: Simple Config with Environment Resolver

**Use case**: Load environment-specific configuration without hard-coding values.

```typescript
import { dotted } from '@orb-zone/dotted-json';

const config = dotted({
  // Base config
  appName: 'MyApp',
  version: '1.0.0',

  // Environment-specific values
  '.env': 'getEnvironment()',
  '.apiUrl': '${.env} === "production" ? "https://api.example.com" : "http://localhost:3000"',
  '.debug': '${.env} !== "production"',

  // Database config
  database: {
    '.host': '${.env} === "production" ? "db.example.com" : "localhost"',
    '.port': '${.env} === "production" ? 5432 : 54320',
    '.name': 'myapp_${.env}'
  }
}, {
  resolvers: {
    getEnvironment: () => process.env.NODE_ENV || 'development'
  }
});

// Use config
console.log('Environment:', await config.get('env'));        // "development"
console.log('API URL:', await config.get('apiUrl'));         // "http://localhost:3000"
console.log('Debug Mode:', await config.get('debug'));       // true
console.log('DB Host:', await config.get('database.host'));  // "localhost"
console.log('DB Name:', await config.get('database.name'));  // "myapp_development"
```

**Key concepts introduced**:

- Expressions can use JavaScript operators (`===`, `?:`)
- Environment detection with resolvers
- Computed configuration based on environment

---

### Example 2: User Context and Personalization

**Use case**: Build personalized experiences based on user data.

```typescript
import { dotted } from '@orb-zone/dotted-json';

const app = dotted({
  // Current user (could come from auth system)
  user: {
    id: 'user:alice',
    firstName: 'Alice',
    tier: 'premium',
    country: 'US',

    // Fetch full profile
    '.profile': 'db.getUser(${id})',

    // Personalized greeting
    '.greeting': 'Good ${helpers.getTimeOfDay()}, ${firstName}!',

    // Feature access based on tier
    '.canExport': '${tier} === "premium" || ${tier} === "enterprise"',
    '.maxProjects': '${tier} === "free" ? 3 : ${tier} === "premium" ? 10 : 999'
  },

  // Personalized content
  dashboard: {
    '.recommendations': 'api.getRecommendations(${user.country}, ${user.tier})',
    '.greeting': '${user.greeting}',
    '.stats': 'api.getUserStats(${user.id})'
  }
}, {
  resolvers: {
    db: {
      getUser: async (id: string) => ({
        id,
        email: 'alice@example.com',
        joinedDate: '2024-01-15',
        preferences: { theme: 'dark', language: 'en' }
      })
    },
    api: {
      getRecommendations: async (country: string, tier: string) => {
        return [
          { title: 'Feature Highlight', type: 'tip' },
          { title: 'Upgrade to unlock more!', type: tier === 'free' ? 'upsell' : 'info' }
        ];
      },
      getUserStats: async (userId: string) => ({
        projectCount: 7,
        lastActive: new Date().toISOString()
      })
    },
    helpers: {
      getTimeOfDay: () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 18) return 'afternoon';
        return 'evening';
      }
    }
  }
});

// Build personalized dashboard
console.log(await app.get('dashboard.greeting'));  // "Good afternoon, Alice!"
console.log('Can export:', await app.get('user.canExport'));  // true
console.log('Max projects:', await app.get('user.maxProjects'));  // 10

const recommendations = await app.get('dashboard.recommendations');
console.log('Recommendations:', recommendations);
// [{ title: 'Feature Highlight', type: 'tip' }, ...]
```

**Key concepts introduced**:

- User-specific data fetching
- Conditional logic based on user attributes
- Personalized UI content
- Time-based dynamic values

---

### Example 3: Feature Flags with Rollout Percentage

**Use case**: Gradually roll out features to a percentage of users.

```typescript
import { dotted } from '@orb-zone/dotted-json';
import crypto from 'crypto';

const app = dotted({
  user: {
    id: 'user:alice',
    email: 'alice@example.com'
  },

  // Feature flag configuration
  features: {
    newDashboard: {
      enabled: true,
      rolloutPercentage: 50,  // 50% of users
      '.isEnabled': 'flags.checkRollout(${user.id}, ${rolloutPercentage})'
    },

    betaFeature: {
      enabled: true,
      allowedUsers: ['user:alice', 'user:bob'],
      '.isEnabled': 'flags.checkAllowlist(${user.id}, ${allowedUsers})'
    },

    experimentalAPI: {
      enabled: false,
      '.isEnabled': '${enabled}'  // Simple boolean
    }
  }
}, {
  resolvers: {
    flags: {
      // Consistent hash-based rollout
      checkRollout: (userId: string, percentage: number) => {
        const hash = crypto.createHash('md5').update(userId).digest('hex');
        const userValue = parseInt(hash.substring(0, 8), 16) % 100;
        return userValue < percentage;
      },

      // Allowlist check
      checkAllowlist: (userId: string, allowedUsers: string[]) => {
        return allowedUsers.includes(userId);
      }
    }
  }
});

// Check feature flags
const newDashboard = await app.get('features.newDashboard.isEnabled');
console.log('New dashboard enabled:', newDashboard);  // true/false based on hash

const betaFeature = await app.get('features.betaFeature.isEnabled');
console.log('Beta feature enabled:', betaFeature);  // true (alice is in allowlist)

const experimental = await app.get('features.experimentalAPI.isEnabled');
console.log('Experimental API enabled:', experimental);  // false

// Use in application logic
if (await app.get('features.newDashboard.isEnabled')) {
  console.log('Showing new dashboard UI');
} else {
  console.log('Showing legacy dashboard UI');
}
```

**Key concepts introduced**:

- Feature flag patterns
- Percentage-based rollouts with consistent hashing
- User allowlists for beta testing
- Boolean flags for simple on/off toggles

**Why this works**:

- **Consistent hashing** ensures same user always gets same result
- **Lazy evaluation** means flags only check when accessed
- **Caching** prevents repeated hash calculations
- **Declarative** - flag logic lives in data, not scattered in code

---

## Core Concepts

### Lazy Evaluation and Caching

**Lazy evaluation** means expressions don't run until you access their paths:

```typescript
const data = dotted({
  user: { id: 123 },
  '.profile': 'expensiveAPICall(${user.id})',  // NOT called yet
  '.posts': 'anotherExpensiveCall(${user.id})'  // NOT called yet
});

// Still not called
console.log('Schema created');

// NOW profile is fetched
await data.get('profile');

// posts is still not fetched (lazy!)
```

**Benefits**:

- No wasted work for unused data
- Faster initial load times
- Pay-per-use evaluation model

**Caching** happens automatically after first evaluation:

```typescript
// First access: runs expression and caches result
const profile1 = await data.get('user.profile');  // API call happens

// Second access: returns cached result
const profile2 = await data.get('user.profile');  // No API call!

// Force re-evaluation (updates cache with new value)
const fresh = await data.get('user.profile', { fresh: true });  // API call again
```

**Cache invalidation**:

- Use `fresh: true` option to re-evaluate and update cache
- Cache clears when you `.set()` a dependency
- External plugins (Pinia Colada, SurrealDB) provide advanced cache strategies

### Resolver Context and Dependencies

**Expressions can reference any part of the schema**:

```typescript
const data = dotted({
  config: { apiUrl: 'https://api.example.com' },
  user: { id: 123 },

  // Reference multiple parts of schema
  '.profile': 'api.get("${config.apiUrl}/users/${user.id}")'
});
```

**Dependency resolution is automatic**:

- The library tracks which paths an expression depends on
- When a dependency changes, dependent expressions re-evaluate
- No manual dependency arrays or effect hooks needed

**Context isolation**:

```typescript
// Each evaluation gets its own context
const data = dotted({
  count: 0,
  '.double': '${count} * 2'
});

await data.get('double');  // 0
data.set('count', 5);
await data.get('double');  // 10 (automatically re-evaluates)
```

### Cycle Detection

**dotted-json prevents infinite loops**:

```typescript
const data = dotted({
  '.a': '${.b} + 1',
  '.b': '${.a} + 1'  // Circular dependency!
});

try {
  await data.get('a');
} catch (error) {
  console.error('Cycle detected:', error.message);
  // Error: Maximum evaluation depth exceeded (cycle detected)
}
```

**Protection mechanisms**:

- Maximum evaluation depth (default: 100)
- Cycle detection in dependency graph
- Clear error messages when cycles occur

**Configure max depth**:

```typescript
const data = dotted(schema, {
  maxEvaluationDepth: 50  // Lower limit for faster cycle detection
});
```

### Trust Model and Security

**IMPORTANT**: dotted-json uses `new Function()` for expression evaluation. This requires **trusted schemas only**.

**Trust boundary**:

✅ **SAFE** - Schemas from trusted sources:

- Your application code
- Configuration files in version control
- Server-side data your backend creates
- Files you control on disk

❌ **UNSAFE** - Never use with:

- User-submitted JSON from web forms
- Data from untrusted third-party APIs
- Any externally-sourced schemas

**Security best practices**:

```typescript
// ✅ Good: schema defined in code
const data = dotted({
  user: { id: 123 },
  '.profile': 'db.getUser(${user.id})'
}, { resolvers });

// ❌ Bad: schema from user input
const userJson = req.body.schema;  // DON'T DO THIS
const data = dotted(JSON.parse(userJson), { resolvers });

// ✅ Good: validate resolver inputs
const resolvers = {
  db: {
    getUser: async (id: number) => {
      if (typeof id !== 'number' || id <= 0) {
        throw new Error('Invalid user ID');
      }
      // Use parameterized queries
      return await db.query('SELECT * FROM users WHERE id = $1', [id]);
    }
  }
};

// ✅ Even better: use Zod plugin for automatic validation
import { withZod } from '@orb-zone/dotted-json/plugins/zod';
import { z } from 'zod';

const data = dotted(schema, {
  ...withZod({
    schemas: {
      resolvers: {
        'db.getUser': {
          input: z.tuple([z.number().positive()]),
          output: z.object({ id: z.number(), name: z.string() })
        }
      }
    }
  }),
  resolvers
});
```

**Why this model?**:

- Enables powerful expression syntax without a custom parser
- Performance: native JavaScript evaluation is fast
- Flexibility: full JavaScript expression support
- Trade-off: requires trusted input (acceptable for config/schema use case)

---

## Next Steps

### Advanced Features

**Variant System** - Multi-dimensional content adaptation:

- Language variants (`lang: 'es'`, `lang: 'ja'`)
- Gender-aware text with pronouns (`gender: 'f'`)
- Formality levels (`form: 'polite'`, `form: 'formal'`)
- Custom dimensions for any use case

Learn more: [Variant System in README](../README.md#variant-system)

**File Loader** - Load JSON from filesystem with variant resolution:

- Automatic file discovery and caching
- Variant-aware file naming (`strings:es:formal.jsön`)
- i18n workflows without external services

Learn more: [File Loader in README](../README.md#file-loader)

**SurrealDB Integration** - Real-time database with LIVE queries:

- Zero-boilerplate database integration
- Real-time updates with WebSocket subscriptions
- Automatic cache invalidation on changes

Learn more: [SurrealDB Plugin in README](../README.md#surrealdb-integration)

**Zod Validation** - Type-safe runtime validation:

- Automatic input/output validation for resolvers
- Path-based schema validation
- Strict or loose modes

Learn more: [Zod Plugin in README](../README.md#zod-integration)

**Framework Integrations**:

- React with TanStack Query
- Vue 3 with Pinia Colada
- Vanilla JavaScript

Learn more: [Vue Integration](../docs/migration.md#from-vue-i18n), [React Integration](../README.md#react-integration)

### API Reference

Complete documentation of all APIs:

- [`dotted()` constructor](../docs/API.md#dotted)
- [`DottedJson` methods](../docs/API.md#dottedjson)
- [Storage providers](../docs/API.md#storage-providers)
- [Plugin APIs](../docs/API.md#plugins)
- [Type definitions](../docs/API.md#type-definitions)

Read: [API Reference](../docs/API.md)

### Migration Guides

Switching from another library? We have detailed migration guides:

- [From i18next](../docs/migration.md#from-i18next)
- [From react-intl](../docs/migration.md#from-react-intl)
- [From vue-i18n](../docs/migration.md#from-vue-i18n)
- [From LaunchDarkly](../docs/migration.md#from-launchdarkly-feature-flags)
- [From Unleash](../docs/migration.md#from-unleash-feature-flags)
- [From custom solutions](../docs/migration.md#from-custom-solutions)

Read: [Migration Guide](../docs/migration.md)

### Production Examples

Real-world examples you can copy and adapt:

**Feature Flag Manager** - LaunchDarkly/Unleash replacement:

- Real-time flag updates
- Percentage rollouts with consistent hashing
- User/team targeting
- Analytics tracking

See: [examples/feature-flag-manager.ts](../examples/feature-flag-manager.ts)

**i18n Translation Editor** - Live translation management:

- Multi-language support
- Real-time updates
- Translation versioning
- Admin UI patterns

See: [examples/i18n-translation-editor.ts](../examples/i18n-translation-editor.ts)

**Real-time Config Manager** - Live configuration:

- Environment-based config
- Instant updates without restart
- Configuration versioning

See: [examples/realtime-config-manager.ts](../examples/realtime-config-manager.ts)

Browse all: [Examples Directory](../examples/)

### Learning Path

**Beginner** (you are here):

1. ✅ Read this Getting Started guide
2. Try [examples/basic-usage.ts](../examples/basic-usage.ts)
3. Build a simple config system for your app
4. Explore [examples/with-zod-validation.ts](../examples/with-zod-validation.ts)

**Intermediate**:

1. Learn the [Variant System](../README.md#variant-system)
2. Try [examples/file-loader-i18n.ts](../examples/file-loader-i18n.ts)
3. Integrate with your framework (Vue/React)
4. Add validation with Zod plugin

**Advanced**:

1. Set up [SurrealDB integration](../README.md#surrealdb-integration)
2. Build a feature flag system with [examples/feature-flag-manager.ts](../examples/feature-flag-manager.ts)
3. Implement real-time updates
4. Study [complete-workflow.ts](../examples/complete-workflow.ts)

**Expert**:

1. Read [architecture documents](./../.specify/memory/)
2. Contribute to the library
3. Build custom plugins
4. Share your patterns with the community

---

## Quick Reference

### Common Patterns

**Config management**:

```typescript
const config = dotted({
  '.env': 'getEnv()',
  '.apiUrl': '${.env} === "prod" ? "https://api.example.com" : "http://localhost:3000"'
}, { resolvers: { getEnv: () => process.env.NODE_ENV } });
```

**API calls**:

```typescript
const data = dotted({
  userId: 123,
  '.user': 'api.get("/users/${userId}")'
}, { resolvers: { api: { get: fetch } } });
```

**Computed values**:

```typescript
const data = dotted({
  items: [1, 2, 3],
  '.total': '${items}.reduce((a, b) => a + b, 0)'
});
```

**Conditional logic**:

```typescript
const data = dotted({
  tier: 'premium',
  '.maxProjects': '${tier} === "free" ? 3 : ${tier} === "premium" ? 10 : 999'
});
```

**Error handling**:

```typescript
const data = dotted({
  '.risky': 'mightFail()'
}, {
  errorDefault: 'fallback value',
  resolvers: { mightFail: () => { throw new Error('oops'); } }
});
```

### Keyboard Shortcuts (none needed!)

This is a library, not a UI tool. But here are mental shortcuts:

- **Dot prefix** = "evaluate this"
- **Template `${}`** = "insert value here"
- **Resolver** = "function I can call"
- **Lazy** = "don't run until accessed"
- **Cache** = "remember the result"

### Common Gotchas

**1. Forgetting `await`**:

```typescript
// ❌ Wrong - returns a Promise
const name = data.get('user.name');

// ✅ Correct - awaits the Promise
const name = await data.get('user.name');
```

**2. Using `get()` instead of accessing path**:

```typescript
// ❌ Wrong - .get() is a method, not in schema
data.get('user.get.name');

// ✅ Correct - access the path
data.get('user.name');
```

**3. Circular dependencies**:

```typescript
// ❌ Wrong - infinite loop
const data = dotted({
  '.a': '${.b}',
  '.b': '${.a}'
});

// ✅ Correct - break the cycle
const data = dotted({
  base: 10,
  '.a': '${base} * 2',
  '.b': '${.a} + 5'
});
```

**4. Untrusted schemas**:

```typescript
// ❌ DANGEROUS - user input
const schema = JSON.parse(req.body);
const data = dotted(schema);

// ✅ SAFE - defined in code
const data = dotted({
  userId: req.params.id,
  '.user': 'db.getUser(${userId})'
});
```

### Getting Help

- **GitHub Issues**: [Report bugs or ask questions](https://github.com/orb-zone/dotted-json/issues)
- **Discussions**: [Share ideas and patterns](https://github.com/orb-zone/dotted-json/discussions)
- **Examples**: [Browse working code](../examples/)
- **API Docs**: [Detailed reference](../docs/API.md)

---

**Ready to build something?** Start with [examples/basic-usage.ts](../examples/basic-usage.ts) and experiment!

**Questions?** Check the [API Reference](../docs/API.md) or [open an issue](https://github.com/orb-zone/dotted-json/issues).

**Want to contribute?** Read [CONTRIBUTING.md](../CONTRIBUTING.md) and review the [constitution](../.specify/memory/constitution.md).
