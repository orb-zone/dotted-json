# Contributing to dotted-json (jsön)

Thank you for your interest in contributing! This document provides guidelines for
contributing to the project.

## 📜 Project Constitution

All contributions must comply with the [Project Constitution](.specify/memory/constitution.md).
Key principles:

1. **Minimal Core, Optional Plugins** - Core must stay under 20 kB
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

# Setup git hooks (lefthook)
bun run prepare

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
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow TDD** - Write tests before implementation
   ```bash
   # 1. Write failing test
   bun test test/unit/your-feature.test.ts

   # 2. Implement feature
   # 3. Verify tests pass
   bun test
   ```

3. **Check Constitution Compliance**
   - Core bundle < 20 kB
   - No framework dependencies in core
   - All tests passing

4. **Update Documentation**
   - Add JSDoc comments
   - Update README if needed
   - Update CHANGELOG.md

5. **Run Quality Checks**
   ```bash
   bun test
   bun run typecheck
   bun run build
   ```

6. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat(loaders): add new storage provider"
   git commit -m "fix(core): resolve caching issue"
   git commit -m "docs: update API reference"
   ```

7. **Submit PR** to `main` branch

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code change (neither fix nor feature)
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Tooling, dependencies, etc.
- `build`: Build system changes
- `ci`: CI/CD changes

**Examples:**
```
feat(surrealdb): add LIVE query support
fix(cache): resolve race condition in TTL cleanup
docs(api): add migration guide from i18next
perf(variant): optimize scoring algorithm
```

### Git Hooks (Lefthook)

Lefthook will automatically:
- Run tests before commit
- Validate commit messages
- Check bundle size
- Run type checking
- Prevent direct pushes to protected branches

## 🔒 Security Guidelines

All resolvers MUST validate inputs. We **strongly recommend** using the **Zod plugin** for automatic validation.

### Security Checklist

- [ ] No credentials or secrets in code
- [ ] Input validation on all resolvers
- [ ] No `eval()` or unsafe code execution
- [ ] Dependencies are trusted and minimal
- [ ] Security warnings documented

## 📚 Additional Resources

- [API Reference](docs/API.md)
- [Migration Guide](docs/MIGRATION.md)
- [Performance Guide](docs/PERFORMANCE.md)
- [Project Constitution](.specify/memory/constitution.md)
- [Roadmap](ROADMAP.md)

## 💬 Questions?

- Open a [Discussion](https://github.com/orbzone/dotted-json/discussions)
- Report bugs via [Issues](https://github.com/orbzone/dotted-json/issues)

## 🙏 Thank You!

Your contributions make this project better for everyone!
