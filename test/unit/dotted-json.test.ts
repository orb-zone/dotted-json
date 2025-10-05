/**
 * Core dotted-json functionality tests
 *
 * Following TDD principle - these tests should be written BEFORE implementation
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('dotted-json core', () => {
  test('placeholder - implementation pending', () => {
    expect(() => {
      dotted({}, {});
    }).toThrow('Not yet implemented');
  });

  // TODO: Following TDD, write tests based on __DRAFT__ reference implementation
  // Priority tests to implement:
  //
  // 1. Basic expression evaluation
  // 2. Template literal interpolation
  // 3. Lazy evaluation (expressions only eval when accessed)
  // 4. Caching behavior
  // 5. Nested expression expansion
  // 6. Error handling with errorDefault
  // 7. Default value resolution
  // 8. Cycle detection (Constitution Principle VI)
  // 9. maxEvaluationDepth enforcement
  // 10. Resolver function calls
});
