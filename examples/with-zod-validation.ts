/**
 * Zod Validation Example
 *
 * Demonstrates the recommended security pattern using the Zod plugin
 * for automatic input/output validation of resolver functions.
 */

import { dotted } from '@orbzone/dotted-json';
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

// Example 1: Basic resolver validation
const userAPI = dotted(
  {
    userId: 42,
    '.user': 'fetchUser(${userId})',
    '.greeting': 'Hello, ${.user.name}!',
  },
  {
    ...withZod({
      schemas: {
        resolvers: {
          fetchUser: {
            input: z.tuple([z.number().positive()]),
            output: z.object({
              id: z.number(),
              name: z.string(),
              email: z.string().email(),
            }),
          },
        },
      },
    }),
    resolvers: {
      fetchUser: async (id: number) => {
        // Inputs automatically validated by Zod
        return {
          id,
          name: 'Jane Doe',
          email: 'jane@example.com',
        };
      },
    },
  }
);

console.log('=== Example 1: Basic Validation ===');
console.log('User:', await userAPI.get('.user'));
console.log('Greeting:', await userAPI.get('.greeting'));

// Example 2: Preventing invalid inputs
const safeAPI = dotted(
  {
    invalidUserId: -1, // Negative ID - will fail validation
    '.badUser': 'fetchUser(${invalidUserId})',
  },
  {
    errorDefault: 'Validation failed',
    ...withZod({
      schemas: {
        resolvers: {
          fetchUser: {
            input: z.tuple([z.number().positive()]),
            output: z.object({
              id: z.number(),
              name: z.string(),
            }),
          },
        },
      },
    }),
    resolvers: {
      fetchUser: async (id: number) => {
        return { id, name: 'Test User' };
      },
    },
  }
);

console.log('\n=== Example 2: Input Validation ===');
console.log('Bad User:', await safeAPI.get('.badUser')); // Returns errorDefault

// Example 3: Complex nested validation
const productAPI = dotted(
  {
    productId: 'prod_123',
    quantity: 5,
    '.product': 'fetchProduct(${productId})',
    '.total': 'calculateTotal(${.product}, ${quantity})',
  },
  {
    ...withZod({
      schemas: {
        resolvers: {
          fetchProduct: {
            input: z.tuple([z.string().startsWith('prod_')]),
            output: z.object({
              id: z.string(),
              name: z.string(),
              price: z.number().positive(),
              inStock: z.boolean(),
            }),
          },
          calculateTotal: {
            input: z.tuple([
              z.object({
                price: z.number(),
              }),
              z.number().int().positive(),
            ]),
            output: z.number(),
          },
        },
      },
    }),
    resolvers: {
      fetchProduct: async (id: string) => {
        return {
          id,
          name: 'Widget',
          price: 29.99,
          inStock: true,
        };
      },
      calculateTotal: (product: { price: number }, quantity: number) => {
        return product.price * quantity;
      },
    },
  }
);

console.log('\n=== Example 3: Complex Nested Validation ===');
console.log('Product:', await productAPI.get('.product'));
console.log('Total:', await productAPI.get('.total'));

// Example 4: Database query validation (preventing SQL injection)
const dbAPI = dotted(
  {
    searchTerm: 'admin',
    limit: 10,
    '.results': 'db.findUsers(${searchTerm}, ${limit})',
  },
  {
    ...withZod({
      schemas: {
        resolvers: {
          'db.findUsers': {
            // Strict input validation
            input: z.tuple([
              z.string().max(50).regex(/^[a-zA-Z0-9_-]+$/), // Alphanumeric only
              z.number().int().min(1).max(100), // Reasonable limits
            ]),
            output: z.array(
              z.object({
                id: z.number(),
                username: z.string(),
              })
            ),
          },
        },
      },
    }),
    resolvers: {
      db: {
        findUsers: async (term: string, limit: number) => {
          // Safe to use validated inputs in parameterized query
          // return await db.query('SELECT * FROM users WHERE username LIKE $1 LIMIT $2', [term, limit]);
          return [
            { id: 1, username: 'admin' },
            { id: 2, username: 'admin_backup' },
          ];
        },
      },
    },
  }
);

console.log('\n=== Example 4: Database Query Validation ===');
console.log('Search Results:', await dbAPI.get('.results'));

// Example 5: Custom error messages
const apiWithCustomErrors = dotted(
  {
    age: 15,
    '.canVote': 'checkVotingAge(${age})',
  },
  {
    ...withZod({
      schemas: {
        resolvers: {
          checkVotingAge: {
            input: z.tuple([
              z
                .number()
                .int()
                .min(18, 'Must be at least 18 years old to vote'),
            ]),
            output: z.boolean(),
          },
        },
      },
    }),
    errorDefault: 'Age validation failed',
    resolvers: {
      checkVotingAge: (age: number) => {
        return age >= 18;
      },
    },
  }
);

console.log('\n=== Example 5: Custom Error Messages ===');
console.log('Can Vote:', await apiWithCustomErrors.get('.canVote')); // Returns errorDefault
