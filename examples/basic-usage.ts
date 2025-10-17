/**
 * Basic Usage Example
 *
 * Demonstrates core dotted-json functionality with simple expressions,
 * resolver functions, and error handling.
 */

import { dotted } from '@orb-zone/dotted-json';

// Example 1: Simple expression evaluation
const userProfile = dotted({
  firstName: 'John',
  lastName: 'Doe',
  '.fullName': '${firstName} ${lastName}',
  '.greeting': 'Hello, ${.fullName}!',
});

console.log('=== Example 1: Simple Expressions ===');
console.log('First Name:', await userProfile.get('firstName'));
console.log('Full Name:', await userProfile.get('.fullName'));
console.log('Greeting:', await userProfile.get('.greeting'));

// Example 2: Resolver functions for dynamic data
const appData = dotted(
  {
    userId: 123,
    '.user': 'fetchUser(${userId})',
    '.userName': '${.user.name}',
  },
  {
    resolvers: {
      fetchUser: async (id: number) => {
        // Simulate API call
        return {
          id,
          name: 'Alice Johnson',
          email: 'alice@example.com',
        };
      },
    },
  }
);

console.log('\n=== Example 2: Resolver Functions ===');
console.log('User ID:', await appData.get('userId'));
console.log('User Object:', await appData.get('.user'));
console.log('User Name:', await appData.get('.userName'));

// Example 3: Error handling with errorDefault
const safeData = dotted(
  {
    '.riskyOperation': 'mightFail()',
    '.safeValue': '${.riskyOperation}',
  },
  {
    errorDefault: 'Operation failed',
    resolvers: {
      mightFail: () => {
        throw new Error('Simulated failure');
      },
    },
  }
);

console.log('\n=== Example 3: Error Handling ===');
console.log('Safe Value:', await safeData.get('.safeValue')); // Returns "Operation failed"

// Example 4: Nested expressions
const dashboard = dotted(
  {
    stats: {
      views: 1000,
      likes: 250,
      '.engagement': 'calculateEngagement(${views}, ${likes})',
    },
  },
  {
    resolvers: {
      calculateEngagement: (views: number, likes: number) => {
        return ((likes / views) * 100).toFixed(2) + '%';
      },
    },
  }
);

console.log('\n=== Example 4: Nested Expressions ===');
console.log('Views:', await dashboard.get('stats.views'));
console.log('Likes:', await dashboard.get('stats.likes'));
console.log('Engagement Rate:', await dashboard.get('stats.engagement'));
