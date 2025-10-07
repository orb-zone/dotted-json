# AEON Entity Hierarchy

**AEON**: **A**daptive **E**ntity **O**bjective **N**etwork
**ION**: **I**nteractive **O**bject **N**ode (atomic building block - Layer 0)

**Version**: 0.1.0
**Status**: Design specification
**Last Updated**: 2025-10-07

---

## Overview

The AEON model defines a hierarchical taxonomy of entity types (A-H) built on top of ION (Layer 0). Each layer represents a specific level of abstraction, from infrastructure (HUB) down to capabilities (ART).

### Design Principles

1. **Alphabetical Ordering**: A-H provides natural, memorable hierarchy
2. **Numeric Association**: Layers 1-8 for future use (permissions, caching, audit)
3. **Clean Naming**: Field names use layer type directly (`hub`, `eco`, `bio` - not `belongs_to_hub`)
4. **ION References**: Variant-aware content via `name = ion:['key', ...]` (not `name_ion`)
5. **Graph Edges**: Relationships stored as edges with metadata (avoid duplication)
6. **Inheritance**: Each layer references parent layers, queries fetch inherited context

---

## Layer Definitions (0-8)

### Layer 0: ION (Internal Substrate)

**ION** - **I**nteractive **O**bject **N**ode

**Purpose**: Atomic building blocks for variant-aware content (translations, configs, user preferences)

**Metaphor**: "Stars in the sky that entities absorb their attributes from"

**Characteristics**:
- Internal implementation detail (not user-facing)
- Variant-aware data storage
- Referenced by A-H entities for dynamic content
- Array-based Record IDs: `ion:['baseName', 'lang', 'gender', 'form', ...custom]`

**Examples**:
```sql
ion:['dept-name', 'cardiology', 'en']
ion:['skill-desc', 'echocardiogram', 'es', 'formal']
ion:['user-greeting', 'alice', 'es']
ion:['config', 'email-settings', 'prod', 'us-east']
```

---

### Layer 1: ART

**ART** - **A**ction **R**esource **T**alent

**Purpose**: Skills, capabilities, certifications, techniques, permissions

**Examples**: Medical procedures, programming languages, security clearances, tool proficiencies

**Schema**:
```sql
DEFINE TABLE art SCHEMAFULL;

DEFINE FIELD name ON TABLE art TYPE record<ion>;           -- Variant-aware name
DEFINE FIELD description ON TABLE art TYPE record<ion>;    -- Variant-aware description
DEFINE FIELD certification_level ON TABLE art TYPE option<int>;
DEFINE FIELD required_training_hours ON TABLE art TYPE option<int>;
DEFINE FIELD created_at ON TABLE art TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE art VALUE 1;
```

**Examples**:
```sql
CREATE art:echocardiogram SET
  name = ion:['skill-name', 'echocardiogram'],
  description = ion:['skill-desc', 'echocardiogram'],
  certification_level = 3,
  required_training_hours = 200;

CREATE art:javascript SET
  name = ion:['skill-name', 'javascript'],
  description = ion:['skill-desc', 'javascript'],
  certification_level = 2;

CREATE art:admin-access SET
  name = ion:['permission-name', 'admin-access'],
  description = ion:['permission-desc', 'admin-access'];
```

---

### Layer 2: BIO

**BIO** - **B**ionic **I**nteraction **O**bserver

**Purpose**: Users, agents, actors, identities (human or AI)

**Examples**: Employees, customers, patients, AI assistants, service accounts

**Schema**:
```sql
DEFINE TABLE bio SCHEMAFULL;

DEFINE FIELD email ON TABLE bio TYPE string
  ASSERT string::is::email($value);
DEFINE FIELD display_name ON TABLE bio TYPE option<record<ion>>;  -- Variant-aware
DEFINE FIELD avatar_url ON TABLE bio TYPE option<string>;
DEFINE FIELD status ON TABLE bio TYPE string
  VALUE $before OR 'active'
  ASSERT $value INSIDE ['active', 'suspended', 'deleted'];
DEFINE FIELD eco ON TABLE bio TYPE option<array<record<eco>>>;    -- Can belong to multiple departments
DEFINE FIELD hub ON TABLE bio TYPE record<hub>;                   -- Tenant
DEFINE FIELD created_at ON TABLE bio TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE bio VALUE 2;

DEFINE INDEX idx_bio_email ON TABLE bio COLUMNS email UNIQUE;
```

**Examples**:
```sql
CREATE bio:alice SET
  email = 'alice@acme.com',
  display_name = ion:['user-displayname', 'alice'],
  eco = [eco:cardiology, eco:radiology],
  hub = hub:acme;

CREATE bio:ai-assistant-beta SET
  email = 'assistant@system.local',
  display_name = ion:['agent-name', 'ai-assistant'],
  eco = [eco:customer-support],
  hub = hub:acme;
```

**Relationships**:
```sql
-- BIO has ART (skills/permissions)
RELATE bio:alice->has->art:echocardiogram SET
  acquired = '2020-06-15',
  proficiency = 'expert',
  expires = '2025-06-15';

-- BIO uses COG (tools)
RELATE bio:alice->uses->cog:scheduler SET
  last_used = time::now(),
  frequency = 'daily';
```

---

### Layer 3: COG

**COG** - **C**apability **O**peration **G**adget

**Purpose**: Tools, forms, UI components, interfaces, APIs (things users interact with)

**Examples**: Scheduling interface, report generator, API endpoint, mobile app, dashboard

**Schema**:
```sql
DEFINE TABLE cog SCHEMAFULL;

DEFINE FIELD name ON TABLE cog TYPE record<ion>;
DEFINE FIELD interface_type ON TABLE cog TYPE string
  ASSERT $value INSIDE ['web-app', 'mobile-app', 'api', 'cli', 'desktop'];
DEFINE FIELD version ON TABLE cog TYPE option<string>;
DEFINE FIELD eco ON TABLE cog TYPE option<array<record<eco>>>;    -- Available in departments
DEFINE FIELD hub ON TABLE cog TYPE record<hub>;
DEFINE FIELD created_at ON TABLE cog TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE cog VALUE 3;
```

**Examples**:
```sql
CREATE cog:scheduler SET
  name = ion:['tool-name', 'scheduler'],
  interface_type = 'web-app',
  version = '3.2.1',
  eco = [eco:cardiology, eco:radiology],
  hub = hub:acme;

CREATE cog:patient-intake-form SET
  name = ion:['form-name', 'patient-intake'],
  interface_type = 'web-app',
  eco = [eco:reception],
  hub = hub:acme;

CREATE cog:api-v3 SET
  name = ion:['api-name', 'rest-api'],
  interface_type = 'api',
  version = '3.0.0',
  hub = hub:acme;
```

**Relationships**:
```sql
-- COG requires ART (permission needed to access tool)
RELATE cog:scheduler->requires->art:scheduler-access;

-- ECO contains COG (tools available in department)
RELATE eco:cardiology->contains->cog:scheduler;
```

---

### Layer 4: DOT

**DOT** - **D**ated **O**perational **T**ransaction

**Purpose**: Historical records, audit logs, immutable transactions, time-bound events

**Examples**: Appointments, purchases, login events, audit trails, invoices, completed tasks

**Characteristics**:
- **Immutable**: Created once, never updated (append-only)
- **Temporal**: Always has `occurred_at` timestamp
- **Audit trail**: Records who did what, when, with what tools

**Schema**:
```sql
DEFINE TABLE dot SCHEMAFULL
  PERMISSIONS FOR create WHERE $auth != NONE
  PERMISSIONS FOR update NONE   -- Immutable!
  PERMISSIONS FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD event_type ON TABLE dot TYPE string
  ASSERT $value INSIDE ['appointment', 'purchase', 'login', 'logout', 'update', 'delete', 'create'];
DEFINE FIELD occurred_at ON TABLE dot TYPE datetime VALUE time::now();
DEFINE FIELD metadata ON TABLE dot TYPE option<object>;
DEFINE FIELD eco ON TABLE dot TYPE option<record<eco>>;
DEFINE FIELD hub ON TABLE dot TYPE record<hub>;
DEFINE FIELD created_at ON TABLE dot TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE dot VALUE 4;

DEFINE INDEX idx_dot_occurred ON TABLE dot COLUMNS occurred_at;
DEFINE INDEX idx_dot_hub_type ON TABLE dot COLUMNS hub, event_type;
```

**Examples**:
```sql
CREATE dot:appointment-20241007-1430 SET
  event_type = 'appointment',
  occurred_at = '2024-10-07T14:30:00Z',
  metadata = {
    patient_id: 'patient-12345',
    duration_minutes: 30,
    status: 'completed'
  },
  eco = eco:cardiology,
  hub = hub:acme;

CREATE dot:login-alice-20241007-143256 SET
  event_type = 'login',
  occurred_at = '2024-10-07T14:32:56Z',
  metadata = {
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0...'
  },
  hub = hub:acme;
```

**Relationships**:
```sql
-- DOT involves BIO (participants in event)
RELATE dot:appointment-20241007-1430->involves->bio:alice SET role = 'provider';
RELATE dot:appointment-20241007-1430->involves->bio:patient-12345 SET role = 'patient';

-- DOT used ART (procedure performed)
RELATE dot:appointment-20241007-1430->used->art:echocardiogram;

-- DOT via COG (booked through)
RELATE dot:appointment-20241007-1430->via->cog:scheduler;

-- BIO created DOT (who initiated)
RELATE bio:alice->created->dot:appointment-20241007-1430 SET
  created_at = time::now();
```

---

### Layer 5: ECO

**ECO** - **E**ntity **C**ontext **O**rganization

**Purpose**: Departments, teams, locations, organizational units (context boundaries)

**Examples**: Cardiology department, sales team west, Building A Floor 3, project groups

**Characteristics**:
- Hierarchical (can nest via `parent` field)
- Multi-membership (BIO can belong to multiple ECOs)
- Scopes access to COGs and ARTs

**Schema**:
```sql
DEFINE TABLE eco SCHEMAFULL;

DEFINE FIELD name ON TABLE eco TYPE record<ion>;
DEFINE FIELD parent ON TABLE eco TYPE option<record<eco>>;        -- Self-referential hierarchy
DEFINE FIELD fad ON TABLE eco TYPE record<fad>;                   -- Belongs to industry
DEFINE FIELD hub ON TABLE eco TYPE record<hub>;
DEFINE FIELD created_at ON TABLE eco TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE eco VALUE 5;
```

**Examples**:
```sql
-- Top-level department
CREATE eco:medical SET
  name = ion:['dept-name', 'medical'],
  parent = NONE,
  fad = fad:healthcare,
  hub = hub:acme;

-- Nested department
CREATE eco:cardiology SET
  name = ion:['dept-name', 'cardiology'],
  parent = eco:medical,
  fad = fad:healthcare,
  hub = hub:acme;

-- Deeply nested
CREATE eco:interventional-cardiology SET
  name = ion:['dept-name', 'interventional-cardiology'],
  parent = eco:cardiology,
  fad = fad:healthcare,
  hub = hub:acme;

-- Team (different org structure)
CREATE eco:sales-team-west SET
  name = ion:['team-name', 'sales-west'],
  parent = eco:sales,
  fad = fad:saas,
  hub = hub:acme;
```

**Relationships**:
```sql
-- ECO contains COG (tools available)
RELATE eco:cardiology->contains->cog:scheduler;
RELATE eco:cardiology->contains->cog:echo-machine-interface;

-- ECO employs BIO (team members)
RELATE eco:cardiology->employs->bio:alice SET
  role = 'physician',
  hired_date = '2020-01-15';
```

---

### Layer 6: FAD

**FAD** - **F**unctional **A**pplication **D**omain

**Purpose**: Industry vertical, business domain, application purpose

**Examples**: Healthcare, e-commerce, education, finance, manufacturing, SaaS

**Characteristics**:
- Defines business context
- Scopes regulatory compliance
- Groups related ECOs

**Schema**:
```sql
DEFINE TABLE fad SCHEMAFULL;

DEFINE FIELD name ON TABLE fad TYPE record<ion>;
DEFINE FIELD description ON TABLE fad TYPE option<record<ion>>;
DEFINE FIELD regulatory_requirements ON TABLE fad TYPE option<array<string>>;
DEFINE FIELD gen ON TABLE fad TYPE option<record<gen>>;           -- Can scope to version
DEFINE FIELD hub ON TABLE fad TYPE record<hub>;
DEFINE FIELD created_at ON TABLE fad TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE fad VALUE 6;
```

**Examples**:
```sql
CREATE fad:healthcare SET
  name = ion:['industry-name', 'healthcare'],
  description = ion:['industry-desc', 'healthcare'],
  regulatory_requirements = ['HIPAA', 'HITECH', 'FDA'],
  hub = hub:acme;

CREATE fad:ecommerce SET
  name = ion:['industry-name', 'ecommerce'],
  description = ion:['industry-desc', 'ecommerce'],
  regulatory_requirements = ['PCI-DSS', 'GDPR'],
  hub = hub:acme;

CREATE fad:education SET
  name = ion:['industry-name', 'education'],
  description = ion:['industry-desc', 'education'],
  regulatory_requirements = ['FERPA', 'COPPA'],
  hub = hub:acme;
```

**Relationships**:
```sql
-- FAD requires ART (industry-specific certifications)
RELATE fad:healthcare->requires->art:hipaa-certification;
RELATE fad:healthcare->requires->art:medical-license;
```

---

### Layer 7: GEN

**GEN** - **G**enerational **E**volution **N**ode

**Purpose**: Versions, releases, feature flags, iterations

**Examples**: API v3, beta release, 2024-Q4-release, feature-flag-new-ui

**Characteristics**:
- Enables versioned deployments
- Allows gradual rollouts
- Isolates breaking changes

**Schema**:
```sql
DEFINE TABLE gen SCHEMAFULL;

DEFINE FIELD version ON TABLE gen TYPE string;
DEFINE FIELD stable ON TABLE gen TYPE bool VALUE false;
DEFINE FIELD deprecated ON TABLE gen TYPE bool VALUE false;
DEFINE FIELD release_date ON TABLE gen TYPE option<datetime>;
DEFINE FIELD hub ON TABLE gen TYPE record<hub>;
DEFINE FIELD created_at ON TABLE gen TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE gen VALUE 7;

DEFINE INDEX idx_gen_version ON TABLE gen COLUMNS hub, version UNIQUE;
```

**Examples**:
```sql
CREATE gen:v2 SET
  version = '2.0.0',
  stable = true,
  deprecated = true,
  release_date = '2022-01-15T00:00:00Z',
  hub = hub:acme;

CREATE gen:v3 SET
  version = '3.0.0',
  stable = true,
  deprecated = false,
  release_date = '2024-06-01T00:00:00Z',
  hub = hub:acme;

CREATE gen:beta SET
  version = '4.0.0-beta',
  stable = false,
  deprecated = false,
  hub = hub:acme;
```

**Usage**:
```sql
-- HUB tracks active version
CREATE hub:acme SET
  subdomain = 'acme',
  active_gen = gen:v3;

-- Entities can scope to version
CREATE fad:healthcare SET
  name = ion:['industry-name', 'healthcare'],
  gen = gen:v3,
  hub = hub:acme;
```

---

### Layer 8: HUB

**HUB** - **H**osted **U**ser **B**oundary

**Purpose**: Tenant, customer, subdomain, isolation boundary (top-level container)

**Examples**: Customer subdomains, demo environments, staging vs production

**Characteristics**:
- Top-level isolation (multi-tenancy)
- Security boundary
- Billing/subscription unit
- DNS entry point

**Schema**:
```sql
DEFINE TABLE hub SCHEMAFULL;

DEFINE FIELD subdomain ON TABLE hub TYPE string;
DEFINE FIELD name ON TABLE hub TYPE option<record<ion>>;
DEFINE FIELD active_gen ON TABLE hub TYPE option<record<gen>>;    -- Current version
DEFINE FIELD status ON TABLE hub TYPE string
  VALUE $before OR 'active'
  ASSERT $value INSIDE ['active', 'suspended', 'trial', 'deleted'];
DEFINE FIELD created_at ON TABLE hub TYPE datetime VALUE time::now();
DEFINE FIELD layer ON TABLE hub VALUE 8;

DEFINE INDEX idx_hub_subdomain ON TABLE hub COLUMNS subdomain UNIQUE;
```

**Examples**:
```sql
CREATE hub:acme SET
  subdomain = 'acme',
  name = ion:['tenant-name', 'acme'],
  active_gen = gen:v3,
  status = 'active';

CREATE hub:demo SET
  subdomain = 'demo',
  name = ion:['tenant-name', 'demo'],
  active_gen = gen:v3,
  status = 'trial';

CREATE hub:staging SET
  subdomain = 'staging',
  name = ion:['tenant-name', 'staging'],
  active_gen = gen:beta,
  status = 'active';
```

---

## Graph Edge Patterns

### Edge Reusability

**Key concept**: The same edge type can connect **any combination of tables**.

```sql
-- "has" edge used across multiple layer combinations

-- BIO has ART (user has skill)
RELATE bio:alice->has->art:echocardiogram SET
  acquired = '2020-06-15',
  proficiency = 'expert';

-- COG has DOT (tool has transaction history)
RELATE cog:scheduler->has->dot:appointment-20241007-1430 SET
  created_via = true;

-- ECO has FAD (department has industry context)
RELATE eco:cardiology->has->fad:healthcare;

-- HUB has GEN (tenant has version)
RELATE hub:acme->has->gen:v3 SET
  activated = '2024-06-01T00:00:00Z';
```

### Common Edge Types

**Ownership/Possession**:
```sql
bio:alice->has->art:skill
eco:dept->has->cog:tool
hub:tenant->has->gen:version
```

**Usage/Interaction**:
```sql
bio:alice->uses->cog:scheduler
bio:alice->created->dot:appointment
dot:event->used->art:procedure
```

**Containment/Membership**:
```sql
eco:cardiology->contains->cog:scheduler
eco:cardiology->employs->bio:alice
fad:healthcare->contains->eco:cardiology
```

**Requirements/Dependencies**:
```sql
cog:scheduler->requires->art:permission
fad:healthcare->requires->art:certification
art:advanced-skill->requires->art:basic-skill
```

**Participation/Involvement**:
```sql
dot:appointment->involves->bio:patient
dot:appointment->involves->bio:provider
dot:transaction->involves->bio:buyer
```

**Hierarchy/Nesting**:
```sql
eco:cardiology->parent_of->eco:interventional-cardiology
eco:medical->parent_of->eco:cardiology
```

### Edge Metadata

Edges can store relationship-specific data:

```sql
-- BIO has ART with certification details
RELATE bio:alice->has->art:echocardiogram SET
  acquired = '2020-06-15',
  proficiency = 'expert',
  expires = '2025-06-15',
  certifying_body = 'American Registry',
  hours_logged = 450;

-- ECO employs BIO with employment details
RELATE eco:cardiology->employs->bio:alice SET
  role = 'physician',
  hired_date = '2020-01-15',
  salary_grade = 7,
  employment_type = 'full-time';

-- DOT involves BIO with participation role
RELATE dot:appointment-20241007-1430->involves->bio:alice SET
  role = 'provider',
  duration_minutes = 30,
  notes = 'Annual checkup completed';
```

---

## Subdomain Architecture

### URL Pattern

```
https://art.bio.cog.dot.eco.fad.gen.hub.example.com/resource/path
       │   │   │   │   │   │   │   │
       1   2   3   4   5   6   7   8
```

### DNS Hierarchy (Right to Left)

```
hub.example.com                                    → Tenant (Layer 8)
gen.hub.example.com                                → + Version (Layer 7)
fad.gen.hub.example.com                            → + Industry (Layer 6)
eco.fad.gen.hub.example.com                        → + Department (Layer 5)
dot.eco.fad.gen.hub.example.com                    → + Transaction (Layer 4)
cog.dot.eco.fad.gen.hub.example.com                → + Tool (Layer 3)
bio.cog.dot.eco.fad.gen.hub.example.com            → + User (Layer 2)
art.bio.cog.dot.eco.fad.gen.hub.example.com        → + Skill (Layer 1)
```

### Example: Healthcare Appointment

```
https://echo.alice.scheduler.appt123.cardio.health.v3.acme.hospital.com/consent-form

Parsed as:
- art = art:echo              (echocardiogram skill)
- bio = bio:alice             (Dr. Alice Wong)
- cog = cog:scheduler         (scheduling tool)
- dot = dot:appt123           (appointment transaction)
- eco = eco:cardio            (cardiology department)
- fad = fad:health            (healthcare industry)
- gen = gen:v3                (version 3)
- hub = hub:acme              (Acme Hospital tenant)
```

### Parsing Algorithm

```typescript
function parseAeonUrl(url: string) {
  const hostname = new URL(url).hostname

  // Extract subdomains, remove base domain (e.g., "hospital.com")
  const parts = hostname.split('.')
  const baseDomainLength = 2  // "hospital.com" = 2 parts
  const subdomains = parts.slice(0, -baseDomainLength)

  // Reverse order (DNS is right-to-left, we want left-to-right)
  const [hub, gen, fad, eco, dot, cog, bio, art] = subdomains.reverse()

  return {
    hub: hub ? `hub:${hub}` : null,
    gen: gen ? `gen:${gen}` : null,
    fad: fad ? `fad:${fad}` : null,
    eco: eco ? `eco:${eco}` : null,
    dot: dot ? `dot:${dot}` : null,
    cog: cog ? `cog:${cog}` : null,
    bio: bio ? `bio:${bio}` : null,
    art: art ? `art:${art}` : null,
  }
}

// Usage
const context = parseAeonUrl('https://echo.alice.scheduler.appt123.cardio.health.v3.acme.hospital.com')

// Query with parsed context
const data = await db.query(`
  SELECT
    id,
    occurred_at,
    ->involves->bio.email AS participants,
    ->used->art.name.data AS procedures
  FROM $dot
  WHERE hub = $hub
    AND eco = $eco
`, context)
```

---

## Inheritance Queries

### Full Context Query

Get entity with all inherited parent context:

```sql
-- Get BIO (user) with full hierarchy
SELECT
  -- Layer 2: BIO (current entity)
  id,
  email,
  display_name.data,

  -- Layer 5: ECO (department)
  eco[0].name.data AS department,

  -- Layer 6: FAD (industry, inherited from ECO)
  eco[0].fad.name.data AS industry,
  eco[0].fad.regulatory_requirements AS compliance,

  -- Layer 7: GEN (version, inherited from FAD)
  eco[0].fad.gen.version AS app_version,

  -- Layer 8: HUB (tenant)
  hub.subdomain AS tenant,
  hub.status AS tenant_status,

  -- Layer 1: ART (skills, via edge)
  ->has->art.{
    name.data AS skill_name,
    certification_level
  } AS skills,

  -- Edge metadata
  ->has.{
    acquired,
    proficiency,
    expires
  } AS skill_details

FROM bio:alice;
```

### Hierarchical ECO Query

Get department with parent chain:

```sql
SELECT
  id,
  name.data AS department_name,
  parent.name.data AS parent_department,
  parent.parent.name.data AS grandparent_department,
  fad.name.data AS industry,
  hub.subdomain AS tenant
FROM eco:interventional-cardiology;
```

### All Children Query

Get all sub-departments:

```sql
-- Direct children
SELECT * FROM eco WHERE parent = eco:medical;

-- All descendants (using graph edges)
SELECT ->parent_of->eco.* FROM eco:medical;
```

---

## Anti-Patterns (Avoid)

### ❌ Duplicating Data Across Layers

**Don't copy attributes from parent layers**:

```sql
-- BAD: Duplicating HUB data in BIO
CREATE bio:alice SET
  email = 'alice@acme.com',
  tenant_name = 'Acme Hospital',     -- ❌ Already in hub.name
  tenant_status = 'active',          -- ❌ Already in hub.status
  hub = hub:acme;

-- GOOD: Reference only
CREATE bio:alice SET
  email = 'alice@acme.com',
  hub = hub:acme;                    -- ✅ Query fetches hub.name, hub.status
```

### ❌ Storing Edge Data in Entity Fields

**Don't embed relationship metadata in entity records**:

```sql
-- BAD: Storing skill details in BIO
CREATE bio:alice SET
  email = 'alice@acme.com',
  skills = [
    {
      skill: 'echocardiogram',           -- ❌ Should be edge
      acquired: '2020-06-15',            -- ❌ Should be edge metadata
      proficiency: 'expert'              -- ❌ Should be edge metadata
    }
  ];

-- GOOD: Use graph edge
CREATE bio:alice SET email = 'alice@acme.com';
RELATE bio:alice->has->art:echocardiogram SET
  acquired = '2020-06-15',               -- ✅ Edge metadata
  proficiency = 'expert';                -- ✅ Edge metadata
```

### ❌ Updating DOT Records

**DOT is immutable (append-only)**:

```sql
-- BAD: Updating historical record
UPDATE dot:appointment-20241007-1430 SET
  status = 'cancelled';                  -- ❌ DOT should never update

-- GOOD: Create new DOT for state change
CREATE dot:appointment-20241007-1430-cancelled SET
  event_type = 'appointment_cancelled',
  occurred_at = time::now(),
  metadata = {
    original_appointment: 'dot:appointment-20241007-1430',
    reason: 'Patient requested reschedule'
  };
```

---

## Use Cases

### Multi-Tenant SaaS

```sql
-- Tenant 1: Acme Hospital
CREATE hub:acme SET subdomain = 'acme', active_gen = gen:v3;
CREATE fad:healthcare SET hub = hub:acme;
CREATE eco:cardiology SET fad = fad:healthcare, hub = hub:acme;
CREATE bio:alice SET email = 'alice@acme.com', eco = [eco:cardiology], hub = hub:acme;

-- Tenant 2: Beta Clinic
CREATE hub:beta SET subdomain = 'beta', active_gen = gen:v3;
CREATE fad:healthcare SET hub = hub:beta;
CREATE eco:cardiology SET fad = fad:healthcare, hub = hub:beta;
CREATE bio:bob SET email = 'bob@beta.com', eco = [eco:cardiology], hub = hub:beta;

-- Query: Get all users in Acme tenant
SELECT * FROM bio WHERE hub = hub:acme;

-- Isolation: Beta users cannot access Acme data
SELECT * FROM bio WHERE hub = $auth.hub;  -- $auth.hub enforced by permissions
```

### Versioned Deployments

```sql
-- v2 (deprecated)
CREATE gen:v2 SET version = '2.0.0', deprecated = true;
CREATE fad:healthcare-v2 SET gen = gen:v2, hub = hub:acme;

-- v3 (stable)
CREATE gen:v3 SET version = '3.0.0', stable = true;
CREATE fad:healthcare-v3 SET gen = gen:v3, hub = hub:acme;

-- Gradual rollout: Some users on v2, some on v3
CREATE bio:alice SET hub = hub:acme;  // Uses hub.active_gen = gen:v3
CREATE bio:legacy-user SET hub = hub:acme-v2;  // Uses hub.active_gen = gen:v2

-- Query scoped to version
SELECT * FROM fad WHERE gen = $context.gen;
```

### Audit Trail

```sql
-- User logs in
CREATE dot:login-alice-20241007-143000 SET
  event_type = 'login',
  occurred_at = '2024-10-07T14:30:00Z',
  hub = hub:acme;
RELATE bio:alice->created->dot:login-alice-20241007-143000;

-- User schedules appointment
CREATE dot:appointment-20241007-1430 SET
  event_type = 'appointment',
  occurred_at = '2024-10-07T14:30:00Z',
  eco = eco:cardiology,
  hub = hub:acme;
RELATE bio:alice->created->dot:appointment-20241007-1430;
RELATE dot:appointment-20241007-1430->via->cog:scheduler;
RELATE dot:appointment-20241007-1430->used->art:echocardiogram;

-- Query: Audit trail for Alice
SELECT
  ->created->dot.event_type,
  ->created->dot.occurred_at,
  ->created->dot->via->cog.name.data AS tool_used
FROM bio:alice
ORDER BY ->created->dot.occurred_at DESC;
```

---

## Next Steps

1. **Finalize acronym definitions** (especially DOT, FAD, ECO edge cases)
2. **Define permission patterns** (how layers enforce access control)
3. **Design caching strategy** (which layers cache longer, which refresh frequently)
4. **Build subdomain router** (TypeScript library for parsing AEON URLs)
5. **Create migration tools** (convert flat IONs to AEON hierarchy)
6. **Implement in `surrounded` package** (SurrealDB schema generator)
7. **Build `aeonic` CLI** (scaffolding tool for generating entities)

---

**Status**: Design specification - Ready for implementation in v2.0.0 monorepo

**Related Documents**:
- [aeonic-vision.md](.specify/memory/aeonic-vision.md) - Framework overview
- [constitution.md](.specify/memory/constitution.md) - Design principles
