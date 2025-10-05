# Examples

This directory contains working examples demonstrating dotted-json concepts and usage patterns.

## Running Examples

All examples use Bun:

```bash
bun run examples/basic-usage.ts
bun run examples/file-inheritance.ts
bun run examples/with-zod-validation.ts
```

## Examples Overview

### 1. Basic Usage (`basic-usage.ts`)
Demonstrates core dotted-json functionality:
- Simple expression evaluation with `${}`
- Resolver functions for dynamic data
- Error handling with `errorDefault`

### 2. File Inheritance (`file-inheritance.ts`)
Shows the self-reference pattern with `extends()`:
- Using `"."` for self-reference
- Loading and merging base schemas from files
- Path resolution with auto-extension

### 3. Zod Validation (`with-zod-validation.ts`)
Demonstrates the recommended security pattern:
- Input/output validation with Zod plugin
- Type-safe resolver definitions
- Automatic runtime validation

## Note on Implementation

⚠️ **These examples demonstrate the API design but won't run until core implementation is complete.**

Following TDD (Test-First Development), we document the desired API first, then:
1. Write comprehensive tests
2. Implement to pass tests
3. Verify examples work as documented

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the TDD workflow.
