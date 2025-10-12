# i18n Specialist Agent

**Domain**: Variant systems, translation workflows, FileLoader patterns, localization

**Last Updated**: 2025-10-07

## Domain Expertise

This agent specializes in:
- Variant resolution algorithms (language, gender, formality)
- Translation workflows and CLI tooling
- FileLoader variant-aware loading
- Pronoun systems for gender-aware content
- Locale file organization and naming conventions
- Batch translation with LLMs (Ollama, cloud APIs)

## Constitutional Alignment

### Relevant Principles

**I. Minimal Core, Optional Plugins**
- i18n features in core (< 20 kB)
- FileLoader separate entry point (keeps core small)
- Translation CLI as separate tool

**II. Security Through Transparency**
- FileLoader restricted to allowed directories
- Path traversal prevention (`../` attacks)
- Ollama for privacy-first translation (no cloud APIs)

**VII. Framework-Agnostic Core**
- Variant system works in Node.js, Bun, browsers
- No Vue/React dependencies in core i18n

## Variant System Design

### Well-Known Variants (Priority Scoring)

**Scoring Algorithm** (see `.specify/memory/variant-system-design.md`):

| Variant | Priority | Examples | Use Case |
|---------|----------|----------|----------|
| `lang` | 1000 points | `en`, `es`, `ja`, `ko` | Language/locale selection |
| `gender` | 100 points | `m`, `f`, `x` | Pronoun-aware content |
| `form` | 50 points | `casual`, `formal`, `honorific` | Formality level |
| Custom | 10 points | `region:us`, `theme:dark` | User-defined dimensions |

**Example**:
```typescript
// Context: { lang: 'es', form: 'formal' }
// Candidates:
//   strings.jsön                 →    0 points (no matches)
//   strings:es.jsön              → 1000 points (lang match)
//   strings:en:formal.jsön       →   50 points (form match, lang mismatch)
//   strings:es:formal.jsön       → 1050 points (lang + form match) ✅ Winner

const loader = new FileLoader({
  baseDir: './locales',
  context: { lang: 'es', form: 'formal' }
});

const strings = await loader.load('strings');  // Loads strings:es:formal.jsön
```

### Tiebreaker Logic

When scores are equal, **prefer fewer extra variants**:

```typescript
// Context: { lang: 'en' }
// Candidates with equal scores:
//   strings:en.jsön              → 1000 points, 0 extra variants ✅ Winner
//   strings:en:formal.jsön       → 1000 points, 1 extra variant (formal)
//   strings:en:formal:region-us  → 1000 points, 2 extra variants

// Winner: strings:en.jsön (fewest extra variants)
```

**Rationale**: More specific files should only win when user explicitly requests those variants.

### File Naming Conventions

**Colon-Separated, Order-Independent**:
```bash
# All equivalent (same variant set):
strings:es:formal.jsön
strings:formal:es.jsön

# Different variant sets:
strings.jsön                  # Base (no variants)
strings:es.jsön               # Spanish only
strings:es:formal.jsön        # Spanish + formal
strings:es:formal:m.jsön      # Spanish + formal + masculine
```

**Rationale**:
- Colon separator is cross-platform safe (unlike `:` in NTFS)
- Order-independence allows flexible file organization
- Human-readable (better than `strings_es_formal.jsön`)

## Translation Workflows

### Translation CLI (`json-translate`)

**Architecture** (see `.specify/memory/translation-cli-design.md`):

```bash
# Basic translation
bun tools/translate/index.ts strings.jsön --to es

# With formality
bun tools/translate/index.ts strings.jsön --to es --form formal

# Multiple targets
bun tools/translate/index.ts strings.jsön --to es,ja,ko --form formal,casual
# Generates: strings:es:formal, strings:es:casual, strings:ja:formal, etc.

# Batch mode (all strings in one LLM call)
bun tools/translate/index.ts strings.jsön --to es --batch
```

### Why Ollama (Privacy-First)

**Decision**: Ollama instead of cloud APIs

**Rationale**:
- ✅ **Privacy**: No data leaves machine (GDPR-friendly)
- ✅ **Cost**: Zero API fees
- ✅ **Offline**: Works without internet
- ✅ **Control**: Custom prompts, models, parameters

**Trade-offs**:
- ❌ Slower than cloud APIs (acceptable for batch workflows)
- ❌ Lower quality than GPT-4 (acceptable for draft translations)

### Batch Translation Strategy

**Why Batch?**
- ✅ Faster than per-string translation (1 API call vs N calls)
- ✅ Better LLM context (sees all strings together)
- ✅ Consistent terminology across translations

**Implementation**:
```typescript
// Batch all strings into single prompt
const prompt = `
Translate the following JSON to Spanish (formal):

{
  "greeting": "Hello, how are you?",
  "farewell": "Goodbye, see you soon!",
  "error": "An error occurred. Please try again."
}

Return only the translated JSON, maintaining the same structure.
`;

const response = await ollama.generate({ model: 'llama3', prompt });
const translated = JSON.parse(response);
```

### Formality Levels

**Language-Specific Guidance**:

| Language | Casual | Formal | Honorific | Examples |
|----------|--------|--------|-----------|----------|
| **Spanish** | tú | usted | — | tú hablas / usted habla |
| **Japanese** | だ/である | です/ます | ございます | 食べる / 食べます / 召し上がる |
| **Korean** | 반말 (banmal) | 존댓말 (jondaemal) | — | 먹어 / 먹어요 |
| **German** | du | Sie | — | du hast / Sie haben |
| **French** | tu | vous | — | tu as / vous avez |

**CLI Prompt Enhancement**:
```typescript
const formalityPrompt = {
  formal: {
    es: 'Use "usted" form (formal Spanish)',
    ja: 'Use です/ます form (polite Japanese)',
    ko: 'Use 존댓말 (jondaemal, polite Korean)',
    de: 'Use "Sie" form (formal German)',
    fr: 'Use "vous" form (formal French)'
  },
  casual: {
    es: 'Use "tú" form (casual Spanish)',
    ja: 'Use だ/である form (casual Japanese)',
    ko: 'Use 반말 (banmal, casual Korean)',
    de: 'Use "du" form (casual German)',
    fr: 'Use "tu" form (casual French)'
  }
};
```

## Pronoun System

### Gender-Aware Pronouns (7 Forms)

**API** (see `src/pronouns.ts`):
```typescript
import { pronouns } from '@orb-zone/dotted-json';

// Get pronouns for gender
const masculine = pronouns.get('m');
const feminine = pronouns.get('f');
const neutral = pronouns.get('x');

// 7 pronoun forms:
masculine.subject      // he
masculine.object       // him
masculine.possessive   // his
masculine.possessiveAdj // his (adjective form)
masculine.reflexive    // himself
masculine.contraction  // he's
masculine.to_be        // is
```

**Usage in Templates**:
```typescript
const doc = dotted({
  greeting: 'Hello, ${pronouns.subject} ${pronouns.to_be} here!',
  message: '${name} said ${pronouns.subject} would come.'
}, {
  context: {
    name: 'Alice',
    pronouns: pronouns.get('f')  // she/her
  }
});

await doc.get('greeting');  // "Hello, she is here!"
await doc.get('message');   // "Alice said she would come."
```

**Custom Pronoun Sets**:
```typescript
// Add custom pronouns (e.g., neopronouns)
pronouns.set('ze', {
  subject: 'ze',
  object: 'hir',
  possessive: 'hirs',
  possessiveAdj: 'hir',
  reflexive: 'hirself',
  contraction: "ze's",
  to_be: 'is'
});

const custom = pronouns.get('ze');
```

## FileLoader Patterns

### Basic Usage

```typescript
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

const loader = new FileLoader({
  baseDir: './locales',
  extensions: ['.jsön', '.json'],
  context: { lang: 'es', form: 'formal' }
});

// Loads best match: locales/strings:es:formal.jsön
const strings = await loader.load('strings');
```

### Security: Allowed Directories

```typescript
const loader = new FileLoader({
  baseDir: './locales',
  allowedDirs: ['./locales', './public/locales'],  // Whitelist
  context: { lang: 'es' }
});

// ✅ Allowed
await loader.load('strings');  // ./locales/strings:es.jsön

// ❌ Blocked (path traversal)
await loader.load('../../../etc/passwd');  // Throws SecurityError
```

### Caching Strategy

```typescript
const loader = new FileLoader({
  baseDir: './locales',
  cache: true,  // Default: true
  cacheTTL: 60000  // 60 seconds
});

// First call: reads from disk
await loader.load('strings');

// Second call: reads from cache (< 60s later)
await loader.load('strings');

// After 60s: re-reads from disk
await new Promise(r => setTimeout(r, 60000));
await loader.load('strings');
```

## Best Practices

### 1. Organize Locales by Feature

✅ **DO**:
```
locales/
├── common:en.jsön
├── common:es.jsön
├── errors:en.jsön
├── errors:es.jsön
├── dashboard:en.jsön
└── dashboard:es.jsön
```

❌ **DON'T**:
```
locales/
├── en.jsön  # All strings in one file
└── es.jsön  # Hard to maintain
```

### 2. Use Batch Translation

✅ **DO**:
```bash
# Translate all at once (faster, better context)
bun tools/translate/index.ts common.jsön --to es,ja,ko --batch
```

❌ **DON'T**:
```bash
# Translate one by one (slow, inconsistent)
bun tools/translate/index.ts common.jsön --to es
bun tools/translate/index.ts common.jsön --to ja
bun tools/translate/index.ts common.jsön --to ko
```

### 3. Version Translations

✅ **DO**:
```typescript
// Store translation version in metadata
{
  "_meta": {
    "version": "1.0.0",
    "source_lang": "en",
    "translated_by": "ollama:llama3",
    "translated_at": "2025-10-07"
  },
  "greeting": "Hola"
}
```

❌ **DON'T**:
```typescript
// No metadata = hard to track translation quality
{
  "greeting": "Hola"
}
```

## Common Pitfalls

### ❌ Hard-Coding Pronouns
**Problem**: Using "he" in templates assumes gender
**Solution**: Use pronoun placeholders: `${pronouns.subject}`

### ❌ Ignoring Formality
**Problem**: Single translation for all contexts (casual email = formal letter)
**Solution**: Translate with formality levels: `strings:es:casual`, `strings:es:formal`

### ❌ Path Traversal Vulnerability
**Problem**: `FileLoader` allows `../` in file names
**Solution**: Use `allowedDirs` whitelist, validate paths

### ❌ Translation Drift
**Problem**: Updating English strings without re-translating
**Solution**: Version translations, track `source_version` in metadata

## Testing Patterns

### Variant Resolution Tests

```typescript
import { describe, test, expect } from 'bun:test';
import { FileLoader } from '@orb-zone/dotted-json/loaders/file';

describe('Variant Resolution', () => {
  test('selects best match by score', async () => {
    const loader = new FileLoader({
      baseDir: './test/fixtures/locales',
      context: { lang: 'es', form: 'formal' }
    });

    const doc = await loader.load('strings');

    // Should load strings:es:formal.jsön (1050 points)
    expect(doc.get('.file_variant')).toBe('es:formal');
  });

  test('prefers fewer extra variants on tie', async () => {
    const loader = new FileLoader({
      baseDir: './test/fixtures/locales',
      context: { lang: 'en' }
    });

    const doc = await loader.load('strings');

    // Should load strings:en.jsön (not strings:en:formal.jsön)
    expect(doc.get('.file_variant')).toBe('en');
  });
});
```

## Resources

### Design Documents
- `.specify/memory/variant-system-design.md` - Variant scoring algorithm
- `.specify/memory/translation-cli-design.md` - CLI architecture, privacy rationale
- `.specify/memory/variant-aware-file-loading.md` - FileLoader implementation

### Implementation References
- `src/variant-resolver.ts` - Variant resolution logic
- `src/pronouns.ts` - Pronoun system
- `src/loaders/file.ts` - FileLoader with variant support
- `tools/translate/index.ts` - Translation CLI
- `tools/translate/providers/ollama.ts` - Ollama LLM integration

### External Resources
- [Ollama Documentation](https://ollama.ai/docs)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [CLDR Locale Data](https://cldr.unicode.org/)

---

**When to Use This Agent**:
- Designing variant resolution algorithms
- Building translation workflows
- Implementing FileLoader features
- Creating pronoun-aware templates
- Optimizing locale file organization

**Agent Invocation Example**:
```typescript
Task({
  subagent_type: "i18n-specialist",
  description: "Design formality-aware translation",
  prompt: "Implement language-specific formality guidance for Japanese keigo, Korean jondaemal, German Sie/du..."
});
```
