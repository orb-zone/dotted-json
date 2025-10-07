-- ============================================================================
-- JSÖN Test Schema for Integration Tests
-- ============================================================================
-- This schema defines tables for testing storage providers, permissions,
-- and schema-driven Zod generation workflows.
--
-- Based on: __DRAFT__/examples/surrealdb-functions.surql
--
-- Usage:
--   In integration tests, import this schema to in-memory SurrealDB instance
--   running on 127.0.0.1:9000

-- ============================================================================
-- JSÖN Documents Storage Table
-- ============================================================================
-- This table stores JSÖN expansion documents with variant resolution support

DEFINE TABLE jsön_documents SCHEMAFULL;

DEFINE FIELD base_name ON jsön_documents TYPE string
  ASSERT string::len($value) > 0;

DEFINE FIELD variants ON jsön_documents TYPE object
  VALUE $value OR {};

DEFINE FIELD data ON jsön_documents TYPE object;

DEFINE FIELD created_at ON jsön_documents TYPE datetime
  VALUE $value OR time::now();

DEFINE FIELD updated_at ON jsön_documents TYPE datetime
  VALUE time::now();

DEFINE FIELD version ON jsön_documents TYPE int
  VALUE $value OR 1;

-- Index for faster lookups by base_name
DEFINE INDEX jsön_documents_base_name_idx ON jsön_documents FIELDS base_name;

-- Composite index for variant-aware queries
DEFINE INDEX jsön_documents_variants_idx ON jsön_documents FIELDS base_name, variants;

-- ============================================================================
-- App Config Table (for testing validation)
-- ============================================================================
-- Tests ASSERT clause mapping to Zod constraints

DEFINE TABLE app_config SCHEMAFULL;

DEFINE FIELD theme ON app_config TYPE string
  ASSERT $value IN ['light', 'dark', 'auto']
  VALUE $value OR 'auto';

DEFINE FIELD api_timeout ON app_config TYPE int
  ASSERT $value >= 1000 AND $value <= 30000
  VALUE $value OR 5000;

DEFINE FIELD max_retries ON app_config TYPE int
  ASSERT $value >= 0 AND $value <= 10
  VALUE $value OR 3;

DEFINE FIELD debug_mode ON app_config TYPE bool
  VALUE $value OR false;

DEFINE FIELD api_url ON app_config TYPE string
  ASSERT string::is::url($value);

DEFINE FIELD admin_email ON app_config TYPE string
  ASSERT string::is::email($value);

DEFINE FIELD tags ON app_config TYPE option<array<string>>;

DEFINE FIELD created_at ON app_config TYPE datetime
  VALUE time::now();

-- ============================================================================
-- User Table (for testing permissions)
-- ============================================================================
-- Tests field-level permissions detection

DEFINE TABLE user SCHEMAFULL;

DEFINE FIELD name ON user TYPE string
  ASSERT string::len($value) >= 2 AND string::len($value) <= 100;

DEFINE FIELD email ON user TYPE string
  ASSERT string::is::email($value);

DEFINE FIELD password_hash ON user TYPE string
  PERMISSIONS
    FOR select NONE
    FOR update WHERE $auth.id = id;

DEFINE FIELD role ON user TYPE string
  ASSERT $value IN ['user', 'admin', 'moderator']
  VALUE $value OR 'user'
  PERMISSIONS
    FOR update WHERE $auth.role = 'admin';

DEFINE FIELD bio ON user TYPE option<string>;

DEFINE FIELD avatar ON user TYPE option<string>
  ASSERT !$value OR string::is::url($value);

DEFINE FIELD created_at ON user TYPE datetime
  VALUE time::now();

DEFINE FIELD last_login ON user TYPE option<datetime>
  PERMISSIONS
    FOR update WHERE $auth.id = id OR $auth.role = 'admin';

-- Index for faster user lookups
DEFINE INDEX user_email_idx ON user FIELDS email UNIQUE;

-- ============================================================================
-- Post Table (for testing CRUD operations)
-- ============================================================================

DEFINE TABLE post SCHEMAFULL;

DEFINE FIELD title ON post TYPE string
  ASSERT string::len($value) >= 3 AND string::len($value) <= 200;

DEFINE FIELD content ON post TYPE string
  ASSERT string::len($value) >= 10;

DEFINE FIELD author_id ON post TYPE record<user>;

DEFINE FIELD likes ON post TYPE int
  VALUE $value OR 0
  ASSERT $value >= 0;

DEFINE FIELD published ON post TYPE bool
  VALUE $value OR false;

DEFINE FIELD tags ON post TYPE array<string>
  VALUE $value OR [];

DEFINE FIELD created_at ON post TYPE datetime
  VALUE time::now();

DEFINE FIELD updated_at ON post TYPE datetime
  VALUE time::now();

-- Index for faster post queries by author
DEFINE INDEX post_author_idx ON post FIELDS author_id;

-- Index for published posts
DEFINE INDEX post_published_idx ON post FIELDS published, created_at;

-- ============================================================================
-- Custom Functions (for testing function resolvers)
-- ============================================================================

-- Get app configuration
DEFINE FUNCTION fn::getConfig() {
  LET $config = SELECT * FROM app_config LIMIT 1;
  RETURN $config[0] OR {
    theme: 'auto',
    api_timeout: 5000,
    max_retries: 3,
    debug_mode: false
  };
};

-- Get user profile by ID
DEFINE FUNCTION fn::getProfile($userId: string) {
  LET $user = SELECT
    id,
    name,
    email,
    role,
    bio,
    avatar,
    created_at
  FROM type::thing('user', string::split($userId, ':')[1])
  LIMIT 1;

  RETURN $user[0] OR {
    id: $userId,
    name: 'Unknown User',
    email: 'unknown@example.com',
    role: 'user'
  };
};

-- Get user's posts
DEFINE FUNCTION fn::getUserPosts($userId: string) {
  LET $posts = SELECT
    id,
    title,
    content,
    likes,
    published,
    tags,
    created_at
  FROM post
  WHERE author_id = type::thing('user', string::split($userId, ':')[1])
  ORDER BY created_at DESC;

  RETURN $posts;
};

-- Create a post
DEFINE FUNCTION fn::createPost($authorId: string, $title: string, $content: string) {
  LET $post = CREATE post CONTENT {
    title: $title,
    content: $content,
    author_id: type::thing('user', string::split($authorId, ':')[1]),
    likes: 0,
    published: false,
    tags: [],
    created_at: time::now(),
    updated_at: time::now()
  };

  RETURN $post[0];
};

-- ============================================================================
-- Seed Data (Optional - for manual testing)
-- ============================================================================

-- Create test user
LET $testUser = CREATE user:test_123 CONTENT {
  name: 'Test User',
  email: 'test@example.com',
  password_hash: 'hashed_password_here',
  role: 'user',
  bio: 'Test user for integration testing',
  created_at: time::now()
};

-- Create test app config
CREATE app_config:default CONTENT {
  theme: 'dark',
  api_timeout: 10000,
  max_retries: 5,
  debug_mode: true,
  api_url: 'http://localhost:8000',
  admin_email: 'admin@example.com',
  tags: ['test', 'development'],
  created_at: time::now()
};

-- Create sample JSÖN documents with variants
CREATE jsön_documents CONTENT {
  base_name: 'greetings',
  variants: { lang: 'en' },
  data: {
    hello: 'Hello',
    goodbye: 'Goodbye',
    welcome: 'Welcome'
  },
  version: 1
};

CREATE jsön_documents CONTENT {
  base_name: 'greetings',
  variants: { lang: 'es' },
  data: {
    hello: 'Hola',
    goodbye: 'Adiós',
    welcome: 'Bienvenido'
  },
  version: 1
};

CREATE jsön_documents CONTENT {
  base_name: 'greetings',
  variants: { lang: 'ja' },
  data: {
    hello: 'こんにちは',
    goodbye: 'さようなら',
    welcome: 'ようこそ'
  },
  version: 1
};

-- Create sample post
CREATE post CONTENT {
  title: 'Test Post',
  content: 'This is a test post for integration testing.',
  author_id: user:test_123,
  likes: 5,
  published: true,
  tags: ['test', 'sample'],
  created_at: time::now(),
  updated_at: time::now()
};
