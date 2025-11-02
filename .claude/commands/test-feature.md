---
description: Generate comprehensive test suite following TDD patterns with edge case coverage
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Constitutional Review**:
   - Read `.specify/memory/constitution.md` (Principle III: Test-First Development)
   - Verify TDD approach is followed

2. **Specialist Auto-Loading**:
   - Load `.specify/agents/testing-specialist.md` for TDD expertise

3. **Feature Context**:
   - Understand what feature needs tests
   - Identify if it's new feature or testing existing code

---

## User Input

Feature name or file path: $ARGUMENTS

Examples:
- `/test-feature variant-caching`
- `/test-feature src/helpers/type-coercion.ts`
- `/test-feature fresh() resolver`

---

## Test Generation Process

### Step 1: Analyze Feature

**1.1: Identify Target Code**

If user provided file path:
- Read the file
- Identify all exported functions/classes
- List public APIs to test

If user provided feature name:
- Search for relevant files in `src/`
- Identify related code
- Ask user to confirm scope

**1.2: Understand Behavior**

For each function/class:
- Read implementation
- Identify inputs and outputs
- Note edge cases (null, undefined, empty, large)
- Identify error conditions
- Check for async operations

**1.3: Check Existing Tests**

Search for existing test file:
```bash
# Look for corresponding test file
ls test/unit/[feature-name].test.ts
ls test/integration/[feature-name]-integration.test.ts
```

If exists:
- Read existing tests
- Identify coverage gaps
- Note missing edge cases

If doesn't exist:
- Plan complete test suite

### Step 2: Design Test Suite

**2.1: Categorize Tests**

**Unit Tests** (`test/unit/*.test.ts`):
- Fast, isolated tests
- Mocked dependencies
- Logic and algorithm testing
- Edge case coverage

**Integration Tests** (`test/integration/*-integration.test.ts`):
- Real dependencies (filesystem, database)
- Plugin interactions
- End-to-end workflows

**Contract Tests** (if applicable):
- TypeScript type safety
- Zod schema validation
- Runtime vs compile-time alignment

**2.2: Identify Test Cases**

For each function/method:

**Happy Path**:
- Valid input → expected output
- Typical use cases

**Edge Cases**:
- Empty inputs ([], '', null, undefined)
- Boundary values (0, -1, MAX_INT)
- Large inputs (1000+ items)
- Special characters (unicode, emojis)

**Error Scenarios**:
- Invalid input types
- Missing required parameters
- Out-of-range values
- Permission/access errors

**Performance** (if critical path):
- Execution time < threshold
- Memory usage reasonable
- No performance regression

**2.3: Plan Test Organization**

Use nested `describe` blocks:
```typescript
describe('FeatureName', () => {
  describe('methodName()', () => {
    describe('when valid input', () => {
      test('returns expected result', () => { /* ... */ });
    });

    describe('when edge cases', () => {
      test('handles null input', () => { /* ... */ });
      test('handles empty array', () => { /* ... */ });
    });

    describe('when invalid input', () => {
      test('throws error for wrong type', () => { /* ... */ });
    });
  });
});
```

### Step 3: Generate Test Code

**3.1: Create Test File Structure**

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { [FeatureName] } from '../../src/[feature-path]';

describe('[FeatureName]', () => {
  // Setup if needed
  beforeAll(() => {
    // Initialize test fixtures
  });

  afterAll(() => {
    // Cleanup
  });

  // Test cases here
});
```

**3.2: Write Test Cases**

Follow AAA pattern (Arrange-Act-Assert):

```typescript
test('descriptive test name', async () => {
  // Arrange: Setup test data
  const input = { /* ... */ };
  const expected = { /* ... */ };

  // Act: Execute function
  const result = await featureFunction(input);

  // Assert: Verify outcome
  expect(result).toBe(expected);
});
```

**3.3: Edge Case Tests**

```typescript
describe('edge cases', () => {
  test('handles null input gracefully', () => {
    expect(() => featureFunction(null)).toThrow('Input cannot be null');
  });

  test('handles empty array', () => {
    const result = featureFunction([]);
    expect(result).toEqual([]);
  });

  test('handles undefined value', () => {
    const result = featureFunction(undefined);
    expect(result).toBe(null);
  });

  test('handles large input (1000+ items)', () => {
    const largeInput = Array.from({ length: 1000 }, (_, i) => i);
    const result = featureFunction(largeInput);
    expect(result.length).toBe(1000);
  });
});
```

**3.4: Error Scenario Tests**

```typescript
describe('error scenarios', () => {
  test('throws error for invalid type', () => {
    expect(() => featureFunction('invalid')).toThrow(TypeError);
  });

  test('throws error with descriptive message', () => {
    expect(() => featureFunction(-1)).toThrow('Value must be non-negative');
  });
});
```

**3.5: Integration Tests** (if needed)

```typescript
// test/integration/feature-integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { FeatureName } from '../../src/feature';

describe('FeatureName Integration', () => {
  beforeAll(async () => {
    // Setup real dependencies (filesystem, database, etc.)
  });

  afterAll(async () => {
    // Cleanup
  });

  test('works with real dependencies', async () => {
    // Test with real filesystem, database, etc.
  });
});
```

### Step 4: Verify Tests

**4.1: Run Tests (Expect Failures if TDD)**

```bash
bun test [test-file-path]
```

If writing tests BEFORE implementation (TDD):
- ✅ Tests should FAIL (feature not implemented yet)
- Verify failures are for the right reason

If writing tests AFTER implementation:
- ✅ Tests should PASS
- If failures, fix tests or identify bugs

**4.2: Check Coverage**

Verify all paths are tested:
- All branches (if/else)
- All error conditions
- All edge cases

**4.3: Run Full Test Suite**

```bash
bun test
```

Ensure:
- No test breaks existing tests
- Total test count increased
- All tests pass

### Step 5: Generate Test Report

Create a summary of generated tests:

```markdown
# Test Suite Generated: [Feature Name]

## Test Files Created/Updated

- `test/unit/[feature].test.ts` - [XX] unit tests
- `test/integration/[feature]-integration.test.ts` - [XX] integration tests (if applicable)

## Test Coverage

### Happy Path
- ✅ [Test case 1]
- ✅ [Test case 2]

### Edge Cases
- ✅ Null input
- ✅ Empty input
- ✅ Large input ([size])
- ✅ Undefined values
- ✅ [Other edge cases]

### Error Scenarios
- ✅ Invalid type
- ✅ Out of range
- ✅ [Other errors]

### Performance (if applicable)
- ✅ Execution time < [threshold]
- ✅ No memory leaks

## Test Results

```bash
bun test [test-file]
```

[If TDD - BEFORE implementation]:
- ❌ [XX] tests failing (EXPECTED - feature not implemented)
- Ready for implementation phase

[If AFTER implementation]:
- ✅ [XX]/[XX] tests passing
- ✅ All edge cases covered
- ✅ No regressions in existing tests

## Next Steps

[If TDD]:
1. Implement feature to make tests pass
2. Run tests after each change
3. Refactor once all tests pass

[If testing existing code]:
1. Review test results
2. Fix any failing tests or bugs found
3. Add additional tests for uncovered scenarios
```

### Step 6: STOP and Report

**DO NOT**:
- Implement the feature (unless explicitly asked)
- Commit changes
- Modify non-test files

**DO**:
- Write comprehensive test suite
- Verify tests run (pass or fail as expected)
- Report coverage and next steps

---

## Test Patterns for Common Scenarios

### Pattern 1: Testing Expressions

```typescript
test('evaluates expression with variables', async () => {
  const doc = dotted({
    user: { name: 'Alice' },
    '.greeting': 'Hello, ${user.name}!'
  });

  const result = await doc.get('greeting');
  expect(result).toBe('Hello, Alice!');
});
```

### Pattern 2: Testing Variants

```typescript
test('resolves best matching variant', async () => {
  const doc = dotted({
    lang: 'es',
    gender: 'f',
    '.title': 'Author',
    '.title:es': 'Autor',
    '.title:es:f': 'Autora'
  });

  const result = await doc.get('title');
  expect(result).toBe('Autora');  // Best match
});
```

### Pattern 3: Testing Resolvers

```typescript
test('calls resolver with correct arguments', async () => {
  const mockResolver = mock((a: number, b: number) => a + b);

  const doc = dotted({
    '.sum': 'add(5, 10)'
  }, {
    resolvers: { add: mockResolver }
  });

  await doc.get('sum');

  expect(mockResolver).toHaveBeenCalledWith(5, 10);
  expect(mockResolver).toHaveBeenCalledTimes(1);
});
```

### Pattern 4: Testing Async Operations

```typescript
test('handles async resolver', async () => {
  const doc = dotted({
    '.user': 'fetchUser("alice")'
  }, {
    resolvers: {
      fetchUser: async (id: string) => ({ id, name: 'Alice' })
    }
  });

  const result = await doc.get('user');
  expect(result).toEqual({ id: 'alice', name: 'Alice' });
});
```

### Pattern 5: Testing Error Handling

```typescript
test('throws error with helpful message', async () => {
  const doc = dotted({
    '.invalid': 'unknownFunction()'
  });

  await expect(doc.get('invalid')).rejects.toThrow(
    'Resolver not found: unknownFunction'
  );
});
```

### Pattern 6: Testing Caching

```typescript
test('caches evaluated expression', async () => {
  let callCount = 0;
  const doc = dotted({
    '.value': 'increment()'
  }, {
    resolvers: {
      increment: () => ++callCount
    }
  });

  await doc.get('value');  // First call
  await doc.get('value');  // Should be cached

  expect(callCount).toBe(1);  // Only called once
});
```

### Pattern 7: Testing File Loading

```typescript
test('loads file with variant matching', async () => {
  const loader = new FileLoader({
    baseDir: './test/fixtures/locales',
    context: { lang: 'es', form: 'formal' }
  });

  const doc = await loader.load('strings');
  expect(await doc.get('greeting')).toBe('Buenos días');
});
```

### Pattern 8: Testing Plugin Integration

```typescript
test('Zod plugin validates resolver inputs', async () => {
  const addSchema = z.tuple([z.number(), z.number()]);

  const doc = dotted({
    '.sum': 'add(5, 10)'
  }, {
    plugins: [zodPlugin({ add: addSchema })],
    resolvers: { add: (a, b) => a + b }
  });

  // Valid input
  const result = await doc.get('sum');
  expect(result).toBe(15);

  // Invalid input
  const invalidDoc = dotted({
    '.sum': 'add("5", "10")'  // Strings instead of numbers
  }, {
    plugins: [zodPlugin({ add: addSchema })],
    resolvers: { add: (a, b) => a + b }
  });

  await expect(invalidDoc.get('sum')).rejects.toThrow(z.ZodError);
});
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Writing implementation code (unless explicitly asked)
- Skipping edge cases
- Creating flaky tests (timing-dependent)
- Using `test.skip()` or `test.only()`
- Making git commits

✅ **ALLOWED**:
- Creating test files
- Writing comprehensive test suites
- Creating test fixtures
- Running tests
- Reporting coverage gaps

---

## Example Usage

```bash
# Generate tests for new feature
/test-feature src/helpers/type-coercion.ts

# Generate tests for existing feature (find gaps)
/test-feature variant-resolver

# Generate integration tests
/test-feature surrealdb-loader --integration
```

---

## Integration with Workflow

This command fits in the TDD workflow:

```
/plan [feature]
  ↓
/test-feature [feature]  ← YOU ARE HERE (write failing tests)
  ↓
/implement [feature]     ← Make tests pass
  ↓
/review-pr
  ↓
/changeset [feature]
```

---

## Success Criteria

A successful test suite includes:
- ✅ Happy path tests (typical use cases)
- ✅ Edge case tests (null, empty, large, etc.)
- ✅ Error scenario tests (invalid inputs)
- ✅ Integration tests (if applicable)
- ✅ Performance tests (if critical path)
- ✅ Clear, descriptive test names
- ✅ AAA pattern (Arrange-Act-Assert)
- ✅ No flaky tests
- ✅ Fast execution (< 1s for unit tests)
