---
description: Validate i18n completeness by comparing base files with translations and checking variant consistency
---

# MANDATORY PREREQUISITES

You MUST complete ALL of these before proceeding:

1. **Specialist Auto-Loading**:
   - Load `.specify/agents/i18n-specialist.md` for i18n expertise

2. **Project Context**:
   - Understand variant file naming convention (`:` separator)
   - Know well-known dimensions (`lang`, `gender`, `form`)

---

## User Input

Base file or directory: $ARGUMENTS

Examples:
- `/validate-i18n locales/strings.jsön` - Validate specific file
- `/validate-i18n locales/` - Validate all files in directory
- `/validate-i18n` - Validate all i18n files in project

---

## Validation Process

### Step 1: Discover i18n Files

**1.1: Find Base Files**

If directory provided:
```bash
find [directory] -name "*.jsön" ! -name "*:*"
```

This finds base files (no variant suffix):
- `strings.jsön` ✅ (base)
- `strings:es.jsön` ❌ (skip, is variant)
- `config.jsön` ✅ (base)

If file provided:
- Use as base file
- Extract base name (remove variants)

If no argument:
```bash
find . -name "*.jsön" ! -name "*:*" -not -path "*/node_modules/*"
```

**1.2: Find Variant Files**

For each base file `basename.jsön`:
```bash
find [directory] -name "basename:*.jsön"
```

Examples:
- Base: `strings.jsön`
- Variants:
  - `strings:es.jsön`
  - `strings:es:formal.jsön`
  - `strings:ja.jsön`
  - `strings:ja:polite.jsön`

**1.3: Parse Variant Dimensions**

For each variant file, extract dimensions from filename:

```
strings:es:formal:f.jsön
       └─┬─┘ └──┬──┘ │
       lang   form  gender
```

Create map:
```typescript
{
  'strings:es.jsön': { lang: 'es' },
  'strings:es:formal.jsön': { lang: 'es', form: 'formal' },
  'strings:es:formal:f.jsön': { lang: 'es', form: 'formal', gender: 'f' }
}
```

### Step 2: Read File Contents

**2.1: Load All Files**

For base file and all variants:
```bash
cat [filepath]
```

Parse JSON content.

**2.2: Extract Keys**

For each file, extract all keys:
- Top-level properties
- Include both regular keys and expression keys (`.prefix`)

Example:
```json
{
  "greeting": "Hello",
  ".farewell": "Goodbye, ${name}",
  "user": {
    "name": "Alice"
  }
}
```

Keys:
- `greeting`
- `.farewell`
- `user`
- `user.name` (nested)

**2.3: Build Key Registry**

Create registry of all unique keys across all files:

```typescript
{
  baseFile: 'strings.jsön',
  keys: {
    'greeting': {
      base: true,
      variants: {
        'es': true,
        'es:formal': true,
        'ja': false  // MISSING
      }
    },
    '.farewell': {
      base: true,
      variants: {
        'es': true,
        'es:formal': false,  // MISSING
        'ja': true
      }
    }
  }
}
```

### Step 3: Validate Completeness

**3.1: Check Missing Translations**

For each key in base file:
- Is it present in ALL variant files?
- If missing, is it intentional or oversight?

**Missing Key Detection**:
```typescript
const missingKeys = [];

for (const key of baseKeys) {
  for (const variantFile of variantFiles) {
    if (!variantFile.hasKey(key)) {
      missingKeys.push({
        key,
        variant: variantFile.name,
        severity: 'error'
      });
    }
  }
}
```

**3.2: Check Extra Keys**

Variant files should NOT have keys missing from base:

```typescript
const extraKeys = [];

for (const variantFile of variantFiles) {
  for (const key of variantFile.keys) {
    if (!baseFile.hasKey(key)) {
      extraKeys.push({
        key,
        variant: variantFile.name,
        severity: 'warning'  // May indicate refactoring oversight
      });
    }
  }
}
```

**3.3: Check Variant Consistency**

For variant-specific keys (e.g., `.title:es:f`):
- Does base file have `.title`?
- Are all variant combinations covered?
- Are there orphaned variants?

Example issue:
```json
// Base file
{
  ".title": "Author",
  ".title:es": "Autor"
  // Missing: .title:es:f (but we have .title:es:m)
}
```

### Step 4: Validate Value Types

**4.1: Type Consistency Check**

For each key, verify types match across variants:

```typescript
// Base
{ "count": 42 }

// Variant (ERROR - type mismatch)
{ "count": "42" }  // String instead of number
```

**4.2: Expression Consistency**

For expression keys (`.prefix`):
- Verify expressions are valid
- Check referenced variables exist
- Ensure expressions make sense for locale

```json
// Base
{ ".greeting": "Hello, ${user.name}!" }

// Variant (WARNING - different structure)
{ ".greeting": "Hola!" }  // Doesn't use ${user.name}
```

**4.3: Placeholder Consistency**

For template strings with placeholders:
- Same placeholders across variants?
- No missing/extra placeholders?

```json
// Base
{ "welcome": "Welcome, {name}!" }

// Variant (ERROR - missing placeholder)
{ "welcome": "Bienvenido!" }  // {name} missing
```

### Step 5: Validate Variant Hierarchy

**5.1: Check Hierarchical Coverage**

Variants should follow hierarchical specificity:

```
strings.jsön              (base - most generic)
  ├─ strings:es.jsön      (Spanish general)
  │   ├─ strings:es:formal.jsön    (Spanish formal)
  │   └─ strings:es:informal.jsön  (Spanish informal)
  └─ strings:ja.jsön      (Japanese general)
      ├─ strings:ja:polite.jsön    (Japanese polite)
      └─ strings:ja:casual.jsön    (Japanese casual)
```

**Issues**:
- ❌ `strings:es:formal.jsön` exists but `strings:es.jsön` doesn't
- ❌ Gaps in hierarchy

**5.2: Check Well-Known Dimensions**

Validate dimension names:
- `lang` - Language code (ISO 639-1: en, es, ja, etc.)
- `gender` - Gender (m, f, n)
- `form` - Formality (formal, informal, polite, casual)

**Warnings for custom dimensions**:
- `strings:es:mexico.jsön` - Is `mexico` a valid dimension?
- Should it be `lang:es` + `region:mx`?

### Step 6: Generate Validation Report

Create comprehensive report:

```markdown
# i18n Validation Report

## Summary

- **Base Files**: [count]
- **Variant Files**: [count]
- **Languages**: [list]
- **Total Keys**: [count]
- **Issues Found**: [count]

## Issues

### 🔴 Missing Translations ([count])

Translations missing from variant files:

**strings:es.jsön**:
- `greeting` - Missing translation (present in base)
- `farewell` - Missing translation (present in base)

**strings:ja.jsön**:
- `welcome.title` - Missing translation (present in base)

### 🟡 Extra Keys ([count])

Keys in variants not present in base:

**strings:es.jsön**:
- `extra.key` - Not in base file (possible orphan)

### 🟡 Type Mismatches ([count])

Value types differ between base and variants:

**strings:es.jsön**:
- `count`: Expected `number`, got `string`

### 🟡 Expression Inconsistencies ([count])

Expression structure differs from base:

**strings:es.jsön**:
- `.greeting`: Base uses `${user.name}`, variant doesn't

### 🟡 Placeholder Mismatches ([count])

Template placeholders missing or extra:

**strings:ja.jsön**:
- `welcome`: Missing placeholder `{name}`

### 🟡 Hierarchy Gaps ([count])

Variant hierarchy has missing levels:

- `strings:es:formal.jsön` exists but `strings:es.jsön` is missing
  - Suggestion: Create `strings:es.jsön` as intermediate level

### ⚠️ Dimension Warnings ([count])

Unusual or non-standard dimension names:

- `strings:es:mexico.jsön` - `mexico` is not a well-known dimension
  - Did you mean: `strings:es.jsön` + region metadata?

## Files Analyzed

### Base Files
- `locales/strings.jsön` ([XX] keys)
- `locales/config.jsön` ([XX] keys)

### Variant Files

**strings.jsön variants**:
- `strings:es.jsön` (lang: es) - [XX] keys
- `strings:es:formal.jsön` (lang: es, form: formal) - [XX] keys
- `strings:ja.jsön` (lang: ja) - [XX] keys

**config.jsön variants**:
- `config:production.jsön` - [XX] keys

## Coverage Statistics

| Base File | Variant | Coverage | Missing |
|-----------|---------|----------|---------|
| strings.jsön | es | 95% | 2/40 keys |
| strings.jsön | es:formal | 90% | 4/40 keys |
| strings.jsön | ja | 100% | 0/40 keys |
| config.jsön | production | 100% | 0/15 keys |

## Recommendations

### High Priority

1. **Add missing translations**:
   ```bash
   # strings:es.jsön
   Add keys: greeting, farewell
   ```

2. **Fix type mismatches**:
   ```json
   // strings:es.jsön - line 42
   - "count": "42"
   + "count": 42
   ```

### Medium Priority

3. **Remove orphaned keys**:
   - Review `extra.key` in strings:es.jsön

4. **Standardize expressions**:
   - Align `.greeting` in strings:es.jsön with base template

### Low Priority

5. **Consider hierarchy**:
   - Add `strings:es.jsön` for better fallback chain

## Next Steps

[If issues found]:
1. Review missing translations (high priority)
2. Fix type mismatches (high priority)
3. Clean up extra keys (medium priority)
4. Validate translations with native speakers

[If all good]:
✅ All i18n files are complete and consistent!
```

### Step 7: STOP and Report

**DO NOT**:
- Modify translation files
- Generate translations automatically
- Delete "extra" keys
- Make git commits

**DO**:
- Generate comprehensive validation report
- Identify all issues (errors, warnings, suggestions)
- Provide actionable recommendations
- Report coverage statistics

---

## Validation Rules

### Critical Issues (🔴 Errors)

**Must Fix Before Production**:
- Missing translations in production variants
- Type mismatches (string vs number)
- Missing required placeholders
- Invalid JSON syntax

### Warnings (🟡 Warnings)

**Should Review**:
- Extra keys in variants
- Expression structure differences
- Hierarchy gaps
- Non-standard dimension names

### Suggestions (⚠️ Info)

**Nice to Have**:
- Variant coverage statistics
- Dimension usage patterns
- File organization suggestions

---

## Special Validation Cases

### Pronoun Placeholders

Validate gender-aware pronouns:

```json
// Base
{ "bio": "{he/she/they} is a developer" }

// Variants should maintain placeholders
{ "bio": "{él/ella/elle} es desarrollador{/a/e}" }
```

### Nested Objects

Validate nested structure consistency:

```json
// Base
{
  "user": {
    "profile": {
      "name": "Name",
      "age": "Age"
    }
  }
}

// Variant must have same structure
{
  "user": {
    "profile": {
      "name": "Nombre",
      "age": "Edad"
    }
  }
}
```

### Expression Variables

Ensure referenced variables exist:

```json
// Base
{
  "user": { "name": "Alice" },
  ".greeting": "Hello, ${user.name}!"
}

// Variant (ERROR - references non-existent variable)
{
  "user": { "name": "Alice" },
  ".greeting": "Hola, ${person.name}!"  // person doesn't exist
}
```

---

## CONSTRAINTS (Strictly Enforced)

❌ **FORBIDDEN**:
- Modifying translation files
- Auto-generating translations (use `/translate-batch` instead)
- Deleting keys without confirmation
- Making git commits
- Running translation services

✅ **ALLOWED**:
- Reading all variant files
- Analyzing key consistency
- Detecting missing translations
- Validating file structure
- Generating reports

---

## Example Usage

```bash
# Validate specific file and its variants
/validate-i18n locales/strings.jsön

# Validate all files in directory
/validate-i18n locales/

# Validate entire project
/validate-i18n
```

---

## Integration with Workflow

This command fits in the i18n workflow:

```
[Create base file]
  ↓
[Create variant files]
  ↓
/validate-i18n  ← YOU ARE HERE (check completeness)
  ↓
[Fix issues]
  ↓
/translate-batch (if using translation tool)
  ↓
/validate-i18n (verify translations)
```

---

## Success Criteria

Successful validation identifies:
- ✅ All missing translations
- ✅ All type mismatches
- ✅ All placeholder inconsistencies
- ✅ All hierarchy gaps
- ✅ All extra/orphaned keys
- ✅ Coverage statistics
- ✅ Actionable recommendations

And provides:
- ✅ Clear severity levels (errors vs warnings)
- ✅ File and line number references
- ✅ Specific fix suggestions
- ✅ Coverage metrics
