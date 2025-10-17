/**
 * Real-time Configuration Manager Example
 *
 * Demonstrates the unified SurrealDB + Pinia Colada plugin with LIVE queries
 * for real-time configuration updates across multiple environments.
 *
 * Use case: Multi-environment app where config changes propagate instantly
 * to all connected clients without polling or manual refresh.
 *
 * Features:
 * - Real-time config sync via LIVE queries
 * - Intelligent caching with Pinia Colada
 * - Automatic cache invalidation on updates
 * - Multi-environment support (dev, staging, prod)
 *
 * @example
 * ```bash
 * # Start SurrealDB
 * surreal start --bind 0.0.0.0:8000 --user root --pass root memory
 *
 * # Run example
 * bun run examples/realtime-config-manager.ts
 * ```
 */

import { dotted } from '../src/index.js';
import { withSurrealDBPinia } from '../src/plugins/surrealdb-pinia.js';

// ============================================================================
// Configuration Types
// ============================================================================

interface AppConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  features: {
    analytics: boolean;
    logging: boolean;
    cache: boolean;
  };
  limits: {
    maxUploadSize: number;
    maxConcurrentRequests: number;
  };
}

interface EnvironmentContext {
  env: 'dev' | 'staging' | 'prod';
}

// ============================================================================
// Real-time Config Manager
// ============================================================================

class RealtimeConfigManager {
  private plugin: Awaited<ReturnType<typeof withSurrealDBPinia>> | null = null;
  private unsubscribers: Array<() => Promise<void>> = [];

  /**
   * Initialize the config manager with SurrealDB connection
   */
  async init() {
    console.log('📡 Connecting to SurrealDB...');

    this.plugin = await withSurrealDBPinia({
      // Connection
      url: 'ws://localhost:8000/rpc',
      namespace: 'app',
      database: 'main',
      auth: {
        type: 'root',
        username: 'root',
        password: 'root'
      },

      // Auto-generate cached queries for config ions
      ions: {
        'config': {
          staleTime: 60_000,  // Config considered fresh for 1 minute
          gcTime: 300_000,     // Keep in cache for 5 minutes
          retry: 3
        }
      },

      // Enable real-time LIVE queries
      live: {
        enabled: true,
        ions: ['config'],
        onUpdate: (event) => {
          console.log(`\n🔔 LIVE UPDATE: ${event.action} on ${event.baseName}`);
          console.log(`   Variants: ${JSON.stringify(event.variants)}`);
          if (event.data) {
            console.log(`   Data: ${JSON.stringify(event.data, null, 2)}`);
          }
        }
      },

      // Defaults
      defaults: {
        staleTime: 30_000,
        gcTime: 300_000
      }
    });

    console.log('✅ Connected to SurrealDB with LIVE queries enabled\n');
  }

  /**
   * Get configuration for environment (cached)
   */
  async getConfig(env: 'dev' | 'staging' | 'prod'): Promise<AppConfig> {
    if (!this.plugin) {
      throw new Error('Manager not initialized');
    }

    console.log(`📖 Loading config for ${env} environment...`);

    const data = dotted(
      {
        '.config': `db.loadIon("config", { env: "${env}" })`
      },
      { resolvers: this.plugin.resolvers }
    );

    const config = await data.get('.config');
    console.log(`✅ Config loaded (from ${config ? 'cache/db' : 'nowhere'})`);

    return config as AppConfig;
  }

  /**
   * Update configuration for environment
   */
  async updateConfig(env: 'dev' | 'staging' | 'prod', config: AppConfig): Promise<void> {
    if (!this.plugin) {
      throw new Error('Manager not initialized');
    }

    console.log(`\n💾 Updating config for ${env} environment...`);

    await this.plugin.loader.save('config', config, { env });

    // Manually invalidate cache (LIVE query will also invalidate automatically)
    this.plugin.invalidateQueries(['ion', 'config']);

    console.log(`✅ Config updated for ${env}`);
  }

  /**
   * Subscribe to real-time config changes for specific environment
   */
  async watchConfig(env: 'dev' | 'staging' | 'prod', callback: (config: AppConfig) => void): Promise<void> {
    if (!this.plugin) {
      throw new Error('Manager not initialized');
    }

    console.log(`👀 Watching config changes for ${env} environment...`);

    const unsubscribe = await this.plugin.subscribe(
      'config',
      { env },
      (data) => {
        if (data) {
          console.log(`\n📬 Config change detected for ${env}!`);
          callback(data);
        } else {
          console.log(`\n🗑️  Config deleted for ${env}`);
        }
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Cleanup and close connections
   */
  async close() {
    console.log('\n🧹 Cleaning up...');

    // Unsubscribe from all watches
    for (const unsubscribe of this.unsubscribers) {
      await unsubscribe();
    }
    this.unsubscribers = [];

    // Close plugin
    if (this.plugin) {
      await this.plugin.close();
      this.plugin = null;
    }

    console.log('✅ Cleanup complete');
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Real-time Configuration Manager with LIVE Queries    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const manager = new RealtimeConfigManager();

  try {
    // Initialize
    await manager.init();

    // Create initial configs for each environment
    const devConfig: AppConfig = {
      apiUrl: 'http://localhost:3000',
      apiKey: 'dev-key-123',
      timeout: 5000,
      retryAttempts: 3,
      features: {
        analytics: false,
        logging: true,
        cache: true
      },
      limits: {
        maxUploadSize: 10_000_000,  // 10 MB
        maxConcurrentRequests: 50
      }
    };

    const prodConfig: AppConfig = {
      apiUrl: 'https://api.production.com',
      apiKey: 'prod-key-secure-xyz',
      timeout: 10000,
      retryAttempts: 5,
      features: {
        analytics: true,
        logging: false,  // Minimal logging in prod
        cache: true
      },
      limits: {
        maxUploadSize: 50_000_000,  // 50 MB
        maxConcurrentRequests: 500
      }
    };

    // Save initial configs
    console.log('📦 Setting up initial configurations...\n');
    await manager.updateConfig('dev', devConfig);
    await manager.updateConfig('prod', prodConfig);

    // Watch for real-time changes
    await manager.watchConfig('dev', (config) => {
      console.log('   📊 Dev config updated:', {
        apiUrl: config.apiUrl,
        timeout: config.timeout,
        features: config.features
      });
    });

    await manager.watchConfig('prod', (config) => {
      console.log('   📊 Prod config updated:', {
        apiUrl: config.apiUrl,
        timeout: config.timeout,
        features: config.features
      });
    });

    // Load configs (will use cache)
    console.log('\n📖 Reading configurations...\n');
    const dev = await manager.getConfig('dev');
    const prod = await manager.getConfig('prod');

    console.log('\n🔍 Current Configurations:');
    console.log('  Dev:', { apiUrl: dev.apiUrl, timeout: dev.timeout });
    console.log('  Prod:', { apiUrl: prod.apiUrl, timeout: prod.timeout });

    // Simulate config update after 2 seconds
    console.log('\n⏳ Waiting 2 seconds before updating config...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update dev config (LIVE query will notify automatically)
    console.log('\n🔄 Simulating configuration change...');
    const updatedDevConfig = {
      ...dev,
      timeout: 8000,  // Increase timeout
      features: {
        ...dev.features,
        analytics: true  // Enable analytics in dev
      }
    };
    await manager.updateConfig('dev', updatedDevConfig);

    // Wait for LIVE update to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Load again (cache invalidated by LIVE query)
    console.log('\n📖 Re-reading dev config (should show updated values)...\n');
    const devUpdated = await manager.getConfig('dev');
    console.log('  Dev (updated):', {
      apiUrl: devUpdated.apiUrl,
      timeout: devUpdated.timeout,
      analytics: devUpdated.features.analytics
    });

    console.log('\n✨ Demo complete! LIVE queries automatically updated cache.');
    console.log('   No polling, no manual refresh needed.\n');

    // Cleanup
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

export { RealtimeConfigManager, type AppConfig, type EnvironmentContext };
