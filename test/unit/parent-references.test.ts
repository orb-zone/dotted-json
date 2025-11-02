/**
 * Parent path reference tests
 */

import { describe, test, expect } from 'bun:test';
import { dotted } from '../../src/index.js';

describe('Parent path references', () => {
  const data = dotted(
    {
      company: {
        name: 'Acme Corp',
        domain: 'acme.com',
        location: 'San Francisco',
        employees: {
          department: 'Engineering',
          manager: {
            name: 'Grace Hopper'
          },
          alice: {
            firstName: 'Alice',
            '.departmentName': '${..department}',
            '.companyName': '${...name}',
            '.managerName': '${..manager.name}',
            '.email': 'buildEmail(${firstName}, ${...domain})',
            '.invalid': '${.....name}',
            '.missing': '${..missingProperty}'
          }
        }
      }
    },
    {
      resolvers: {
        buildEmail: (first: string, domain: string) => `${first.toLowerCase()}@${domain}`
      }
    }
  );

  test('resolves immediate parent properties with ..', async () => {
    expect(await data.get('company.employees.alice.departmentName')).toBe('Engineering');
  });

  test('resolves grandparent properties with ...', async () => {
    expect(await data.get('company.employees.alice.companyName')).toBe('Acme Corp');
  });

  test('resolves nested properties on parent objects', async () => {
    expect(await data.get('company.employees.alice.managerName')).toBe('Grace Hopper');
  });

  test('supports parent references inside function expressions', async () => {
    expect(await data.get('company.employees.alice.email')).toBe('alice@acme.com');
  });

  test('throws helpful error when reference exceeds available parents', async () => {
    await expect(data.get('company.employees.alice.invalid')).rejects.toThrow(
      "Parent reference '.....name' at 'company.employees.alice' goes beyond root (requires 4 parent levels, only 3 available)"
    );
  });

  test('throws helpful error when parent path is missing', async () => {
    await expect(data.get('company.employees.alice.missing')).rejects.toThrow(
      "Parent reference '..missingProperty' at 'company.employees.alice' resolved to undefined path 'company.employees.missingProperty'"
    );
  });
});
