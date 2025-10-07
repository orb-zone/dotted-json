# Design Document Creator

Create a comprehensive design document in `.specify/memory/` following project standards.

## Usage

```
/design [feature-name]
```

## Workflow

When this command is invoked:

1. **Gather requirements** - Ask clarifying questions about the feature
2. **Research context** - Read related design documents and code
3. **Create structure** - Use standard design document template:
   - Overview & goals
   - Design approaches (3+ options with pros/cons)
   - Recommended approach with rationale
   - Implementation details
   - Code examples
   - API design
   - Testing strategy
   - Migration path (if breaking changes)
   - Success metrics
   - References

4. **Cross-reference** - Link to related designs and existing code
5. **Write document** - Save to `.specify/memory/[feature-name]-design.md`
6. **Update tracking** - Update ROADMAP.md and .specify/README.md

## Template Variables

- `{{FEATURE_NAME}}` - Name of the feature
- `{{VERSION}}` - Target version (e.g., v0.7.0)
- `{{DATE}}` - Current date
- `{{RELATED_DOCS}}` - List of related design documents

## Example

```
User: /design live-query-subscriptions
```

Output:
- Creates `.specify/memory/live-query-subscriptions-design.md`
- Updates ROADMAP.md with feature reference
- Updates .specify/README.md with new design doc
- Returns summary of design approaches

## Standards

Follow these project standards:
- Constitution principles (`.specify/memory/constitution.md`)
- TDD approach (tests first)
- Bundle size constraints (plugins < 35 kB)
- Variant system patterns
- SurrealDB-first when applicable
