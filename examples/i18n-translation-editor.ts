/**
 * Real-time i18n Translation Editor Example
 *
 * Demonstrates a collaborative translation management system where multiple
 * translators can work on different languages simultaneously with instant
 * updates across all connected clients.
 *
 * Features:
 * - Real-time collaboration via LIVE queries
 * - Multi-language support with variant resolution
 * - Formality levels (formal/informal/polite)
 * - Translation progress tracking
 * - Automatic cache invalidation
 * - Conflict-free concurrent editing
 *
 * Use Case:
 * Perfect for:
 * - SaaS applications with multi-language support
 * - Content management systems
 * - Documentation platforms
 * - E-commerce product catalogs
 *
 * @example
 * ```bash
 * # Start SurrealDB
 * surreal start --bind 0.0.0.0:8000 --user root --pass root memory
 *
 * # Run editor
 * bun run examples/i18n-translation-editor.ts
 * ```
 */

import { dotted } from '../src/index.js';
import { withSurrealDBPinia } from '../src/plugins/surrealdb-pinia.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Translation entry with metadata
 */
interface Translation {
  /** Translation key (e.g., 'welcome.title') */
  key: string;
  /** Translated text */
  value: string;
  /** Last modified timestamp */
  updatedAt?: Date;
  /** Translator who last modified */
  updatedBy?: string;
  /** Translation status */
  status?: 'draft' | 'review' | 'approved';
  /** Optional notes for translators */
  notes?: string;
}

/**
 * Translation bundle for a specific language/form variant
 */
interface TranslationBundle {
  [key: string]: string | Translation;
}

/**
 * Language variant context
 */
interface LanguageContext {
  lang: string;
  form?: 'formal' | 'informal' | 'polite';
}

/**
 * Translation statistics
 */
interface TranslationStats {
  lang: string;
  form?: string;
  total: number;
  translated: number;
  draft: number;
  review: number;
  approved: number;
  progress: number;
}

// ============================================================================
// Translation Editor Class
// ============================================================================

class TranslationEditor {
  private plugin: Awaited<ReturnType<typeof withSurrealDBPinia>> | null = null;
  private subscribers: Array<() => Promise<void>> = [];
  private languages: LanguageContext[] = [];

  /**
   * Initialize the translation editor with SurrealDB connection
   */
  async init(languages: LanguageContext[]) {
    this.languages = languages;

    console.log('🌍 Initializing Translation Editor...');
    console.log(`   Languages: ${languages.map(l => `${l.lang}${l.form ? `/${l.form}` : ''}`).join(', ')}`);

    this.plugin = await withSurrealDBPinia({
      // Connection
      url: 'ws://localhost:8000/rpc',
      namespace: 'i18n',
      database: 'translations',
      auth: {
        type: 'root',
        username: 'root',
        password: 'root'
      },

      // Auto-generate cached queries for translation strings
      ions: {
        'strings': {
          staleTime: 30_000,   // Translations fresh for 30s
          gcTime: 300_000,     // Keep in cache for 5 minutes
          retry: 3
        }
      },

      // Enable real-time LIVE queries for all languages
      live: {
        enabled: true,
        ions: ['strings'],
        onUpdate: (event) => {
          const { lang, form } = event.variants;
          const formStr = form ? ` (${form})` : '';
          console.log(`\n🔔 LIVE UPDATE: ${event.action} on ${lang}${formStr}`);

          if (event.data) {
            const keys = Object.keys(event.data);
            console.log(`   Keys updated: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
          }
        }
      },

      // Performance monitoring
      metrics: true,
      onMetrics: (metrics) => {
        if (metrics.operation === 'load') {
          const cacheStatus = metrics.cacheHit ? '✓ cache' : '⟳ database';
          console.log(`   📊 Load ${metrics.baseName}: ${metrics.duration.toFixed(2)}ms (${cacheStatus})`);
        }
      }
    });

    console.log('✅ Translation Editor initialized\n');
  }

  /**
   * Load translations for a specific language
   */
  async loadTranslations(context: LanguageContext): Promise<TranslationBundle> {
    if (!this.plugin) {
      throw new Error('Editor not initialized');
    }

    const formStr = context.form ? ` (${context.form})` : '';
    console.log(`📖 Loading translations for ${context.lang}${formStr}...`);

    try {
      const data = dotted(
        {
          '.strings': `db.loadIon("strings", ${JSON.stringify(context)})`
        },
        { resolvers: this.plugin.resolvers }
      );

      return await data.get('strings') || {};
    } catch (error: any) {
      if (error.message.includes('not found')) {
        console.log(`   ℹ️  No translations exist for ${context.lang}${formStr} yet`);
        return {};
      }
      throw error;
    }
  }

  /**
   * Update a single translation
   */
  async updateTranslation(
    context: LanguageContext,
    key: string,
    value: string,
    metadata?: Partial<Translation>
  ): Promise<void> {
    if (!this.plugin) {
      throw new Error('Editor not initialized');
    }

    const formStr = context.form ? ` (${context.form})` : '';
    console.log(`\n💾 Updating translation: ${key} in ${context.lang}${formStr}`);
    console.log(`   Value: "${value}"`);

    // Load current translations
    const current = await this.loadTranslations(context);

    // Update the specific key
    const updated = {
      ...current,
      [key]: {
        key,
        value,
        updatedAt: new Date(),
        ...metadata
      }
    };

    // Save back to database
    await this.plugin.loader.save('strings', updated, context);

    console.log(`✅ Translation updated`);

    // Invalidate cache to trigger refetch
    this.plugin.invalidateQueries(['ion', 'strings']);
  }

  /**
   * Batch update multiple translations
   */
  async batchUpdate(
    context: LanguageContext,
    translations: Record<string, string>
  ): Promise<void> {
    if (!this.plugin) {
      throw new Error('Editor not initialized');
    }

    const formStr = context.form ? ` (${context.form})` : '';
    console.log(`\n📦 Batch updating ${Object.keys(translations).length} translations for ${context.lang}${formStr}`);

    const current = await this.loadTranslations(context);

    const updated = { ...current };
    for (const [key, value] of Object.entries(translations)) {
      updated[key] = {
        key,
        value,
        updatedAt: new Date(),
        status: 'draft'
      };
    }

    await this.plugin.loader.save('strings', updated, context);

    console.log(`✅ Batch update complete`);
    this.plugin.invalidateQueries(['ion', 'strings']);
  }

  /**
   * Watch for real-time updates to a language
   */
  async watchLanguage(
    context: LanguageContext,
    onChange: (translations: TranslationBundle) => void
  ): Promise<void> {
    if (!this.plugin) {
      throw new Error('Editor not initialized');
    }

    const formStr = context.form ? ` (${context.form})` : '';
    console.log(`👀 Watching ${context.lang}${formStr} for changes...`);

    const unsubscribe = await this.plugin.subscribe(
      'strings',
      context,
      (data) => {
        if (data) {
          console.log(`\n📬 Translation update received for ${context.lang}${formStr}`);
          onChange(data);
        }
      }
    );

    this.subscribers.push(unsubscribe);
  }

  /**
   * Get translation statistics for a language
   */
  async getStats(context: LanguageContext): Promise<TranslationStats> {
    const translations = await this.loadTranslations(context);
    const entries = Object.values(translations);

    const total = entries.length;
    const draft = entries.filter(t => typeof t === 'object' && t.status === 'draft').length;
    const review = entries.filter(t => typeof t === 'object' && t.status === 'review').length;
    const approved = entries.filter(t => typeof t === 'object' && t.status === 'approved').length;
    const translated = entries.filter(t => t && (typeof t === 'string' || t.value)).length;

    return {
      lang: context.lang,
      form: context.form,
      total,
      translated,
      draft,
      review,
      approved,
      progress: total > 0 ? Math.round((translated / total) * 100) : 0
    };
  }

  /**
   * Compare translations between languages
   */
  async compareLanguages(
    baseContext: LanguageContext,
    targetContext: LanguageContext
  ): Promise<{
    missing: string[];
    outdated: string[];
    upToDate: string[];
  }> {
    const base = await this.loadTranslations(baseContext);
    const target = await this.loadTranslations(targetContext);

    const baseKeys = new Set(Object.keys(base));
    const targetKeys = new Set(Object.keys(target));

    const missing = Array.from(baseKeys).filter(k => !targetKeys.has(k));
    const outdated: string[] = [];
    const upToDate: string[] = [];

    for (const key of targetKeys) {
      if (!baseKeys.has(key)) continue;

      const baseEntry = base[key];
      const targetEntry = target[key];

      const baseUpdated = typeof baseEntry === 'object' ? baseEntry.updatedAt : null;
      const targetUpdated = typeof targetEntry === 'object' ? targetEntry.updatedAt : null;

      if (baseUpdated && targetUpdated && baseUpdated > targetUpdated) {
        outdated.push(key);
      } else {
        upToDate.push(key);
      }
    }

    return { missing, outdated, upToDate };
  }

  /**
   * Cleanup and close connections
   */
  async close() {
    console.log('\n🧹 Closing Translation Editor...');

    for (const unsubscribe of this.subscribers) {
      await unsubscribe();
    }
    this.subscribers = [];

    if (this.plugin) {
      await this.plugin.close();
      this.plugin = null;
    }

    console.log('✅ Editor closed');
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log('║  Real-time i18n Translation Editor with LIVE Queries   ║');
  console.log('╚═════════════════════════════════════════════════════════╝\n');

  const editor = new TranslationEditor();

  try {
    // Define supported languages
    const languages: LanguageContext[] = [
      { lang: 'en' },
      { lang: 'es', form: 'formal' },
      { lang: 'es', form: 'informal' },
      { lang: 'ja', form: 'polite' },
      { lang: 'de', form: 'formal' }
    ];

    // Initialize editor
    await editor.init(languages);

    // Create base translations (English)
    console.log('📝 Creating base translations (English)...\n');
    await editor.batchUpdate({ lang: 'en' }, {
      'welcome.title': 'Welcome to our app',
      'welcome.subtitle': 'Get started in seconds',
      'nav.home': 'Home',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.delete': 'Delete'
    });

    // Create Spanish formal translations
    console.log('\n📝 Creating Spanish (formal) translations...\n');
    await editor.batchUpdate({ lang: 'es', form: 'formal' }, {
      'welcome.title': 'Bienvenido a nuestra aplicación',
      'welcome.subtitle': 'Comience en segundos',
      'nav.home': 'Inicio',
      'nav.profile': 'Perfil',
      'nav.settings': 'Configuración'
    });

    // Create Spanish informal translations
    console.log('\n📝 Creating Spanish (informal) translations...\n');
    await editor.batchUpdate({ lang: 'es', form: 'informal' }, {
      'welcome.title': 'Bienvenido a nuestra app',
      'welcome.subtitle': 'Empieza en segundos',
      'nav.home': 'Inicio'
    });

    // Watch for changes on Spanish formal
    await editor.watchLanguage({ lang: 'es', form: 'formal' }, (translations) => {
      console.log('   📊 Spanish (formal) updated:', Object.keys(translations).length, 'keys');
    });

    // Get translation statistics
    console.log('\n📊 Translation Statistics:\n');
    for (const lang of languages) {
      const stats = await editor.getStats(lang);
      const formStr = stats.form ? ` (${stats.form})` : '';
      console.log(`   ${stats.lang}${formStr}: ${stats.translated}/${stats.total} (${stats.progress}%)`);
    }

    // Compare languages
    console.log('\n🔍 Comparing translations...\n');
    const comparison = await editor.compareLanguages(
      { lang: 'en' },
      { lang: 'es', form: 'formal' }
    );

    console.log(`   Missing in Spanish (formal): ${comparison.missing.length} keys`);
    if (comparison.missing.length > 0) {
      console.log(`      ${comparison.missing.join(', ')}`);
    }

    // Simulate real-time update
    console.log('\n⏳ Waiting 2 seconds before simulating update...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n🔄 Simulating translator update (Spanish formal)...');
    await editor.updateTranslation(
      { lang: 'es', form: 'formal' },
      'action.save',
      'Guardar',
      {
        status: 'approved',
        updatedBy: 'translator@example.com',
        notes: 'Reviewed and approved'
      }
    );

    // Wait for LIVE update to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Load updated translations
    console.log('\n📖 Loading updated Spanish (formal) translations...\n');
    const updated = await editor.loadTranslations({ lang: 'es', form: 'formal' });
    const actionSave = updated['action.save'] as Translation;
    console.log(`   action.save:`, {
      value: actionSave.value,
      status: actionSave.status,
      updatedBy: actionSave.updatedBy
    });

    console.log('\n✨ Demo complete! Real-time updates working perfectly.\n');

    // Cleanup
    await editor.close();

  } catch (error) {
    console.error('❌ Error:', error);
    await editor.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TranslationEditor, type Translation, type TranslationBundle, type LanguageContext, type TranslationStats };
