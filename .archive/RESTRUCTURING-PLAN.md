# Restructuring Plan for OpenCode

## Current State Analysis

This repo was initialized with **github-spec-kit**, which provides a formal specification→plan→tasks→implement workflow. However, **OpenCode** has a different philosophy:

- **OpenCode**: Conversational, tool-driven, lightweight todo management
- **github-spec-kit**: Formal spec docs, bash scripts, multi-phase planning

## Proposed Restructuring

### Phase 1: Streamline Commands ✅

**Keep (domain-specific, useful)**:
- `/surql` - Generate SurrealQL (SurrealDB-specific)
- `/zod-from-surql` - Generate Zod from SurrealQL (integration-specific)
- `/surql-review` - Review SurrealQL code (quality check)
- `/constitution` - View/update constitution (project governance)

**Add (OpenCode-friendly)**:
- `/docs-audit` - Audit documentation (replaces formal analyze)
- `/test-gen` - Generate tests (focused test generation)

**Archive (too heavyweight)**:
- `/specify` - Formal spec creation (use natural conversation instead)
- `/plan` - Multi-phase planning (use OpenCode's todo system)
- `/clarify` - Question-based clarification (ask directly)
- `/tasks` - Task generation (use OpenCode's todo tool)
- `/implement` - Task execution (just do it conversationally)
- `/analyze` - Cross-artifact analysis (too formal)
- `/design` - Design docs (create naturally)

### Phase 2: Directory Structure

**Recommended structure**:
```
.claude/
├── commands/              # Custom OpenCode commands
│   ├── surql.md          # Generate SurrealQL
│   ├── zod-from-surql.md # Generate Zod from SurrealQL
│   ├── surql-review.md   # Review SurrealQL
│   ├── docs-audit.md     # Audit documentation
│   ├── test-gen.md       # Generate tests
│   └── constitution.md   # Constitution management
├── agents/
│   └── README.md         # Points to .specify/agents/
└── README.md             # OpenCode config overview

.specify/
├── agents/               # Domain specialist agents (keep as-is)
│   ├── surrealdb-expert.md
│   ├── zod-integration-specialist.md
│   ├── testing-specialist.md
│   └── [7 more...]
├── memory/               # Design docs, constitution (keep as-is)
│   ├── constitution.md
│   ├── storage-providers-design.md
│   └── [25+ more...]
├── scripts/              # Archive (no longer needed)
│   └── bash/             # Move to .archive/
└── templates/            # Archive (no longer needed)
    └── [*.md]            # Move to .archive/

.archive/                 # New directory for github-spec-kit artifacts
├── github-spec-kit/
│   ├── commands/         # Old /specify, /plan, etc.
│   ├── scripts/          # Bash scripts
│   └── templates/        # Template files
```

### Phase 3: Workflow Changes

**Old workflow (github-spec-kit)**:
```bash
/specify "Feature description"
/clarify
/plan
/tasks
/implement
```

**New workflow (OpenCode-native)**:
```bash
# Just have a conversation!
"Can you add React hooks support?"
# OpenCode uses todo tool automatically for complex tasks
# No formal spec/plan/tasks artifacts needed
```

**When you need domain expertise**:
```bash
/surql "Create a user table with permissions"
/zod-from-surql examples/schema.surql
/test-gen "SurrealDBLoader.query() method"
```

### Phase 4: Migration Steps

1. **Create new streamlined commands** (done above in `.claude/commands-proposed/`)
2. **Test new commands** with OpenCode
3. **Archive old commands**:
   ```bash
   mkdir -p .archive/github-spec-kit
   mv .specify/scripts .archive/github-spec-kit/
   mv .specify/templates .archive/github-spec-kit/
   mv .claude/commands/{specify,plan,clarify,tasks,implement,analyze,design}.md .archive/github-spec-kit/commands/
   ```
4. **Update .claude/README.md** with OpenCode-specific guidance
5. **Update AGENTS.md** to reference OpenCode workflow

## Benefits of Restructuring

### For OpenCode Users:
✅ **Simpler**: No formal spec/plan/tasks ceremony
✅ **Conversational**: Just describe what you want
✅ **Lightweight**: Uses OpenCode's native todo tool
✅ **Domain-specific**: Keep the valuable SurrealDB/Zod commands

### For github-spec-kit Users:
✅ **Preserved**: All old files archived, not deleted
✅ **Documented**: Clear migration path
✅ **Optional**: Can still use .specify/memory/ for design docs

## Commands Comparison

### Before (github-spec-kit)
| Command | Purpose | Lines | Scripts |
|---------|---------|-------|---------|
| /specify | Create spec | 22 | 1 bash script |
| /plan | Create plan | 46 | 1 bash script |
| /clarify | Ask questions | ~30 | 1 bash script |
| /tasks | Generate tasks | ~40 | 1 bash script |
| /implement | Execute tasks | 58 | 1 bash script |
| /analyze | Cross-check | 150+ | 1 bash script |

**Total**: 6 commands, ~350 lines, 6 bash scripts

### After (OpenCode-native)
| Command | Purpose | Lines | Scripts |
|---------|---------|-------|---------|
| /surql | Generate SurrealQL | 20 | 0 |
| /zod-from-surql | Gen Zod schemas | 20 | 0 |
| /surql-review | Review SurrealQL | 15 | 0 |
| /docs-audit | Audit docs | 25 | 0 |
| /test-gen | Generate tests | 25 | 0 |
| /constitution | Manage constitution | 25 | 0 |

**Total**: 6 commands, ~130 lines, 0 bash scripts

**Reduction**: 63% fewer lines, 100% fewer bash scripts

## Next Steps

1. Review proposed commands in `.claude/commands-proposed/`
2. Test one command with OpenCode
3. If satisfied, execute migration:
   ```bash
   # Backup
   cp -r .claude .claude.backup
   cp -r .specify .specify.backup
   
   # Archive
   mkdir -p .archive/github-spec-kit
   mv .specify/scripts .archive/github-spec-kit/
   mv .specify/templates .archive/github-spec-kit/
   
   # Install new commands
   rm .claude/commands/*.md
   cp .claude/commands-proposed/*.md .claude/commands/
   
   # Cleanup
   rm -rf .claude/commands-proposed
   ```
4. Update documentation
5. Test workflow with real tasks

## Questions to Consider

1. **Do you use the formal spec/plan/tasks workflow often?**
   - If yes: Keep both systems (hybrid approach)
   - If no: Go full OpenCode-native

2. **Do you collaborate with others using github-spec-kit?**
   - If yes: Keep .archive/ with clear docs
   - If no: Can fully migrate

3. **What do you value most?**
   - Formal planning: Keep github-spec-kit
   - Speed and simplicity: Go OpenCode-native
   - Domain tools: Hybrid approach (proposed)

## Recommendation

**Hybrid approach** (proposed above):
- Archive formal spec/plan/tasks workflow
- Keep domain-specific commands (/surql, /zod-from-surql)
- Add OpenCode-friendly helpers (/docs-audit, /test-gen)
- Preserve all knowledge in .specify/memory/
- Use OpenCode's natural conversation for most tasks

This gives you the best of both worlds:
- **Speed**: No ceremony for simple tasks
- **Power**: Domain commands for specialized work
- **Knowledge**: All design docs preserved
- **Flexibility**: Can adapt workflow as needed
