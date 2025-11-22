/**
 * jsön-translate CLI
 *
 * Translate .jsön files using local Ollama LLM
 *
 * Usage:
 *   bun tools/translate/index.ts <file> --to <lang> [--form <formality>] [--model <model>]
 *
 * Examples:
 *   bun tools/translate/index.ts strings.jsön --to es
 *   bun tools/translate/index.ts strings.jsön --to ja --form polite
 *   bun tools/translate/index.ts strings:es.jsön --to es --form formal
 */

import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { OllamaProvider } from './providers/ollama.js';
import { readSourceFile, writeVariantFile, translateObjectValuesBatch } from './utils/file-output.js';

// Load .env if available
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const { config } = await import('dotenv');
  config({ path: envPath });
}

const FORMALITY_LEVELS = ['casual', 'informal', 'neutral', 'polite', 'formal', 'honorific'];

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      to: { type: 'string', short: 't' },
      form: { type: 'string', short: 'f' },
      model: { type: 'string', short: 'm' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
      check: { type: 'boolean' }
    },
    allowPositionals: true
  });

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  // Health check mode
  if (values.check) {
    await checkOllama(values.model);
    process.exit(0);
  }

  if (positionals.length === 0) {
    showHelp();
    process.exit(0);
  }

  const sourcePath = positionals[0];
  const targetLang = values.to;
  const formality = values.form as any;
  const model = values.model;
  const outputDir = values.output;

  // Validate arguments
  if (!sourcePath) {
    console.error('❌ Error: No source file specified');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (!targetLang) {
    console.error('❌ Error: Target language not specified (use --to <lang>)');
    process.exit(1);
  }

  if (formality && !FORMALITY_LEVELS.includes(formality)) {
    console.error(`❌ Error: Invalid formality level: ${formality}`);
    console.error(`Valid levels: ${FORMALITY_LEVELS.join(', ')}`);
    process.exit(1);
  }

  const resolvedPath = resolve(process.cwd(), sourcePath);

  if (!existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    await translateFile({
      sourcePath: resolvedPath,
      targetLang,
      formality,
      model,
      outputDir
    });
  } catch (error) {
    console.error('\n❌ Translation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function translateFile(options: {
  sourcePath: string;
  targetLang: string;
  formality?: string;
  model?: string;
  outputDir?: string;
}) {
  const { sourcePath, targetLang, formality, model, outputDir } = options;

  console.log('🌍 jsön-translate\n');
  console.log(`📄 Source: ${sourcePath}`);
  console.log(`🎯 Target: ${targetLang}${formality ? ` (${formality})` : ''}`);

  // Initialize Ollama provider
  const provider = new OllamaProvider(model ? { model } : {});

  // Check Ollama health
  console.log('\n🔍 Checking Ollama...');
  const health = await provider.checkHealth();

  if (!health.running) {
    throw new Error(`Ollama is not running. Start it with: ollama serve`);
  }

  if (!health.modelAvailable) {
    console.warn(`⚠️  Model not found. Downloading model...`);
    console.warn(`   Run: ollama pull ${model || 'llama3.2'}`);
  }

  console.log('✅ Ollama is ready\n');

  // Read source file
  console.log('📖 Reading source file...');
  const sourceData = await readSourceFile(sourcePath);
  const keyCount = countKeys(sourceData);
  console.log(`   Found ${keyCount} keys to translate`);

  // Translate
  console.log('\n🔄 Translating...');
  let completed = 0;

  const translated = await translateObjectValuesBatch(
    sourceData,
    async (texts) => {
      const results = await provider.translateBatch(texts, {
        targetLang,
        formality: formality as any,
        sourceLang: 'en' // Could be auto-detected or specified
      });
      completed += texts.length;
      console.log(`   Progress: ${completed}/${keyCount} keys`);
      return results;
    },
    {
      onProgress: (completed, total) => {
        console.log(`   Completed: ${completed}/${total}`);
      }
    }
  );

  // Write output file
  console.log('\n💾 Writing output...');
  const outputPath = await writeVariantFile(translated, {
    sourcePath,
    targetLang,
    formality,
    outputDir
  });

  console.log(`✅ Translation complete!`);
  console.log(`📝 Output: ${outputPath}\n`);
}

function countKeys(obj: any, count = 0): number {
  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      count++;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      count = countKeys(value, count);
    }
  }
  return count;
}

async function checkOllama(model?: string) {
  console.log('🔍 Checking Ollama status...\n');

  const provider = new OllamaProvider(model ? { model } : {});
  const health = await provider.checkHealth();

  if (health.running) {
    console.log('✅ Ollama is running');
    console.log(`   Model: ${model || process.env.OLLAMA_MODEL || 'llama3.2'}`);
    console.log(`   Status: ${health.modelAvailable ? 'Available' : 'Not downloaded'}`);

    if (!health.modelAvailable) {
      console.log(`\n📥 To download the model, run:`);
      console.log(`   ollama pull ${model || process.env.OLLAMA_MODEL || 'llama3.2'}`);
    }
  } else {
    console.log('❌ Ollama is not running');
    console.log(`   Error: ${health.error || 'Unknown'}`);
    console.log(`\n🚀 To start Ollama, run:`);
    console.log(`   ollama serve`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🌍 jsön-translate - Translate .jsön files using local Ollama LLM

USAGE:
  bun tools/translate/index.ts <file> --to <lang> [options]

OPTIONS:
  -t, --to <lang>        Target language (required)
                         Examples: es, ja, fr, de, ko

  -f, --form <level>     Formality level (optional)
                         Levels: casual, informal, neutral, polite, formal, honorific

  -m, --model <name>     Ollama model to use (default: llama3.2)
                         Examples: llama3.2, mistral, gemma2

  -o, --output <dir>     Output directory (default: same as source)

  --check                Check Ollama status and exit

  -h, --help             Show this help message

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL        Ollama API URL (default: http://localhost:11434)
  OLLAMA_MODEL           Default model (default: llama3.2)
  OLLAMA_TEMPERATURE     Creativity 0-1 (default: 0.3)

EXAMPLES:
  # Translate to Spanish
  bun tools/translate/index.ts strings.jsön --to es

  # Translate to Japanese with polite formality (keigo)
  bun tools/translate/index.ts strings.jsön --to ja --form polite

  # Translate Spanish file to formal variant
  bun tools/translate/index.ts strings:es.jsön --to es --form formal

  # Use specific model
  bun tools/translate/index.ts strings.jsön --to fr --model mistral

  # Check Ollama status
  bun tools/translate/index.ts --check

OUTPUT:
  Creates variant files with naming: <base>:<lang>[:<form>].jsön

  Examples:
    strings.jsön + --to es          → strings:es.jsön
    strings.jsön + --to ja --form polite → strings:ja:polite.jsön

REQUIREMENTS:
  - Ollama must be running (ollama serve)
  - Model must be downloaded (ollama pull <model>)
`);
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
