# Aeonic Framework Vision

**AEON**: **A**daptive **E**ntity **O**bjective **N**etwork
**ION**: **I**nteractive **O**bject **N**ode (atomic building block)

**Version**: 0.1.1-vision
**Status**: Conceptual (planned for v2.0.0+ monorepo)
**Last Updated**: 2025-10-07

---

## Core Concepts

### AEON Model

The **AEON model** is a graph-based architecture where entities form an adaptive network that responds to context, objectives, and relationships.

**A**daptive - Applications respond to context (user, locale, permissions, environment)
**E**ntity - Strongly-typed nodes in the graph (User, Team, Role, etc.)
**O**bjective - Business logic defined as database functions with clear goals
**N**etwork - Entities connected through SurrealDB graph relations

### ION (Interactive Object Node)

**IONs** are the atomic building blocks of the AEON model - variant-aware data objects that:

- **Interactive**: Respond to variant context (language, user, environment, formality)
- **Object**: Structured data with schema validation
- **Node**: Exists in a graph network with relationships to other entities

**Storage Format**: SurrealDB table `ion` with array-based Record IDs
- Format: `ion:['baseName', 'lang', 'gender', 'form', ...custom]`
- Example: `ion:['welcome', 'es', 'neutral', 'formal']`
- Benefits: 10-100x faster queries via range scans vs WHERE clauses

**Use Cases**:
- i18n translation strings (variant: language, formality, gender)
- User preferences (variant: userId, environment)
- Configuration data (variant: environment, region)
- Multi-tenant content (variant: teamId, locale)

**ION Lifecycle in AEON**:
1. **Creation**: IONs are created with variant dimensions (lang, env, userId, etc.)
2. **Storage**: Stored in SurrealDB `ion` table with array Record IDs
3. **Resolution**: Queried via range scans for optimal performance
4. **Adaptation**: Best-match variant selected based on context scoring
5. **Interaction**: Consumed by UI components via composables (Vue/React)
6. **Evolution**: Variants added/updated without schema migrations

---

## Web-Craft Ecosystem: AEON/ION Across the Monorepo

The AEON/ION model provides a unified mental framework across all `@orb-zone` packages in the future monorepo.

### Package Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    @orb-zone/aeonic                          │
│         (Opinionated fullstack framework)                   │
│  - Scaffolding CLI                                          │
│  - Predefined entities (User, Role, Team)                   │
│  - Database functions (fn::auth::*, fn::team::*)            │
│  - Vue composables (useAeonicAuth, useAeonicEntity)         │
└────────────────────┬────────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────────┐
│                  @orb-zone/surrounded                        │
│         (SurrealDB integration layer)                       │
│  - LIVE query subscriptions                                 │
│  - Real-time data sync                                      │
│  - ION storage providers (SurrealDBLoader)                  │
│  - Graph traversal helpers                                  │
│  - Permission introspection                                 │
└────────────────────┬────────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────────┐
│                @orb-zone/dotted-json                         │
│         (Core expression engine + ION foundation)           │
│  - Expression evaluation (.property syntax)                 │
│  - Variant resolution system                                │
│  - ION concept implementation                               │
│  - FileLoader (filesystem IONs)                             │
│  - Zod validation integration                               │
└─────────────────────────────────────────────────────────────┘
```

### Cross-Package ION Concepts

| Package | ION Usage | Example |
|---------|-----------|---------|
| **dotted-json** | Foundation - variant resolution engine | `ion:['welcome', 'es', 'formal']` loaded from filesystem |
| **surrounded** | ION persistence to SurrealDB | `SurrealDBLoader` stores/retrieves IONs with array Record IDs |
| **aeonic** | ION-powered i18n + config | Pre-built ION collections for app strings, user prefs |

### How IONs Flow Through the Stack

**Example: Multi-Language Welcome Message**

1. **Developer creates ION** (via CLI or manually):
   ```bash
   # Using aeonic CLI (future)
   bun aeonic ion create welcome --lang=en --form=formal
   # Creates: ion:['welcome', 'en', 'formal']
   ```

2. **ION stored in SurrealDB** (via `surrounded`):
   ```typescript
   import { SurrealDBLoader } from '@orb-zone/dotted-json/loaders/surrealdb'

   const loader = new SurrealDBLoader({ /* config */ })
   await loader.save('welcome',
     { title: 'Welcome', message: 'Hello, esteemed guest!' },
     { lang: 'en', form: 'formal' }
   )
   // Stored as: ion:['welcome', 'en', 'formal']
   ```

3. **ION resolved in Vue app** (via `aeonic` composable):
   ```vue
   <script setup>
   import { useIon } from '@orb-zone/aeonic'

   const { user } = useAeonicAuth()
   const welcome = useIon('welcome', {
     lang: user.value.locale,      // 'es'
     form: user.value.formality    // 'formal'
   })
   // Resolves to: ion:['welcome', 'es', 'formal']
   // Falls back to: ion:['welcome', 'es'] or ion:['welcome']
   </script>

   <template>
     <h1>{{ welcome.title }}</h1>
     <p>{{ welcome.message }}</p>
   </template>
   ```

4. **ION updates in real-time** (via `surrounded` LIVE query):
   ```typescript
   // Backend updates Spanish formal welcome
   await loader.save('welcome',
     { title: 'Bienvenido', message: '¡Hola, distinguido invitado!' },
     { lang: 'es', form: 'formal' }
   )

   // Frontend automatically receives update via LIVE query
   // Vue component re-renders with new Spanish text
   ```

### Entity Hierarchy in AEON Model

**Standard Entities** (predefined in `aeonic`):
- `user` - User accounts with authentication
- `role` - RBAC roles (admin, editor, viewer)
- `permission` - Granular access control
- `team` - Multi-tenant organizations
- `audit_log` - Change tracking for compliance

**IONs** (dynamic content nodes):
- `ion` - Variant-aware data objects (strings, config, user prefs)

**Custom Entities** (app-specific):
- `post`, `comment`, `product`, etc. (defined by developer)

**Relationship Pattern**:
```
┌──────────┐        ┌──────────┐        ┌──────────┐
│   User   │◄──────►│   Team   │◄──────►│   Role   │
└────┬─────┘        └──────────┘        └──────────┘
     │
     │ owns
     ▼
┌──────────┐        ┌──────────┐
│   Post   │◄──────►│   ION    │ (post title variants)
└──────────┘        └──────────┘
```

### AEON Design Principles Across Packages

#### 1. Adaptive (Context-Aware)

**dotted-json**: Expressions adapt based on variant context
```typescript
const doc = dotted({ greeting: '.welcome' }, {
  variants: { lang: 'ja', form: 'polite' }
})
// Returns: "いらっしゃいませ" (Japanese polite welcome)
```

**surrounded**: Queries adapt based on user permissions
```typescript
// Automatically filters results by $auth.id
const posts = await query('SELECT * FROM post WHERE author = $auth.id')
```

**aeonic**: UI adapts based on user role
```vue
<template>
  <AdminPanel v-if="hasRole('admin')" />
  <EditorPanel v-else-if="hasRole('editor')" />
  <ViewerPanel v-else />
</template>
```

#### 2. Entity (Strongly-Typed Nodes)

**dotted-json**: Type-safe ION schemas via Zod
```typescript
import { z } from 'zod'

const WelcomeIonSchema = z.object({
  title: z.string(),
  message: z.string(),
  cta: z.string().optional()
})

await loader.save('welcome', data, variants, { schema: WelcomeIonSchema })
```

**surrounded**: Auto-generate TypeScript types from SurrealDB schemas
```bash
bun surql-to-ts schema/user.surql > src/generated/user.ts
```

**aeonic**: Full-stack type safety (DB → API → UI)
```typescript
// Shared types across frontend and backend
type User = z.infer<typeof UserSchema>
```

#### 3. Objective (Business Logic as Functions)

**dotted-json**: Resolver functions for complex logic
```typescript
const resolvers = {
  math: {
    calculateTax: (price: number, rate: number) => price * rate
  }
}
```

**surrounded**: Database functions for server-side logic
```sql
DEFINE FUNCTION fn::user::register($email: string, $password: string) {
  -- Hash password, create user, assign default role
  RETURN $user;
}
```

**aeonic**: Pre-built objective functions for common patterns
```typescript
// Composable wraps fn::user::register
const { register } = useAeonicAuth()
await register(email, password, displayName)
```

#### 4. Network (Graph Relationships)

**dotted-json**: References between IONs
```json
{
  "profile.greeting": ".ion:welcome",
  "profile.bio": ".ion:bio",
  "profile.settings": ".ion:settings"
}
```

**surrounded**: Graph traversal helpers
```typescript
// Get all posts by users in my teams
const posts = await traverse('$auth.id')
  .edge('member_of')
  .node('team')
  .edge('has_member')
  .node('user')
  .edge('authored')
  .node('post')
  .execute()
```

**aeonic**: Pre-defined relationship patterns
```sql
-- User -[member_of]-> Team
-- Team -[owns]-> Project
-- Project -[has]-> Post
```

---

## Executive Summary

**Aeonic** is an opinionated fullstack framework built on top of `@orb-zone/surrounded`, providing predefined schema conventions, entity patterns, and rapid scaffolding for SurrealDB + Vue applications.

**Market Position**: Rails for SurrealDB + Vue
**Foundation**: Built on AEON/ION architecture for adaptive, graph-based applications

**Target Audience**:
- Fullstack developers building CRUD applications
- Teams needing rapid prototyping with production-ready patterns
- Projects requiring opinionated security/permission models

**Core Value Proposition**: From zero to production-ready SurrealDB + Vue app in < 5 minutes with `bun create aeonic my-app`.

---

## AEON Principles

### Adaptive
Applications adapt to user context (authentication, permissions, locale, theme) without manual configuration.

**Example**:
- Automatic permission enforcement based on `$auth` scope
- Dynamic UI based on user role (admin sees more features)
- Locale-aware content from JSöN documents

### Entity
Predefined entity schemas for common patterns (User, Role, Permission, Team, Audit).

**Example**:
- `User` table with authentication fields
- `Role` table with RBAC relationships
- `AuditLog` table for change tracking

### Objective
Business logic defined as database functions (`fn::`) with clear objectives.

**Example**:
- `fn::user::register(email, password)` - User registration
- `fn::team::invite(team_id, user_id, role)` - Team invitation
- `fn::audit::log(entity, action, changes)` - Audit logging

### Network
Entities connected through SurrealDB graph relations.

**Example**:
- `User -[member_of]-> Team`
- `User -[has_role]-> Role`
- `Team -[owns]-> Project`

---

## Package Structure (v2.0.0)

```
packages/aeonic/
├── src/
│   ├── index.ts                    # Main entry: createAeonicApp()
│   ├── schemas/                    # Predefined .surql schemas
│   │   ├── user.surql              # User entity
│   │   ├── role.surql              # Role entity
│   │   ├── permission.surql        # Permission entity
│   │   ├── team.surql              # Team entity
│   │   ├── audit_log.surql         # Audit trail
│   │   └── functions/              # Database functions
│   │       ├── auth.surql          # fn::auth::* functions
│   │       ├── user.surql          # fn::user::* functions
│   │       └── team.surql          # fn::team::* functions
│   ├── templates/                  # Code generation templates
│   │   ├── entity.ts.hbs           # Entity component template
│   │   ├── list.vue.hbs            # List view template
│   │   ├── detail.vue.hbs          # Detail view template
│   │   └── form.vue.hbs            # Form template
│   ├── conventions/
│   │   ├── naming.ts               # Table/field naming conventions
│   │   ├── permissions.ts          # Permission templates
│   │   └── relations.ts            # Relationship patterns
│   └── composables/
│       ├── useAeonicAuth.ts        # Authentication composable
│       ├── useAeonicEntity.ts      # Entity CRUD composable
│       └── useAeonicPermissions.ts # Permission checking
├── cli/
│   ├── create.ts                   # bun create aeonic scaffolding
│   ├── generate.ts                 # Code generation commands
│   │   ├── entity                  # Generate new entity
│   │   ├── function                # Generate database function
│   │   └── page                    # Generate CRUD pages
│   └── migrate.ts                  # Database migration tool
├── templates/                      # Project scaffolding templates
│   ├── app/                        # Default app template
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── App.vue
│   │   │   ├── router/
│   │   │   └── views/
│   │   ├── schema/                 # Database schema
│   │   │   └── database.surql      # Imports all entity schemas
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── minimal/                    # Minimal template (opt-out entities)
└── package.json                    # @orb-zone/aeonic
```

---

## Predefined Entities

### 1. User Entity

**Schema** (`src/schemas/user.surql`):
```sql
-- User entity with authentication
DEFINE TABLE user SCHEMAFULL;

-- Authentication fields
DEFINE FIELD email ON TABLE user TYPE string
  ASSERT $value != NONE AND string::is::email($value);

DEFINE FIELD password_hash ON TABLE user TYPE string
  PERMISSIONS FOR select NONE;  -- Never expose password hash

DEFINE FIELD email_verified ON TABLE user TYPE bool
  VALUE $before OR false;

-- Profile fields
DEFINE FIELD display_name ON TABLE user TYPE string
  ASSERT $value != NONE AND string::len($value) > 0;

DEFINE FIELD avatar_url ON TABLE user TYPE option<string>;

DEFINE FIELD locale ON TABLE user TYPE string
  VALUE $before OR 'en';

DEFINE FIELD theme ON TABLE user TYPE string
  VALUE $before OR 'light'
  ASSERT $value INSIDE ['light', 'dark', 'auto'];

-- Status fields
DEFINE FIELD status ON TABLE user TYPE string
  VALUE $before OR 'active'
  ASSERT $value INSIDE ['active', 'suspended', 'deleted'];

DEFINE FIELD created_at ON TABLE user TYPE datetime
  VALUE $before OR time::now();

DEFINE FIELD updated_at ON TABLE user TYPE datetime
  VALUE time::now();

DEFINE FIELD last_login_at ON TABLE user TYPE option<datetime>;

-- Indexes
DEFINE INDEX idx_user_email ON TABLE user COLUMNS email UNIQUE;

-- Permissions
PERMISSIONS
  FOR select WHERE
    $auth.id = id OR
    $auth.role IN ['admin', 'moderator']
  FOR create NONE  -- Use fn::auth::register instead
  FOR update WHERE $auth.id = id
  FOR delete WHERE $auth.role = 'admin';
```

### 2. Role Entity (RBAC)

**Schema** (`src/schemas/role.surql`):
```sql
-- Role-Based Access Control
DEFINE TABLE role SCHEMAFULL;

DEFINE FIELD name ON TABLE role TYPE string
  ASSERT $value INSIDE ['admin', 'editor', 'viewer', 'guest'];

DEFINE FIELD description ON TABLE role TYPE string;

DEFINE FIELD permissions ON TABLE role TYPE array<string>;

-- Built-in roles
CREATE role:admin SET
  name = 'admin',
  description = 'Full system access',
  permissions = ['*'];

CREATE role:editor SET
  name = 'editor',
  description = 'Can create and edit content',
  permissions = ['content.create', 'content.update', 'content.read'];

CREATE role:viewer SET
  name = 'viewer',
  description = 'Read-only access',
  permissions = ['content.read'];

CREATE role:guest SET
  name = 'guest',
  description = 'Limited public access',
  permissions = ['content.read.public'];
```

### 3. Permission Entity

**Schema** (`src/schemas/permission.surql`):
```sql
-- Granular permissions
DEFINE TABLE permission SCHEMAFULL;

DEFINE FIELD resource ON TABLE permission TYPE string;  -- e.g., "post", "user"
DEFINE FIELD action ON TABLE permission TYPE string;    -- e.g., "create", "read", "update", "delete"
DEFINE FIELD scope ON TABLE permission TYPE string      -- e.g., "own", "team", "all"
  ASSERT $value INSIDE ['own', 'team', 'all'];

-- Relation: User has Role
DEFINE TABLE user_role SCHEMAFULL;
DEFINE FIELD user ON TABLE user_role TYPE record<user>;
DEFINE FIELD role ON TABLE user_role TYPE record<role>;
DEFINE FIELD assigned_at ON TABLE user_role TYPE datetime VALUE time::now();
DEFINE FIELD assigned_by ON TABLE user_role TYPE option<record<user>>;

DEFINE INDEX idx_user_role ON TABLE user_role COLUMNS user, role UNIQUE;
```

### 4. Team Entity (Multi-Tenancy)

**Schema** (`src/schemas/team.surql`):
```sql
-- Team/Organization for multi-tenancy
DEFINE TABLE team SCHEMAFULL;

DEFINE FIELD name ON TABLE team TYPE string
  ASSERT $value != NONE AND string::len($value) > 0;

DEFINE FIELD slug ON TABLE team TYPE string
  ASSERT $value != NONE AND string::is::alphanum($value);

DEFINE FIELD owner ON TABLE team TYPE record<user>;

DEFINE FIELD created_at ON TABLE team TYPE datetime VALUE time::now();

DEFINE INDEX idx_team_slug ON TABLE team COLUMNS slug UNIQUE;

-- Relation: User member of Team
DEFINE TABLE team_member SCHEMAFULL;
DEFINE FIELD team ON TABLE team_member TYPE record<team>;
DEFINE FIELD user ON TABLE team_member TYPE record<user>;
DEFINE FIELD role ON TABLE team_member TYPE string
  ASSERT $value INSIDE ['owner', 'admin', 'member'];
DEFINE FIELD joined_at ON TABLE team_member TYPE datetime VALUE time::now();

-- Permissions: Team-scoped access
PERMISSIONS ON TABLE team
  FOR select WHERE
    id IN (SELECT team FROM team_member WHERE user = $auth.id)
  FOR update WHERE
    id IN (SELECT team FROM team_member WHERE user = $auth.id AND role IN ['owner', 'admin']);
```

### 5. AuditLog Entity

**Schema** (`src/schemas/audit_log.surql`):
```sql
-- Audit trail for compliance
DEFINE TABLE audit_log SCHEMAFULL PERMISSIONS FOR select, create WHERE $auth.role = 'admin';

DEFINE FIELD entity_type ON TABLE audit_log TYPE string;      -- "user", "post", etc.
DEFINE FIELD entity_id ON TABLE audit_log TYPE string;        -- Record ID
DEFINE FIELD action ON TABLE audit_log TYPE string            -- "create", "update", "delete"
  ASSERT $value INSIDE ['create', 'update', 'delete'];

DEFINE FIELD actor ON TABLE audit_log TYPE record<user>;      -- Who made the change
DEFINE FIELD timestamp ON TABLE audit_log TYPE datetime VALUE time::now();

DEFINE FIELD changes ON TABLE audit_log TYPE option<object>;  -- JSON diff of changes
DEFINE FIELD metadata ON TABLE audit_log TYPE option<object>; -- IP, user agent, etc.

-- Index for querying
DEFINE INDEX idx_audit_entity ON TABLE audit_log COLUMNS entity_type, entity_id;
DEFINE INDEX idx_audit_actor ON TABLE audit_log COLUMNS actor;
```

---

## Database Functions (fn::)

### Authentication Functions (`fn::auth::`)

```sql
-- User registration
DEFINE FUNCTION fn::auth::register($email: string, $password: string, $display_name: string) {
  -- Validate email not already registered
  LET $existing = SELECT * FROM user WHERE email = $email;
  IF count($existing) > 0 {
    THROW "Email already registered";
  };

  -- Hash password
  LET $password_hash = crypto::argon2::generate($password);

  -- Create user
  LET $user = CREATE user SET
    email = $email,
    password_hash = $password_hash,
    display_name = $display_name,
    email_verified = false;

  -- Assign default role
  CREATE user_role SET
    user = $user.id,
    role = role:viewer;

  -- Return user (without password_hash)
  RETURN SELECT id, email, display_name, created_at FROM user WHERE id = $user.id;
};

-- User login
DEFINE FUNCTION fn::auth::login($email: string, $password: string) {
  LET $user = SELECT * FROM user WHERE email = $email AND status = 'active';

  IF count($user) = 0 {
    THROW "Invalid credentials";
  };

  -- Verify password
  IF !crypto::argon2::compare($user.password_hash, $password) {
    THROW "Invalid credentials";
  };

  -- Update last login
  UPDATE $user.id SET last_login_at = time::now();

  -- Return user with roles
  RETURN SELECT
    id, email, display_name, avatar_url, locale, theme,
    (SELECT role.* FROM user_role WHERE user = $parent.id) AS roles
  FROM user WHERE id = $user.id;
};

-- Email verification
DEFINE FUNCTION fn::auth::verify_email($user_id: record<user>, $token: string) {
  -- Verify token (implementation depends on token strategy)
  -- ...

  UPDATE $user_id SET email_verified = true;
  RETURN true;
};
```

### User Management Functions (`fn::user::`)

```sql
-- Update user profile
DEFINE FUNCTION fn::user::update_profile(
  $user_id: record<user>,
  $updates: object
) {
  -- Validate caller is user or admin
  IF $auth.id != $user_id AND $auth.role != 'admin' {
    THROW "Permission denied";
  };

  -- Update allowed fields only
  UPDATE $user_id SET
    display_name = $updates.display_name OR display_name,
    avatar_url = $updates.avatar_url OR avatar_url,
    locale = $updates.locale OR locale,
    theme = $updates.theme OR theme;

  RETURN SELECT id, display_name, avatar_url, locale, theme
    FROM user WHERE id = $user_id;
};

-- Suspend user (admin only)
DEFINE FUNCTION fn::user::suspend($user_id: record<user>, $reason: string) {
  IF $auth.role != 'admin' {
    THROW "Permission denied: admin only";
  };

  UPDATE $user_id SET status = 'suspended';

  -- Log audit trail
  CREATE audit_log SET
    entity_type = 'user',
    entity_id = $user_id,
    action = 'update',
    actor = $auth.id,
    metadata = { reason: $reason };

  RETURN true;
};
```

### Team Functions (`fn::team::`)

```sql
-- Create team
DEFINE FUNCTION fn::team::create($name: string, $slug: string) {
  LET $team = CREATE team SET
    name = $name,
    slug = $slug,
    owner = $auth.id;

  -- Add creator as owner
  CREATE team_member SET
    team = $team.id,
    user = $auth.id,
    role = 'owner';

  RETURN $team;
};

-- Invite user to team
DEFINE FUNCTION fn::team::invite(
  $team_id: record<team>,
  $user_id: record<user>,
  $role: string
) {
  -- Check caller is team admin
  LET $membership = SELECT * FROM team_member
    WHERE team = $team_id AND user = $auth.id AND role IN ['owner', 'admin'];

  IF count($membership) = 0 {
    THROW "Permission denied: must be team owner or admin";
  };

  -- Add team member
  CREATE team_member SET
    team = $team_id,
    user = $user_id,
    role = $role;

  RETURN true;
};
```

---

## Naming Conventions

### Table Names
- **Singular, lowercase**: `user`, `post`, `comment`
- **Compound words**: snake_case: `audit_log`, `team_member`
- **Relation tables**: `{entity1}_{entity2}`: `user_role`, `team_member`

### Field Names
- **Lowercase, snake_case**: `display_name`, `created_at`
- **Timestamps**: `*_at` suffix: `created_at`, `updated_at`, `deleted_at`
- **Booleans**: `is_*` or `has_*` prefix: `is_active`, `has_permission`
- **References**: singular entity name: `user`, `team`, `role`

### Function Names
- **Namespace**: `fn::{entity}::{action}`
- **Examples**: `fn::user::register`, `fn::team::create`, `fn::auth::login`

### Record IDs
- **Semantic IDs**: `user:alice`, `team:acme`, `role:admin`
- **Auto-generated**: `user:ulid()`, `post:uuid()`

---

## CLI Scaffolding

### Create New Project

```bash
# Interactive wizard
bun create aeonic my-app

# Prompts:
# ? Project name: my-app
# ? Template: (app | minimal)
# ? Entities: [x] User [x] Role [x] Team [ ] AuditLog
# ? Authentication: (email+password | oauth | none)
# ? UI Framework: (Vue 3 | Nuxt 3)

cd my-app
bun install
bun dev
```

**Generated Structure**:
```
my-app/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── views/
│   │   ├── Home.vue
│   │   ├── Login.vue
│   │   ├── Dashboard.vue
│   │   └── users/
│   │       ├── UserList.vue
│   │       ├── UserDetail.vue
│   │       └── UserForm.vue
│   ├── composables/
│   │   ├── useAuth.ts
│   │   └── useUsers.ts
│   └── generated/
│       └── schemas.zod.ts
├── schema/
│   ├── database.surql          # Imports all entities
│   ├── entities/
│   │   ├── user.surql
│   │   ├── role.surql
│   │   └── team.surql
│   └── functions/
│       ├── auth.surql
│       └── user.surql
├── package.json
├── vite.config.ts
├── tsconfig.json
└── aeonic.config.ts            # Aeonic configuration
```

### Generate Entity

```bash
# Generate new entity with CRUD pages
bun aeonic generate entity Post title:string content:text author:user published:bool

# Generates:
# - schema/entities/post.surql
# - src/views/posts/PostList.vue
# - src/views/posts/PostDetail.vue
# - src/views/posts/PostForm.vue
# - src/composables/usePosts.ts
# - Updates router and navigation
```

### Generate Database Function

```bash
# Generate custom function
bun aeonic generate function fn::post::publish user_id:record<user> post_id:record<post>

# Generates:
# - schema/functions/post.surql (adds function)
# - src/composables/usePosts.ts (adds publishPost method)
```

### Database Migration

```bash
# Apply schema to database
bun aeonic migrate

# Runs:
# 1. Reads schema/*.surql files
# 2. Applies DEFINE statements to SurrealDB
# 3. Seeds initial data (roles, etc.)
# 4. Generates TypeScript types
```

---

## Configuration

### `aeonic.config.ts`

```typescript
import { defineAeonicConfig } from '@orb-zone/aeonic';

export default defineAeonicConfig({
  // SurrealDB connection
  database: {
    url: process.env.SURREALDB_URL || 'ws://localhost:8000/rpc',
    namespace: 'my_app',
    database: 'main',
    auth: {
      type: 'root',
      user: 'root',
      pass: 'root'
    }
  },

  // Entity configuration
  entities: {
    // Enable/disable predefined entities
    user: true,
    role: true,
    team: true,
    auditLog: false,  // Opt-out

    // Custom entities (auto-discovered from schema/entities/)
    custom: ['post', 'comment']
  },

  // Code generation
  generate: {
    output: './src/generated',
    zod: true,           // Generate Zod schemas
    typescript: true,    // Generate TypeScript types
    composables: true    // Generate Vue composables
  },

  // UI configuration
  ui: {
    framework: 'vue',
    theme: 'light',
    locale: 'en'
  },

  // Security
  security: {
    enforcePermissions: true,
    auditTrail: true,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireNumber: true,
      requireSpecial: true
    }
  }
});
```

---

## Vue Composables

### `useAeonicAuth()`

```typescript
import { useAeonicAuth } from '@orb-zone/aeonic';

const {
  user,           // Ref<User | null>
  isAuthenticated, // Ref<boolean>
  login,          // (email, password) => Promise<User>
  logout,         // () => Promise<void>
  register,       // (email, password, name) => Promise<User>
  hasPermission,  // (resource, action) => boolean
  hasRole         // (role) => boolean
} = useAeonicAuth();

// Example usage
async function handleLogin() {
  try {
    await login(email.value, password.value);
    router.push('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

### `useAeonicEntity()`

```typescript
import { useAeonicEntity } from '@orb-zone/aeonic';
import { UserSchema } from '@/generated/schemas.zod';

const {
  items,          // Ref<User[]>
  loading,        // Ref<boolean>
  error,          // Ref<Error | null>
  fetchAll,       // () => Promise<User[]>
  fetchOne,       // (id) => Promise<User>
  create,         // (data) => Promise<User>
  update,         // (id, data) => Promise<User>
  delete: remove  // (id) => Promise<void>
} = useAeonicEntity('user', UserSchema);

// Example usage
async function loadUsers() {
  await fetchAll();
}

async function createUser() {
  await create({
    email: email.value,
    display_name: name.value
  });
}
```

---

## Comparison: Aeonic vs Surrounded vs Dotted

| Feature | @orb-zone/dotted-json | @orb-zone/surrounded | @orb-zone/aeonic |
|---------|---------------------|---------------------|----------------|
| **Core** | Expression engine, variants, i18n | + SurrealDB, LIVE queries, storage | + Predefined entities, scaffolding |
| **Bundle** | 18-25 kB | +30-50 kB | +20-40 kB |
| **Abstraction** | General-purpose JSON | SurrealDB framework | Opinionated fullstack |
| **Setup** | Manual configuration | Manual schema design | Automatic scaffolding |
| **Use Case** | Library integration | Custom SurrealDB apps | Rapid CRUD apps |
| **Learning Curve** | Low (core concepts) | Medium (SurrealDB + plugin) | Low (conventions) |
| **Flexibility** | High (no opinions) | Medium (SurrealDB-focused) | Low (opinionated) |
| **Target** | Library authors | Framework builders | App developers |

---

## Migration Path

### From Dotted to Surrounded

When you outgrow core features and need SurrealDB:

```typescript
// Before: @orb-zone/dotted-json
import { dotted } from '@orb-zone/dotted-json';
const doc = dotted({ user: '.fetchUser()' }, { resolvers });

// After: @orb-zone/surrounded
import { useSurrounded } from '@orb-zone/surrounded';
const { query } = useSurrounded({ url: '...' });
const user = await query('user:alice');
```

### From Surrounded to Aeonic

When you want predefined entities and scaffolding:

```bash
# Migrate existing surrounded app
bun create aeonic my-app --from-surrounded

# Imports existing schema/*.surql files
# Generates CRUD pages for existing entities
# Adds missing entities (User, Role, etc.)
```

---

## Future Enhancements (v2.1+)

### Additional Templates
- **Admin Dashboard** - Pre-built admin UI
- **SaaS Starter** - Multi-tenant SaaS template
- **E-commerce** - Product catalog, cart, checkout
- **Blog/CMS** - Content management system

### Integrations
- **Stripe** - Payment processing functions
- **SendGrid** - Email notifications
- **S3** - File upload/storage
- **OAuth** - Social authentication (Google, GitHub)

### Developer Tools
- **Aeonic Studio** - Visual schema editor
- **CLI Dashboard** - `bun aeonic dashboard` (web UI)
- **Migration Generator** - Auto-generate schema migrations

---

## Philosophy

**Convention over Configuration**: Sensible defaults, escape hatches when needed.

**Security by Default**: Permissions enforced at database level, not application level.

**Developer Happiness**: From idea to production in minutes, not days.

**Open Ecosystem**: Predefined entities are templates, not constraints. Customize freely.

---

**Status**: Vision document - Implementation planned for v2.0.0 monorepo migration

**Next Steps**:
1. Complete v1.0.0 of dotted-json and surrounded
2. Gather feedback on entity schema conventions
3. Build CLI scaffolding tools
4. Create initial templates
5. Release Aeonic v0.1.0-alpha

---

**Authentication Architecture** (Self-Hosted):

**Primary**: SurrealDB built-in scope authentication
- Email + password (Argon2 hashing)
- JWT token issuance (30-day sessions)
- Scope-based permissions (`$auth.id`, `$auth.role`)

**Optional Extensions** (In-House Implementation):
- **OAuth Providers**: Google, GitHub, Microsoft (via `@auth/core` adapter)
- **Passkeys/WebAuthn**: Browser-native passkey support (store public keys in SurrealDB)
- **Magic Links**: Passwordless email authentication (generate token, email link)

**Rationale**:
- ✅ **Self-Contained**: No 3rd party auth service dependency
- ✅ **Zero Cost**: No free tier limits or pricing concerns
- ✅ **Privacy-First**: User data never leaves your infrastructure
- ✅ **SurrealDB Native**: Leverage built-in token/session management
- ✅ **Flexible**: Start simple (email/password), add OAuth/passkeys later
- ✅ **Control**: Full control over auth flow, no vendor lock-in

**Implementation**:
```sql
-- SurrealDB scope-based auth (built-in)
DEFINE SCOPE user SESSION 30d
  SIGNIN (
    SELECT * FROM user
    WHERE email = $email
    AND crypto::argon2::compare(password_hash, $password)
    AND status = 'active'
  )
  SIGNUP (
    CREATE user SET
      email = $email,
      password_hash = crypto::argon2::generate($password),
      email_verified = false,
      status = 'active'
  );
```

**Questions for Design Refinement**:
- Which entities are essential vs optional?
- Should audit logging be opt-in or opt-out?
- ✅ **Authentication**: Self-hosted SurrealDB scope auth, with optional OAuth/Passkey extensions
- How to handle schema migrations (up/down files vs auto-migrate)?
- Should we provide multiple UI frameworks (Vue, React, Svelte)?

**Design Decisions Made**:
- ✅ **Self-Hosted Auth**: SurrealDB handles authentication, no 3rd party dependency
- ✅ **Optional OAuth**: Provide examples for integrating OAuth providers (not baked-in by default)
- ✅ **Passkey Support**: WebAuthn implementation guide (store credentials in SurrealDB)
- ✅ **Simplicity**: Start with email+password, users can extend to OAuth/passkeys as needed
