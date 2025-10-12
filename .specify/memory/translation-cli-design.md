# Translation CLI Design

## Overview

The `json-translate` CLI tool generates translated variant files using local Ollama LLM, enabling privacy-friendly i18n workflows.

## Core Principles

### 1. Privacy First

**Decision**: Use local Ollama instead of cloud APIs (AWS, GCP, Azure)

**Rationale**:
- No external API keys required
- Translation data never leaves user's machine
- GDPR/privacy compliance friendly
- Free (no per-token costs)
- Works offline

**Trade-off**: Requires local setup (Ollama + model download) but acceptable for development workflows.

### 2. Automatic Variant Naming

**Decision**: CLI automatically generates variant files with correct naming convention

**Example**:
```bash
# Input: strings.jsön
# Command: json-translate strings.jsön --to es --form formal
# Output: strings:es:formal.jsön
```

**Rationale**:
- Eliminates manual naming errors
- Ensures consistency with file loader expectations
- Matches library's variant system exactly

### 3. Batch Translation

**Decision**: Translate all strings in one API call when possible

**Implementation**:
```typescript
// Instead of:
for (const text of texts) {
  await translate(text); // N API calls
}

// Use:
await translateBatch(texts); // 1 API call
```

**Rationale**:
- Faster (1 round-trip vs N)
- More efficient for LLMs (better context)
- Lower latency

**Trade-off**: Requires careful prompt engineering to maintain format.

## Ollama Provider Design

### API Choice

**Decision**: Use `/api/generate` endpoint (non-streaming)

**Rationale**:
- Simpler implementation (no stream parsing)
- Batch translation easier to format
- Progress can be shown per-file not per-token

**Alternative considered**: `/api/chat` (chat completion API)
- Rejected: Adds unnecessary conversation overhead for translation task

### Prompt Engineering

#### Single Translation Prompt

```
Translate the following text to {targetLang} (from {sourceLang})

Formality level: {formality}
{language-specific guidance}

Context: {context}

IMPORTANT: Return ONLY the translated text, no explanations.

Text to translate:
{text}
```

#### Batch Translation Prompt

```
Translate the following numbered list of texts to {targetLang}

Formality level: {formality}
{language-specific guidance}

IMPORTANT: Return ONLY the numbered translations, one per line, no explanations.
Format: 1. <translation>
2. <translation>
...

Texts to translate:
1. {text1}
2. {text2}
...
```

**Key design choices**:
1. **Numbered format**: Easier to parse, maintains order
2. **Explicit "ONLY" instruction**: Reduces LLM commentary
3. **Format specification**: Teaches LLM expected output structure

### Language-Specific Formality Guidance

**Decision**: Inject language-specific instructions based on target language + formality

**Example**:
```typescript
const guidance = {
  ja: {
    polite: ' (Use polite form: です/ます - keigo)',
    honorific: ' (Use honorific form: 尊敬語/謙譲語)'
  },
  ko: {
    polite: ' (Use 존댓말 - jondaemal)',
  },
  de: {
    formal: ' (Use "Sie" form)'
  }
};
```

**Rationale**:
- LLMs understand these linguistic terms
- Provides cultural context
- More reliable than generic "be formal"

### Response Parsing

**Decision**: Strip common LLM prefixes automatically

**Implementation**:
```typescript
function extractTranslation(response: string): string {
  let cleaned = response.trim();

  // Remove "Here is the translation:" etc
  cleaned = cleaned.replace(/^(here is the translation|translation):?\s*/i, '');

  // Remove quotes if entire response is quoted
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}
```

**Rationale**:
- LLMs often add helpful (but unwanted) context
- Users want clean translations in output files
- Regex-based stripping is safer than trying to prevent in prompt

## File I/O Design

### Preserve Structure

**Decision**: Only translate string values, preserve all other data types

**Implementation**:
```typescript
async function translateObjectValues(obj, translator) {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = await translator(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateObjectValues(value, translator);
    } else {
      result[key] = value; // Numbers, booleans, arrays, null
    }
  }
  return result;
}
```

**Rationale**:
- JSON may contain config (numbers, booleans)
- Only natural language strings need translation
- Preserves schema structure

### Output Formatting

**Decision**: Pretty-print JSON with 2-space indentation + trailing newline

```typescript
const content = JSON.stringify(data, null, 2) + '\n';
```

**Rationale**:
- Human-readable diffs in git
- Consistent with project style
- Trailing newline = POSIX compliance

## CLI Design

### Argument Parsing

**Decision**: Use Node.js built-in `parseArgs` from `util` module

**Rationale**:
- Zero dependencies
- Bun supports Node.js APIs
- Good enough for simple CLI
- No need for commander.js, yargs, etc.

### Configuration Sources

**Priority order** (highest to lowest):
1. CLI flags (`--model llama3.3`)
2. Environment variables (`OLLAMA_MODEL=llama3.3`)
3. Defaults (hardcoded: `llama3.2`)

**Implementation**:
```typescript
{
  model: options.model || process.env.OLLAMA_MODEL || 'llama3.2'
}
```

**Rationale**: Standard Unix convention (flags > env > defaults)

### Health Checks

**Decision**: Provide `--check` flag to verify Ollama setup

**Checks**:
1. Is Ollama running? (GET `/api/tags`)
2. Is model downloaded? (check response for model name)

**Rationale**:
- Debugging is hard without visibility
- Better UX than cryptic "fetch failed" errors
- Suggests next action (`ollama pull <model>`)

### Progress Tracking

**Decision**: Show progress after each batch translation

```typescript
console.log(`   Progress: ${completed}/${total} keys`);
```

**Rationale**:
- Translation can be slow (LLM inference)
- User needs feedback that it's working
- Simple counter sufficient (no fancy progress bars needed)

## Error Handling

### Connection Errors

```typescript
catch (error) {
  if (error.message.includes('fetch failed')) {
    throw new Error(`Failed to connect to Ollama at ${baseUrl}. Is Ollama running?`);
  }
  throw error;
}
```

**Rationale**: Convert network errors to actionable user messages

### Validation Errors

```typescript
if (!FORMALITY_LEVELS.includes(formality)) {
  console.error(`❌ Error: Invalid formality level: ${formality}`);
  console.error(`Valid levels: ${FORMALITY_LEVELS.join(', ')}`);
  process.exit(1);
}
```

**Rationale**:
- Fail fast with clear error
- Show valid options (user-friendly)
- Exit code 1 (script-friendly)

## Integration with Package

### Global Installation

**Decision**: Add CLI to package.json `bin` field

```json
{
  "bin": {
    "json-translate": "./tools/translate/index.ts"
  }
}
```

**Rationale**:
- Standard npm convention
- Works with `npm install -g`
- Symlinks binary to PATH

### File Distribution

**Decision**: Include `tools/` in `files` array

**Rationale**:
- CLI needs source files
- Bun can execute .ts directly
- No need to transpile

## Future Enhancements

### Considered but Deferred

1. **Streaming progress**: Could show per-token output
   - Deferred: Adds complexity, batch mode is fast enough

2. **Cloud providers**: AWS Translate, GCP Translation
   - Deferred: Privacy-first approach with Ollama is differentiated
   - Could add later as opt-in plugins

3. **Translation memory**: Cache previous translations
   - Deferred: LLMs are fast enough, adds state management
   - Could add if users translate large files repeatedly

4. **Glossary support**: Enforce specific term translations
   - Deferred: Can be added to prompts manually
   - Could add as `--glossary` flag later

5. **Batch file translation**: Translate entire directories
   - Deferred: Users can use shell loops (`for file in *.jsön`)
   - Could add `--glob` support later

## Testing Strategy

### Manual Testing

Current approach: Manual testing with real Ollama instance

**Rationale**:
- LLM API tests would be slow/flaky
- Prompts need real-world validation
- Integration test > unit test for this tool

### Future: Mock Tests

Could add unit tests for:
- File naming logic (`generateVariantFilename`)
- Response parsing (`extractTranslation`)
- Structure preservation (`translateObjectValues`)

But leave LLM calls untested (integration test territory).

## Implementation Files

- `tools/translate/index.ts` - CLI entry point
- `tools/translate/providers/ollama.ts` - Ollama provider
- `tools/translate/utils/file-output.ts` - File I/O utilities

## Success Criteria

✅ Translates JSON files to target language
✅ Preserves JSON structure (non-string values)
✅ Generates correct variant filenames
✅ Supports formality levels with language-specific guidance
✅ Works with local Ollama (privacy-friendly)
✅ Provides helpful error messages
✅ Shows progress for large files
✅ Zero external API dependencies
✅ Installable globally via npm/bun

## Example Session

```bash
$ json-translate --check
✅ Ollama is running
   Model: llama3.3
   Status: Available

$ json-translate strings.jsön --to ja --form polite
🌍 jsön-translate
📄 Source: strings.jsön
🎯 Target: ja (polite)

🔍 Checking Ollama...
✅ Ollama is ready

📖 Reading source file...
   Found 3 keys to translate

🔄 Translating...
   Progress: 3/3 keys

💾 Writing output...
✅ Translation complete!
📝 Output: strings:ja:polite.jsön
```

## Related Documentation

- `.specify/memory/variant-system-design.md` - Variant naming conventions
- `.specify/memory/variant-aware-file-loading.md` - File loader integration
- `README.md` - User-facing CLI documentation
