# Vue3 Expert Agent

**Domain**: Vue 3 Composition API, reactive patterns, TypeScript integration, best practices

**Last Updated**: 2025-10-08

## Domain Expertise

This agent specializes in:
- Vue 3 Composition API (script setup, composables)
- Reactivity system (`ref`, `computed`, `watch`, `reactive`)
- TypeScript integration with Vue
- Vue performance optimization patterns
- Pinia and Pinia Colada integration
- Vue ecosystem best practices
- Component architecture and lifecycle

## Constitutional Alignment

### Relevant Principles

**Framework-Agnostic Core** (Constitution):
- Core library has zero Vue dependencies
- Vue integration via optional plugins/composables
- Examples demonstrate Vue patterns without forcing Vue usage

**Example Quality** (Constitution):
- Vue examples MUST use Composition API (not Options API)
- Examples MUST demonstrate production-ready patterns
- Examples MUST use TypeScript with proper type inference
- Examples MUST avoid anti-patterns and performance pitfalls

## Vue 3 Best Practices

### Script Setup Pattern

✅ **DO** - Modern Composition API:
```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useSurrounded } from '@orbzone/surrounded';

interface Props {
  configId: string;
}

const props = defineProps<Props>();

// Computed for derived state (efficient, cached)
const config = useSurrounded(computed(() => `/config/${props.configId}`));

// TypeScript infers the type automatically
const isEnabled = computed(() => config.data.value?.enabled ?? false);
</script>
```

❌ **DON'T** - Unnecessary reactivity:
```vue
<script setup lang="ts">
// Anti-pattern: Creates new computed on every prop change
const config = useSurrounded(`/config/${props.configId}`);
</script>
```

### Computed vs Ref

✅ **DO** - Use computed for derived values:
```typescript
// Efficient: Only recalculates when dependencies change
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

// Efficient: Derived from reactive source
const configPath = computed(() => `/settings/${userId.value}`);
```

❌ **DON'T** - Create new objects in template:
```vue
<!-- Anti-pattern: Creates new object on every render -->
<ConfigEditor :settings="{ userId: userId, theme: 'dark' }" />

<!-- Better: Use computed -->
<ConfigEditor :settings="editorSettings" />

<script setup>
const editorSettings = computed(() => ({
  userId: userId.value,
  theme: 'dark'
}));
</script>
```

### Composables Pattern

✅ **DO** - Reusable composition functions:
```typescript
/**
 * Composable for managing feature flags with JSöN
 *
 * @param flagKey - The feature flag key
 * @returns Reactive feature flag state with helpers
 *
 * @example
 * ```vue
 * <script setup>
 * const { isEnabled, enable, disable } = useFeatureFlag('new-ui');
 * </script>
 *
 * <template>
 *   <button v-if="isEnabled" @click="disable">
 *     Disable New UI
 *   </button>
 * </template>
 * ```
 */
export function useFeatureFlag(flagKey: string) {
  const flags = useSurrounded('/feature-flags');

  const isEnabled = computed(() =>
    flags.data.value?.[flagKey]?.enabled ?? false
  );

  const enable = () => flags.mutate.value?.({ [flagKey]: { enabled: true } });
  const disable = () => flags.mutate.value?.({ [flagKey]: { enabled: false } });

  return {
    isEnabled,
    enable,
    disable,
    isLoading: flags.isLoading,
    error: flags.error
  };
}
```

### TypeScript Integration

✅ **DO** - Leverage type inference:
```typescript
import { z } from 'zod';

// Zod schema as single source of truth
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest'])
});

// Infer TypeScript type from Zod schema
type User = z.infer<typeof UserSchema>;

// Vue composable with inferred types
export function useUser(userId: string) {
  const userDoc = useSurrounded<User>(
    computed(() => `/users/${userId}`)
  );

  // TypeScript knows the shape of user.data.value
  const isAdmin = computed(() =>
    userDoc.data.value?.role === 'admin'
  );

  return { user: userDoc, isAdmin };
}
```

### Reactivity Performance

✅ **DO** - Optimize with computed:
```typescript
// Efficient: Computed value cached until dependencies change
const filteredItems = computed(() =>
  items.value.filter(item => item.category === selectedCategory.value)
);

// Efficient: Memoized object reference
const queryKey = computed(() => ({
  collection: 'users',
  filter: { active: true },
  limit: pageSize.value
}));
```

❌ **DON'T** - Create new references unnecessarily:
```typescript
// Anti-pattern: New object on every access
const queryKey = ref({ collection: 'users', filter: { active: true } });

// Anti-pattern: Inline computation in template
<div v-for="item in items.filter(i => i.active)" />
```

### Watch and Side Effects

✅ **DO** - Use watch for side effects:
```typescript
import { watch, watchEffect } from 'vue';

// Watch specific source
watch(userId, async (newId) => {
  // Load user preferences when userId changes
  await loadPreferences(newId);
}, { immediate: true });

// Watch multiple sources
watch([route, locale], ([newRoute, newLocale]) => {
  // Update page title when route or locale changes
  document.title = getLocalizedTitle(newRoute, newLocale);
});

// WatchEffect for automatic dependency tracking
watchEffect(() => {
  // Automatically tracks all reactive dependencies
  console.log(`Current user: ${userName.value}, Role: ${userRole.value}`);
});
```

❌ **DON'T** - Use watch for computed values:
```typescript
// Anti-pattern: Use computed instead
const fullName = ref('');
watch([firstName, lastName], () => {
  fullName.value = `${firstName.value} ${lastName.value}`;
});

// Better: Use computed
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
```

## Pinia Colada Integration

### Query Hook Pattern

✅ **DO** - Use JSöN with Pinia Colada caching:
```typescript
import { usePiniaColada } from '@orbzone/dotted-json/plugins/pinia-colada';

export function useConfig(configId: string) {
  return usePiniaColada(
    computed(() => `/config/${configId}`),
    {
      staleTime: 60000,              // Cache for 1 minute
      refetchOnWindowFocus: true,    // Refresh on tab focus
      enabled: computed(() => !!configId) // Conditional fetching
    }
  );
}
```

### Mutation Pattern

✅ **DO** - Handle mutations with optimistic updates:
```typescript
import { usePiniaColada } from '@orbzone/dotted-json/plugins/pinia-colada';

export function useConfigMutation() {
  const mutation = usePiniaColada('/config', {
    mutation: true,
    onMutate: async (newConfig) => {
      // Optimistic update
      return { previousConfig: currentConfig.value };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousConfig) {
        restoreConfig(context.previousConfig);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      invalidateQueries('/config');
    }
  });

  return mutation;
}
```

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Reactive Value Without Computed

**Problem**: Creating reactive dependencies in props without computed wrapper
```vue
<script setup>
// Problem: New query on every prop change
const data = useSurrounded(`/users/${props.userId}`);
</script>
```

**Solution**: Wrap in computed for efficiency
```vue
<script setup>
const data = useSurrounded(computed(() => `/users/${props.userId}`));
</script>
```

**Why**: Without computed, the composable doesn't know the value is reactive and may not update correctly or may create unnecessary new queries.

### ❌ Anti-Pattern 2: Custom Resolver for Built-in Functionality

**Problem**: Implementing features manually that JSöN already provides
```typescript
// Anti-pattern: Custom resolver for what should be data references
const resolvers = {
  getUserName: (userId) => users.find(u => u.id === userId)?.name
};
```

**Solution**: Use JSöN's path resolution
```json
{
  "userName": ".users[userId].name",
  "userId": "123",
  "users": { "123": { "name": "Alice" } }
}
```

### ❌ Anti-Pattern 3: Mutating Reactive Objects Directly

**Problem**: Direct mutation breaks reactivity tracking
```typescript
// Anti-pattern: Direct mutation
config.value.settings.theme = 'dark';
```

**Solution**: Replace entire object or use reactive()
```typescript
// Option 1: Replace object
config.value = { ...config.value, settings: { ...config.value.settings, theme: 'dark' } };

// Option 2: Use reactive() for nested mutations
const config = reactive({ settings: { theme: 'light' } });
config.settings.theme = 'dark'; // Works with reactive()
```

### ❌ Anti-Pattern 4: Using ref() for Complex Objects

**Problem**: `ref()` with deep objects doesn't track nested changes efficiently
```typescript
// Anti-pattern: Nested mutations won't trigger updates efficiently
const user = ref({ profile: { name: 'Alice', age: 30 } });
user.value.profile.age = 31; // This works but is inefficient
```

**Solution**: Use `reactive()` for objects with nested properties
```typescript
// Better: reactive() tracks nested properties efficiently
const user = reactive({ profile: { name: 'Alice', age: 30 } });
user.profile.age = 31; // Efficient reactivity
```

## Example Structure

### Production-Ready Component Example

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSurrounded } from '@orbzone/surrounded';
import { z } from 'zod';

/**
 * Feature Flag Manager Component
 *
 * Demonstrates:
 * - Computed for reactive queries
 * - TypeScript with Zod inference
 * - Pinia Colada caching
 * - Error handling
 * - Loading states
 */

// Zod schema with type inference
const FeatureFlagSchema = z.object({
  enabled: z.boolean(),
  rollout: z.number().min(0).max(100),
  description: z.string()
});

type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

interface Props {
  flagKey: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  updated: [flag: FeatureFlag];
  error: [error: Error];
}>();

// Computed for efficient reactive query
const flagPath = computed(() => `/feature-flags/${props.flagKey}`);

// Use JSöN with Pinia Colada caching
const { data, isLoading, error, mutate, invalidate } = useSurrounded<FeatureFlag>(
  flagPath,
  { staleTime: 30000 }
);

// Local editing state
const isEditing = ref(false);
const editForm = ref<FeatureFlag | null>(null);

// Computed derived state
const currentFlag = computed(() => data.value);
const hasChanges = computed(() =>
  editForm.value && JSON.stringify(editForm.value) !== JSON.stringify(currentFlag.value)
);

// Actions
const startEdit = () => {
  editForm.value = currentFlag.value ? { ...currentFlag.value } : null;
  isEditing.value = true;
};

const cancelEdit = () => {
  editForm.value = null;
  isEditing.value = false;
};

const saveChanges = async () => {
  if (!editForm.value) return;

  try {
    await mutate(editForm.value);
    emit('updated', editForm.value);
    isEditing.value = false;
  } catch (err) {
    emit('error', err as Error);
  }
};

const toggleEnabled = async () => {
  if (!currentFlag.value) return;

  await mutate({
    ...currentFlag.value,
    enabled: !currentFlag.value.enabled
  });
};

const refresh = () => invalidate();
</script>

<template>
  <div class="feature-flag-manager">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      Loading feature flag...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error">
      Error: {{ error.message }}
      <button @click="refresh">Retry</button>
    </div>

    <!-- Content -->
    <div v-else-if="currentFlag" class="content">
      <!-- Display Mode -->
      <div v-if="!isEditing" class="display-mode">
        <h3>{{ props.flagKey }}</h3>
        <p>{{ currentFlag.description }}</p>
        <div class="status">
          <span :class="{ enabled: currentFlag.enabled, disabled: !currentFlag.enabled }">
            {{ currentFlag.enabled ? 'Enabled' : 'Disabled' }}
          </span>
          <span class="rollout">Rollout: {{ currentFlag.rollout }}%</span>
        </div>

        <div class="actions">
          <button @click="toggleEnabled">
            {{ currentFlag.enabled ? 'Disable' : 'Enable' }}
          </button>
          <button @click="startEdit">Edit</button>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else class="edit-mode">
        <h3>Edit {{ props.flagKey }}</h3>
        <form @submit.prevent="saveChanges">
          <label>
            Description:
            <input v-model="editForm!.description" type="text" />
          </label>

          <label>
            Enabled:
            <input v-model="editForm!.enabled" type="checkbox" />
          </label>

          <label>
            Rollout (%):
            <input
              v-model.number="editForm!.rollout"
              type="number"
              min="0"
              max="100"
            />
          </label>

          <div class="form-actions">
            <button type="submit" :disabled="!hasChanges">Save</button>
            <button type="button" @click="cancelEdit">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty">
      Feature flag not found
    </div>
  </div>
</template>

<style scoped>
.feature-flag-manager {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.loading {
  color: #666;
  font-style: italic;
}

.error {
  color: #d00;
  padding: 0.5rem;
  background: #fee;
  border-radius: 4px;
}

.status {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
}

.enabled {
  color: #0a0;
  font-weight: bold;
}

.disabled {
  color: #666;
}

.actions, .form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## Documentation Standards

### Component Documentation

```typescript
/**
 * useSurrounded - Vue composable for reactive JSöN queries
 *
 * Integrates JSöN with Vue 3 reactivity system and Pinia Colada caching.
 *
 * @param path - Reactive path or computed path to JSöN document
 * @param options - Query options (staleTime, refetchOnWindowFocus, etc.)
 * @returns Reactive query result with data, loading, error states
 *
 * @example
 * ```vue
 * <script setup>
 * import { computed } from 'vue';
 * import { useSurrounded } from '@orbzone/surrounded';
 *
 * const userId = ref('123');
 *
 * // Reactive query - updates when userId changes
 * const user = useSurrounded(computed(() => `/users/${userId.value}`));
 *
 * // TypeScript inference
 * const userName = computed(() => user.data.value?.name ?? 'Unknown');
 * </script>
 *
 * <template>
 *   <div v-if="user.isLoading">Loading...</div>
 *   <div v-else-if="user.error">Error: {{ user.error.message }}</div>
 *   <div v-else>{{ userName }}</div>
 * </template>
 * ```
 */
export function useSurrounded<T = any>(
  path: MaybeRefOrGetter<string>,
  options?: UseSurroundedOptions
): UseSurroundedResult<T> {
  // Implementation
}
```

## Resources

### Vue 3 Documentation
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [TypeScript with Vue](https://vuejs.org/guide/typescript/overview.html)
- [Performance Optimization](https://vuejs.org/guide/best-practices/performance.html)

### Pinia Resources
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Pinia Colada Documentation](https://pinia-colada.esm.dev/)

### Design Documents
- `.specify/memory/constitution.md` - Framework-agnostic principles
- `.specify/memory/surrealdb-vue-vision.md` - Vue + JSöN integration vision
- `.specify/memory/integration-patterns.md` - Production patterns

### Implementation References
- `src/plugins/pinia-colada.ts` - Pinia Colada plugin implementation
- `examples/` - Production-ready Vue examples

---

**When to Use This Agent**:
- Writing Vue 3 code examples
- Reviewing Vue components for best practices
- Optimizing Vue reactivity patterns
- Creating Vue composables
- Integrating JSöN with Vue ecosystem
- Fixing Vue anti-patterns in documentation

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "vue3-expert",
  description: "Review Vue examples for best practices",
  prompt: "Review all Vue code examples in docs/ and examples/ for anti-patterns, inefficient reactivity, and opportunities to use computed(). Focus on the MIGRATION.md Vue component examples and ensure they demonstrate production-ready patterns with proper TypeScript inference."
});
```
