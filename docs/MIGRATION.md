# Migration Guide

How to migrate to `@orbzone/dotted-json` from other solutions.

---

## Table of Contents

- [From i18next](#from-i18next)
- [From react-intl](#from-react-intl)
- [From vue-i18n](#from-vue-i18n)
- [From LaunchDarkly](#from-launchdarkly-feature-flags)
- [From Unleash](#from-unleash-feature-flags)
- [From Custom Solutions](#from-custom-solutions)

---

## From i18next

### Before (i18next)

```typescript
import i18next from 'i18next';

await i18next.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        welcome: 'Welcome, {{name}}!',
        items: 'You have {{count}} item',
        items_plural: 'You have {{count}} items'
      }
    },
    es: {
      translation: {
        welcome: '¡Bienvenido, {{name}}!',
        items: 'Tienes {{count}} artículo',
        items_plural: 'Tienes {{count}} artículos'
      }
    }
  }
});

const message = i18next.t('welcome', { name: 'Alice' });
const count = i18next.t('items', { count: 5 });
```

### After (jsön)

**Step 1: Convert to JSÖN format**

Create `strings:en.jsön`:
```json
{
  "welcome": "Welcome, ${user.name}!",
  "items": "You have ${count} item${count > 1 ? 's' : ''}"
}
```

Create `strings:es.jsön`:
```json
{
  "welcome": "¡Bienvenido, ${user.name}!",
  "items": "Tienes ${count} artículo${count > 1 ? 's' : ''}"
}
```

**Step 2: Load with FileLoader**

```typescript
import { dotted } from '@orbzone/dotted-json';
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });
await loader.init();

const data = dotted({
  user: { name: 'Alice' },
  count: 5,
  '.strings': 'extends("strings")'
}, {
  resolvers: {
    extends: async (baseName: string) => {
      return await loader.load(baseName, {
        lang: 'es'  // or get from context
      });
    }
  }
});

const welcome = await data.get('strings.welcome');
const items = await data.get('strings.items');
```

### Key Differences

| Feature | i18next | jsön |
|---------|---------|------|
| Interpolation | `{{var}}` | `${var}` |
| Pluralization | Separate keys | JavaScript expressions |
| Namespaces | Built-in | Via file organization |
| Fallback | Built-in | Via variant resolution |
| Real-time updates | Plugin required | Built-in with SurrealDB |

### Advantages of jsön

- **Simpler syntax**: Standard JavaScript template literals
- **More powerful**: Full expression support, not just interpolation
- **Type-safe**: Use with TypeScript for compile-time checks
- **Unified data**: Translations are just data, use same tools for everything
- **Real-time**: Native support with SurrealDB LIVE queries

---

## From react-intl

### Before (react-intl)

```typescript
import { IntlProvider, FormattedMessage } from 'react-intl';

const messages = {
  en: {
    greeting: 'Hello, {name}!',
    price: 'Price: {amount, number, currency}'
  },
  es: {
    greeting: '¡Hola, {name}!',
    price: 'Precio: {amount, number, currency}'
  }
};

function App() {
  return (
    <IntlProvider locale="en" messages={messages.en}>
      <FormattedMessage
        id="greeting"
        values={{ name: 'Alice' }}
      />
    </IntlProvider>
  );
}
```

### After (jsön)

**Create translation files:**

`strings:en.jsön`:
```json
{
  "greeting": "Hello, ${user.name}!",
  "price": "Price: $${amount.toFixed(2)}"
}
```

`strings:es.jsön`:
```json
{
  "greeting": "¡Hola, ${user.name}!",
  "price": "Precio: $${amount.toFixed(2)}"
}
```

**React component:**

```typescript
import { dotted } from '@orbzone/dotted-json';
import { useTanstackDottedJSON } from '@orbzone/dotted-json/react';
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });

function App() {
  const { data, isLoading } = useTanstackDottedJSON({
    user: { name: 'Alice' },
    amount: 99.99,
    '.strings': 'extends("strings")'
  }, {
    resolvers: {
      extends: async (baseName: string) => {
        return await loader.load(baseName, { lang: 'en' });
      }
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <p>{data.get('strings.greeting')}</p>
      <p>{data.get('strings.price')}</p>
    </div>
  );
}
```

### Migration Tips

1. **Message formatting**: Replace ICU syntax with JavaScript expressions
   - `{count, plural, one {1 item} other {# items}}` → `${count} item${count !== 1 ? 's' : ''}`
   - `{amount, number, currency}` → `$${amount.toFixed(2)}`

2. **Nested messages**: Use dot notation
   - `messages.user.profile.title` → `strings.user.profile.title`

3. **Dynamic locale**: Pass `lang` variant from context/state

---

## From vue-i18n

### Before (vue-i18n)

```typescript
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      message: {
        hello: 'hello world',
        named: 'hello {name}'
      }
    },
    ja: {
      message: {
        hello: 'こんにちは、世界',
        named: 'こんにちは、{name}'
      }
    }
  }
});

app.use(i18n);
```

```vue
<template>
  <p>{{ $t('message.hello') }}</p>
  <p>{{ $t('message.named', { name: 'Alice' }) }}</p>
</template>
```

### After (jsön)

**Create translation files:**

`strings:en.jsön`:
```json
{
  "message": {
    "hello": "hello world",
    "named": "hello ${user.name}"
  }
}
```

`strings:ja.jsön`:
```json
{
  "message": {
    "hello": "こんにちは、世界",
    "named": "こんにちは、${user.name}"
  }
}
```

**Vue component:**

```vue
<script setup>
import { dotted } from '@orbzone/dotted-json';
import { useTanstackDottedJSON } from '@orbzone/dotted-json/vue';
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });

const { data, isLoading } = useTanstackDottedJSON({
  user: { name: 'Alice' },
  '.strings': 'extends("strings")'
}, {
  resolvers: {
    extends: async (baseName: string) => {
      return await loader.load(baseName, { lang: 'ja' });
    }
  }
});
</script>

<template>
  <p v-if="!isLoading">{{ data.get('strings.message.hello') }}</p>
  <p v-if="!isLoading">{{ data.get('strings.message.named') }}</p>
</template>
```

### Migration Strategy

1. **Extract messages**: Export vue-i18n messages to JSON files
2. **Add expressions**: Replace `{var}` with `${var}`
3. **File organization**: Split by locale (`strings:en.jsön`, `strings:ja.jsön`)
4. **Formality support**: Add formality variants for Japanese
   - `strings:ja:polite.jsön` - Teineigo (丁寧語)
   - `strings:ja:honorific.jsön` - Keigo (敬語)

---

## From LaunchDarkly (Feature Flags)

### Before (LaunchDarkly)

```typescript
import * as LaunchDarkly from 'launchdarkly-node-server-sdk';

const client = LaunchDarkly.init('sdk-key');

await client.waitForInitialization();

const showNewFeature = await client.variation(
  'new-feature',
  { key: 'user-123', email: 'user@example.com' },
  false
);

if (showNewFeature) {
  // Show new feature
}

client.close();
```

### After (jsön)

**Create feature flags in SurrealDB:**

Use the [feature-flag-manager.ts](../examples/feature-flag-manager.ts) example:

```typescript
import { FeatureFlagManager } from './examples/feature-flag-manager';

const manager = new FeatureFlagManager();
await manager.init();

// Create flag
await manager.setFlag({
  key: 'new-feature',
  name: 'New Feature',
  description: 'Enable new dashboard',
  enabled: true,
  rolloutPercentage: 50,  // 50% rollout
  targetUsers: ['user-123'],
  environments: ['prod']
}, 'prod');

// Evaluate flag
const result = await manager.isEnabled('new-feature', {
  userId: 'user-123',
  environment: 'prod'
});

if (result.enabled) {
  console.log(`Feature enabled (${result.reason})`);
}

await manager.close();
```

### Migration Mapping

| LaunchDarkly | jsön |
|--------------|------|
| Flag key | `flag.key` |
| User targeting | `flag.targetUsers` |
| Segment targeting | `flag.targetTeams` |
| Percentage rollout | `flag.rolloutPercentage` |
| Environments | `flag.environments` |
| Variations | Use multiple flags or custom metadata |

### Advantages

- **No external service**: Self-hosted with SurrealDB
- **Real-time updates**: LIVE queries propagate changes instantly
- **Type-safe**: TypeScript definitions for all flag types
- **Analytics**: Built-in evaluation tracking
- **Cost**: Free (no per-seat or MAU charges)

---

## From Unleash (Feature Flags)

### Before (Unleash)

```typescript
import { initialize } from 'unleash-client';

const unleash = initialize({
  url: 'https://unleash.example.com/api/',
  appName: 'my-app',
  instanceId: 'instance-1'
});

unleash.on('ready', () => {
  const enabled = unleash.isEnabled('new-feature', {
    userId: 'user-123',
    sessionId: 'session-456'
  });

  if (enabled) {
    // Feature enabled
  }
});
```

### After (jsön)

```typescript
import { FeatureFlagManager } from './examples/feature-flag-manager';

const manager = new FeatureFlagManager();
await manager.init();

// Create flag with gradual rollout strategy
await manager.setFlag({
  key: 'new-feature',
  name: 'New Feature',
  description: 'Gradual rollout',
  enabled: true,
  rolloutPercentage: 25  // Start at 25%
}, 'prod');

// Watch for changes
const unwatch = await manager.watchFlags('prod', (flags) => {
  console.log('Flags updated:', Object.keys(flags));
});

// Evaluate
const result = await manager.isEnabled('new-feature', {
  userId: 'user-123',
  environment: 'prod'
});

console.log(`Enabled: ${result.enabled} (${result.reason})`);

// Increase rollout
await manager.setFlag({
  key: 'new-feature',
  name: 'New Feature',
  description: 'Gradual rollout',
  enabled: true,
  rolloutPercentage: 50  // Increase to 50%
}, 'prod');
// All clients auto-update via LIVE queries!

await unwatch();
await manager.close();
```

### Strategy Mapping

| Unleash Strategy | jsön Implementation |
|------------------|---------------------|
| `default` | `enabled: true` (no targeting) |
| `userWithId` | `targetUsers: ['user-1', 'user-2']` |
| `gradualRolloutUserId` | `rolloutPercentage: 50` |
| `remoteAddress` | Custom variant (`{ region: 'us-east' }`) |
| `applicationHostname` | Custom variant (`{ host: 'app-1' }`) |
| `flexibleRollout` | `rolloutPercentage` with consistent hashing |

### Migration Steps

1. **Export Unleash flags**: Use Unleash API to export all flags
2. **Convert strategies**: Map Unleash strategies to jsön flag properties
3. **Setup SurrealDB**: Initialize with feature flag schema
4. **Import flags**: Bulk create flags using `FeatureFlagManager`
5. **Replace client**: Update code to use `manager.isEnabled()`
6. **Setup LIVE queries**: Enable real-time updates
7. **Monitor**: Use built-in analytics (`manager.getStats()`)

---

## From Custom Solutions

### REST API + Database

**Before:**
```typescript
// Custom feature flag API
const response = await fetch('/api/flags/new-feature', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-ID': 'user-123'
  }
});
const { enabled } = await response.json();
```

**After:**
```typescript
import { withSurrealDBPinia } from '@orbzone/dotted-json/plugins/surrealdb-pinia';

const plugin = await withSurrealDBPinia({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  ions: {
    'flags': { staleTime: 60_000 }
  },
  live: {
    enabled: true,
    ions: ['flags']
  }
});

const data = dotted({
  '.flags': 'db.loadIon("flags", { env: "prod" })'
}, { resolvers: plugin.resolvers });

const flags = await data.get('flags');
const enabled = flags['new-feature']?.enabled;
```

**Benefits:**
- No REST API needed (direct WebSocket to SurrealDB)
- Built-in caching (Pinia Colada)
- Real-time updates (LIVE queries)
- Type-safe access

### Filesystem Config Files

**Before:**
```typescript
import fs from 'fs/promises';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const configPath = path.join(__dirname, `config.${env}.json`);
const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
```

**After:**
```typescript
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './config' });
await loader.init();

const config = await loader.load('config', {
  env: process.env.NODE_ENV || 'development'
});
```

**Benefits:**
- Automatic variant resolution
- Built-in caching
- Consistent API across different backends
- Easy to switch to SurrealDB later

### Environment Variables

**Before:**
```typescript
const config = {
  apiUrl: process.env.API_URL,
  timeout: parseInt(process.env.TIMEOUT || '5000'),
  features: {
    darkMode: process.env.FEATURE_DARK_MODE === 'true',
    newUI: process.env.FEATURE_NEW_UI === 'true'
  }
};
```

**After:**

Create `config:prod.jsön`:
```json
{
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "features": {
    "darkMode": true,
    "newUI": false
  }
}
```

**Load with environment detection:**
```typescript
import { dotted } from '@orbzone/dotted-json';
import { FileLoader } from '@orbzone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './config' });
await loader.init();

const data = dotted({
  '.config': 'extends("config")'
}, {
  resolvers: {
    extends: async (baseName: string) => {
      return await loader.load(baseName, {
        env: process.env.NODE_ENV || 'development'
      });
    }
  }
});

const config = await data.get('config');
```

---

## General Migration Tips

### 1. Start Small

Migrate one feature at a time:
- Week 1: Translations
- Week 2: Feature flags
- Week 3: Configuration
- Week 4: User preferences

### 2. Run in Parallel

Keep old system running while testing jsön:

```typescript
// Dual-load strategy
const oldTranslations = await i18next.t('welcome');
const newTranslations = await data.get('strings.welcome');

// Compare and log differences
if (oldTranslations !== newTranslations) {
  console.warn('Translation mismatch:', { old, new });
}
```

### 3. Use Feature Flags

Use feature flags to control migration:

```typescript
const useNewSystem = await flags.isEnabled('use-json-translations', context);

const message = useNewSystem
  ? await data.get('strings.welcome')
  : await i18next.t('welcome');
```

### 4. Gradual Rollout

- **Phase 1**: Internal users only
- **Phase 2**: Beta users (10%)
- **Phase 3**: Wider rollout (50%)
- **Phase 4**: Full rollout (100%)
- **Phase 5**: Remove old system

### 5. Performance Monitoring

Compare performance before/after:

```typescript
import { benchmark } from '../test/helpers/surrealdb-test-utils';

// Old system
await benchmark(
  async () => await i18next.t('welcome'),
  100,
  'i18next translation'
);

// New system
await benchmark(
  async () => await data.get('strings.welcome'),
  100,
  'jsön translation'
);
```

### 6. Data Validation

Validate migrated data with Zod:

```typescript
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

const TranslationSchema = z.record(z.string());

const data = dotted({
  '.strings': 'extends("strings")'
}, {
  resolvers,
  ...withZod({
    schemas: {
      paths: { 'strings': TranslationSchema }
    },
    mode: 'strict'
  })
});

// Will throw if validation fails
const strings = await data.get('strings');
```

---

## Need Help?

- [Examples](../examples/) - See working examples
- [API Reference](./API.md) - Complete API documentation
- [Performance Guide](./PERFORMANCE.md) - Optimization tips
- [GitHub Issues](https://github.com/orbzone/dotted-json/issues) - Ask questions

---

## Migration Checklist

### Planning
- [ ] Identify all systems to migrate (i18n, feature flags, config, etc.)
- [ ] Document current data formats and schemas
- [ ] Choose migration strategy (big bang vs gradual)
- [ ] Set up test environment

### Data Migration
- [ ] Export data from old system
- [ ] Convert to JSÖN format
- [ ] Validate with Zod schemas
- [ ] Test variant resolution
- [ ] Import to new system (FileLoader or SurrealDB)

### Code Migration
- [ ] Install `@orbzone/dotted-json`
- [ ] Set up loaders (FileLoader or SurrealDBLoader)
- [ ] Configure plugins (Zod, Pinia Colada, etc.)
- [ ] Update code to use jsön API
- [ ] Add error handling and fallbacks
- [ ] Set up real-time updates (if using SurrealDB)

### Testing
- [ ] Unit tests for data access
- [ ] Integration tests for loaders
- [ ] Performance benchmarks
- [ ] Load testing (concurrent users)
- [ ] Validate variant resolution
- [ ] Test real-time updates

### Deployment
- [ ] Deploy to staging environment
- [ ] Run parallel systems (old + new)
- [ ] Monitor performance and errors
- [ ] Gradual rollout to production
- [ ] Monitor and iterate
- [ ] Deprecate old system

### Cleanup
- [ ] Remove old system code
- [ ] Archive old data
- [ ] Update documentation
- [ ] Train team on new system
- [ ] Celebrate! 🎉
