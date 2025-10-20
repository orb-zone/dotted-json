# Migration Guide

How to migrate to `@orb-zone/dotted-json` from other solutions.

---

## Breaking Changes in v1.1.0

### Variant System Migration: Restored Automatic Variant Resolution

**What Changed:** The variant system has been restored to use automatic resolution with `:variant` modifiers. Instead of complex tree-walking expressions, you can now use clean variant syntax (`.key:lang:gender`) and variants are automatically resolved from data properties using tree-walking.

**Why This Change:** The tree-walking approach introduced in v1.1.0 was too verbose and complex. The restored system maintains the clean `:variant` syntax while using tree-walking internally to automatically discover variant context from data properties.

#### Before (v1.1.0 tree-walking)

```typescript
// Complex expressions with tree-walking
const data = dotted({
  lang: 'es',
  form: 'formal',
  '.greeting': '${.lang === "es" && .form === "formal" ? "Buenos días" : .lang === "es" ? "Hola" : "Hello"}'
});

const bio = dotted({
  gender: 'f',
  '.bio': '${.gender === "f" ? "She is known for her work" : .gender === "m" ? "He is known for his work" : "They are known for their work"}'
});

await data.get('.greeting'); // → 'Buenos días'
await bio.get('.bio'); // → 'She is known for her work'
```

#### After (v1.1.0 restored automatic resolution)

```typescript
// Clean variant syntax with automatic resolution
const data = dotted({
  lang: 'es',
  form: 'formal',
  '.greeting': 'Hello',
  '.greeting:es': 'Hola',
  '.greeting:es:formal': 'Buenos días'
});

const bio = dotted({
  gender: 'f',
  '.bio': 'The author is known',
  '.bio:f': 'She is known for her work',
  '.bio:m': 'He is known for his work'
});

await data.get('.greeting'); // → 'Buenos días'
await bio.get('.bio'); // → 'She is known for her work'
```

#### Migration Steps

1. **Remove complex tree-walking expressions**
   ```typescript
   // ❌ Old (complex expressions)
   {
     '.greeting': '${.lang === "es" && .form === "formal" ? "Buenos días" : .lang === "es" ? "Hola" : "Hello"}'
   }

   // ✅ New (clean variant syntax)
   {
     '.greeting': 'Hello',
     '.greeting:es': 'Hola',
     '.greeting:es:formal': 'Buenos días'
   }
   ```

2. **Convert gender-aware expressions to variants**
   ```typescript
   // ❌ Old (complex gender expressions)
   {
     '.bio': '${.gender === "f" ? "She is known" : .gender === "m" ? "He is known" : "They are known"}'
   }

   // ✅ New (gender variants)
   {
     '.bio': 'They are known',
     '.bio:f': 'She is known',
     '.bio:m': 'He is known'
   }
   ```

3. **Keep variant properties as data**
   ```typescript
   // ✅ Both approaches work - variant properties stay in data
   const data = dotted({
     lang: 'es',      // ← Variant context from data
     gender: 'f',     // ← Variant context from data
     '.greeting:es': 'Hola',
     '.bio:f': 'She is known'
   });
   ```

4. **Use pronouns in expressions**
   ```typescript
   // Tree-walking enables natural pronoun usage
   {
     gender: 'f',
     '.message': '${:subject} completed ${:possessive} task'
   }
   // → 'She completed her task'
   ```

**Benefits of Tree-Walking:**
- ✅ Variants feel like regular data
- ✅ Expressions can reference any variant from any ancestor
- ✅ No more confusing control-plane/data-plane separation
- ✅ More intuitive and powerful

---

## Table of Contents

- [Breaking Changes in v1.1.0](#breaking-changes-in-v110)
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

**Step 1: Convert to JSöN format and rename keys**

Create `strings:en.jsön`:
```json
{
  ".welcome": "Welcome, ${user.name}!",
  ".items": "You have ${count} item${count > 1 ? 's' : ''}"
}
```

Create `strings:es.jsön`:
```json
{
  ".welcome": "¡Bienvenido, ${user.name}!",
  ".items": "Tienes ${count} artículo${count > 1 ? 's' : ''}"
}
```

**Step 2: Use naturally with variant resolution**

```typescript
import { dotted } from '@orb-zone/dotted-json';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });
await loader.init();

// Load strings file once - FileLoader handles variant resolution
const strings = await loader.load('strings', { lang: 'es' });

const data = dotted({
  user: { name: 'Alice' },
  count: 5,
  ...strings  // Spread the loaded strings
});

// Access directly - expressions evaluate automatically
const welcome = await data.get('welcome');  // "¡Bienvenido, Alice!"
const items = await data.get('items');      // "Tienes 5 artículos"
```

**Alternative: Dynamic loading**

```typescript
const data = dotted({
  user: { name: 'Alice' },
  count: 5,
  '.strings': 'loader.load("strings", ${variants})'
}, {
  resolvers: { loader },
  variants: { lang: 'es' }  // Variant context
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

**Step 1: Create translation files with dot-prefixed keys**

`strings:en.jsön`:
```json
{
  ".greeting": "Hello, ${user.name}!",
  ".price": "Price: $${amount.toFixed(2)}"
}
```

`strings:es.jsön`:
```json
{
  ".greeting": "¡Hola, ${user.name}!",
  ".price": "Precio: $${amount.toFixed(2)}"
}
```

**Step 2: React component with natural integration**

```typescript
import { dotted } from '@orb-zone/dotted-json';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';
import { useState, useEffect } from 'react';

const loader = new FileLoader({ baseDir: './locales' });

function App() {
  const [translations, setTranslations] = useState(null);

  useEffect(() => {
    loader.init().then(() => {
      loader.load('strings', { lang: 'en' }).then(setTranslations);
    });
  }, []);

  if (!translations) return <div>Loading...</div>;

  const data = dotted({
    user: { name: 'Alice' },
    amount: 99.99,
    ...translations  // Spread translations into schema
  });

  return (
    <div>
      <p>{data.get('greeting')}</p>
      <p>{data.get('price')}</p>
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

**Step 1: Create translation files with dot-prefixed keys**

`strings:en.jsön`:
```json
{
  ".hello": "hello world",
  ".named": "hello ${user.name}"
}
```

`strings:ja.jsön`:
```json
{
  ".hello": "こんにちは、世界",
  ".named": "こんにちは、${user.name}"
}
```

**Step 2: Vue component with natural integration**

```vue
<script setup>
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';
import { ref, computed, onMounted } from 'vue';

const loader = new FileLoader({ baseDir: './locales' });
const translations = ref(null);
const error = ref(null);

onMounted(async () => {
  try {
    await loader.init();
    translations.value = await loader.load('strings', { lang: 'ja' });
  } catch (e) {
    error.value = e;
    console.error('Failed to load translations:', e);
  }
});

// Computed schema with user data and translations
const schema = computed(() => {
  if (!translations.value) return null;
  return {
    user: { name: 'Alice' },
    ...translations.value  // Spreads loaded translations
  };
});
</script>

<template>
  <div v-if="error">
    <p>Error loading translations: {{ error.message }}</p>
  </div>
  <div v-else-if="schema">
    <!-- Direct access to pre-loaded strings (no async needed) -->
    <p>{{ schema.hello }}</p>
    <p>{{ schema.named }}</p>
  </div>
  <div v-else>
    <p>Loading translations...</p>
  </div>
</template>
```

**Key Points:**
- ✅ Direct access to translations (no async `.get()` calls in template)
- ✅ Error handling for failed loads
- ✅ Efficient reactivity with `computed()`
- ✅ Loading state with `v-else`

**Advanced: Using Suspense (Vue 3.x+)**

For a more idiomatic Vue 3 approach, use `<Suspense>`:

```vue
<!-- Child Component (TranslationsView.vue) -->
<script setup>
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });

// Top-level await requires parent to use <Suspense>
await loader.init();
const translations = await loader.load('strings', { lang: 'ja' });

const schema = {
  user: { name: 'Alice' },
  ...translations
};
</script>

<template>
  <div>
    <p>{{ schema.hello }}</p>
    <p>{{ schema.named }}</p>
  </div>
</template>
```

```vue
<!-- Parent Component -->
<template>
  <Suspense>
    <template #default>
      <TranslationsView />
    </template>
    <template #fallback>
      <div>Loading translations...</div>
    </template>
  </Suspense>
</template>
```

**Benefits:**
- ✅ Cleaner async handling with top-level await
- ✅ Better loading states
- ✅ Easier error boundaries with `onErrorCaptured`

### Migration Strategy

1. **Extract messages**: Export vue-i18n messages to JSON files
2. **Rename keys**: Add `.` prefix to all message keys (enables expressions)
3. **Update interpolation**: Replace `{var}` with `${var}`
4. **File organization**: Split by locale (`strings:en.jsön`, `strings:ja.jsön`)
5. **Load and spread**: Use FileLoader to load variants, spread into dotted schema
6. **Formality support**: Add formality variants for Japanese (optional)
   - `strings:ja:polite.jsön` - Teineigo (丁寧語)
   - `strings:ja:honorific.jsön` - Keigo (敬語)

### Advanced Vue 3 Patterns

#### With Pinia Colada (Intelligent Caching)

Use the Pinia Colada plugin for automatic caching and real-time updates:

```vue
<script setup lang="ts">
import { dotted } from '@orb-zone/dotted-json';
import { withPiniaColada } from '@orb-zone/dotted-json/plugins/pinia-colada';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';
import { computed } from 'vue';

// Configure Pinia Colada plugin with queries
const plugin = withPiniaColada({
  queries: {
    'loader.getStrings': {
      key: (lang: string) => ['strings', lang],
      query: async (lang: string) => {
        const loader = new FileLoader({ baseDir: './locales' });
        await loader.init();
        return await loader.load('strings', { lang });
      },
      staleTime: 300_000  // Cache for 5 minutes
    }
  }
});

// Create reactive schema with expressions
const lang = ref('ja');

const schema = computed(() => dotted({
  user: { name: 'Alice' },
  '.strings': `loader.getStrings("${lang.value}")`
}, {
  resolvers: plugin.resolvers
}));

// Evaluated with caching
const strings = await schema.value.get('strings');
</script>

<template>
  <div>
    <select v-model="lang">
      <option value="en">English</option>
      <option value="ja">日本語</option>
      <option value="es">Español</option>
    </select>

    <div v-if="strings">
      <p>{{ strings.hello }}</p>
      <p>{{ strings.named }}</p>
    </div>
  </div>
</template>
```

**Benefits:**
- ✅ **Automatic caching** - Queries cached with stale time
- ✅ **Deduplication** - Multiple components share same query
- ✅ **Background refetch** - Stale queries refetch in background
- ✅ **Optimistic updates** - Instant UI updates with rollback

#### With TypeScript (Type Safety)

Add full TypeScript support for translations:

```vue
<script setup lang="ts">
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';
import { ref, computed, onMounted } from 'vue';

// Define translation schema
interface Translations {
  hello: string;
  named: string;
  welcome: string;
  goodbye: string;
}

// Define user schema
interface UserSchema {
  user: { name: string };
  translations: Translations;
}

const loader = new FileLoader({ baseDir: './locales' });
const translations = ref<Translations | null>(null);
const error = ref<Error | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    await loader.init();
    translations.value = await loader.load<Translations>('strings', {
      lang: 'ja'
    });
  } catch (e) {
    error.value = e as Error;
  } finally {
    loading.value = false;
  }
});

// Computed schema with full type inference
const schema = computed<UserSchema | null>(() => {
  if (!translations.value) return null;
  return {
    user: { name: 'Alice' },
    translations: translations.value
  };
});

// TypeScript knows the exact shape
const greeting = computed(() => schema.value?.translations.hello ?? '');
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="schema">
    <!-- TypeScript autocomplete works here -->
    <p>{{ schema.translations.hello }}</p>
    <p>{{ schema.translations.named }}</p>
    <p>{{ greeting }}</p>
  </div>
</template>
```

#### Composable Pattern (Reusable Logic)

Create a reusable composable for translations:

```typescript
// composables/useTranslations.ts
import { ref, computed, type Ref } from 'vue';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './locales' });
let initialized = false;

export interface UseTranslationsOptions {
  lang?: string;
  autoLoad?: boolean;
}

export function useTranslations(options: UseTranslationsOptions = {}) {
  const { lang = 'en', autoLoad = true } = options;

  const translations = ref(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const load = async (locale: string = lang) => {
    try {
      loading.value = true;
      error.value = null;

      if (!initialized) {
        await loader.init();
        initialized = true;
      }

      translations.value = await loader.load('strings', { lang: locale });
    } catch (e) {
      error.value = e as Error;
      console.error('Failed to load translations:', e);
    } finally {
      loading.value = false;
    }
  };

  // Auto-load on creation
  if (autoLoad) {
    load();
  }

  return {
    translations: computed(() => translations.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    load
  };
}
```

**Usage in components:**

```vue
<script setup lang="ts">
import { useTranslations } from '@/composables/useTranslations';

// Simple usage
const { translations, loading, error } = useTranslations({ lang: 'ja' });

// With dynamic locale switching
const currentLang = ref('en');
const { translations, load } = useTranslations({ autoLoad: false });

watch(currentLang, (newLang) => {
  load(newLang);
}, { immediate: true });
</script>

<template>
  <div v-if="loading">Loading translations...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="translations">
    <p>{{ translations.hello }}</p>
    <p>{{ translations.named }}</p>
  </div>
</template>
```

**Benefits:**
- ✅ **Reusable** - Share logic across components
- ✅ **Testable** - Easy to unit test
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Flexible** - Supports lazy loading and locale switching

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

**Use the production-ready Feature Flag Manager example:**

See [examples/feature-flag-manager.ts](../examples/feature-flag-manager.ts) for complete source code.

```typescript
import { FeatureFlagManager } from './examples/feature-flag-manager';
// Note: Copy this file to your project and customize as needed

const manager = new FeatureFlagManager();
await manager.init();

// Create flag with targeting
await manager.setFlag({
  key: 'new-feature',
  name: 'New Feature',
  description: 'Enable new dashboard with real-time analytics',
  enabled: true,
  rolloutPercentage: 50,  // Gradual rollout to 50% of users
  targetUsers: ['user-123'],  // Always enabled for these users
  targetTeams: ['beta-testers'],  // All team members
  environments: ['prod']
}, 'prod');

// Evaluate flag (results cached + real-time updates)
const result = await manager.isEnabled('new-feature', {
  userId: 'user-123',
  teamId: 'engineering',
  environment: 'prod'
});

console.log(`Feature enabled: ${result.enabled} (${result.reason})`);
// Output: "Feature enabled: true (user-targeted)"

await manager.close();
```

**Key Features:**
- ✅ **Real-time sync** - Changes propagate instantly via LIVE queries
- ✅ **Intelligent caching** - Pinia Colada caches evaluations
- ✅ **Consistent rollout** - Same user always gets same result
- ✅ **Multiple targeting** - Users, teams, percentages, environments
- ✅ **Analytics** - Track flag evaluations automatically

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
- **Customizable**: Full control over flag schema and evaluation logic

### Customization Guide

The example provides a starting point for feature flags. Common customizations:

#### 1. Multi-Variate Flags (A/B/C Testing)

Add support for multiple variants with different configurations:

```typescript
interface FeatureFlag {
  // ... existing fields ...

  variants?: {
    name: string;
    weight: number;  // Percentage allocated to this variant
    config: Record<string, any>;  // Variant-specific config
  }[];
}

// Example: Test 3 checkout flows
await manager.setFlag({
  key: 'checkout-experiment',
  enabled: true,
  variants: [
    { name: 'control', weight: 34, config: { flow: 'original' } },
    { name: 'variant-a', weight: 33, config: { flow: 'single-page' } },
    { name: 'variant-b', weight: 33, config: { flow: 'progressive' } }
  ],
  environments: ['prod']
}, 'prod');

// Evaluation returns variant assignment
const result = await manager.getVariant('checkout-experiment', {
  userId: 'user-123',
  environment: 'prod'
});

console.log(result.variant);  // 'variant-a'
console.log(result.config);   // { flow: 'single-page' }
```

#### 2. Custom Targeting Rules

Add location, device, or subscription-based targeting:

```typescript
interface FlagContext {
  userId?: string;
  teamId?: string;
  environment: string;

  // Custom targeting dimensions
  location?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  subscriptionPlan?: 'free' | 'pro' | 'enterprise';
  customAttributes?: Record<string, any>;
}

// Enhanced evaluation logic
async isEnabled(key: string, context: FlagContext) {
  const flag = await this.getFlag(key, context.environment);

  // Location-based targeting
  if (flag.targetLocations?.includes(context.location)) {
    return { enabled: true, reason: 'location-targeted' };
  }

  // Subscription plan requirement
  if (flag.requiresPlan && context.subscriptionPlan !== flag.requiresPlan) {
    return { enabled: false, reason: 'plan-not-eligible' };
  }

  // Device-specific flags
  if (flag.targetDevices?.includes(context.deviceType)) {
    return { enabled: true, reason: 'device-targeted' };
  }

  // Continue with standard evaluation...
}
```

#### 3. Time-Based Scheduling

Auto-enable/disable flags at specific times:

```typescript
interface FeatureFlag {
  // ... existing fields ...
  schedule?: {
    startTime?: Date;
    endTime?: Date;
  };
}

// Schedule Halloween feature
await manager.setFlag({
  key: 'halloween-theme',
  enabled: true,
  schedule: {
    startTime: new Date('2025-10-25T00:00:00Z'),
    endTime: new Date('2025-11-01T23:59:59Z')
  },
  environments: ['prod']
}, 'prod');

// Evaluation checks schedule
async isEnabled(key: string, context: FlagContext) {
  const flag = await this.getFlag(key, context.environment);

  if (flag.schedule) {
    const now = new Date();
    if (flag.schedule.startTime && now < flag.schedule.startTime) {
      return { enabled: false, reason: 'scheduled-not-started' };
    }
    if (flag.schedule.endTime && now > flag.schedule.endTime) {
      return { enabled: false, reason: 'scheduled-expired' };
    }
  }

  // Continue with standard evaluation...
}
```

#### 4. Integration with Analytics

Track flag evaluations for conversion analysis:

```typescript
import { analytics } from './analytics';

async isEnabled(key: string, context: FlagContext) {
  const result = await super.isEnabled(key, context);

  // Track evaluation event
  await analytics.track('feature_flag_evaluated', {
    flagKey: key,
    enabled: result.enabled,
    reason: result.reason,
    userId: context.userId,
    environment: context.environment,
    timestamp: new Date()
  });

  // Track impression for A/B test analysis
  if (result.enabled && context.userId) {
    await analytics.track('feature_flag_impression', {
      flagKey: key,
      userId: context.userId,
      variant: result.variant || 'default'
    });
  }

  return result;
}
```

#### 5. Admin Dashboard UI

Build a Vue/React admin panel to manage flags:

```vue
<!-- FlagManager.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { FeatureFlagManager } from './examples/feature-flag-manager';

const manager = new FeatureFlagManager();
const flags = ref([]);
const environments = ['dev', 'staging', 'prod'];

onMounted(async () => {
  await manager.init();
  flags.value = await manager.listFlags('prod');
});

const toggleFlag = async (flagKey: string, enabled: boolean) => {
  await manager.updateFlag(flagKey, { enabled }, 'prod');
};

const updateRollout = async (flagKey: string, percentage: number) => {
  await manager.updateFlag(flagKey, { rolloutPercentage: percentage }, 'prod');
};
</script>

<template>
  <div class="flag-manager">
    <h2>Feature Flags</h2>
    <div v-for="flag in flags" :key="flag.key" class="flag-card">
      <div class="flag-header">
        <h3>{{ flag.name }}</h3>
        <toggle v-model="flag.enabled" @change="toggleFlag(flag.key, $event)" />
      </div>
      <p>{{ flag.description }}</p>
      <div class="flag-controls">
        <label>
          Rollout: {{ flag.rolloutPercentage }}%
          <input
            type="range"
            :value="flag.rolloutPercentage"
            @input="updateRollout(flag.key, $event.target.value)"
            min="0"
            max="100"
          />
        </label>
      </div>
    </div>
  </div>
</template>
```

**Learn More**: See the complete [Feature Flags Guide](./feature-flags.md) for detailed patterns, troubleshooting, and advanced usage.

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
import { withSurrealDBPinia } from '@orb-zone/dotted-json/plugins/surrealdb-pinia';

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
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

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
import { dotted } from '@orb-zone/dotted-json';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({ baseDir: './config' });
await loader.init();

// FileLoader automatically resolves variants (env:prod, env:dev, etc.)
const config = await loader.load('config', {
  env: process.env.NODE_ENV || 'development'
});

// Use directly or spread into dotted schema
const data = dotted({
  ...config
});
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
import { withZod } from '@orb-zone/dotted-json/plugins/zod';
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
- [Performance Guide](./performance.md) - Optimization tips
- [GitHub Issues](https://github.com/orb-zone/dotted-json/issues) - Ask questions

---

## Migration Checklist

### Planning
- [ ] Identify all systems to migrate (i18n, feature flags, config, etc.)
- [ ] Document current data formats and schemas
- [ ] Choose migration strategy (big bang vs gradual)
- [ ] Set up test environment

### Data Migration
- [ ] Export data from old system
- [ ] Convert to JSöN format
- [ ] Validate with Zod schemas
- [ ] Test variant resolution
- [ ] Import to new system (FileLoader or SurrealDB)

### Code Migration
- [ ] Install `@orb-zone/dotted-json`
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
