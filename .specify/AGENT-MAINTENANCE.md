# Agent Maintenance Guide

This document provides guidelines for maintaining and updating the agent system to ensure it remains effective and aligned with project evolution.

## Maintenance Schedule

### Quarterly Reviews (Every 3 Months)

**Root AGENTS.md**:
- [ ] Review command accuracy (build, test, lint commands still work?)
- [ ] Update bundle size constraints if constitution changed
- [ ] Verify constitutional references are current
- [ ] Check new development tools that should be included
- [ ] Update "Recent Changes" section with last 3 features

**Specialist Agents** (`.specify/agents/`):
- [ ] Review code examples against current implementation
- [ ] Update version compatibility information
- [ ] Check for new best practices in each domain
- [ ] Verify constitutional compliance
- [ ] Update resource links and references

### Monthly Checkups

**Quick Validation**:
```bash
# Verify all commands in AGENTS.md work
bun run build
bun run lint  
bun run typecheck
bun test

# Check agent file syntax
for agent in .specify/agents/*.md; do
  echo "Checking $agent..."
  # Basic markdown syntax check
done
```

### Event-Driven Updates

**Trigger Events**:
- Constitution amendments → Update all agents
- Major version releases → Update version compatibility
- New plugin integrations → Create or update relevant agents
- Security vulnerabilities → Update security guidance
- Performance regressions → Update optimization patterns

## Agent Update Process

### 1. Assessment Phase

**Identify Need for Update**:
```bash
# What changed since last update?
git log --since="3 months ago" --oneline
# Look for:
# - New features added
# - API changes  
# - New dependencies
# - Performance improvements
# - Security fixes
```

**Impact Analysis**:
- Which agents are affected by changes?
- Are there new domains that need agents?
- Have existing agents become obsolete?
- Are there new patterns to document?

### 2. Update Phase

**Root AGENTS.md Updates**:
```markdown
## Recent Changes
- **v0.12.1** (2025-10-17): JSR version sync, changesets v1 refactor
- **v0.12.0** (2025-10-17): Custom resolvers, changesets automation  
- **v0.11.0** (2025-10-16): CLI rename, example fixes, documentation audit
```

**Specialist Agent Updates**:
```markdown
# surrealdb-expert.md
## Current Implementation Status
- **v0.4.0**: Basic CRUD resolvers ✅
- **v0.6.0**: SurrealDBLoader with array Record IDs ✅  
- **v0.8.0**: LIVE query subscriptions ✅
- **v0.9.0**: Field-level permissions ✅
```

### 3. Validation Phase

**Testing Agent Guidance**:
```bash
# Test code examples from agents
bun examples/with-zod-validation.ts
bun examples/surrealdb-auto-discovery.ts

# Verify bundle size constraints
bun run build
ls -la dist/index.js  # Should be < 20 kB

# Test performance recommendations
bun test --coverage  # Should maintain coverage levels
```

**Constitutional Compliance Check**:
```bash
# Verify agents don't contradict constitution
grep -r "20 kB" .specify/agents/  # Should match constitution
grep -r "TDD\|Test-First" .specify/agents/  # Should enforce testing
```

## Version Management

### Agent Versioning

Each specialist agent should track:
```markdown
**Last Updated**: 2025-10-19
**Version Compatibility**: v0.12.1+
**Constitution Version**: 1.1.0
**Related Design Documents**: 
- storage-providers-design.md (Implemented v0.6.0)
- permissions-and-zod-integration.md (Implemented v0.9.0)
```

### Compatibility Matrix

| Agent Version | Project Version | Notes |
|---------------|-----------------|-------|
| surrealdb-expert v1.0 | v0.4.0+ | Basic CRUD support |
| surrealdb-expert v1.1 | v0.6.0+ | Added SurrealDBLoader |
| surrealdb-expert v1.2 | v0.8.0+ | Added LIVE queries |
| surrealdb-expert v1.3 | v0.9.0+ | Added field permissions |

## Quality Assurance

### Agent Quality Checklist

**Content Quality**:
- [ ] All code examples are tested and working
- [ ] Constitutional principles are correctly interpreted
- [ ] Best practices are current and relevant
- [ ] Anti-patterns are clearly identified
- [ ] Resource links are valid and useful

**Structural Quality**:
- [ ] Follows agent template structure
- [ ] Markdown syntax is correct
- [ ] Internal links work properly
- [ ] Code blocks have language specified
- [ ] Tables are properly formatted

**Integration Quality**:
- [ ] References to root AGENTS.md are accurate
- [ ] Cross-agent references are consistent
- [ ] Slash command integration patterns work
- [ ] Version compatibility is clearly stated

### Review Process

**Self-Review** (Agent Author):
1. Check all quality checklist items
2. Test code examples in current environment
3. Verify constitutional compliance
4. Update version information

**Peer Review** (Another Maintainer):
1. Validate technical accuracy
2. Check for missing edge cases
3. Verify integration with other agents
4. Assess clarity and usefulness

**Community Review** (Optional):
1. Post in GitHub issues for feedback
2. Test with real development scenarios
3. Collect improvement suggestions
4. Incorporate community feedback

## Creating New Agents

### Agent Proposal Template

```markdown
# Agent Proposal: [Agent Name]

## Domain
What specific domain will this agent cover?

## Need
Why is this agent needed? What problems will it solve?

## Scope
What specific areas will this agent cover?

## Related Agents
How does this agent relate to existing agents?

## Constitutional Alignment
Which constitutional principles are most relevant?

## Maintenance Plan
How often will this agent need updates?
```

### Agent Creation Checklist

**Pre-Creation**:
- [ ] Domain is distinct from existing agents
- [ ] Sufficient complexity to warrant specialist agent
- [ ] Clear constitutional alignment identified
- [ ] Maintenance plan established

**Creation**:
- [ ] Use agent template from `.specify/templates/`
- [ ] Include all required sections
- [ ] Add working code examples
- [ ] Reference relevant design documents

**Post-Creation**:
- [ ] Add to `.specify/agents/README.md`
- [ ] Update root `AGENTS.md` specialist list
- [ ] Create integration examples
- [ ] Plan first quarterly review

## Decommissioning Agents

### Decommissioning Criteria

Consider decommissioning an agent when:
- Domain is no longer relevant to the project
- Agent content is consistently outdated
- Another agent covers the domain more effectively
- Maintenance burden outweighs value

### Decommissioning Process

1. **Assessment**: Evaluate impact and alternatives
2. **Documentation**: Mark agent as deprecated with timeline
3. **Migration**: Move useful content to other agents or root docs
4. **Removal**: Delete agent file after deprecation period
5. **Updates**: Update all references and agent lists

## Emergency Updates

### Security Vulnerabilities

**Immediate Actions**:
1. Update all affected agents with security guidance
2. Add security warnings to relevant sections
3. Update constitutional references if needed
4. Communicate changes to team

**Example Response**:
```markdown
## Security Update (2025-10-19)

**Critical**: Expression evaluator vulnerability discovered
**Impact**: All agents using expression evaluation
**Action**: Updated security guidance in all agents
**Constitution**: Added Principle II-A amendment
```

### Breaking Changes

**Rapid Response**:
1. Identify all agents affected by breaking changes
2. Update code examples and patterns
3. Add migration guidance where needed
4. Update version compatibility information

## Documentation Updates

### Change Documentation

Maintain `AGENT-MAINTENANCE.md` with:
- Update history with dates and reasons
- Agent version changes
- Constitutional amendments
- Major restructuring events

### Communication

**Internal Communication**:
- Update team on agent changes
- Highlight new capabilities
- Document breaking changes
- Provide migration guidance

**External Communication** (if applicable):
- Update contributor guidelines
- Document new agent capabilities
- Share best practices with community

## Tools and Automation

### Automated Checks

```bash
# .github/workflows/agent-validation.yml
name: Validate Agent Documentation
on:
  push:
    paths: ['.specify/agents/**', 'AGENTS.md']
jobs:
  validate-agents:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check agent syntax
        run: |
          # Validate markdown syntax
          # Check internal links
          # Verify code examples compile
```

### Maintenance Scripts

```bash
#!/bin/bash
# .specify/scripts/update-agent-versions.sh

# Update last updated dates
for agent in .specify/agents/*.md; do
  sed -i "s/\*\*Last Updated\*\*: [0-9-]*/\*\*Last Updated\*\*: $(date +%Y-%m-%d)/" "$agent"
done

# Check version compatibility
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"
```

## Metrics and KPIs

### Agent Effectiveness Metrics

**Usage Metrics**:
- How often are agents referenced in development?
- Which agents are used most frequently?
- Are agents preventing common mistakes?

**Quality Metrics**:
- Code example success rate
- Constitutional compliance rate
- Documentation accuracy score

**Maintenance Metrics**:
- Time between updates
- Number of outdated examples
- Review completion rate

### Improvement Targets

**Quarterly Goals**:
- Reduce outdated examples by 90%
- Maintain 100% constitutional compliance
- Improve agent usage documentation
- Streamline maintenance processes

---

**Last Updated**: 2025-10-19  
**Next Review**: 2026-01-19  
**Related**: [Agent Examples](./AGENT-EXAMPLES.md) | [Specialist Agents](./agents/README.md) | [Constitution](./memory/constitution.md)