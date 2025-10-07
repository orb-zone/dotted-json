# Claude Code Configuration

This directory contains custom configuration for Claude Code to optimize development workflow for the web-craft monorepo.

## Directory Structure

```
.claude/
├── README.md                   # This file
├── commands/                   # Custom slash commands
│   ├── design.md              # /design - Create design document
│   ├── implement.md           # /implement - Implement from design
│   ├── test.md                # /test - Generate tests
│   ├── surql.md               # /surql - Generate SurrealQL
│   └── review.md              # /review - Code review workflow
└── agents/                     # Specialized subagents (future)
    └── surrealdb-expert.md    # SurrealDB specialist (planned)
```

## Slash Commands

Custom commands are available via `/command-name` in the chat.

### Project Management

- `/design` - Create a new design document in `.specify/memory/`
- `/implement` - Implement a feature from a design document
- `/test` - Generate test suite for a feature
- `/review` - Review code changes before committing

### SurrealDB-Specific

- `/surql` - Generate SurrealQL schema or functions
- `/zod` - Generate Zod schemas from SurrealQL
- `/types` - Generate TypeScript types

## Specialized Agents (Future)

### SurrealDB Expert Agent

A specialized subagent pre-loaded with deep SurrealDB knowledge for:
- SurrealQL optimization
- Permission design validation
- LIVE query patterns
- Performance tuning
- Record ID design

**Status**: Planned for v0.7.0 (when implementing SurrealDBLoader)

## Usage

See individual command files for detailed usage and examples.
