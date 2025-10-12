# JSöN Examples

Production-ready examples demonstrating real-world patterns you can adapt for your application.

## Quick Start

```bash
# Run any example
bun run examples/basic-usage.ts

# With SurrealDB examples (requires database)
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
bun run examples/feature-flag-manager.ts
```

---

## Basic Examples

### [basic-usage.ts](./basic-usage.ts)

**Use Case**: Core functionality introduction

**Demonstrates**:
- Dot-prefixed expression evaluation
- Custom resolver functions
- Basic schema structure
- Synchronous evaluation

**Quick Start**:
```bash
bun run examples/basic-usage.ts
```

---

### [with-zod-validation.ts](./with-zod-validation.ts)

**Use Case**: Type-safe data validation with Zod

**Demonstrates**:
- Zod plugin integration
- Runtime type validation
- Schema validation for expressions
- Error handling for invalid data

**Quick Start**:
```bash
bun add zod  # Install Zod if not already installed
bun run examples/with-zod-validation.ts
```

**Learn More**: [Zod Plugin Documentation](../src/plugins/zod.ts)

---

## File Loading & Variants

### [file-loader-i18n.ts](./file-loader-i18n.ts)

**Use Case**: Internationalization with variant-aware file loading

**Demonstrates**:
- FileLoader with language variants
- Automatic best-match file selection
- Variant scoring (lang, gender, formality)
- Fallback handling

**File Structure**:
```
examples/data/locales/
├── strings.jsön              # Default
├── strings:en.jsön           # English
├── strings:es.jsön           # Spanish
└── strings:es:formal.jsön    # Spanish (formal)
```

**Quick Start**:
```bash
bun run examples/file-loader-i18n.ts
```

**Learn More**: [Variant System Design](../.specify/memory/variant-aware-file-loading.md)

---

### [variants-i18n.ts](./variants-i18n.ts)

**Use Case**: Advanced variant resolution patterns

**Demonstrates**:
- Multi-dimensional variants (lang, gender, formality)
- Tie-breaking logic when scores are equal
- Custom variant dimensions
- Variant scoring algorithm

**Quick Start**:
```bash
bun run examples/variants-i18n.ts
```

---

### [file-inheritance.ts](./file-inheritance.ts)

**Use Case**: Hierarchical configuration with file inheritance

**Demonstrates**:
- Base configuration with overrides
- Environment-specific configs
- File cascading patterns
- Merge strategies

**Quick Start**:
```bash
bun run examples/file-inheritance.ts
```

---

## SurrealDB Integration

### [feature-flag-manager.ts](./feature-flag-manager.ts) ⭐

**Use Case**: Production-ready feature flag system

**Demonstrates**:
- Real-time flag updates with LIVE queries
- Intelligent caching with Pinia Colada
- User/team targeting strategies
- Percentage rollouts with consistent hashing
- Environment-based flag management
- A/B testing support
- Flag analytics and monitoring

**Prerequisites**:
```bash
# Start SurrealDB
surreal start --bind 0.0.0.0:8000 --user root --pass root memory

# Install dependencies
bun add @orb-zone/dotted-json surrealdb @pinia/colada pinia vue
```

**Quick Start**:
```bash
bun run examples/feature-flag-manager.ts
```

**Learn More**: [Feature Flags Guide](../docs/feature-flags.md)

**Common Customizations**:
- Multi-variate flags (A/B/C testing)
- Custom targeting rules (location, device, plan tier)
- Integration with analytics platforms
- Flag scheduling (time-based activation)
- Admin dashboard UI

---

### [realtime-config-manager.ts](./realtime-config-manager.ts)

**Use Case**: Live configuration management with real-time updates

**Demonstrates**:
- Real-time config synchronization
- Environment-based configuration
- Configuration versioning
- Instant updates without restart

**Prerequisites**:
```bash
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
```

**Quick Start**:
```bash
bun run examples/realtime-config-manager.ts
```

---

### [i18n-translation-editor.ts](./i18n-translation-editor.ts)

**Use Case**: Live translation editing with admin interface

**Demonstrates**:
- Real-time translation updates
- Multi-language support
- Translation versioning
- Approval workflows
- Admin UI patterns

**Prerequisites**:
```bash
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
```

**Quick Start**:
```bash
bun run examples/i18n-translation-editor.ts
```

**UI Features**:
- Translation search and filtering
- Inline editing
- Diff view for changes
- Bulk import/export

---

### [surrealdb-auto-discovery.ts](./surrealdb-auto-discovery.ts)

**Use Case**: Auto-generate resolvers from SurrealDB schema

**Demonstrates**:
- Function discovery via `INFO FOR DATABASE`
- Automatic resolver generation from `fn::*` functions
- Type-safe function calls
- Schema introspection

**Prerequisites**:
```bash
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
```

**Quick Start**:
```bash
bun run examples/surrealdb-auto-discovery.ts
```

**Learn More**: [SurrealDB Plugin Documentation](../src/plugins/surrealdb.ts)

---

### [complete-workflow.ts](./complete-workflow.ts)

**Use Case**: End-to-end integration of all features

**Demonstrates**:
- Multiple plugin composition
- Real-world application architecture
- Best practices for production use
- Error handling and recovery

**Prerequisites**:
```bash
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
bun add zod @pinia/colada pinia vue
```

**Quick Start**:
```bash
bun run examples/complete-workflow.ts
```

---

## Example Categories

### By Use Case

| Use Case | Examples |
|----------|----------|
| **Feature Flags** | [feature-flag-manager.ts](./feature-flag-manager.ts) |
| **Internationalization (i18n)** | [file-loader-i18n.ts](./file-loader-i18n.ts), [variants-i18n.ts](./variants-i18n.ts), [i18n-translation-editor.ts](./i18n-translation-editor.ts) |
| **Configuration Management** | [realtime-config-manager.ts](./realtime-config-manager.ts), [file-inheritance.ts](./file-inheritance.ts) |
| **Type Validation** | [with-zod-validation.ts](./with-zod-validation.ts) |
| **Database Integration** | [surrealdb-auto-discovery.ts](./surrealdb-auto-discovery.ts), [complete-workflow.ts](./complete-workflow.ts) |

### By Complexity

| Level | Examples |
|-------|----------|
| **Beginner** | [basic-usage.ts](./basic-usage.ts), [with-zod-validation.ts](./with-zod-validation.ts) |
| **Intermediate** | [file-loader-i18n.ts](./file-loader-i18n.ts), [variants-i18n.ts](./variants-i18n.ts), [file-inheritance.ts](./file-inheritance.ts) |
| **Advanced** | [feature-flag-manager.ts](./feature-flag-manager.ts), [realtime-config-manager.ts](./realtime-config-manager.ts), [i18n-translation-editor.ts](./i18n-translation-editor.ts) |
| **Expert** | [surrealdb-auto-discovery.ts](./surrealdb-auto-discovery.ts), [complete-workflow.ts](./complete-workflow.ts) |

### By Plugin

| Plugin | Examples |
|--------|----------|
| **Zod** | [with-zod-validation.ts](./with-zod-validation.ts), [complete-workflow.ts](./complete-workflow.ts) |
| **SurrealDB** | [surrealdb-auto-discovery.ts](./surrealdb-auto-discovery.ts), [feature-flag-manager.ts](./feature-flag-manager.ts), [realtime-config-manager.ts](./realtime-config-manager.ts) |
| **Pinia Colada** | [feature-flag-manager.ts](./feature-flag-manager.ts), [realtime-config-manager.ts](./realtime-config-manager.ts), [i18n-translation-editor.ts](./i18n-translation-editor.ts) |
| **FileLoader** | [file-loader-i18n.ts](./file-loader-i18n.ts), [variants-i18n.ts](./variants-i18n.ts), [file-inheritance.ts](./file-inheritance.ts) |

---

## Running Examples

### Prerequisites

**Core Examples** (basic-usage, with-zod-validation, file-loader-i18n, variants-i18n, file-inheritance):
```bash
bun install
```

**SurrealDB Examples** (feature-flag-manager, realtime-config-manager, i18n-translation-editor, surrealdb-auto-discovery, complete-workflow):
```bash
# Install SurrealDB
brew install surrealdb/tap/surreal  # macOS
# or
curl -sSf https://install.surrealdb.com | sh  # Linux/macOS
# or
iwr https://windows.surrealdb.com -useb | iex  # Windows

# Start database
surreal start --bind 0.0.0.0:8000 --user root --pass root memory

# Install dependencies
bun add @orb-zone/dotted-json surrealdb @pinia/colada pinia vue
```

### Package Scripts

```bash
# Run specific example
bun run examples/feature-flag-manager.ts

# Or use npm scripts (if defined in package.json)
bun run example:flags
bun run example:i18n
bun run example:realtime
```

---

## Customization Guide

### Adapting Examples for Your Project

All examples are designed to be **copied and customized**:

1. **Copy the example** to your project:
   ```bash
   cp examples/feature-flag-manager.ts src/lib/feature-flags.ts
   ```

2. **Customize the schema** for your needs:
   ```typescript
   // Add your own fields
   interface MyFeatureFlag extends FeatureFlag {
     owner: string;
     jiraTicket: string;
     expiresAt?: Date;
   }
   ```

3. **Add custom logic**:
   ```typescript
   // Custom targeting rules
   if (context.subscriptionPlan === 'enterprise') {
     return { enabled: true, reason: 'enterprise-access' };
   }
   ```

4. **Integrate with your stack**:
   ```typescript
   // Add analytics tracking
   analytics.track('feature_flag_evaluated', {
     flag: key,
     enabled: result.enabled
   });
   ```

### Example Modification Patterns

**Pattern 1: Add Authentication**
```typescript
import { getUser } from './auth';

async isEnabled(flagKey: string, context: FlagContext) {
  const user = await getUser(context.userId);

  // Require authentication
  if (!user) {
    return { enabled: false, reason: 'not-authenticated' };
  }

  // Continue with evaluation...
}
```

**Pattern 2: Add Audit Logging**
```typescript
async setFlag(flag: FeatureFlag, environment: string) {
  const result = await super.setFlag(flag, environment);

  // Log flag change
  await auditLog.create({
    action: 'flag_updated',
    resource: flag.key,
    userId: currentUser.id,
    changes: flag
  });

  return result;
}
```

**Pattern 3: Add Webhooks**
```typescript
async setFlag(flag: FeatureFlag, environment: string) {
  const result = await super.setFlag(flag, environment);

  // Notify external systems
  await webhook.send('https://api.example.com/flags/updated', {
    flag: flag.key,
    enabled: flag.enabled,
    environment
  });

  return result;
}
```

---

## Testing Examples

### Unit Testing

```typescript
import { describe, test, expect } from 'bun:test';
import { FeatureFlagManager } from '../examples/feature-flag-manager';

describe('FeatureFlagManager', () => {
  test('evaluates percentage rollout correctly', async () => {
    const manager = new FeatureFlagManager();
    await manager.init();

    await manager.setFlag({
      key: 'test-flag',
      enabled: true,
      rolloutPercentage: 50
    }, 'test');

    const result = await manager.isEnabled('test-flag', {
      userId: 'user-123',
      environment: 'test'
    });

    expect(result).toHaveProperty('enabled');
    expect(result).toHaveProperty('reason');
  });
});
```

### Integration Testing

See [test/integration/](../test/integration/) for integration test examples with SurrealDB.

---

## Troubleshooting

### Common Issues

**Issue**: Example fails with "Module not found"

**Solution**: Install dependencies
```bash
bun install
bun add surrealdb @pinia/colada pinia vue  # For SurrealDB examples
```

---

**Issue**: SurrealDB connection refused

**Solution**: Start SurrealDB
```bash
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
```

---

**Issue**: Example runs but no output

**Solution**: Check console logs and increase debug level
```typescript
const plugin = await withSurrealDBPinia({
  // ...config
  live: {
    enabled: true,
    debug: true  // Enable debug logs
  }
});
```

---

## Contributing Examples

Have a great example to share? We'd love to add it!

**Guidelines**:
1. **Production-ready** - Should work without modification
2. **Well-documented** - Include comments explaining key concepts
3. **Self-contained** - All dependencies explicit
4. **Runnable** - Must include working Quick Start section

**Submission Process**:
1. Create example in `examples/` directory
2. Add entry to this README
3. Add Quick Start instructions
4. Submit PR with description

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full guidelines.

---

## Related Documentation

- [Main README](../README.md) - Library overview and installation
- [API Documentation](../docs/API.md) - Complete API reference
- [Migration Guide](../docs/migration.md) - Migrating from other libraries
- [Feature Flags Guide](../docs/feature-flags.md) - In-depth feature flag patterns
- [Performance Guide](../docs/performance.md) - Optimization strategies

---

## Next Steps

1. **Try basic examples** - Start with [basic-usage.ts](./basic-usage.ts)
2. **Explore your use case** - Find relevant example above
3. **Copy and customize** - Adapt example to your needs
4. **Read the docs** - Deep dive into [API](../docs/API.md) and [patterns](../docs/migration.md)
5. **Build something awesome** - Share your creation!

---

**Questions?**

- Open an issue: [GitHub Issues](https://github.com/orb-zone/dotted-json/issues)
- Read the docs: [Documentation](../docs/)
- Check the FAQ: [README FAQ](../README.md#faq)
