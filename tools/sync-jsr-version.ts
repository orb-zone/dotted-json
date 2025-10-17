#!/usr/bin/env bun
/**
 * Sync version from package.json to jsr.json
 * Run after `changeset version` to ensure JSR gets the correct version
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJsonPath = resolve(import.meta.dir, "../package.json");
const jsrJsonPath = resolve(import.meta.dir, "../jsr.json");

try {
  // Read package.json version
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  const version = packageJson.version;

  if (!version) {
    console.error("❌ No version found in package.json");
    process.exit(1);
  }

  // Read and update jsr.json
  const jsrJson = JSON.parse(readFileSync(jsrJsonPath, "utf-8"));
  const oldVersion = jsrJson.version;

  if (oldVersion === version) {
    console.log(`✅ jsr.json already at version ${version}`);
    process.exit(0);
  }

  jsrJson.version = version;

  // Write back to jsr.json with formatting
  writeFileSync(jsrJsonPath, JSON.stringify(jsrJson, null, 2) + "\n");

  console.log(`✅ Synced version: ${oldVersion} → ${version}`);
  console.log(`   📝 Updated jsr.json`);
} catch (error) {
  console.error("❌ Failed to sync version:", error);
  process.exit(1);
}
