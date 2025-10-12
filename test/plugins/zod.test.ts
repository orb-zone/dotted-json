/**
 * Zod Integration Test Suite
 *
 * Tests the withZod() plugin for dotted-json v0.3.0
 * Coverage: Basic validation, modes, error handling
 */

import { describe, it, expect } from 'bun:test';
import { dotted } from '../../src/index.js';
import { withZod, ValidationError } from '../../src/plugins/zod.js';

// Mock Zod for testing (since it's a peer dependency)
const z = {
  object: (shape: any) => ({
    safeParse: (value: any) => {
      // Simple validation mock
      for (const [key, validator] of Object.entries(shape)) {
        if (!(key in value)) {
          return {
            success: false,
            error: { format: () => ({ [key]: 'Required' }) }
          };
        }

        const val = value[key];
        const v: any = validator;

        // Check email format
        if (v._type === 'email' && !val.includes('@')) {
          return {
            success: false,
            error: { format: () => ({ [key]: 'Invalid email' }) }
          };
        }

        // Check string type
        if (v._type === 'string' && typeof val !== 'string') {
          return {
            success: false,
            error: { format: () => ({ [key]: 'Must be string' }) }
          };
        }
      }
      return { success: true, data: value };
    }
  }),
  string: () => ({ _type: 'string', email: () => ({ _type: 'email' }) }),
  enum: (values: string[]) => ({
    safeParse: (value: any) => {
      if (!values.includes(value)) {
        return {
          success: false,
          error: { format: () => ({ _errors: ['Invalid enum value'] }) }
        };
      }
      return { success: true, data: value };
    }
  })
};

describe('Zod Plugin - Basic Validation', () => {
  it('should validate expression results against schema', () => {
    const ProfileSchema = z.object({
      email: z.string().email(),
      name: z.string()
    });

    const validation = withZod({
      schemas: {
        paths: { 'user.profile': ProfileSchema }
      },
      mode: 'strict'
    });

    const validProfile = {
      email: 'user@example.com',
      name: 'John Doe'
    };

    const result = validation.validation.validate('user.profile', validProfile);
    expect(result).toEqual(validProfile);
  });

  it('should throw ValidationError on invalid data in strict mode', () => {
    const ProfileSchema = z.object({
      email: z.string().email(),
      name: z.string()
    });

    const validation = withZod({
      schemas: {
        paths: { 'user.profile': ProfileSchema }
      },
      mode: 'strict'
    });

    const invalidProfile = {
      email: 'not-an-email',
      name: 'John'
    };

    expect(() => {
      validation.validation.validate('user.profile', invalidProfile);
    }).toThrow(ValidationError);
  });

  it('should return data despite validation errors in loose mode', () => {
    const ProfileSchema = z.object({
      email: z.string().email()
    });

    const consoleSpy: string[] = [];
    const originalError = console.error;
    console.error = (...args: any[]) => consoleSpy.push(args.join(' '));

    const validation = withZod({
      schemas: {
        paths: { 'user.profile': ProfileSchema }
      },
      mode: 'loose'
    });

    const invalidData = { email: 'not-an-email' };
    const result = validation.validation.validate('user.profile', invalidData);

    expect(result).toEqual(invalidData);
    expect(consoleSpy.length).toBeGreaterThan(0);

    console.error = originalError;
  });

  it('should skip validation when mode is off', () => {
    const ProfileSchema = z.object({
      email: z.string().email()
    });

    const validation = withZod({
      schemas: {
        paths: { 'user.profile': ProfileSchema }
      },
      mode: 'off'
    });

    const invalidData = { email: 'not-an-email' };
    const result = validation.validation.validate('user.profile', invalidData);

    expect(result).toEqual(invalidData);
    expect(validation.validation.enabled).toBe(false);
  });

  it('should pass through data when no schema is configured for path', () => {
    const validation = withZod({
      schemas: {
        paths: { 'user.profile': z.object({ email: z.string() }) }
      },
      mode: 'strict'
    });

    const data = { theme: 'dark' };
    const result = validation.validation.validate('settings.theme', data);

    expect(result).toEqual(data);
  });
});

describe('Zod Plugin - Integration with dotted-json', () => {
  it('should validate data retrieved via get()', async () => {
    const UserSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string()
    });

    const data = dotted({
      user: {
        id: '123',
        '.profile': 'resolvers.fetchUser(${user.id})'
      }
    }, {
      resolvers: {
        resolvers: {
          fetchUser: async (_id: string) => ({
            id: '123',
            email: 'test@example.com',
            name: 'Test User'
          })
        }
      },
      ...withZod({
        schemas: {
          paths: {
            'user.profile': UserSchema
          }
        },
        mode: 'strict'
      })
    });

    const profile = await data.get('user.profile');
    expect(profile.email).toBe('test@example.com');
    expect(profile.name).toBe('Test User');
  });

  it('should throw ValidationError when get() returns invalid data', async () => {
    const UserSchema = z.object({
      email: z.string().email()
    });

    const data = dotted({
      user: {
        '.profile': 'resolvers.fetchUser()'
      }
    }, {
      resolvers: {
        resolvers: {
          fetchUser: async () => ({
            email: 'not-an-email' // Invalid!
          })
        }
      },
      ...withZod({
        schemas: {
          paths: {
            'user.profile': UserSchema
          }
        },
        mode: 'strict'
      })
    });

    await expect(data.get('user.profile')).rejects.toThrow(ValidationError);
  });
});

describe('Zod Plugin - Custom Error Handler', () => {
  it('should call custom onError handler', () => {
    const errors: Array<{ path: string; error: any }> = [];

    const EmailSchema = z.object({ value: z.string().email() });

    const validation = withZod({
      schemas: {
        paths: {
          'user.email': EmailSchema
        }
      },
      mode: 'loose',
      onError: (error, path) => {
        errors.push({ path, error });
      }
    });

    validation.validation.validate('user.email', { value: 'not-an-email' });

    expect(errors.length).toBe(1);
    expect(errors[0].path).toBe('user.email');
  });
});
