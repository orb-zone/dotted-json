/**
 * Integration tests for hierarchical context and parent references
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('Integration: hierarchical context with parent references', () => {
  test('per-user pronouns merge with company metadata via parent refs', async () => {
    const data = dotted({
      '.context': { lang: 'en' },
      company: {
        name: 'Orbital Zone',
        region: 'us-east',
        '.context': { region: 'us-east' }
      },
      users: {
        alice: {
          '.context': { gender: 'f' },
          role: 'Engineer',
          '.profile': '${:subject} works at ${...company.name} (${...company.region})',
          '.greeting': 'Hello, I am ${:subject}'
        },
        bob: {
          '.context': { gender: 'm' },
          role: 'Designer',
          '.profile': '${:subject} works at ${...company.name} (${...company.region})',
          '.greeting': 'Hello, I am ${:subject}'
        }
      }
    });

    expect(await data.get('users.alice.greeting')).toBe('Hello, I am she');
    expect(await data.get('users.bob.greeting')).toBe('Hello, I am he');
    expect(await data.get('users.alice.profile')).toBe('she works at Orbital Zone (us-east)');
    expect(await data.get('users.bob.profile')).toBe('he works at Orbital Zone (us-east)');
  });

  test('multi-tenant contexts inherit and drive parent-aware expressions', async () => {
    const config = dotted({
      '.context': { env: 'production', region: 'us-east' },
      limits: {
        acme: { users: 5000 },
        startup: { users: 100 }
      },
      tenants: {
        acme: {
          '.context': { tenant: 'acme', tier: 'enterprise' },
          '.welcome': 'Welcome ${...companyName} (${tier})',
          features: {
            '.maxUsers': '${....limits.acme.users}',
            '.storage': '${..tier === "enterprise" ? "unlimited" : "1TB"}'
          }
        },
        startup: {
          '.context': { tenant: 'startup', tier: 'basic' },
          '.welcome': 'Welcome ${...companyName} (${tier})',
          features: {
            '.maxUsers': '${....limits.startup.users}',
            '.storage': '${..tier === "enterprise" ? "unlimited" : "1TB"}'
          }
        }
      },
      companyName: 'Dotted SaaS'
    });

    expect(await config.get('tenants.acme.welcome')).toBe('Welcome Dotted SaaS (enterprise)');
    expect(await config.get('tenants.acme.features.maxUsers')).toBe(5000);
    expect(await config.get('tenants.acme.features.storage')).toBe('unlimited');

    expect(await config.get('tenants.startup.welcome')).toBe('Welcome Dotted SaaS (basic)');
    expect(await config.get('tenants.startup.features.maxUsers')).toBe(100);
    expect(await config.get('tenants.startup.features.storage')).toBe('1TB');
  });
});
