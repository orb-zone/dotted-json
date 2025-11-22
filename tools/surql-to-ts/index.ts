/**
 * surql-to-ts CLI
 *
 * Generate TypeScript types and resolvers from SurrealDB schema
 *
 * @usage
 * ```bash
 * # From schema file
 * bun surql-to-ts --schema schema.surql --output db.generated.ts
 *
 * # From running database
 * bun surql-to-ts --url ws://localhost:8000/rpc --ns app --db main --output db.generated.ts
 *
 * # Watch mode
 * bun surql-to-ts --schema schema.surql --output db.generated.ts --watch
 * ```
 */

import { readFileSync, writeFileSync, watchFile } from 'fs';
import { resolve } from 'path';
import { parseArgs } from 'util';

// Import our generation modules
import {
  parseFunctionsFromSchema,
  discoverFunctions,
  type FunctionMetadata
} from '../../src/plugins/surrealdb/function-discovery.js';

import {
  generateTypeDefinitions,
  generateZodSchema,
  type TypeGeneratorOptions
} from '../../src/plugins/surrealdb/type-generator.js';

/**
 * CLI options
 */
interface CLIOptions {
  schema?: string;
  url?: string;
  namespace?: string;
  database?: string;
  auth?: string;
  output: string;
  watch?: boolean;
  includeZod?: boolean;
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): CLIOptions {
  const { values } = parseArgs({
    options: {
      schema: { type: 'string', short: 's' },
      url: { type: 'string', short: 'u' },
      namespace: { type: 'string', short: 'n' },
      database: { type: 'string', short: 'd' },
      auth: { type: 'string', short: 'a' },
      output: { type: 'string', short: 'o', default: 'db.generated.ts' },
      watch: { type: 'boolean', short: 'w' },
      'include-zod': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true
  });

  return {
    schema: values.schema as string | undefined,
    url: values.url as string | undefined,
    namespace: values.namespace as string | undefined,
    database: values.database as string | undefined,
    auth: values.auth as string | undefined,
    output: values.output as string,
    watch: values.watch as boolean | undefined,
    includeZod: values['include-zod'] as boolean | undefined,
    help: values.help as boolean | undefined
  };
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
╭─────────────────────────────────────────────────────────────╮
│  surql-to-ts - Generate TypeScript types from SurrealDB    │
│  Part of @orb-zone/dotted-json                              │
╰─────────────────────────────────────────────────────────────╯

USAGE:
  bun surql-to-ts [OPTIONS]

OPTIONS:
  -s, --schema <file>       Path to .surql schema file
  -u, --url <url>          SurrealDB connection URL
  -n, --namespace <name>   Database namespace (with --url)
  -d, --database <name>    Database name (with --url)
  -a, --auth <json>        Auth credentials (with --url)
  -o, --output <file>      Output file (default: db.generated.ts)
  -w, --watch              Watch schema file for changes
  --include-zod            Generate Zod schemas
  -h, --help               Show this help

EXAMPLES:
  # Generate from schema file
  bun surql-to-ts --schema schema.surql --output db.generated.ts

  # Generate from running database
  bun surql-to-ts \\
    --url ws://localhost:8000/rpc \\
    --namespace app \\
    --database main \\
    --output db.generated.ts

  # Watch mode (regenerate on changes)
  bun surql-to-ts --schema schema.surql --watch

  # Include Zod schemas for runtime validation
  bun surql-to-ts --schema schema.surql --include-zod

FEATURES:
  ✓ Auto-discovers DEFINE FUNCTION statements
  ✓ Generates TypeScript interfaces and types
  ✓ Creates resolver interfaces for dotted-json
  ✓ Optional Zod schema generation
  ✓ Watch mode for development
  ✓ Single source of truth from .surql files

LEARN MORE:
  https://github.com/orb-zone/dotted-json
`);
}

/**
 * Generate types from schema file
 */
async function generateFromSchema(
  schemaPath: string,
  outputPath: string,
  options: { includeZod?: boolean }
): Promise<void> {
  try {
    // Read schema file
    const schemaContent = readFileSync(resolve(schemaPath), 'utf-8');

    // Parse functions
    const functions = parseFunctionsFromSchema(schemaContent);

    if (functions.length === 0) {
      console.warn('⚠️  No DEFINE FUNCTION statements found in schema');
      return;
    }

    // Generate TypeScript code
    let code = generateTypeDefinitions(functions, {
      includeComments: true,
      includeResolverInterface: true,
      resolverNamespace: 'DB'
    });

    // Optionally add Zod schemas
    if (options.includeZod) {
      code += '\n// Zod Schemas for Runtime Validation\n';
      code += 'import { z } from \'zod\';\n\n';

      for (const fn of functions) {
        code += generateZodSchema(fn);
        code += '\n';
      }
    }

    // Write to output file
    writeFileSync(resolve(outputPath), code, 'utf-8');

    console.log(`✅ Generated types for ${functions.length} functions → ${outputPath}`);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

/**
 * Generate types from running database
 */
async function generateFromDatabase(
  url: string,
  namespace: string,
  database: string,
  outputPath: string,
  options: { auth?: string; includeZod?: boolean }
): Promise<void> {
  try {
    // Dynamic import of surrealdb
    const { default: Surreal } = await import('surrealdb') as { default: any };

    const db = new Surreal();
    await db.connect(url);

    // Authenticate if credentials provided
    if (options.auth) {
      const auth = JSON.parse(options.auth);
      await db.signin(auth);
    }

    // Select namespace and database
    await db.use({ namespace, database });

    // Discover functions
    const functions = await discoverFunctions(db);

    if (functions.length === 0) {
      console.warn('⚠️  No custom functions found in database');
      await db.close();
      return;
    }

    // Generate TypeScript code
    let code = generateTypeDefinitions(functions, {
      includeComments: true,
      includeResolverInterface: true,
      resolverNamespace: 'DB'
    });

    // Optionally add Zod schemas
    if (options.includeZod) {
      code += '\n// Zod Schemas for Runtime Validation\n';
      code += 'import { z } from \'zod\';\n\n';

      for (const fn of functions) {
        code += generateZodSchema(fn);
        code += '\n';
      }
    }

    // Write to output file
    writeFileSync(resolve(outputPath), code, 'utf-8');

    console.log(`✅ Generated types for ${functions.length} functions → ${outputPath}`);

    await db.close();
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const options = parseCliArgs();

  // Show help
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Validate options
  if (!options.schema && !options.url) {
    console.error('❌ Error: Must provide either --schema or --url');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  if (options.url && (!options.namespace || !options.database)) {
    console.error('❌ Error: --url requires --namespace and --database');
    process.exit(1);
  }

  // Generate from schema file
  if (options.schema) {
    console.log(`📄 Reading schema: ${options.schema}`);

    await generateFromSchema(options.schema, options.output, {
      includeZod: options.includeZod
    });

    // Watch mode
    if (options.watch) {
      console.log(`👀 Watching for changes...`);

      watchFile(resolve(options.schema), { interval: 1000 }, async () => {
        console.log('\n🔄 Schema changed, regenerating...');
        await generateFromSchema(options.schema!, options.output, {
          includeZod: options.includeZod
        });
      });

      // Keep process alive
      process.stdin.resume();
    }
  }

  // Generate from database
  if (options.url) {
    console.log(`🔌 Connecting to: ${options.url}`);
    console.log(`📦 Database: ${options.namespace}/${options.database}`);

    await generateFromDatabase(
      options.url,
      options.namespace!,
      options.database!,
      options.output,
      {
        auth: options.auth,
        includeZod: options.includeZod
      }
    );
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
