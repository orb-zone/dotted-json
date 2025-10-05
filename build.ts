#!/usr/bin/env bun

/**
 * Build script for dotted-json library
 *
 * Builds the library using Bun's native bundler with TypeScript support.
 * Outputs ESM modules with type definitions to dist/
 */

import { build } from 'bun';
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const outdir = './dist';

// Clean dist directory
if (existsSync(outdir)) {
  await rm(outdir, { recursive: true });
}
await mkdir(outdir, { recursive: true });

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
  'plugins/tanstack',
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
      '@tanstack/react-query',
      '@tanstack/vue-query',
      '@tanstack/svelte-query',
      '@tanstack/solid-query',
    ],
  });
}

// Framework composables
const frameworks = [
  'vue/useTanstackDottedJSON',
  'react/useTanstackDottedJSON',
];

for (const framework of frameworks) {
  await build({
    entrypoints: [`./src/${framework}.ts`],
    outdir,
    target: 'browser',
    format: 'esm',
    minify: false,
    sourcemap: 'external',
    splitting: true,
    external: [
      'dot-prop',
      'vue',
      'react',
      '@tanstack/react-query',
      '@tanstack/vue-query',
    ],
  });
}

// Generate type declarations using tsc
console.log('\n📝 Generating type declarations...');
const tsc = Bun.spawn(['bunx', 'tsc', '--emitDeclarationOnly'], {
  stdout: 'inherit',
  stderr: 'inherit',
});

await tsc.exited;

console.log('\n✅ Build complete!');
console.log(`📦 Output: ${outdir}/`);

// Show bundle sizes
const { size } = await Bun.file(`${outdir}/index.js`).stat();
const sizeKB = (size / 1024).toFixed(2);
console.log(`📊 Core bundle size: ${sizeKB} kB`);

// Constitution check: core must be < 15 kB
if (size > 15 * 1024) {
  console.error(`\n❌ CONSTITUTION VIOLATION: Core bundle (${sizeKB} kB) exceeds 15 kB limit`);
  process.exit(1);
}

console.log('✅ Constitution check passed: Core bundle within 15 kB limit');
