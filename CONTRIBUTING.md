# Contributing to dotted-json (jsön)

Thank you for your interest in contributing! This document provides guidelines for
contributing to the project.

## 📜 Project Constitution

All contributions must comply with the [Project Constitution](.specify/memory/constitution.md).
Key principles:

1. **Minimal Core, Optional Plugins** - Core must stay under 15 kB
2. **Security Through Transparency** - Trust model must be documented
3. **Test-First Development** - TDD is mandatory (write tests first!)
4. **Lazy Evaluation with Explicit Caching** - Core value proposition
5. **Plugin Architecture with Clear Boundaries** - No monkey-patching
6. **Cycle Detection and Safeguards** - Prevent infinite loops
7. **Framework-Agnostic Core** - Zero framework dependencies in core

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0.0 or higher
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/orbzone/dotted-json.git
cd dotted-json

# Install dependencies
bun install

# Run tests
bun test

# Start development mode
bun run dev
```

## 🧪 Test-First Development (TDD)

**MANDATORY**: This project follows strict TDD. All features MUST follow this workflow:

1. **Write tests first** - Tests should fail initially
2. **Get user approval** - Show failing tests to maintainer
3. **Implement feature** - Make tests pass
4. **Refactor** - Clean up while keeping tests green

## 📝 Pull Request Process

1. **Fork and Branch**
2. **Follow TDD** - Write tests before implementation
3. **Check Constitution Compliance**
4. **Update Documentation**
5. **Run Quality Checks**: `bun test && bun run typecheck && bun run build`
6. **Submit PR**

See full details in the repository.

## 🔒 Security Guidelines

All resolvers MUST validate inputs. We **strongly recommend** using the **Zod plugin** for automatic validation.

For questions, reach out via [GitHub Discussions](https://github.com/orbzone/dotted-json/discussions).
