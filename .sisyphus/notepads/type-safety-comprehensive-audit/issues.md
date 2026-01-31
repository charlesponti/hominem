## [2026-01-31 14:00] Discovered: CLI package has noUncheckedIndexedAccess errors

### Issue
The `@hominem/cli` package was not initially checked during Task 1 work. After fixing @hominem/hono-rpc, discovered 11 type errors in CLI package from `noUncheckedIndexedAccess: true`.

### Errors Found
- src/commands/ai/ask.ts - `thinking` and `answer` possibly undefined
- src/commands/convert/typingmind-to-openai.ts - Object possibly undefined (2 errors)
- src/commands/csv-to-json.ts - `string | undefined` not assignable to `string`
- src/uniqlo/scrape.stagehand.ts - Object possibly undefined (3 errors)
- src/uniqlo/scrape.ts - Object possibly undefined (3 errors)

### Root Cause
`noUncheckedIndexedAccess` makes array/object index access return `T | undefined` instead of just `T`. This catches potential runtime errors where accessing an index might return undefined.

### Fix Pattern
```typescript
// ❌ Before
const item = array[0];
item.property; // ERROR: item possibly undefined

// ✅ After - Option 1: Optional chaining
const item = array[0];
item?.property;

// ✅ After - Option 2: Guard clause
const item = array[0];
if (!item) return;
item.property;

// ✅ After - Option 3: Non-null assertion (only if guaranteed)
const item = array[0]!;
item.property;
```
