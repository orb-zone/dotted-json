# Agent Definitions

## Location

All specialist agent definitions for this project are located in:

**[`.specify/agents/`](../../.specify/agents/)**

This directory contains domain-specific AI agent definitions for:
- SurrealDB integration
- Vue 3 best practices
- Documentation curation
- Performance optimization
- Testing strategies
- And more...

## Why `.specify/agents/`?

The `.specify/` directory is the project's central knowledge base, containing:
- Constitutional principles
- Design documents
- Memory files
- **Specialist agent definitions**

This keeps all project-specific context in one place, separate from Claude Code's own configuration in `.claude/`.

## Available Agents

See [`.specify/agents/README.md`](../../.specify/agents/README.md) for:
- Complete list of available agents
- Usage examples
- Agent structure and guidelines
- How to create new agents

## Usage

Agents are invoked using the Task tool when you need domain expertise:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "Your task description",
  prompt: "Load context from .specify/agents/surrealdb-expert.md and help with..."
});
```

---

**Note**: This `.claude/agents/` directory is reserved for Claude Code-specific configurations. All project agent definitions belong in `.specify/agents/`.
