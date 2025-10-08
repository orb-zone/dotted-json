# Feature Flags with JSöN

## Overview

Learn how to build production-ready feature flag systems using dotted-json's plugin architecture. This guide demonstrates real-time flag management with intelligent caching, user targeting, and percentage rollouts.

**Production Example**: See [examples/feature-flag-manager.ts](../examples/feature-flag-manager.ts) for complete, runnable implementation.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [Usage Patterns](#usage-patterns)
- [Customization Guide](#customization-guide)
- [Best Practices](#best-practices)
- [Comparison to Commercial Services](#comparison-to-commercial-services)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
bun add @orbzone/dotted-json surrealdb @pinia/colada pinia vue

# Start SurrealDB
surreal start --bind 0.0.0.0:8000 --user root --pass root memory
```

### Basic Usage

```typescript
import { FeatureFlagManager } from './examples/feature-flag-manager';

// Initialize manager
const manager = new FeatureFlagManager();
await manager.init();

// Create a flag
await manager.setFlag({
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: 'Next-gen dashboard with real-time analytics',
  enabled: true,
  rolloutPercentage: 50,  // Gradual rollout to 50% of users
  environments: ['prod']
}, 'prod');

// Check if flag is enabled for a user
const result = await manager.isEnabled('new-dashboard', {
  userId: 'user-123',
  environment: 'prod'
});

console.log(`Flag enabled: ${result.enabled}`);
console.log(`Reason: ${result.reason}`);
```

---

## Core Concepts

### 1. Real-Time Updates with LIVE Queries

Feature flags sync automatically across all connected clients using SurrealDB's LIVE queries:

```typescript
// Changes made in one client...
await manager.setFlag({
  key: 'maintenance-mode',
  enabled: true  // Enable maintenance mode
}, 'prod');

// ...are immediately reflected in all other clients (no polling!)
```

**Benefits:**
- ✅ **Zero latency** - No polling intervals, instant updates
- ✅ **Efficient** - Push-based, not pull-based
- ✅ **Consistent** - All clients see the same state simultaneously

### 2. Intelligent Caching with Pinia Colada

Flag evaluations are cached to minimize database queries:

```typescript
// First call: Queries database
await manager.isEnabled('feature-x', { userId: 'user-123' });

// Subsequent calls: Served from cache (milliseconds)
await manager.isEnabled('feature-x', { userId: 'user-123' });

// Cache invalidated on flag update via LIVE query
// Next call: Fresh data from database
```

**Cache Strategy:**
- **Stale time**: 60 seconds (configurable)
- **Invalidation**: Automatic on flag changes
- **Per-user**: Each user's evaluation is cached independently

### 3. Targeting Strategies

#### User Targeting
Enable flags for specific users:

```typescript
await manager.setFlag({
  key: 'beta-features',
  enabled: true,
  targetUsers: ['user-alice', 'user-bob'],  // Only these users
  environments: ['prod']
}, 'prod');
```

#### Team Targeting
Enable flags for entire teams:

```typescript
await manager.setFlag({
  key: 'internal-tools',
  enabled: true,
  targetTeams: ['engineering', 'product'],  // All team members
  environments: ['prod']
}, 'prod');
```

#### Percentage Rollout
Gradually roll out to a percentage of users:

```typescript
await manager.setFlag({
  key: 'new-feature',
  enabled: true,
  rolloutPercentage: 25,  // 25% of users
  environments: ['prod']
}, 'prod');
```

**Consistent Hashing:**
- Same user always gets same result (stable rollout)
- No random flickering between enabled/disabled
- Deterministic based on `userId` + `flagKey`

#### Environment-Based
Control flags per environment:

```typescript
// Enabled in staging only
await manager.setFlag({
  key: 'experimental-api',
  enabled: true,
  environments: ['staging']
}, 'staging');

// Disabled in production
const result = await manager.isEnabled('experimental-api', {
  environment: 'prod'
});
// result.enabled === false
```

---

## Architecture

### Plugin Composition

The feature flag manager is built by composing existing JSöN plugins:

```
┌─────────────────────────────────────┐
│   FeatureFlagManager (Example)     │
│   Business logic + opinions        │
└─────────────────────────────────────┘
              │
              ├─────────────────┐
              ↓                 ↓
┌──────────────────────┐  ┌─────────────────────┐
│  SurrealDB Plugin    │  │  Pinia Colada       │
│  - LIVE queries      │  │  - Cache management │
│  - Persistence       │  │  - Invalidation     │
└──────────────────────┘  └─────────────────────┘
              │
              ↓
┌──────────────────────────────────────┐
│      dotted-json Core                │
│      Expression evaluation           │
└──────────────────────────────────────┘
```

**Key Components:**

1. **SurrealDB Plugin**: Provides real-time sync and persistence
2. **Pinia Colada Plugin**: Manages caching and query state
3. **FeatureFlagManager**: Combines plugins with business logic

### Data Model

Flags are stored in SurrealDB with the following schema:

```sql
DEFINE TABLE feature_flags SCHEMAFULL;

DEFINE FIELD key ON TABLE feature_flags TYPE string;
DEFINE FIELD name ON TABLE feature_flags TYPE string;
DEFINE FIELD description ON TABLE feature_flags TYPE string;
DEFINE FIELD enabled ON TABLE feature_flags TYPE bool;
DEFINE FIELD rolloutPercentage ON TABLE feature_flags TYPE option<int>;
DEFINE FIELD targetUsers ON TABLE feature_flags TYPE option<array>;
DEFINE FIELD targetTeams ON TABLE feature_flags TYPE option<array>;
DEFINE FIELD environments ON TABLE feature_flags TYPE option<array>;
DEFINE FIELD meta ON TABLE feature_flags TYPE option<object>;

DEFINE INDEX idx_flag_key ON TABLE feature_flags COLUMNS key UNIQUE;
DEFINE INDEX idx_flag_env ON TABLE feature_flags COLUMNS environments;
```

---

## Usage Patterns

### Pattern 1: Progressive Rollout

Gradually increase rollout percentage:

```typescript
// Week 1: Internal testing (5%)
await manager.setFlag({
  key: 'new-checkout',
  enabled: true,
  rolloutPercentage: 5,
  targetTeams: ['engineering'],  // Plus all engineers
  environments: ['prod']
}, 'prod');

// Week 2: Beta users (25%)
await manager.updateFlag('new-checkout', {
  rolloutPercentage: 25,
  targetTeams: ['engineering', 'beta-testers']
}, 'prod');

// Week 3: Half of users (50%)
await manager.updateFlag('new-checkout', {
  rolloutPercentage: 50
}, 'prod');

// Week 4: Full rollout (100%)
await manager.updateFlag('new-checkout', {
  rolloutPercentage: 100
}, 'prod');
```

### Pattern 2: Kill Switch

Emergency feature disable:

```typescript
// Normal operation
await manager.setFlag({
  key: 'payment-processor',
  enabled: true,
  environments: ['prod']
}, 'prod');

// Emergency: Payment processor down
// Disable immediately (real-time sync to all clients)
await manager.setFlag({
  key: 'payment-processor',
  enabled: false,
  environments: ['prod']
}, 'prod');

// All clients immediately see the change
// No need to redeploy or restart
```

### Pattern 3: A/B Testing

Test multiple variants:

```typescript
// Variant A: Original checkout
await manager.setFlag({
  key: 'checkout-variant-a',
  enabled: true,
  rolloutPercentage: 50,  // 50% of users
  environments: ['prod']
}, 'prod');

// Variant B: New checkout
await manager.setFlag({
  key: 'checkout-variant-b',
  enabled: true,
  rolloutPercentage: 50,  // Other 50% of users
  environments: ['prod']
}, 'prod');

// In your app:
const variantA = await manager.isEnabled('checkout-variant-a', { userId });
const variantB = await manager.isEnabled('checkout-variant-b', { userId });

if (variantA.enabled) {
  // Show original checkout
} else if (variantB.enabled) {
  // Show new checkout
} else {
  // Fallback
}
```

### Pattern 4: Scheduled Releases

Use environment variables or external schedulers:

```typescript
// Use with cron jobs or GitHub Actions
import { FeatureFlagManager } from './examples/feature-flag-manager';

const manager = new FeatureFlagManager();
await manager.init();

// Enable at specific time
const now = new Date();
const releaseDate = new Date('2025-10-15T00:00:00Z');

if (now >= releaseDate) {
  await manager.setFlag({
    key: 'halloween-theme',
    enabled: true,
    environments: ['prod']
  }, 'prod');
}
```

### Pattern 5: Multi-Environment Testing

Test in staging before production:

```typescript
// Stage 1: Enable in dev
await manager.setFlag({
  key: 'new-api',
  enabled: true,
  environments: ['dev']
}, 'dev');

// Stage 2: Enable in staging
await manager.setFlag({
  key: 'new-api',
  enabled: true,
  environments: ['staging']
}, 'staging');

// Stage 3: Gradual prod rollout
await manager.setFlag({
  key: 'new-api',
  enabled: true,
  rolloutPercentage: 10,
  environments: ['prod']
}, 'prod');
```

---

## Customization Guide

The example implementation provides a starting point. Common customizations:

### Custom Flag Schema

Add your own fields:

```typescript
interface CustomFeatureFlag extends FeatureFlag {
  // Custom fields
  owner?: string;
  jiraTicket?: string;
  expiresAt?: Date;
  tags?: string[];

  // Multi-variate testing
  variants?: {
    name: string;
    weight: number;
    config: Record<string, any>;
  }[];
}
```

### Custom Targeting Rules

Add location, device, or plan-based targeting:

```typescript
interface FlagContext {
  userId?: string;
  teamId?: string;
  environment: string;

  // Custom context
  location?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  subscriptionPlan?: 'free' | 'pro' | 'enterprise';
  userAttributes?: Record<string, any>;
}

// Custom evaluation logic
async isEnabled(key: string, context: FlagContext) {
  const flag = await this.getFlag(key, context.environment);

  // Location-based targeting
  if (flag.targetLocations?.includes(context.location)) {
    return { enabled: true, reason: 'location-targeted' };
  }

  // Plan-based targeting
  if (flag.requiresPlan && context.subscriptionPlan !== flag.requiresPlan) {
    return { enabled: false, reason: 'plan-not-eligible' };
  }

  // ... rest of evaluation logic
}
```

### Analytics Integration

Track flag evaluations:

```typescript
import { analytics } from './analytics';

async isEnabled(key: string, context: FlagContext) {
  const result = await super.isEnabled(key, context);

  // Track evaluation
  await analytics.track('feature_flag_evaluated', {
    flagKey: key,
    enabled: result.enabled,
    reason: result.reason,
    userId: context.userId,
    environment: context.environment,
    timestamp: new Date()
  });

  return result;
}
```

### Custom Rollout Algorithms

Replace consistent hashing with your own:

```typescript
// Time-based rollout (gradually increase over 24 hours)
function timeBasedRollout(flagKey: string, startTime: Date, endTime: Date): number {
  const now = Date.now();
  const start = startTime.getTime();
  const end = endTime.getTime();

  if (now < start) return 0;
  if (now > end) return 100;

  // Linear interpolation
  const progress = (now - start) / (end - start);
  return Math.floor(progress * 100);
}

// Use in evaluation
const currentRollout = timeBasedRollout(
  flag.key,
  flag.metadata.startTime,
  flag.metadata.endTime
);

if (userHash < currentRollout) {
  return { enabled: true, reason: 'time-based-rollout' };
}
```

---

## Best Practices

### 1. Flag Naming Conventions

Use consistent, descriptive names:

```typescript
// ✅ Good
'new-checkout-flow'
'experimental-search-algorithm'
'maintenance-mode'
'dark-mode-ui'

// ❌ Bad
'flag1'
'test'
'new-feature'
'temp'
```

### 2. Default to Disabled

Always default flags to `false` for safety:

```typescript
// ✅ Good - Explicit enable
await manager.setFlag({
  key: 'risky-feature',
  enabled: false,  // Explicit default
  environments: ['prod']
}, 'prod');

// Enable only when ready
await manager.updateFlag('risky-feature', { enabled: true }, 'prod');
```

### 3. Environment Isolation

Keep environments strictly separated:

```typescript
// ✅ Good - Environment-specific
await manager.setFlag({
  key: 'debug-mode',
  enabled: true,
  environments: ['dev', 'staging']  // Not in prod
}, 'dev');

// ❌ Bad - Too broad
await manager.setFlag({
  key: 'debug-mode',
  enabled: true,
  environments: ['dev', 'staging', 'prod']  // Dangerous!
}, 'dev');
```

### 4. Clean Up Old Flags

Remove flags after full rollout:

```typescript
// After feature is 100% rolled out and stable
await manager.deleteFlag('new-checkout', 'prod');

// Update code to remove flag checks
// Before:
if (await manager.isEnabled('new-checkout', { userId })) {
  // New checkout
} else {
  // Old checkout
}

// After:
// New checkout (flag removed, code simplified)
```

### 5. Document Flag Purpose

Always include clear descriptions:

```typescript
await manager.setFlag({
  key: 'payment-processor-v2',
  name: 'Payment Processor V2',
  description: 'Switches to new Stripe integration. Rollback plan: disable flag, incidents auto-route to #payments-oncall',
  enabled: true,
  metadata: {
    owner: 'payments-team',
    jiraTicket: 'PAY-1234',
    rollbackPlan: 'Disable flag and alert #payments-oncall'
  }
}, 'prod');
```

### 6. Monitor Flag Evaluations

Track flag usage to identify stale flags:

```typescript
// Flags not evaluated in 30 days are candidates for removal
const staleFlags = await manager.getStaleFlags(30);

console.log('Stale flags:', staleFlags.map(f => f.key));
// ['old-feature', 'unused-experiment', ...]
```

---

## Comparison to Commercial Services

### vs. LaunchDarkly / Split.io

**JSöN Feature Flags (Example)**:
- ✅ **Cost**: Free (self-hosted)
- ✅ **Customization**: Full control over schema and logic
- ✅ **Real-time**: SurrealDB LIVE queries
- ✅ **Privacy**: Data stays in your infrastructure
- ❌ **UI**: No admin dashboard (DIY)
- ❌ **SDKs**: No mobile SDKs (web only)
- ❌ **Scale**: Depends on SurrealDB capacity

**LaunchDarkly**:
- ✅ **UI**: Polished admin dashboard
- ✅ **SDKs**: Mobile, backend, frontend
- ✅ **Scale**: Managed, high availability
- ❌ **Cost**: $$ (starts at $8/seat/month)
- ❌ **Vendor lock-in**: Proprietary platform

**When to use JSöN**:
- Self-hosted infrastructure
- Custom targeting logic
- Privacy-sensitive data
- Learning/experimentation

**When to use LaunchDarkly**:
- Non-technical stakeholders need UI
- Multi-platform (iOS, Android, backend)
- Enterprise compliance requirements

### vs. Unleash

**Unleash** is open-source and similar to JSöN approach:
- ✅ Self-hosted
- ✅ Admin UI included
- ❌ More complex setup (PostgreSQL, Redis, Node.js)
- ❌ Less customizable (fixed data model)

**JSöN** is lighter-weight and more flexible, but requires building your own UI.

---

## Advanced Topics

### Integration with Existing Systems

#### Import from LaunchDarkly

```typescript
import { LaunchDarklyClient } from 'launchdarkly-node-server-sdk';

// Fetch flags from LaunchDarkly
const ldClient = new LaunchDarklyClient('sdk-key');
const allFlags = await ldClient.allFlagsState({ key: 'context-key' });

// Migrate to JSöN
for (const [key, value] of Object.entries(allFlags.allValues())) {
  await manager.setFlag({
    key,
    name: key,
    description: `Migrated from LaunchDarkly`,
    enabled: value as boolean,
    environments: ['prod']
  }, 'prod');
}
```

#### Sync with Feature Flag Files

```typescript
import { readFile } from 'fs/promises';

// Read flags from YAML/JSON config
const configFile = await readFile('./flags.yml', 'utf-8');
const flags = YAML.parse(configFile);

// Sync to database
for (const flag of flags) {
  await manager.setFlag(flag, flag.environment);
}
```

### Multi-Tenant Feature Flags

Support per-tenant flags:

```typescript
interface TenantFlagContext extends FlagContext {
  tenantId: string;
}

// Tenant-specific flag
await manager.setFlag({
  key: 'tenant-acme-new-feature',
  enabled: true,
  metadata: {
    tenantId: 'acme-corp'
  }
}, 'prod');

// Evaluation with tenant context
const result = await manager.isEnabled('tenant-acme-new-feature', {
  userId: 'user-123',
  tenantId: 'acme-corp',
  environment: 'prod'
});
```

---

## Troubleshooting

### Flags Not Updating in Real-Time

**Problem**: Flag changes don't appear immediately

**Solution**: Check LIVE query connection

```typescript
// Enable debug logging
const plugin = await withSurrealDBPinia({
  url: 'ws://localhost:8000/rpc',
  namespace: 'app',
  database: 'main',
  live: {
    enabled: true,
    debug: true,  // Enable debug logs
    onUpdate: (event) => {
      console.log('LIVE update:', event);
    }
  }
});
```

### High Cache Miss Rate

**Problem**: Too many database queries

**Solution**: Increase stale time

```typescript
const plugin = await withSurrealDBPinia({
  // ...config
  ions: {
    'feature-flags': {
      staleTime: 300_000  // 5 minutes (default: 60s)
    }
  }
});
```

### Inconsistent Rollout Behavior

**Problem**: Same user gets different results

**Solution**: Ensure consistent userId

```typescript
// ❌ Bad - User ID changes between calls
isEnabled('flag', { userId: Math.random().toString() });

// ✅ Good - Stable user ID
isEnabled('flag', { userId: 'user-123' });
```

---

## Next Steps

1. **Copy the example**: Start with [examples/feature-flag-manager.ts](../examples/feature-flag-manager.ts)
2. **Customize schema**: Add fields relevant to your use case
3. **Build admin UI**: Create a Vue/React dashboard (see [examples/i18n-translation-editor.ts](../examples/i18n-translation-editor.ts) for reference)
4. **Add analytics**: Track flag evaluations and conversions
5. **Integrate with CI/CD**: Automate flag deployments

---

## Related Documentation

- [Migration Guide](./MIGRATION.md#from-launchdarkly-feature-flags) - Migrating from other flag services
- [SurrealDB Plugin](../src/plugins/surrealdb-pinia.ts) - Real-time database integration
- [Pinia Colada Plugin](../src/plugins/pinia-colada.ts) - Caching and state management
- [Production Examples](../examples/README.md) - More real-world patterns

---

**Questions or Issues?**

Open an issue on [GitHub](https://github.com/orbzone/dotted-json/issues) or check the [examples directory](../examples/) for more patterns.
