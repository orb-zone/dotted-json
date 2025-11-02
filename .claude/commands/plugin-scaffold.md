---
description: Generate complete plugin boilerplate with tests, types, docs, and build configuration
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Constitutional Review**:
   - Read `.specify/memory/constitution.md` (Principle IV: Plugin Architecture)
   - Verify plugin uses peer dependencies, not direct dependencies

2. **Specialist Auto-Loading**:
   - Load `.specify/agents/architecture-specialist.md` for plugin patterns

3. **Plugin Context**:
   - Understand what the plugin will do
   - Identify peer dependencies needed
   - Determine if it integrates with external libraries

---

## User Input

Plugin name and description: $ARGUMENTS

Examples:
- `/plugin-scaffold react - React hooks for dotted-json`
- `/plugin-scaffold tanstack-query - TanStack Query integration`
- `/plugin-scaffold kysely - Kysely database query builder`

---

## Plugin Scaffolding Process

### Step 1: Parse Plugin Requirements

**1.1: Extract Plugin Name**

From user input, extract:
- **Plugin name**: `react`, `tanstack-query`, `kysely`
- **Description**: What the plugin does
- **Integration target**: External library to integrate with

**1.2: Determine Naming Conventions**

- **File name**: `src/plugins/[plugin-name].ts`
- **Export name**: `[pluginName]Plugin` (camelCase + Plugin)
- **Type name**: `[PluginName]Plugin` (PascalCase + Plugin)

Examples:
- `react` → `src/plugins/react.ts` → `reactPlugin`
- `tanstack-query` → `src/plugins/tanstack-query.ts` → `tanstackQueryPlugin`

**1.3: Identify Peer Dependencies**

Ask user or infer from plugin name:
- React plugin → peer dep: `react` ^18.0.0
- TanStack Query → peer dep: `@tanstack/react-query` ^5.0.0
- Kysely → peer dep: `kysely` ^0.27.0

### Step 2: Generate Plugin File Structure

**2.1: Create Plugin Implementation**

Template for `src/plugins/[plugin-name].ts`:

```typescript
/**
 * [Plugin Name] plugin for dotted-json
 *
 * [Description of what the plugin does]
 *
 * @example
 * ```typescript
 * import { dotted } from '@orb-zone/dotted-json';
 * import { [pluginName]Plugin } from '@orb-zone/dotted-json/plugins/[plugin-name]';
 *
 * const data = dotted({
 *   '.example': 'exampleResolver()'
 * }, {
 *   plugins: [[pluginName]Plugin()]
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { Plugin, Resolver, ResolverRegistry } from '../types';

/**
 * Options for [Plugin Name] plugin
 */
export interface [PluginName]PluginOptions {
  /**
   * [Option description]
   * @default [default value]
   */
  exampleOption?: boolean;
}

/**
 * Creates a [Plugin Name] plugin instance
 *
 * @param options - Configuration options
 * @returns Plugin instance
 *
 * @example
 * ```typescript
 * const plugin = [pluginName]Plugin({
 *   exampleOption: true
 * });
 * ```
 */
export function [pluginName]Plugin(
  options: [PluginName]PluginOptions = {}
): Plugin {
  const { exampleOption = false } = options;

  // Plugin-specific resolvers
  const resolvers: ResolverRegistry = {
    // Add resolver functions here
    exampleResolver: (...args: any[]) => {
      // Implementation
      return 'example result';
    }
  };

  return {
    name: '[plugin-name]',
    version: '1.0.0',

    // Extend resolver registry
    resolvers,

    // Optional: Error handler
    onError: (error, context) => {
      // Custom error handling
      throw error;
    },

    // Optional: Pre-evaluation hook
    beforeEvaluate: (expression, context) => {
      // Transform expression if needed
      return expression;
    },

    // Optional: Post-evaluation hook
    afterEvaluate: (result, expression, context) => {
      // Transform result if needed
      return result;
    }
  };
}

/**
 * Default export for convenience
 */
export default [pluginName]Plugin;
```

**2.2: Update Main Index**

Add export to `src/index.ts`:

```typescript
// Plugins (optional, peer dependencies)
export { [pluginName]Plugin } from './plugins/[plugin-name]';
export type { [PluginName]PluginOptions } from './plugins/[plugin-name]';
```

**2.3: Update package.json**

Add peer dependency warning to `package.json`:

```json
{
  "peerDependenciesMeta": {
    "[peer-dependency]": {
      "optional": true
    }
  }
}
```

### Step 3: Generate Test Suite

**3.1: Create Unit Tests**

Template for `test/unit/[plugin-name]-plugin.test.ts`:

```typescript
import { describe, test, expect, mock } from 'bun:test';
import { dotted } from '../../src/index';
import { [pluginName]Plugin } from '../../src/plugins/[plugin-name]';

describe('[PluginName] Plugin', () => {
  describe('plugin factory', () => {
    test('creates plugin instance with default options', () => {
      const plugin = [pluginName]Plugin();

      expect(plugin.name).toBe('[plugin-name]');
      expect(plugin.resolvers).toBeDefined();
    });

    test('accepts custom options', () => {
      const plugin = [pluginName]Plugin({
        exampleOption: true
      });

      expect(plugin).toBeDefined();
    });
  });

  describe('resolvers', () => {
    test('provides expected resolver functions', () => {
      const plugin = [pluginName]Plugin();

      expect(plugin.resolvers).toHaveProperty('exampleResolver');
      expect(typeof plugin.resolvers.exampleResolver).toBe('function');
    });

    test('resolver executes correctly', async () => {
      const doc = dotted({
        '.result': 'exampleResolver()'
      }, {
        plugins: [[pluginName]Plugin()]
      });

      const result = await doc.get('result');
      expect(result).toBe('example result');
    });
  });

  describe('integration with dotted-json', () => {
    test('works with dotted() core', async () => {
      const doc = dotted({
        value: 'test',
        '.computed': 'exampleResolver()'
      }, {
        plugins: [[pluginName]Plugin()]
      });

      const result = await doc.get('computed');
      expect(result).toBeDefined();
    });

    test('works with other plugins', async () => {
      // Test plugin composition if applicable
    });
  });

  describe('error handling', () => {
    test('handles resolver errors gracefully', async () => {
      // Test error scenarios
    });
  });

  describe('edge cases', () => {
    test('handles null input', async () => {
      // Test edge cases
    });

    test('handles empty input', async () => {
      // Test edge cases
    });
  });
});
```

**3.2: Create Integration Tests** (if external deps)

Template for `test/integration/[plugin-name]-integration.test.ts`:

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { dotted } from '../../src/index';
import { [pluginName]Plugin } from '../../src/plugins/[plugin-name]';

describe('[PluginName] Integration Tests', () => {
  beforeAll(async () => {
    // Setup real dependencies
    // e.g., start database, create test fixtures
  });

  afterAll(async () => {
    // Cleanup
  });

  test('integrates with [external library]', async () => {
    // Test with real external dependency
    const plugin = [pluginName]Plugin({
      // Real configuration
    });

    const doc = dotted({
      '.data': '[pluginResolver]()'
    }, {
      plugins: [plugin]
    });

    const result = await doc.get('data');
    expect(result).toBeDefined();
  });
});
```

### Step 4: Generate Documentation

**4.1: Create Plugin README**

Template for `src/plugins/README-[plugin-name].md`:

```markdown
# [Plugin Name] Plugin

[Brief description of plugin and what it does]

## Installation

```bash
# Install dotted-json
bun add @orb-zone/dotted-json

# Install peer dependency
bun add [peer-dependency]
```

## Usage

```typescript
import { dotted } from '@orb-zone/dotted-json';
import { [pluginName]Plugin } from '@orb-zone/dotted-json/plugins/[plugin-name]';

const data = dotted({
  '.example': 'exampleResolver()'
}, {
  plugins: [[pluginName]Plugin()]
});

const result = await data.get('example');
```

## Options

### `[PluginName]PluginOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exampleOption` | `boolean` | `false` | [Description] |

## Resolvers

### `exampleResolver()`

[Description of resolver]

**Signature**:
```typescript
exampleResolver(...args: any[]): any
```

**Example**:
```typescript
const data = dotted({
  '.result': 'exampleResolver(arg1, arg2)'
}, {
  plugins: [[pluginName]Plugin()]
});
```

## Error Handling

[Describe error handling behavior]

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import type { [PluginName]PluginOptions } from '@orb-zone/dotted-json/plugins/[plugin-name]';

const options: [PluginName]PluginOptions = {
  exampleOption: true
};
```

## Examples

### Example 1: [Use Case]

```typescript
[Working example]
```

### Example 2: [Use Case]

```typescript
[Working example]
```

## See Also

- [Main Documentation](../../docs/API.md)
- [Plugin Architecture](../../docs/PLUGINS.md)
- [Examples](../../examples/)
```

**4.2: Update Main API Docs**

Add section to `docs/API.md`:

```markdown
## [PluginName] Plugin

[Brief description]

**Import**:
```typescript
import { [pluginName]Plugin } from '@orb-zone/dotted-json/plugins/[plugin-name]';
```

**Peer Dependencies**:
- `[peer-dep]` ^[version]

[Link to full plugin documentation](../src/plugins/README-[plugin-name].md)
```

### Step 5: Update Build Configuration

**5.1: Add Plugin to Build**

Update `build.ts` to handle plugin as separate chunk:

```typescript
// Add to external dependencies (peer deps)
external: [
  'react',
  'vue',
  'zod',
  'surrealdb',
  '@pinia/colada',
  'pinia',
  '[new-peer-dependency]'  // Add here
]
```

**5.2: Verify Bundle Size**

Ensure plugin doesn't bloat core bundle:
- Plugins should be separate chunks
- Peer dependencies should be external
- Core bundle stays under 50 kB

### Step 6: Create Example

**6.1: Generate Example File**

Template for `examples/[plugin-name]-example.ts`:

```typescript
/**
 * Example: [Plugin Name] Plugin
 *
 * [Description of what this example demonstrates]
 */

import { dotted } from '../src/index';
import { [pluginName]Plugin } from '../src/plugins/[plugin-name]';

// Example 1: Basic usage
async function basicExample() {
  const data = dotted({
    '.result': 'exampleResolver()'
  }, {
    plugins: [[pluginName]Plugin()]
  });

  const result = await data.get('result');
  console.log('Result:', result);
}

// Example 2: Advanced usage
async function advancedExample() {
  const data = dotted({
    // More complex example
  }, {
    plugins: [
      [pluginName]Plugin({
        exampleOption: true
      })
    ]
  });

  // Demonstrate advanced features
}

// Run examples
console.log('=== [Plugin Name] Plugin Examples ===\n');

console.log('1. Basic Example:');
await basicExample();

console.log('\n2. Advanced Example:');
await advancedExample();
```

**6.2: Add Example to Package Scripts**

Update `package.json`:

```json
{
  "scripts": {
    "example:[plugin-name]": "bun run examples/[plugin-name]-example.ts"
  }
}
```

### Step 7: Generate Scaffold Report

Create summary of generated files:

```markdown
# Plugin Scaffolding Complete: [Plugin Name]

## Files Created

### Implementation
- ✅ `src/plugins/[plugin-name].ts` - Plugin implementation ([XX] lines)
- ✅ `src/index.ts` - Updated with plugin export

### Tests
- ✅ `test/unit/[plugin-name]-plugin.test.ts` - Unit tests ([XX] tests)
- ✅ `test/integration/[plugin-name]-integration.test.ts` - Integration tests (if applicable)

### Documentation
- ✅ `src/plugins/README-[plugin-name].md` - Plugin documentation
- ✅ `docs/API.md` - Updated with plugin section
- ✅ `examples/[plugin-name]-example.ts` - Working example

### Configuration
- ✅ `package.json` - Updated with peer dependency metadata
- ✅ `build.ts` - Updated with external dependency

## Peer Dependencies

The following peer dependencies were added:
- `[peer-dep]` ^[version] (optional)

Users must install separately:
```bash
bun add [peer-dep]
```

## Next Steps

### 1. Implement Plugin Logic
- [ ] Fill in resolver implementations
- [ ] Add plugin-specific logic
- [ ] Handle error cases

### 2. Write Tests (TDD)
- [ ] Write failing tests for each resolver
- [ ] Implement resolvers to make tests pass
- [ ] Add edge case tests
- [ ] Add integration tests (if external deps)

### 3. Documentation
- [ ] Update resolver descriptions
- [ ] Add usage examples
- [ ] Document options and defaults
- [ ] Add TypeScript examples

### 4. Validation
- [ ] Run tests: `bun test test/unit/[plugin-name]-plugin.test.ts`
- [ ] Build: `bun run build`
- [ ] Check bundle size
- [ ] Run example: `bun run example:[plugin-name]`

### 5. Integration
- [ ] Test with other plugins
- [ ] Verify peer dependency is optional
- [ ] Check TypeScript types
- [ ] Update main README (if user-facing)

## Quick Start

```bash
# Implement plugin
vim src/plugins/[plugin-name].ts

# Write tests (TDD)
vim test/unit/[plugin-name]-plugin.test.ts
bun test test/unit/[plugin-name]-plugin.test.ts

# Try example
bun run example:[plugin-name]
```

## Plugin Template Customization

The generated files are templates. Customize:

1. **Resolvers**: Add actual resolver logic
2. **Options**: Add plugin-specific configuration
3. **Hooks**: Implement beforeEvaluate, afterEvaluate, onError as needed
4. **Types**: Add specific type definitions
5. **Tests**: Add domain-specific test cases

## Constitutional Compliance

✅ **Plugin Architecture** (Principle IV):
- Plugin uses peer dependency (not bundled)
- Core remains framework-agnostic
- Plugin is optional

✅ **Bundle Size** (Principle I):
- Plugin built as separate chunk
- External peer dependencies
- Core bundle unaffected

⚠️ **TDD Required** (Principle III):
- Tests scaffolded, but need implementation
- Follow RED-GREEN-REFACTOR cycle

## Example Usage After Implementation

```typescript
import { dotted } from '@orb-zone/dotted-json';
import { [pluginName]Plugin } from '@orb-zone/dotted-json/plugins/[plugin-name]';

const data = dotted({
  '.data': '[resolver]()'
}, {
  plugins: [[pluginName]Plugin()]
});

const result = await data.get('data');
```
```

### Step 8: STOP and Report

**DO NOT**:
- Implement plugin logic (user's responsibility)
- Make git commits
- Publish package
- Install peer dependencies globally

**DO**:
- Create all scaffold files
- Update configuration
- Generate tests, docs, examples
- Provide next steps guide

---

## Plugin Patterns

### Pattern 1: Simple Resolver Plugin

Adds custom functions:

```typescript
export function mathPlugin(): Plugin {
  return {
    name: 'math',
    resolvers: {
      add: (a, b) => a + b,
      multiply: (a, b) => a * b
    }
  };
}
```

### Pattern 2: Integration Plugin

Wraps external library:

```typescript
export function reactPlugin(): Plugin {
  return {
    name: 'react',
    resolvers: {
      useQuery: (key, fetcher) => {
        // Use React Query
        return useQuery({ queryKey: key, queryFn: fetcher });
      }
    }
  };
}
```

### Pattern 3: Validation Plugin

Adds pre/post hooks:

```typescript
export function zodPlugin(schemas): Plugin {
  return {
    name: 'zod',
    beforeEvaluate: (expr, ctx) => {
      // Validate inputs
      return expr;
    },
    afterEvaluate: (result, expr, ctx) => {
      // Validate outputs
      return result;
    }
  };
}
```

### Pattern 4: Caching Plugin

Intercepts evaluation:

```typescript
export function cachePlugin(): Plugin {
  const cache = new Map();

  return {
    name: 'cache',
    beforeEvaluate: (expr, ctx) => {
      if (cache.has(expr)) {
        return cache.get(expr);
      }
      return expr;
    },
    afterEvaluate: (result, expr, ctx) => {
      cache.set(expr, result);
      return result;
    }
  };
}
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Implementing plugin logic (scaffolding only)
- Adding direct dependencies to core
- Bundling peer dependencies
- Making git commits
- Publishing changes

✅ **ALLOWED**:
- Creating scaffold files
- Updating configuration
- Generating tests/docs/examples
- Adding peer dependency metadata
- Updating build config

---

## Example Usage

```bash
# Scaffold React plugin
/plugin-scaffold react - React hooks for dotted-json

# Scaffold database plugin
/plugin-scaffold kysely - Kysely query builder integration

# Scaffold validation plugin
/plugin-scaffold ajv - AJV JSON schema validation
```

---

## Integration with Workflow

This command helps create new plugins:

```
/plan [plugin idea]
  ↓
/plugin-scaffold [plugin-name]  ← YOU ARE HERE
  ↓
/test-feature src/plugins/[plugin-name].ts
  ↓
/implement [plugin-name]
  ↓
/doc-api src/plugins/[plugin-name].ts
  ↓
/review-pr
  ↓
/changeset [plugin-name]
```

---

## Success Criteria

Successful scaffolding creates:
- ✅ Complete plugin file with JSDoc
- ✅ Unit test suite (ready for TDD)
- ✅ Integration test file (if needed)
- ✅ Plugin documentation
- ✅ Working example
- ✅ Updated configuration (package.json, build.ts)
- ✅ Updated main exports
- ✅ Peer dependency metadata
- ✅ Next steps guide
