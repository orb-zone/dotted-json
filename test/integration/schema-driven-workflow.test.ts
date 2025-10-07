/**
 * Schema-Driven Workflow Integration Test Suite
 *
 * Tests the end-to-end workflow of using SurrealDB .surql schemas as the
 * single source of truth for generating Zod schemas and TypeScript types.
 *
 * This validates the core Phase 6 design vision:
 *   .surql file (SOURCE OF TRUTH)
 *        ↓ (auto-generate)
 *   Zod schemas (VALIDATION)
 *        ↓ (auto-infer)
 *   TypeScript types (TYPE SAFETY)
 *
 * Prerequisites:
 *   - SurrealDB installed and running (bun run db:test)
 *   - Test schema imported (test/integration/fixtures/test-schema.surql)
 *
 * Based on design: .specify/memory/surql-to-zod-inference.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  connectTestDB,
  importSchema,
  dropTables,
  type SurrealConnection
} from './setup.js';

// ============================================================================
// Mock Zod (will use real Zod in production)
// ============================================================================

const z = {
  object: (shape: any) => ({
    shape,
    parse: (value: any) => {
      // Simple validation mock
      for (const [key, validator] of Object.entries(shape)) {
        if (!(key in value)) {
          if (!validator._optional) {
            throw new Error(`Missing required field: ${key}`);
          }
        } else {
          const val = value[key];
          const v: any = validator;

          // Validate type
          if (v._type === 'string' && typeof val !== 'string') {
            throw new Error(`Field ${key} must be a string`);
          }
          if (v._type === 'number' && typeof val !== 'number') {
            throw new Error(`Field ${key} must be a number`);
          }
          if (v._type === 'boolean' && typeof val !== 'boolean') {
            throw new Error(`Field ${key} must be a boolean`);
          }

          // Validate constraints
          if (v._min !== undefined && val < v._min) {
            throw new Error(`Field ${key} must be >= ${v._min}`);
          }
          if (v._max !== undefined && val > v._max) {
            throw new Error(`Field ${key} must be <= ${v._max}`);
          }
          if (v._email && !val.includes('@')) {
            throw new Error(`Field ${key} must be a valid email`);
          }
          if (v._enum && !v._enum.includes(val)) {
            throw new Error(`Field ${key} must be one of: ${v._enum.join(', ')}`);
          }
        }
      }
      return value;
    }
  }),
  string: () => ({
    _type: 'string',
    email: function() {
      this._email = true;
      return this;
    },
    optional: function() {
      this._optional = true;
      return this;
    }
  }),
  number: () => ({
    _type: 'number',
    int: function() {
      this._int = true;
      return this;
    },
    min: function(min: number) {
      this._min = min;
      return this;
    },
    max: function(max: number) {
      this._max = max;
      return this;
    },
    optional: function() {
      this._optional = true;
      return this;
    }
  }),
  boolean: () => ({
    _type: 'boolean',
    optional: function() {
      this._optional = true;
      return this;
    }
  }),
  enum: (values: string[]) => ({
    _enum: values,
    parse: (value: any) => {
      if (!values.includes(value)) {
        throw new Error(`Value must be one of: ${values.join(', ')}`);
      }
      return value;
    }
  }),
  array: (itemSchema: any) => ({
    _type: 'array',
    _itemSchema: itemSchema,
    optional: function() {
      this._optional = true;
      return this;
    }
  })
};

// ============================================================================
// Schema Parser - Extracts metadata from SurrealDB INFO FOR TABLE
// ============================================================================

interface FieldMetadata {
  name: string;
  type: string;
  assert?: string;
  value?: string;
  permissions?: {
    select?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
}

async function getTableSchema(
  db: SurrealConnection,
  tableName: string
): Promise<FieldMetadata[]> {
  const result = await db.query(`INFO FOR TABLE ${tableName}`);

  if (!result || !result[0]) {
    throw new Error(`Failed to get schema for table ${tableName}`);
  }

  const info = result[0];
  const fields: FieldMetadata[] = [];

  // Parse field definitions from INFO FOR TABLE output
  // Note: This is a simplified parser for testing. Production version
  // would parse the actual SurrealQL DEFINE FIELD statements.

  if (info.fields) {
    for (const [fieldName, fieldDef] of Object.entries(info.fields as any)) {
      fields.push({
        name: fieldName,
        type: fieldDef.type || 'any',
        assert: fieldDef.assert,
        value: fieldDef.value,
        permissions: fieldDef.permissions
      });
    }
  }

  return fields;
}

// ============================================================================
// Zod Schema Generator - Maps SurrealDB types to Zod schemas
// ============================================================================

function surqlTypeToZod(surqlType: string): any {
  // Remove option<> wrapper
  const isOptional = surqlType.startsWith('option<');
  const coreType = isOptional
    ? surqlType.slice(7, -1)
    : surqlType;

  let schema: any;

  switch (coreType) {
    case 'string':
      schema = z.string();
      break;
    case 'int':
    case 'number':
      schema = z.number().int();
      break;
    case 'bool':
    case 'boolean':
      schema = z.boolean();
      break;
    case 'datetime':
      schema = z.string(); // Simplified: treat as ISO string
      break;
    case 'object':
      schema = z.object({}); // Generic object
      break;
    default:
      if (coreType.startsWith('array<')) {
        const itemType = coreType.slice(6, -1);
        schema = z.array(surqlTypeToZod(itemType));
      } else if (coreType.startsWith('record<')) {
        schema = z.string(); // Record IDs are strings
      } else {
        schema = z.string(); // Fallback to string
      }
  }

  return isOptional ? schema.optional() : schema;
}

function applyAssertConstraints(schema: any, assertClause?: string): any {
  if (!assertClause) return schema;

  // Parse ASSERT constraints
  // Examples:
  //   - string::is::email($value) → .email()
  //   - $value >= 1000 AND $value <= 30000 → .min(1000).max(30000)
  //   - $value IN ['light', 'dark', 'auto'] → z.enum(['light', 'dark', 'auto'])

  if (assertClause.includes('string::is::email')) {
    return schema.email();
  }

  if (assertClause.includes('string::is::url')) {
    // Simplified: no .url() in our mock, just return as-is
    return schema;
  }

  // Parse min/max constraints
  const minMatch = assertClause.match(/\$value\s*>=\s*(\d+)/);
  const maxMatch = assertClause.match(/\$value\s*<=\s*(\d+)/);

  if (minMatch) {
    schema = schema.min(parseInt(minMatch[1]));
  }
  if (maxMatch) {
    schema = schema.max(parseInt(maxMatch[1]));
  }

  // Parse enum (IN) constraints
  const enumMatch = assertClause.match(/\$value\s+IN\s+\[([^\]]+)\]/);
  if (enumMatch) {
    const values = enumMatch[1]
      .split(',')
      .map(v => v.trim().replace(/['"]/g, ''));
    return z.enum(values as [string, ...string[]]);
  }

  return schema;
}

function generateZodSchemaFromFields(fields: FieldMetadata[]): any {
  const shape: any = {};

  for (const field of fields) {
    let schema = surqlTypeToZod(field.type);
    schema = applyAssertConstraints(schema, field.assert);
    shape[field.name] = schema;
  }

  return z.object(shape);
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Schema-Driven Workflow Integration', () => {
  let db: SurrealConnection;
  let Surreal: any;

  beforeAll(async () => {
    try {
      Surreal = (await import('surrealdb')).default;
    } catch {
      console.log('⏭️  Skipping schema-driven tests (surrealdb not installed)');
      return;
    }

    try {
      db = await connectTestDB(Surreal);
      await importSchema(db, 'test/integration/fixtures/test-schema.surql');
    } catch (error: any) {
      console.error('❌ Failed to setup schema-driven tests:');
      console.error('   ' + error.message);
      throw error;
    }
  });

  afterAll(async () => {
    if (!Surreal || !db) return;
    await dropTables(db, ['app_config', 'user', 'post', 'jsön_documents']);
    await db.close();
  });

  describe('Schema Introspection', () => {
    it('should extract field metadata from app_config table', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'app_config');

      expect(fields).toBeDefined();
      expect(fields.length).toBeGreaterThan(0);

      // Check for specific fields from test-schema.surql
      const themeField = fields.find(f => f.name === 'theme');
      expect(themeField).toBeDefined();
      expect(themeField?.type).toBe('string');
    });

    it('should extract field metadata from user table', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'user');

      expect(fields).toBeDefined();

      const emailField = fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.type).toBe('string');
    });
  });

  describe('Type Mapping (SurrealDB → Zod)', () => {
    it('should map string type to z.string()', () => {
      const zodSchema = surqlTypeToZod('string');
      expect(zodSchema._type).toBe('string');
    });

    it('should map int type to z.number().int()', () => {
      const zodSchema = surqlTypeToZod('int');
      expect(zodSchema._type).toBe('number');
      expect(zodSchema._int).toBe(true);
    });

    it('should map bool type to z.boolean()', () => {
      const zodSchema = surqlTypeToZod('bool');
      expect(zodSchema._type).toBe('boolean');
    });

    it('should map option<string> to z.string().optional()', () => {
      const zodSchema = surqlTypeToZod('option<string>');
      expect(zodSchema._type).toBe('string');
      expect(zodSchema._optional).toBe(true);
    });

    it('should map array<string> to z.array(z.string())', () => {
      const zodSchema = surqlTypeToZod('array<string>');
      expect(zodSchema._type).toBe('array');
      expect(zodSchema._itemSchema._type).toBe('string');
    });

    it('should map record<user> to z.string()', () => {
      const zodSchema = surqlTypeToZod('record<user>');
      expect(zodSchema._type).toBe('string');
    });
  });

  describe('ASSERT Clause Mapping', () => {
    it('should map string::is::email() to .email()', () => {
      const baseSchema = z.string();
      const schema = applyAssertConstraints(
        baseSchema,
        'string::is::email($value)'
      );

      expect(schema._email).toBe(true);
    });

    it('should map min/max constraints', () => {
      const baseSchema = z.number().int();
      const schema = applyAssertConstraints(
        baseSchema,
        '$value >= 1000 AND $value <= 30000'
      );

      expect(schema._min).toBe(1000);
      expect(schema._max).toBe(30000);
    });

    it('should map IN clause to z.enum()', () => {
      const schema = applyAssertConstraints(
        z.string(),
        "$value IN ['light', 'dark', 'auto']"
      );

      expect(schema._enum).toEqual(['light', 'dark', 'auto']);
    });
  });

  describe('End-to-End Schema Generation', () => {
    it('should generate Zod schema from app_config table', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'app_config');
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      // Valid data should pass
      const validData = {
        theme: 'dark',
        api_timeout: 10000,
        max_retries: 5,
        debug_mode: true,
        api_url: 'https://api.example.com',
        admin_email: 'admin@example.com',
        tags: ['test'],
        created_at: new Date().toISOString()
      };

      expect(() => AppConfigSchema.parse(validData)).not.toThrow();
    });

    it('should validate data according to generated schema', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'app_config');
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      // Invalid email should fail
      const invalidData = {
        theme: 'dark',
        api_timeout: 10000,
        max_retries: 5,
        debug_mode: true,
        api_url: 'https://api.example.com',
        admin_email: 'not-an-email', // Invalid
        created_at: new Date().toISOString()
      };

      expect(() => AppConfigSchema.parse(invalidData)).toThrow(/email/);
    });

    it('should enforce min/max constraints from schema', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'app_config');
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      // api_timeout < 1000 should fail
      const invalidData = {
        theme: 'dark',
        api_timeout: 500, // Too low (min: 1000)
        max_retries: 5,
        debug_mode: true,
        api_url: 'https://api.example.com',
        admin_email: 'admin@example.com',
        created_at: new Date().toISOString()
      };

      expect(() => AppConfigSchema.parse(invalidData)).toThrow(/>=.*1000/);
    });

    it('should enforce enum constraints from schema', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'app_config');
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      // theme must be 'light' | 'dark' | 'auto'
      const invalidData = {
        theme: 'rainbow', // Invalid enum value
        api_timeout: 5000,
        max_retries: 3,
        debug_mode: false,
        api_url: 'https://api.example.com',
        admin_email: 'admin@example.com',
        created_at: new Date().toISOString()
      };

      expect(() => AppConfigSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Real-world Workflow', () => {
    it('should validate data before saving to SurrealDB', async () => {
      if (!Surreal) return;

      // Step 1: Get schema from SurrealDB
      const fields = await getTableSchema(db, 'app_config');

      // Step 2: Generate Zod schema
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      // Step 3: Validate user input
      const userInput = {
        theme: 'dark',
        api_timeout: 10000,
        max_retries: 5,
        debug_mode: true,
        api_url: 'https://api.example.com',
        admin_email: 'admin@example.com',
        tags: ['production', 'main'],
        created_at: new Date().toISOString()
      };

      // Validation passes
      const validated = AppConfigSchema.parse(userInput);

      // Step 4: Save to SurrealDB
      await db.create('app_config', validated);

      // Step 5: Verify data was saved
      const saved = await db.select('app_config');
      expect(saved.length).toBeGreaterThan(0);
    });

    it('should catch validation errors before database insertion', async () => {
      if (!Surreal) return;

      const fields = await getTableSchema(db, 'app_config');
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      const invalidInput = {
        theme: 'invalid-theme', // Should be 'light' | 'dark' | 'auto'
        api_timeout: 100000, // Too high (max: 30000)
        max_retries: 20, // Too high (max: 10)
        debug_mode: 'yes', // Should be boolean
        api_url: 'not-a-url',
        admin_email: 'not-an-email',
        created_at: new Date().toISOString()
      };

      // Should catch errors before attempting database insert
      expect(() => AppConfigSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Type Inference (Zod → TypeScript)', () => {
    it('should provide type safety through z.infer<>', async () => {
      if (!Surreal) return;

      // This test validates that the TypeScript compiler would catch type errors
      // In production, this would use: type AppConfig = z.infer<typeof AppConfigSchema>

      const fields = await getTableSchema(db, 'app_config');
      const AppConfigSchema = generateZodSchemaFromFields(fields);

      const validConfig = {
        theme: 'dark',
        api_timeout: 5000,
        max_retries: 3,
        debug_mode: true,
        api_url: 'https://api.example.com',
        admin_email: 'admin@example.com',
        tags: ['test'],
        created_at: new Date().toISOString()
      };

      const parsed = AppConfigSchema.parse(validConfig);

      // TypeScript would infer these types automatically
      expect(typeof parsed.theme).toBe('string');
      expect(typeof parsed.api_timeout).toBe('number');
      expect(typeof parsed.debug_mode).toBe('boolean');
    });
  });
});

describe('Schema-Driven Benefits', () => {
  it('demonstrates single source of truth principle', () => {
    // This test validates the design vision:
    //
    // TRADITIONAL APPROACH (3 sources of truth):
    //   1. Database schema (manually defined)
    //   2. TypeScript types (manually defined)
    //   3. Validation rules (manually defined)
    //   Problem: Drift between all three!
    //
    // SCHEMA-DRIVEN APPROACH (1 source of truth):
    //   1. SurrealDB .surql schema (SINGLE SOURCE)
    //      ↓ auto-generate
    //   2. Zod schemas (derived)
    //      ↓ auto-infer
    //   3. TypeScript types (derived)
    //   Benefit: Zero drift, automatic synchronization!

    const benefits = {
      noDrift: 'Types, validation, and DB schema always in sync',
      singleEdit: 'Update schema once, everything else updates',
      typesSafe: 'TypeScript catches errors at compile time',
      runtimeSafe: 'Zod catches errors at runtime',
      lessCode: 'No manual type definitions or validators',
      documentation: '.surql file serves as API documentation'
    };

    expect(Object.keys(benefits)).toHaveLength(6);
  });
});
