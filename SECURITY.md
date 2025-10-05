# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Model

### Trust Model (NON-NEGOTIABLE)

This library uses `new Function()` for expression evaluation, which provides flexibility but requires **trusted input**.

**CRITICAL**: This library assumes schemas are written by developers, not end-users.

### Safe Usage ✅

- Schemas defined in your application code
- Configuration files you control (committed to version control)
- Server-side data structures built by your backend
- Data from databases you control

### Unsafe Usage ❌

- **NEVER** pass user-submitted JSON from web forms
- **NEVER** use data from external APIs you don't control
- **NEVER** use any untrusted third-party sources
- **NEVER** allow users to define custom expressions

## Reporting a Vulnerability

**Please do NOT open public GitHub issues for security vulnerabilities.**

To report a security vulnerability, please email:

📧 **security@orb.zone**

Include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

You should receive a response within **48 hours**. We will:

1. Confirm receipt of your report
2. Assess the vulnerability
3. Develop a fix
4. Release a patch
5. Credit you in the security advisory (if desired)

## Security Best Practices

### 1. Input Validation

**Recommended**: Use the Zod plugin for automatic validation

```typescript
import { withZod } from '@orbzone/dotted-json/plugins/zod';
import { z } from 'zod';

const data = dotted(schema, {
  ...withZod({
    schemas: {
      resolvers: {
        'db.findUser': {
          input: z.tuple([z.number().positive()]),
          output: z.object({ id: z.number(), name: z.string() })
        }
      }
    }
  }),
  resolvers: {
    db: {
      findUser: async (id) => {
        // Inputs automatically validated by Zod
        return await db.query('SELECT * FROM users WHERE id = $1', [id]);
      }
    }
  }
});
```

### 2. SQL Injection Prevention

**Always use parameterized queries**:

```typescript
// ✅ SAFE: Parameterized query
resolvers: {
  db: {
    findUser: async (id) => {
      return await db.query('SELECT * FROM users WHERE id = $1', [id]);
    }
  }
}

// ❌ UNSAFE: String interpolation
resolvers: {
  db: {
    findUser: async (id) => {
      return await db.query(`SELECT * FROM users WHERE id = ${id}`);
    }
  }
}
```

### 3. Error Message Sanitization

**Don't leak sensitive information in errors**:

```typescript
const data = dotted(schema, {
  errorDefault: 'Operation failed', // Generic message
  resolvers: {
    db: {
      findUser: async (id) => {
        try {
          return await db.query('SELECT * FROM users WHERE id = $1', [id]);
        } catch (error) {
          // Log detailed error server-side
          console.error('Database error:', error);
          // Throw sanitized error to client
          throw new Error('Failed to fetch user');
        }
      }
    }
  }
});
```

### 4. Filesystem Plugin Security

If using the filesystem plugin (when available):

```typescript
// ✅ SAFE: Controlled base directory
withFileSystem({
  baseDir: './data/cards',    // Controlled location
  allowUrls: false,            // URLs disabled by default
  trustedDomains: []           // No external domains
})

// ❌ UNSAFE: User-controlled paths
withFileSystem({
  baseDir: req.query.path,     // User input!
  allowUrls: true,             // Allows arbitrary URLs
})
```

### 5. URL Loading (Future Feature)

When URL loading is implemented:

- **Disabled by default** (opt-in required)
- **Whitelist domains** (never trust arbitrary URLs)
- **Validate certificates** (HTTPS only)
- **Set timeouts** (prevent hanging requests)

## Known Limitations

1. **Expression Evaluation**: Uses `new Function()` - requires trusted schemas
2. **No Sandboxing**: Expressions have full JavaScript capabilities
3. **Circular Dependencies**: Detected but could cause DoS if validation disabled
4. **Memory Usage**: Large schemas cached in memory

## Security Updates

Security updates will be:

1. Released as patch versions (e.g., 0.1.1)
2. Documented in CHANGELOG.md with `[SECURITY]` prefix
3. Announced via GitHub Security Advisories
4. Highlighted in README.md

## Vulnerability Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 1-2**: Acknowledge receipt
- **Day 3-7**: Assess and develop fix
- **Day 8-14**: Release patch version
- **Day 15**: Public disclosure (if critical)

## Security Champions

This project follows the [OpenSSF Best Practices](https://bestpractices.coreinfrastructure.org/):

- ✅ Dependency scanning (Bun's built-in tools)
- ✅ Automated testing (CI/CD)
- ✅ Code review requirements
- ✅ Security documentation
- ⏳ Security audits (planned for v1.0.0)

## Contact

For security concerns: **security@orb.zone**

For general questions: [GitHub Discussions](https://github.com/orbzone/dotted-json/discussions)

---

**Last Updated**: 2025-10-05
**Version**: 1.0.0
