---
description: Generate and update API documentation from TypeScript types and JSDoc comments
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Constitutional Review**:
   - Read `.specify/memory/constitution.md` (documentation standards)

2. **Specialist Auto-Loading**:
   - Load `.specify/agents/documentation-curator.md` for documentation expertise

3. **Source Code Context**:
   - Understand current exports
   - Identify undocumented APIs

---

## User Input

Scope (optional): $ARGUMENTS

Examples:
- `/doc-api` - Update all API documentation
- `/doc-api src/dotted-json.ts` - Document specific file
- `/doc-api plugins` - Document all plugins

---

## Documentation Generation Process

### Step 1: Analyze Exports

**1.1: Scan Main Entry Point**

Read `src/index.ts`:
```typescript
// Extract all export statements
export { dotted, type DottedJson } from './dotted-json';
export { type Options, type Resolver } from './types';
// ... etc
```

Create list of:
- Exported functions
- Exported classes
- Exported types/interfaces
- Exported constants

**1.2: Read Implementation Files**

For each export, read source file to extract:
- JSDoc comments
- Function signatures
- Parameter types
- Return types
- Generic type parameters
- Examples in comments

**1.3: Identify Documentation Gaps**

Compare exports against `docs/API.md`:
- Missing sections for new exports
- Outdated signatures
- Missing parameter descriptions
- Missing return type docs
- Missing examples

### Step 2: Extract API Information

**2.1: Parse Function Signatures**

For each function:
```typescript
/**
 * Creates a dotted-json instance for dynamic expression evaluation
 * @param data - The data object with expressions
 * @param options - Configuration options
 * @returns A DottedJson instance with lazy evaluation
 */
export function dotted(
  data: any,
  options?: Options
): DottedJson {
  // ...
}
```

Extract:
- **Name**: `dotted`
- **Description**: "Creates a dotted-json instance..."
- **Parameters**:
  - `data: any` - "The data object with expressions"
  - `options?: Options` - "Configuration options"
- **Returns**: `DottedJson` - "A DottedJson instance with lazy evaluation"
- **Generics**: None
- **Throws**: (check for `@throws` tags)

**2.2: Parse Type Definitions**

For each type/interface:
```typescript
/**
 * Configuration options for dotted-json
 */
export interface Options {
  /** Custom resolver functions */
  resolvers?: Record<string, Resolver>;
  /** Enable automatic caching */
  cache?: boolean;
  /** Plugin instances */
  plugins?: Plugin[];
}
```

Extract:
- **Name**: `Options`
- **Description**: "Configuration options for dotted-json"
- **Properties**:
  - `resolvers?: Record<string, Resolver>` - "Custom resolver functions"
  - `cache?: boolean` - "Enable automatic caching"
  - `plugins?: Plugin[]` - "Plugin instances"

**2.3: Parse Class Methods**

For each class:
```typescript
export class DottedJson {
  /**
   * Gets a value from the data object
   * @param path - Dot-notation path (e.g., 'user.name')
   * @returns The resolved value
   */
  async get(path: string): Promise<any> {
    // ...
  }
}
```

Extract all public methods with their signatures.

### Step 3: Generate Documentation Sections

**3.1: Function Documentation Template**

```markdown
### `functionName()`

[Brief description from JSDoc]

**Signature**:
```typescript
function functionName(param1: Type1, param2?: Type2): ReturnType
```

**Parameters**:
- `param1` (`Type1`) - [Description]
- `param2` (`Type2`, optional) - [Description]. Default: [default value]

**Returns**:
- `ReturnType` - [Description]

**Throws**:
- `ErrorType` - [When this error is thrown]

**Example**:
```typescript
[Working code example]
```

**See Also**:
- [Related function](#related-function)
```

**3.2: Type Documentation Template**

```markdown
### `TypeName`

[Brief description]

**Definition**:
```typescript
interface TypeName {
  property1: Type1;
  property2?: Type2;
}
```

**Properties**:
- `property1` (`Type1`, required) - [Description]
- `property2` (`Type2`, optional) - [Description]

**Example**:
```typescript
const example: TypeName = {
  property1: value1,
  property2: value2
};
```
```

**3.3: Class Documentation Template**

```markdown
### `ClassName`

[Brief description]

**Constructor**:
```typescript
new ClassName(param1: Type1, param2?: Type2)
```

**Methods**:

#### `methodName()`

[Method description]

**Signature**:
```typescript
methodName(param: ParamType): ReturnType
```

[... parameters, returns, example ...]

**Properties**:

#### `propertyName`

- **Type**: `PropertyType`
- **Description**: [Description]

**Example**:
```typescript
[Complete class usage example]
```
```

### Step 4: Extract or Generate Examples

**4.1: Find Existing Examples**

Search for examples in:
- JSDoc comments (`@example` tags)
- `examples/` directory
- `README.md`
- `test/` files (as usage patterns)

**4.2: Generate New Examples**

If no example exists, create one that:
- Shows realistic usage
- Demonstrates key features
- Is self-contained (copy-paste ready)
- Compiles without errors
- Follows project style

**Example Format**:
```typescript
import { dotted } from '@orb-zone/dotted-json';

// Setup
const data = dotted({
  user: { name: 'Alice', age: 30 },
  '.greeting': 'Hello, ${user.name}!'
});

// Usage
const greeting = await data.get('greeting');
console.log(greeting);  // "Hello, Alice!"
```

**4.3: Validate Examples**

For each code example:
1. Extract to temporary file
2. Run TypeScript compiler
3. Verify it compiles
4. Run with Bun (if executable)
5. Verify output matches expected

### Step 5: Update API.md

**5.1: Read Current API.md**

```bash
cat docs/API.md
```

Parse structure:
- Table of contents
- Sections (Functions, Types, Classes, Plugins)
- Existing documentation

**5.2: Identify Changes Needed**

Compare extracted API with current docs:

**Additions** (new since last update):
- New exports not in API.md

**Updates** (changed signatures):
- Functions with different parameters
- Types with new properties
- Classes with new methods

**Removals** (deprecated/removed):
- Documented APIs no longer exported

**5.3: Generate Updated Sections**

For each change:
- Add new sections for new exports
- Update existing sections for changes
- Mark deprecated items (if still documented)
- Remove sections for deleted exports

**5.4: Organize Content**

Structure API.md:

```markdown
# API Reference

## Table of Contents

- [Core Functions](#core-functions)
  - [dotted()](#dotted)
  - [expand()](#expand)
- [Types](#types)
  - [Options](#options)
  - [DottedJson](#dottedJson)
- [Classes](#classes)
  - [FileLoader](#fileloader)
  - [SurrealDBLoader](#surrealdbloader)
- [Plugins](#plugins)
  - [Zod Plugin](#zod-plugin)
  - [SurrealDB Plugin](#surrealdb-plugin)

---

## Core Functions

### `dotted()`

[Documentation...]

---

## Types

### `Options`

[Documentation...]

---

[etc.]
```

**5.5: Write Updated API.md**

Use Edit tool to update `docs/API.md`:
- Preserve existing structure
- Update changed sections
- Add new sections
- Remove obsolete sections
- Update table of contents

### Step 6: Validate Documentation

**6.1: Check Examples Compile**

Extract all code blocks with ` ```typescript`:
1. Save to temporary files
2. Run `bun run typecheck` on each
3. Report any that don't compile
4. Fix or mark as pseudo-code

**6.2: Check Links**

Verify all internal links work:
- Table of contents links to sections
- "See Also" links point to valid sections
- External links are accessible

**6.3: Check Completeness**

Verify every export is documented:
```bash
# Get all exports
grep -r "^export" src/index.ts

# Check each appears in API.md
grep "### \`exportName\`" docs/API.md
```

Report any missing.

**6.4: Style Consistency**

Check documentation follows style:
- ✅ Code blocks have language tags
- ✅ Parameters use `backticks`
- ✅ Consistent heading levels
- ✅ Examples are self-contained
- ✅ Descriptions are clear and concise

### Step 7: Generate Documentation Report

Create summary of changes:

```markdown
# API Documentation Updated

## Changes Made

### New Documentation
- `functionName()` - [Brief description]
- `TypeName` - [Brief description]

### Updated Documentation
- `existingFunction()` - Updated signature: [what changed]
- `ExistingType` - Added properties: [list]

### Removed Documentation
- `deprecatedFunction()` - No longer exported

## Validation Results

### Example Compilation
- ✅ All code examples compile
- [Or]: ⚠️ [X] examples need fixes:
  - [example location]: [error]

### Link Validation
- ✅ All internal links valid
- [Or]: ⚠️ Broken links:
  - [link]: [issue]

### Coverage
- ✅ All exports documented
- [Or]: ⚠️ Missing documentation:
  - [export name]

## File Updated

- `docs/API.md` - [XX] sections added/updated

## Next Steps

[If issues found]:
1. Fix compilation errors in examples
2. Update broken links
3. Add missing documentation

[If all good]:
✅ API documentation is complete and accurate
```

### Step 8: STOP and Report

**DO NOT**:
- Commit changes
- Update other documentation (README, guides)
- Modify source code
- Create pull requests

**DO**:
- Update `docs/API.md`
- Validate examples compile
- Report completeness status
- Suggest additional documentation needs

---

## Documentation Best Practices

### 1. Clear Descriptions

✅ **DO**:
```markdown
Creates a lazy-evaluating JSON object that resolves expressions on access.
```

❌ **DON'T**:
```markdown
Makes JSON objects.
```

### 2. Self-Contained Examples

✅ **DO**:
```typescript
import { dotted } from '@orb-zone/dotted-json';

const data = dotted({
  name: 'Alice',
  '.greeting': 'Hello, ${name}!'
});

const greeting = await data.get('greeting');
// greeting === "Hello, Alice!"
```

❌ **DON'T**:
```typescript
// Assuming data is already set up
const greeting = await data.get('greeting');
```

### 3. Type Annotations

✅ **DO**:
```markdown
**Parameters**:
- `path` (`string`) - Dot-notation path to the value
- `options` (`GetOptions`, optional) - Evaluation options
```

❌ **DON'T**:
```markdown
**Parameters**:
- path - The path
- options - Some options
```

### 4. Error Documentation

✅ **DO**:
```markdown
**Throws**:
- `TypeError` - When `path` is not a string
- `EvaluationError` - When expression evaluation fails
```

❌ **DON'T**:
```markdown
May throw errors.
```

### 5. Cross-References

✅ **DO**:
```markdown
**See Also**:
- [Options](#options) - Configuration object structure
- [Resolvers](#resolvers) - Custom function registration
```

---

## Special Documentation Cases

### Documenting Generics

```markdown
### `createResolver<T>()`

Creates a type-safe resolver function.

**Type Parameters**:
- `T` - The return type of the resolver

**Signature**:
```typescript
function createResolver<T>(
  fn: (...args: any[]) => T
): Resolver<T>
```

**Example**:
```typescript
const numberResolver = createResolver<number>((a, b) => a + b);
const stringResolver = createResolver<string>((s) => s.toUpperCase());
```
```

### Documenting Overloads

```markdown
### `get()`

Gets a value with optional type assertion.

**Overloads**:

```typescript
// Overload 1: Simple get
get(path: string): Promise<any>

// Overload 2: With type assertion
get<T>(path: string): Promise<T>
```

**Examples**:

```typescript
// Inferred type (any)
const value = await data.get('user.name');

// Explicit type
const name = await data.get<string>('user.name');
const age = await data.get<number>('user.age');
```
```

### Documenting Async Functions

```markdown
### `load()`

Asynchronously loads data from storage.

**Signature**:
```typescript
async load(key: string): Promise<DottedJson>
```

**Note**: This function is asynchronous. Always use `await` or `.then()`.

**Example**:
```typescript
// Using await
const data = await loader.load('config');

// Using .then()
loader.load('config').then(data => {
  // Use data
});
```
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Modifying source code
- Adding `@ts-ignore` to make examples compile
- Creating fake/pseudo-code examples
- Skipping example validation
- Making git commits

✅ **ALLOWED**:
- Updating docs/API.md
- Extracting JSDoc comments
- Generating examples from source
- Validating example compilation
- Cross-referencing related APIs

---

## Example Usage

```bash
# Update all API documentation
/doc-api

# Document specific file
/doc-api src/plugins/zod.ts

# Document plugin APIs only
/doc-api plugins
```

---

## Integration with Workflow

This command fits after feature implementation:

```
/plan [feature]
  ↓
/test-feature [feature]
  ↓
/implement [feature]
  ↓
/doc-api [feature]  ← YOU ARE HERE
  ↓
/review-pr
  ↓
/changeset [feature]
```

---

## Success Criteria

Successful API documentation includes:
- ✅ All exports documented
- ✅ Accurate type signatures
- ✅ Clear parameter descriptions
- ✅ Working code examples
- ✅ Examples compile without errors
- ✅ Cross-references to related APIs
- ✅ Error conditions documented
- ✅ Consistent formatting
- ✅ Table of contents updated
