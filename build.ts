#!/usr/bin/env bun

/**
 * Build script for dotted-json library
 *
 * Builds the library using Bun's native bundler with TypeScript support.
 * Outputs ESM modules with type definitions to dist/
 */

import { build } from 'bun';
import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const outdir = './dist';
const clidir = './dist/cli';

// Clean dist directory
if (existsSync(outdir)) {
  await rm(outdir, { recursive: true });
}
await mkdir(outdir, { recursive: true });
await mkdir(clidir, { recursive: true });

console.log('🏗️  Building dotted-json...\n');

// Core library
await build({
  entrypoints: ['./src/index.ts'],
  outdir,
  target: 'browser',
  format: 'esm',
  minify: false,
  sourcemap: 'external',
  splitting: true,
  external: ['dot-prop'],
});

// Plugins (optional peer dependencies)
const plugins = [
  'plugins/zod',
  'plugins/surrealdb',
  'plugins/pinia-colada',
];

for (const plugin of plugins) {
  await build({
    entrypoints: [`./src/${plugin}.ts`],
    outdir,
    target: 'browser',
    format: 'esm',
    minify: false,
    sourcemap: 'external',
    splitting: true,
    external: [
      'dot-prop',
      'zod',
      'surrealdb',
      '@pinia/colada',
      'pinia',
    ],
  });
}

// Framework composables (none currently)
// const frameworks = [];
// for (const framework of frameworks) { ... }

// Generate type declarations using tsc
console.log('\n📝 Generating type declarations...');
const tsc = Bun.spawn(['bunx', 'tsc', '--emitDeclarationOnly'], {
  stdout: 'inherit',
  stderr: 'inherit',
});

await tsc.exited;

console.log('\n📦 Building CLI tools...');

// Build CLI tools (for npm publishing)
const cliTools = [
  {
    name: 'translate',
    entry: './tools/translate/index.ts',
    output: 'translate.js'
  },
  {
    name: 'surql-to-ts',
    entry: './tools/surql-to-ts/index.ts',
    output: 'surql-to-ts.js'
  }
];

for (const tool of cliTools) {
  try {
    await build({
      entrypoints: [tool.entry],
      outdir: clidir,
      target: 'node',
      format: 'esm',
      minify: false,
      sourcemap: 'external',
      naming: tool.output,
      external: ['dotenv']
    });

    // Add shebang to make it executable
    const filePath = join(clidir, tool.output);
    const content = await readFile(filePath, 'utf-8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      await writeFile(filePath, `#!/usr/bin/env node\n${content}`);
    }

    console.log(`   ✅ Built ${tool.name}`);
  } catch (error) {
    console.error(`   ❌ Failed to build ${tool.name}:`, error);
    process.exit(1);
  }
}

console.log('\n✅ Build complete!');
console.log(`📦 Output: ${outdir}/`);

// Show bundle sizes
const { size } = await Bun.file(`${outdir}/index.js`).stat();
const sizeKB = (size / 1024).toFixed(2);
console.log(`📊 Core bundle size: ${sizeKB} kB`);

// Constitution check: core must be < 50 kB (updated 2025-10-19 for v0.13 features)
if (size > 50 * 1024) {
  console.error(`\n❌ CONSTITUTION VIOLATION: Core bundle (${sizeKB} kB) exceeds 50 kB limit`);
  process.exit(1);
}

console.log('✅ Constitution check passed: Core bundle within 50 kB limit');
