# Testing Specialist Agent

**Domain**: TDD workflows, integration tests, contract testing, test organization

**Last Updated**: 2025-10-07

## Domain Expertise

This agent specializes in:
- Test-Driven Development (TDD) workflows
- Unit testing with Bun test runner
- Integration testing with SurrealDB
- Contract testing for TypeScript types
- Test organization and maintainability
- Mocking strategies and fixtures

## Constitutional Alignment

### Relevant Principles

**III. Test-First Development (NON-NEGOTIABLE)**
- Write tests BEFORE implementation
- Verify tests fail first, then pass after implementation
- 100% test pass rate required before merge
- Performance regression tests for critical paths

**Quality Gates**:
- ✅ 210/210 tests passing (current state)
- ✅ Zero skipped tests in main branch
- ✅ New features require happy path + edge cases + error scenarios

## TDD Workflow

### Red-Green-Refactor Cycle

**Step 1: RED** - Write failing test
```typescript
import { describe, test, expect } from 'bun:test';
import { dotted } from '../src/index';

describe('dotted-json', () => {
  test('evaluates simple expression', async () => {
    const doc = dotted({
      sum: '.add(a, b)',
      a: 5,
      b: 10
    }, {
      resolvers: {
        add: (a, b) => a + b
      }
    });

    const result = await doc.get('sum');
    expect(result).toBe(15);
  });
});

// Run: bun test
// Expected: ❌ FAIL (not implemented yet)
```

**Step 2: GREEN** - Implement minimal code to pass
```typescript
// src/index.ts
export function dotted(data, options) {
  return {
    get(path) {
      // Minimal implementation
      const value = data[path];
      if (typeof value === 'string' && value.startsWith('.')) {
        const match = value.match(/\.(\w+)\((.*)\)/);
        const [_, fnName, args] = match;
        return options.resolvers[fnName](...parseArgs(args));
      }
      return value;
    }
  };
}

// Run: bun test
// Expected: ✅ PASS
```

**Step 3: REFACTOR** - Improve code quality
```typescript
// Extract expression parser
class ExpressionEvaluator {
  parse(expr) { /* ... */ }
  evaluate(expr, context) { /* ... */ }
}

// Refactor dotted() to use ExpressionEvaluator
export function dotted(data, options) {
  const evaluator = new ExpressionEvaluator(options.resolvers);
  return {
    get(path) {
      const value = data[path];
      if (evaluator.isExpression(value)) {
        return evaluator.evaluate(value, data);
      }
      return value;
    }
  };
}

// Run: bun test
// Expected: ✅ PASS (same behavior, cleaner code)
```

## Test Organization

### Current Structure

```
test/
├── unit/                           # Unit tests (fast, isolated)
│   ├── dotted-json.test.ts         # Core class tests
│   ├── expression-evaluator.test.ts # Expression engine tests
│   ├── variant-resolver.test.ts    # Variant scoring tests
│   ├── pronouns.test.ts            # Pronoun system tests
│   ├── file-loader.test.ts         # FileLoader unit tests
│   ├── zod-plugin.test.ts          # Zod plugin tests
│   ├── surrealdb-plugin.test.ts    # SurrealDB plugin tests (mocked)
│   └── pinia-colada-plugin.test.ts # Pinia Colada tests (mocked)
│
├── integration/                    # Integration tests (slower, real dependencies)
│   ├── file-loader-integration.test.ts  # Real filesystem tests
│   └── surrealdb-integration.test.ts    # Real database tests (requires running DB)
│
└── fixtures/                       # Test data
    ├── locales/
    │   ├── strings.jsön
    │   ├── strings:es.jsön
    │   └── strings:es:formal.jsön
    └── schemas/
        └── users.surql
```

### Naming Conventions

**Test Files**:
- Unit tests: `*.test.ts`
- Integration tests: `*-integration.test.ts`
- Fixtures: `fixtures/` directory

**Test Descriptions**:
```typescript
describe('ComponentName', () => {
  describe('methodName()', () => {
    test('does expected behavior when valid input', () => { /* ... */ });
    test('throws error when invalid input', () => { /* ... */ });
    test('handles edge case: empty array', () => { /* ... */ });
  });
});
```

## Testing Patterns

### 1. Unit Tests (Isolated, Fast)

**Characteristics**:
- No external dependencies (file I/O, database, network)
- Use mocks/stubs for dependencies
- Fast execution (< 1ms per test)
- High coverage of logic branches

**Example**:
```typescript
import { describe, test, expect, mock } from 'bun:test';
import { ExpressionEvaluator } from '../src/expression-evaluator';

describe('ExpressionEvaluator', () => {
  test('evaluates function call with parameters', () => {
    const mockResolver = mock((a, b) => a + b);
    const evaluator = new ExpressionEvaluator({ add: mockResolver });

    const result = evaluator.evaluate('.add(5, 10)', {});

    expect(result).toBe(15);
    expect(mockResolver).toHaveBeenCalledWith(5, 10);
  });
});
```

### 2. Integration Tests (Real Dependencies)

**Characteristics**:
- Uses real filesystem, database, network
- Slower execution (10ms - 1s per test)
- Tests actual integration points
- Requires test environment setup

**Example**:
```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { FileLoader } from '../src/loaders/file';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

describe('FileLoader Integration', () => {
  const testDir = './test-output/locales';

  beforeAll(() => {
    // Setup: Create test files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(`${testDir}/strings.jsön`, JSON.stringify({ hello: 'Hello' }));
    writeFileSync(`${testDir}/strings:es.jsön`, JSON.stringify({ hello: 'Hola' }));
  });

  afterAll(() => {
    // Cleanup: Remove test files
    rmSync(testDir, { recursive: true, force: true });
  });

  test('loads best matching file from filesystem', async () => {
    const loader = new FileLoader({
      baseDir: testDir,
      context: { lang: 'es' }
    });

    const doc = await loader.load('strings');
    expect(await doc.get('hello')).toBe('Hola');
  });
});
```

### 3. Contract Tests (Type Safety)

**Characteristics**:
- Verify TypeScript types match runtime behavior
- Use `z.infer<>` for schema → type contracts
- Compile-time type checking
- Runtime validation tests

**Example**:
```typescript
import { describe, test, expect, expectTypeOf } from 'bun:test';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

type User = z.infer<typeof UserSchema>;

describe('Schema Contract Tests', () => {
  test('runtime schema matches TypeScript type', () => {
    const validUser: User = {
      name: 'Alice',
      age: 30
    };

    // Runtime validation
    expect(() => UserSchema.parse(validUser)).not.toThrow();

    // Type-level validation (compile-time)
    expectTypeOf(validUser).toMatchTypeOf<User>();
  });

  test('schema rejects invalid data', () => {
    const invalidUser = {
      name: 'Bob',
      age: 'thirty'  // Wrong type
    };

    expect(() => UserSchema.parse(invalidUser)).toThrow();
  });
});
```

## Mocking Strategies

### 1. Function Mocking

```typescript
import { mock } from 'bun:test';

test('calls resolver with correct parameters', () => {
  const mockFetch = mock(async (url) => ({ data: 'mocked' }));

  const doc = dotted({
    user: '.fetchUser("alice")'
  }, {
    resolvers: {
      fetchUser: mockFetch
    }
  });

  await doc.get('user');

  expect(mockFetch).toHaveBeenCalledWith('alice');
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
```

### 2. Database Mocking

```typescript
import { mock } from 'bun:test';

test('generates correct SQL query', async () => {
  const mockDB = {
    select: mock(() => Promise.resolve([{ id: 'user:alice' }])),
    query: mock(() => Promise.resolve([]))
  };

  const plugin = createSurrealDBPlugin(mockDB);

  await plugin.resolvers['db.select.users']();

  expect(mockDB.select).toHaveBeenCalledWith('users');
});
```

### 3. Fixture Files

```typescript
// test/fixtures/locales/strings:es:formal.jsön
{
  "greeting": "Buenos días",
  "farewell": "Adiós"
}

// Test uses fixture
test('loads fixture file', async () => {
  const loader = new FileLoader({
    baseDir: './test/fixtures/locales',
    context: { lang: 'es', form: 'formal' }
  });

  const doc = await loader.load('strings');
  expect(await doc.get('greeting')).toBe('Buenos días');
});
```

## Coverage Requirements

### Current Coverage (v0.5.0)

| Module | Tests | Coverage | Status |
|--------|-------|----------|--------|
| Core (dotted-json) | 85 | ~95% | ✅ Good |
| Expression evaluator | 45 | ~98% | ✅ Excellent |
| Variant resolver | 30 | ~90% | ✅ Good |
| FileLoader | 25 | ~85% | ⚠️ Needs edge cases |
| Zod plugin | 8 | ~90% | ✅ Good |
| SurrealDB plugin | 0 | 0% | ❌ Needs tests |
| Pinia Colada plugin | 12 | ~85% | ✅ Good |

**Total**: 210 tests passing

### Coverage Goals

**Target Coverage**:
- Core modules: > 95%
- Plugins: > 85%
- Integration tests: > 70%

**Uncovered Edge Cases** (to add):
- FileLoader: Path traversal attacks, missing files
- SurrealDB: Connection failures, permission errors
- Variant resolver: Tie-breaking with 3+ candidates

## Performance Regression Tests

**Benchmark Suite**:
```typescript
import { describe, test, expect } from 'bun:test';
import { dotted } from '../src/index';

describe('Performance Benchmarks', () => {
  test('simple expression < 1ms', async () => {
    const doc = dotted({
      value: '.identity(42)'
    }, {
      resolvers: { identity: (x) => x }
    });

    const start = performance.now();
    await doc.get('value');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  test('variant resolution < 5ms for 100 candidates', async () => {
    // Generate 100 variant files
    const candidates = Array.from({ length: 100 }, (_, i) => ({
      path: `file:variant${i}.jsön`,
      variants: { custom: `v${i}` }
    }));

    const start = performance.now();
    const winner = resolveVariant(candidates, { custom: 'v50' });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
    expect(winner.path).toBe('file:variant50.jsön');
  });
});
```

## Common Pitfalls

### ❌ Testing Implementation Details
**Problem**: Tests break when refactoring internal code
**Solution**: Test public API behavior, not private methods

### ❌ Skipping Edge Cases
**Problem**: Tests only cover happy path
**Solution**: Test error scenarios, empty inputs, null/undefined

### ❌ Flaky Tests
**Problem**: Tests pass/fail randomly due to timing issues
**Solution**: Use deterministic mocks, avoid real timers

### ❌ Missing Cleanup
**Problem**: Integration tests leave test files/data behind
**Solution**: Use `afterAll()` hooks to clean up

### ❌ Slow Test Suite
**Problem**: Running all tests takes > 10 seconds
**Solution**: Separate fast unit tests from slow integration tests

## Best Practices

### 1. Test Naming

✅ **DO**:
```typescript
test('throws error when path is invalid', () => { /* ... */ });
test('returns cached value on second access', () => { /* ... */ });
```

❌ **DON'T**:
```typescript
test('test1', () => { /* ... */ });
test('it works', () => { /* ... */ });
```

### 2. Arrange-Act-Assert Pattern

```typescript
test('calculates sum correctly', () => {
  // Arrange: Setup test data
  const doc = dotted({
    sum: '.add(a, b)',
    a: 5,
    b: 10
  }, {
    resolvers: { add: (a, b) => a + b }
  });

  // Act: Perform action
  const result = await doc.get('sum');

  // Assert: Verify outcome
  expect(result).toBe(15);
});
```

### 3. One Assertion Per Test

✅ **DO**:
```typescript
test('parses expression correctly', () => {
  const expr = '.add(5, 10)';
  const parsed = parser.parse(expr);
  expect(parsed.fn).toBe('add');
});

test('parses expression parameters', () => {
  const expr = '.add(5, 10)';
  const parsed = parser.parse(expr);
  expect(parsed.params).toEqual([5, 10]);
});
```

❌ **DON'T**:
```typescript
test('parses expression', () => {
  const expr = '.add(5, 10)';
  const parsed = parser.parse(expr);
  expect(parsed.fn).toBe('add');  // Multiple assertions
  expect(parsed.params).toEqual([5, 10]);  // Hard to debug failures
});
```

## Resources

### Testing Tools
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Bun Mocking](https://bun.sh/docs/test/mocks)
- [TDD Guide](https://testdriven.io/)

### Design Documents
- `.specify/memory/constitution.md` - TDD principle (Principle III)

### Implementation References
- `test/unit/` - Current unit test suite
- `test/integration/` - Current integration tests
- `test/fixtures/` - Test data files

---

**When to Use This Agent**:
- Designing test strategies for new features
- Improving test coverage
- Writing performance benchmarks
- Debugging flaky tests
- Organizing test suites

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "testing-specialist",
  description: "Design integration test strategy",
  prompt: "Create integration test suite for SurrealDBLoader with real database, including setup, teardown, and permission testing..."
});
```
