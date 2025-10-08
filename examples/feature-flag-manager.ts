/**
 * Feature Flag Manager Example
 *
 * Demonstrates a production-ready feature flag system with:
 * - Environment-based configuration (dev/staging/prod)
 * - User/team-based targeting
 * - Percentage rollouts
 * - Real-time flag updates via LIVE queries
 * - A/B testing support
 * - Flag analytics and monitoring
 *
 * Use Case:
 * - Progressive feature rollouts
 * - A/B testing experiments
 * - Kill switches for emergency shutdowns
 * - User/team-specific features
 * - Environment-based configuration
 *
 * @example
 * ```bash
 * # Start SurrealDB
 * surreal start --bind 0.0.0.0:8000 --user root --pass root memory
 *
 * # Run feature flag manager
 * bun run examples/feature-flag-manager.ts
 * ```
 */

import { dotted } from '../src/index.js';
import { withSurrealDBPinia } from '../src/plugins/surrealdb-pinia.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Feature flag configuration
 */
interface FeatureFlag {
  /** Unique flag key */
  key: string;
  /** Human-readable name */
  name: string;
  /** Flag description */
  description: string;
  /** Flag status */
  enabled: boolean;
  /** Rollout percentage (0-100) */
  rolloutPercentage?: number;
  /** User IDs to target */
  targetUsers?: string[];
  /** Team IDs to target */
  targetTeams?: string[];
  /** Environments where flag is active */
  environments?: string[];
  /** Flag metadata */
  metadata?: {
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];
  };
}

/**
 * Flag evaluation context
 */
interface FlagContext {
  userId?: string;
  teamId?: string;
  environment: 'dev' | 'staging' | 'prod';
  custom?: Record<string, any>;
}

/**
 * Flag evaluation result
 */
interface FlagEvaluation {
  key: string;
  enabled: boolean;
  reason: 'targeted_user' | 'targeted_team' | 'rollout' | 'global' | 'disabled';
  metadata?: any;
}

// ============================================================================
// Feature Flag Manager
// ============================================================================

class FeatureFlagManager {
  private plugin: Awaited<ReturnType<typeof withSurrealDBPinia>> | null = null;
  private flagCache = new Map<string, FeatureFlag>();
  private evaluationLog: FlagEvaluation[] = [];

  /**
   * Initialize feature flag manager
   */
  async init() {
    console.log('🚩 Initializing Feature Flag Manager...');

    this.plugin = await withSurrealDBPinia({
      url: 'ws://localhost:8000/rpc',
      namespace: 'features',
      database: 'flags',
      auth: {
        type: 'root',
        username: 'root',
        password: 'root'
      },

      // Cache flags for fast evaluation
      ions: {
        'flags': {
          staleTime: 60_000,   // Flags fresh for 1 minute
          gcTime: 300_000      // Keep in cache for 5 minutes
        }
      },

      // Real-time flag updates
      live: {
        enabled: true,
        ions: ['flags'],
        onUpdate: (event) => {
          console.log(`\n🔔 Flag Update: ${event.action}`);
          console.log(`   Environment: ${JSON.stringify(event.variants)}`);

          // Invalidate local cache on update
          const cacheKey = JSON.stringify(event.variants);
          this.flagCache.delete(cacheKey);
        }
      },

      // Performance monitoring
      metrics: true,
      onMetrics: (metrics) => {
        if (metrics.operation === 'load' && metrics.cacheHit === false) {
          console.log(`   📊 Loaded flags from DB: ${metrics.duration.toFixed(2)}ms`);
        }
      }
    });

    console.log('✅ Feature Flag Manager initialized\n');
  }

  /**
   * Create or update a feature flag
   */
  async setFlag(
    flag: FeatureFlag,
    environment: 'dev' | 'staging' | 'prod' = 'dev'
  ): Promise<void> {
    if (!this.plugin) throw new Error('Manager not initialized');

    console.log(`💾 Setting flag: ${flag.key} (${environment})`);
    console.log(`   Enabled: ${flag.enabled}`);
    if (flag.rolloutPercentage !== undefined) {
      console.log(`   Rollout: ${flag.rolloutPercentage}%`);
    }

    // Load existing flags
    let flags: Record<string, FeatureFlag>;
    try {
      const data = dotted(
        { '.flags': `db.loadIon("flags", { env: "${environment}" })` },
        { resolvers: this.plugin.resolvers }
      );
      flags = await data.get('flags') || {};
    } catch {
      flags = {};
    }

    // Update flag
    flags[flag.key] = {
      ...flag,
      metadata: {
        ...flag.metadata,
        updatedAt: new Date()
      }
    };

    // Save to database
    await this.plugin.loader.save('flags', flags, { env: environment });

    // Invalidate cache
    this.flagCache.delete(JSON.stringify({ env: environment }));
    this.plugin.invalidateQueries(['ion', 'flags']);

    console.log(`✅ Flag saved\n`);
  }

  /**
   * Get all flags for an environment
   */
  async getFlags(environment: 'dev' | 'staging' | 'prod'): Promise<Record<string, FeatureFlag>> {
    if (!this.plugin) throw new Error('Manager not initialized');

    const cacheKey = JSON.stringify({ env: environment });

    // Check local cache first
    if (this.flagCache.has(cacheKey)) {
      console.log(`   💨 Using cached flags for ${environment}`);
      return this.flagCache.get(cacheKey) as any;
    }

    // Load from database
    console.log(`📖 Loading flags for ${environment}...`);

    try {
      const data = dotted(
        { '.flags': `db.loadIon("flags", { env: "${environment}" })` },
        { resolvers: this.plugin.resolvers }
      );

      const flags = await data.get('flags') || {};
      this.flagCache.set(cacheKey, flags);

      return flags;
    } catch {
      return {};
    }
  }

  /**
   * Evaluate a feature flag for a user/team
   */
  async isEnabled(
    flagKey: string,
    context: FlagContext
  ): Promise<FlagEvaluation> {
    const flags = await this.getFlags(context.environment);
    const flag = flags[flagKey];

    // Flag doesn't exist or is disabled
    if (!flag || !flag.enabled) {
      const result: FlagEvaluation = {
        key: flagKey,
        enabled: false,
        reason: 'disabled'
      };
      this.logEvaluation(result);
      return result;
    }

    // Check environment targeting
    if (flag.environments && !flag.environments.includes(context.environment)) {
      const result: FlagEvaluation = {
        key: flagKey,
        enabled: false,
        reason: 'disabled'
      };
      this.logEvaluation(result);
      return result;
    }

    // Check user targeting
    if (context.userId && flag.targetUsers?.includes(context.userId)) {
      const result: FlagEvaluation = {
        key: flagKey,
        enabled: true,
        reason: 'targeted_user',
        metadata: { userId: context.userId }
      };
      this.logEvaluation(result);
      return result;
    }

    // Check team targeting
    if (context.teamId && flag.targetTeams?.includes(context.teamId)) {
      const result: FlagEvaluation = {
        key: flagKey,
        enabled: true,
        reason: 'targeted_team',
        metadata: { teamId: context.teamId }
      };
      this.logEvaluation(result);
      return result;
    }

    // Check percentage rollout
    if (flag.rolloutPercentage !== undefined) {
      const hash = this.hashString(`${flagKey}:${context.userId || 'anonymous'}`);
      const userPercentile = hash % 100;
      const enabled = userPercentile < flag.rolloutPercentage;

      const result: FlagEvaluation = {
        key: flagKey,
        enabled,
        reason: 'rollout',
        metadata: { userPercentile, rolloutPercentage: flag.rolloutPercentage }
      };
      this.logEvaluation(result);
      return result;
    }

    // Global flag (no targeting)
    const result: FlagEvaluation = {
      key: flagKey,
      enabled: true,
      reason: 'global'
    };
    this.logEvaluation(result);
    return result;
  }

  /**
   * Batch evaluate multiple flags
   */
  async evaluateFlags(
    flagKeys: string[],
    context: FlagContext
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      flagKeys.map(async (key) => {
        const evaluation = await this.isEnabled(key, context);
        results[key] = evaluation.enabled;
      })
    );

    return results;
  }

  /**
   * Watch for flag changes
   */
  async watchFlags(
    environment: 'dev' | 'staging' | 'prod',
    onChange: (flags: Record<string, FeatureFlag>) => void
  ): Promise<() => Promise<void>> {
    if (!this.plugin) throw new Error('Manager not initialized');

    console.log(`👀 Watching flags for ${environment}...\n`);

    return await this.plugin.subscribe(
      'flags',
      { env: environment },
      (data) => {
        if (data) {
          console.log(`\n📬 Flags updated for ${environment}`);
          onChange(data);
        }
      }
    );
  }

  /**
   * Get evaluation statistics
   */
  getStats(): {
    totalEvaluations: number;
    enabledCount: number;
    disabledCount: number;
    byReason: Record<string, number>;
  } {
    const byReason: Record<string, number> = {};
    let enabledCount = 0;
    let disabledCount = 0;

    for (const eval of this.evaluationLog) {
      byReason[eval.reason] = (byReason[eval.reason] || 0) + 1;
      if (eval.enabled) enabledCount++;
      else disabledCount++;
    }

    return {
      totalEvaluations: this.evaluationLog.length,
      enabledCount,
      disabledCount,
      byReason
    };
  }

  /**
   * Log flag evaluation
   */
  private logEvaluation(evaluation: FlagEvaluation): void {
    this.evaluationLog.push(evaluation);

    // Keep log size manageable
    if (this.evaluationLog.length > 1000) {
      this.evaluationLog = this.evaluationLog.slice(-500);
    }
  }

  /**
   * Simple string hash for consistent percentage rollouts
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Cleanup
   */
  async close() {
    console.log('\n🧹 Closing Feature Flag Manager...');

    if (this.plugin) {
      await this.plugin.close();
      this.plugin = null;
    }

    this.flagCache.clear();
    console.log('✅ Manager closed');
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Feature Flag Manager with Real-time Updates         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const manager = new FeatureFlagManager();

  try {
    await manager.init();

    // Create feature flags
    console.log('📝 Creating feature flags...\n');

    // 1. Simple on/off flag
    await manager.setFlag({
      key: 'dark_mode',
      name: 'Dark Mode',
      description: 'Enable dark mode UI',
      enabled: true
    }, 'prod');

    // 2. Percentage rollout flag
    await manager.setFlag({
      key: 'new_dashboard',
      name: 'New Dashboard',
      description: 'Redesigned dashboard UI',
      enabled: true,
      rolloutPercentage: 25, // 25% of users
      environments: ['prod']
    }, 'prod');

    // 3. Targeted users flag
    await manager.setFlag({
      key: 'beta_features',
      name: 'Beta Features',
      description: 'Early access to beta features',
      enabled: true,
      targetUsers: ['user-123', 'user-456'],
      environments: ['dev', 'staging', 'prod']
    }, 'prod');

    // 4. Team-based flag
    await manager.setFlag({
      key: 'advanced_analytics',
      name: 'Advanced Analytics',
      description: 'Enhanced analytics dashboard',
      enabled: true,
      targetTeams: ['team-engineering', 'team-product'],
      environments: ['prod']
    }, 'prod');

    // Evaluate flags for different users
    console.log('🔍 Evaluating flags...\n');

    const contexts: FlagContext[] = [
      { userId: 'user-123', environment: 'prod' },
      { userId: 'user-789', environment: 'prod' },
      { userId: 'user-999', teamId: 'team-engineering', environment: 'prod' }
    ];

    for (const context of contexts) {
      console.log(`User: ${context.userId}${context.teamId ? ` (${context.teamId})` : ''}`);

      const darkMode = await manager.isEnabled('dark_mode', context);
      console.log(`  dark_mode: ${darkMode.enabled} (${darkMode.reason})`);

      const newDashboard = await manager.isEnabled('new_dashboard', context);
      console.log(`  new_dashboard: ${newDashboard.enabled} (${newDashboard.reason})`);

      const betaFeatures = await manager.isEnabled('beta_features', context);
      console.log(`  beta_features: ${betaFeatures.enabled} (${betaFeatures.reason})`);

      const analytics = await manager.isEnabled('advanced_analytics', context);
      console.log(`  advanced_analytics: ${analytics.enabled} (${analytics.reason})\n`);
    }

    // Watch for flag changes
    const unwatch = await manager.watchFlags('prod', (flags) => {
      console.log('   Updated flags:', Object.keys(flags).length);
    });

    // Simulate flag update
    console.log('⏳ Waiting 2 seconds before updating flag...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n🔄 Updating new_dashboard rollout to 50%...');
    await manager.setFlag({
      key: 'new_dashboard',
      name: 'New Dashboard',
      description: 'Redesigned dashboard UI',
      enabled: true,
      rolloutPercentage: 50, // Increased to 50%
      environments: ['prod']
    }, 'prod');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get statistics
    const stats = manager.getStats();
    console.log('\n📊 Evaluation Statistics:');
    console.log(`   Total evaluations: ${stats.totalEvaluations}`);
    console.log(`   Enabled: ${stats.enabledCount}`);
    console.log(`   Disabled: ${stats.disabledCount}`);
    console.log(`   By reason:`, stats.byReason);

    console.log('\n✨ Demo complete!\n');

    await unwatch();
    await manager.close();

  } catch (error) {
    console.error('❌ Error:', error);
    await manager.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FeatureFlagManager, type FeatureFlag, type FlagContext, type FlagEvaluation };
