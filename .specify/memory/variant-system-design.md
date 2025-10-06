# Variant System Design

## Overview

The variant system enables context-aware property resolution for internationalization (i18n), personalization, and multi-dimensional content variations.

## Core Concept

Properties can have variant-specific versions identified by suffix patterns:
- `.greeting` - Base property
- `.greeting:es` - Spanish variant
- `.greeting:ja:polite` - Japanese polite variant
- `.greeting:f` - Female gender variant
- `.greeting:es:f:formal` - Multi-dimensional variant

## Well-Known Variants

### Priority Scoring

Well-known variants receive higher priority scores to ensure predictable resolution:

1. **`lang`** - Language/locale (1000 points)
   - Pattern: `/^[a-z]{2}(-[A-Z]{2})?$/` (e.g., `es`, `en-US`, `ja`)
   - Use case: Translations, locale-specific content

2. **`gender`** - Pronoun gender (100 points)
   - Pattern: `/^[mfx]$/` (m=masculine, f=feminine, x=non-binary)
   - Use case: Gendered pronouns, personalization

3. **`form`** - Formality/honorific level (50 points)
   - Pattern: `/^(casual|informal|neutral|polite|formal|honorific)$/`
   - Use case: Respect levels in Japanese (keigo), Korean (jondaemal), German (Sie/du), Spanish (tú/usted)
   - Added in: v0.2.0

4. **Custom variants** - User-defined (10 points)
   - Pattern: Any string key not matching well-known patterns
   - Examples: `region:aws`, `theme:dark`, `tier:premium`

### Rationale for `form` Variant

**Why add formality as a well-known variant?**

Many languages have grammatical registers that require different vocabulary/grammar:

- **Japanese**:
  - Casual: だ/である
  - Polite: です/ます (keigo 敬語)
  - Formal: でございます
  - Honorific: 尊敬語/謙譲語

- **Korean**:
  - Casual: 반말 (banmal)
  - Polite: 존댓말 (jondaemal)
  - Formal/Honorific: Higher levels of 존댓말

- **German**:
  - Casual: du (informal you)
  - Formal: Sie (formal you)

- **Spanish**:
  - Casual: tú
  - Formal: usted

- **French**:
  - Casual: tu
  - Formal: vous

**Design decision**: Use `form` instead of `formality` or `register` for brevity (4 letters, pairs aesthetically with `lang`).

## Variant Resolution Algorithm

### Scoring

When resolving a property path with variant context `{ lang: 'es', gender: 'f' }`:

```typescript
// Available variants:
'.greeting' (base)
'.greeting:es' (lang=es) → 1000 points
'.greeting:es:f' (lang=es, gender=f) → 1100 points
'.greeting:fr' (lang=fr) → 0 points (no match)
```

### Tiebreaker Logic

**Problem**: When multiple variants have the same score, which should win?

**Example**:
```
Context: { lang: 'es' }

Files available:
- strings:es.jsön (lang match = 1000 points)
- strings:es:formal.jsön (lang match = 1000 points, but has extra 'form' variant)
```

**Solution**: When scores are equal, prefer the variant with **fewer extra variants** (variants present in path but not in context).

```typescript
function countExtraVariants(pathVariants, contextVariants) {
  let count = 0;
  for (const [key, value] of Object.entries(pathVariants)) {
    const contextValue = contextVariants[key];
    // Count if variant is:
    // 1. Not in context (undefined)
    // 2. Mismatched value
    if (contextValue === undefined || contextValue !== value) {
      count++;
    }
  }
  return count;
}
```

**Sort priority**:
1. Primary: Score (descending - higher is better)
2. Tiebreaker: Extra variants count (ascending - lower is better)

This ensures:
- `strings:es` beats `strings:es:formal` when only requesting `{ lang: 'es' }`
- `strings:es:formal` wins when requesting `{ lang: 'es', form: 'formal' }`

## Variant Context

### Setting Context

```typescript
const data = dotted(schema, {
  variants: {
    lang: 'ja',
    gender: 'f',
    form: 'polite'
  }
});
```

### Context Inheritance

Variant context flows through:
- Property resolution (`.greeting:ja` matches when `lang: 'ja'`)
- File loader (loads `strings:ja:polite.jsön`)
- Expression evaluation (available as `this.variants`)

## Pronoun Helpers

Special placeholders for automatic gender-aware pronoun resolution:

```typescript
'${:subject}'    // he/she/they
'${:object}'     // him/her/them
'${:possessive}' // his/her/their
'${:reflexive}'  // himself/herself/themselves
```

Resolved based on `gender` variant in context.

## File Naming Convention

Files use colon-separated variant suffixes:

```
strings.jsön                  # Base
strings:es.jsön              # lang=es
strings:es:formal.jsön       # lang=es, form=formal
strings:ja:polite.jsön       # lang=ja, form=polite
profile:f.jsön               # gender=f
app:aws:premium.jsön         # region=aws, tier=premium (custom)
```

**Order independence**: `strings:es:f.jsön` ≡ `strings:f:es.jsön` (same resolution, same cache key after sorting)

## Implementation Files

- `src/types.ts` - `VariantContext` interface
- `src/variant-resolver.ts` - Scoring and tiebreaker logic
- `src/loaders/file.ts` - File variant resolution
- `test/unit/variants.test.ts` - Variant resolution tests

## Future Considerations

### Potential Well-Known Variants

Could add in future versions (if patterns emerge):
- `region` - Geographic region (e.g., `us`, `eu`, `apac`)
- `theme` - UI theme (e.g., `light`, `dark`, `high-contrast`)
- `platform` - Platform-specific (e.g., `ios`, `android`, `web`)

### Migration Path

Adding new well-known variants is **non-breaking** as long as:
1. Pattern is specific enough to not match existing custom variants
2. Scoring doesn't disrupt existing resolution order
3. Documentation updated with new variant

## Examples

### Multi-Dimensional Resolution

```typescript
const messages = dotted({
  '.welcome': 'Welcome',
  '.welcome:es': 'Bienvenido',
  '.welcome:es:f': 'Bienvenida',
  '.welcome:es:f:formal': 'Le damos la bienvenida',
  '.welcome:ja:polite': 'いらっしゃいませ'
}, {
  variants: { lang: 'es', gender: 'f', form: 'formal' }
});

// Resolves to: '.welcome:es:f:formal' (1150 points: 1000 + 100 + 50)
console.log(messages.welcome); // "Le damos la bienvenida"
```

### Tiebreaker Example

```typescript
// Context: { lang: 'es' } - no formality specified
const data = dotted({
  '.greeting:es': 'Hola',           // 1000 points, 0 extra
  '.greeting:es:formal': 'Buenos días'  // 1000 points, 1 extra
});

// Result: 'Hola' (fewer extra variants wins tiebreaker)
```

## Design Principles

1. **Predictable**: Well-known variants have fixed scoring
2. **Extensible**: Custom variants supported for domain-specific needs
3. **Exact match preferred**: More specific matches score higher
4. **Graceful fallback**: Missing variants fall back to base or closest match
5. **Order-independent**: `a:b:c` ≡ `c:b:a` in resolution
6. **Culturally aware**: Formality levels respect language-specific registers

## Related Documentation

- `.specify/memory/variant-aware-file-loading.md` - File loader implementation
- `README.md` - User-facing variant documentation
- `test/unit/variants.test.ts` - Variant behavior tests
