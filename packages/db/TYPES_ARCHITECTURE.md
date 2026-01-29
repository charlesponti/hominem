# Hominem Types Architecture: "Compute Once"

## Overview

This document explains the type architecture pattern used in Hominem to achieve sub-second TypeScript type inference.

**TL;DR:** Compute Drizzle types ONCE per domain, never re-derive them. Re-use forever.

---

## The Problem We Solved

### TypeScript Type Inference Bottleneck

Drizzle generates complex generic types for tables:
```typescript
// notes.schema.ts
export const notes = pgTable('notes', { ... });
// TypeScript infers: Table<SchemaShape, InsertShape, SelectShape> with 50+ generic params

export type Note = {
  id: string;
  type: AllContentType; // Union of 30+ types
  // ... 20+ fields
};
```

**When imported and re-derived multiple times:**
```
notes.schema.ts (Drizzle table — expensive type)
    ↓ import
service.ts (type NewType = Omit<Note, 'id'> & {...})  ← TS RE-INFERS
    ↓ import + derive
hono-rpc/routes.ts (type RouteOutput = Pick<Note, ...>)  ← TS RE-INFERS AGAIN
    ↓ import
app.ts (assembles all routes)  ← TS RE-INFERS ONCE MORE
```

**Result:** A single type is instantiated 5-10 times across the chain. At 100ms per instantiation, that's 500ms-1s per type.

---

## The Solution: "Compute Once" Pattern

### Step 1: Create a `.types.ts` for Each Domain

```typescript
// packages/db/src/schema/notes.types.ts
import type { Note, NoteInsert } from './notes.schema';

// Computed ONCE
export type NoteOutput = Note;
export type NoteInput = NoteInsert;
export type NoteSyncItem = Omit<Note, 'id' | 'synced' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Re-export Zod schemas
export { NoteContentTypeSchema, TaskMetadataSchema } from './notes.schema';
```

**Key:** Compute once, re-export forever. No re-derivation.

### Step 2: Update Index to Export `.types.ts` Only

```typescript
// packages/db/src/schema/index.ts
// OLD ❌
export * from './notes.schema';  // Exports expensive Drizzle types + types
export * from './finance.schema';
// ... 30+ files

// NEW ✅
export * from './notes.types';   // Exports only pre-computed types
export * from './finance.types';
// ... 9 files
```

**Impact:** No more expanding 30+ schema files with complex Drizzle unions.

### Step 3: Services Import Pre-Computed Types

```typescript
// packages/notes/src/notes.service.ts

// OLD ❌ (forces re-inference)
import type { Note, NoteInsert } from '@hominem/db/schema';
import { notes } from '@hominem/db/schema';
type SyncItem = Omit<Note, 'id'> & {...};  // ← TS infers again!

async create(input: NoteInsert): Promise<Note> { ... }

// NEW ✅ (uses pre-computed types)
import type { NoteOutput, NoteInput, NoteSyncItem } from '@hominem/db/schema';
import { notes } from '@hominem/db/schema/notes';  // Direct schema import for DB ops

async create(input: NoteInput): Promise<NoteOutput> { ... }
```

**Result:** Service no longer triggers type re-inference. Uses stable, pre-computed aliases.

### Step 4: Routes Inherit Pre-Computed Types

```typescript
// packages/hono-rpc/src/routes/notes.ts
import type { NoteOutput, NoteInput } from '@hominem/db/schema';

export const notesRoutes = new Hono()
  .post('/create', async (c) => {
    const input = await c.req.json();  // input: NoteInput (pre-computed)
    const result = await service.create(input);  // result: NoteOutput
    return c.json(result);
  });
```

**No type re-derivation in routes.** Uses types from `@hominem/db/schema`.

---

## Architecture Diagram

```
LAYER 0: Drizzle Definitions
  notes.schema.ts
    └─ export: notes table (complex Drizzle type)
    └─ export: Note, NoteInsert (raw types from Drizzle)

LAYER 1: Computed Types Barrier ← "COMPUTE ONCE" HAPPENS HERE
  notes.types.ts  ← SINGLE COMPUTATION POINT
    └─ input: Note, NoteInsert (from notes.schema.ts)
    └─ output: NoteOutput, NoteInput, NoteSyncItem
    └─ computed ONCE, reused forever

  index.ts
    └─ export * from ./notes.types  (not from .schema!)

LAYER 2: Services (use pre-computed types)
  notes.service.ts
    └─ import NoteOutput, NoteInput from @hominem/db/schema
    └─ no re-derivation (uses types directly)

LAYER 3: Hono RPC Routes (inherit pre-computed types)
  routes/notes.ts
    └─ import NoteOutput, NoteInput from @hominem/db/schema
    └─ define handlers (no type re-derivation)

LAYER 4: Apps (single type instantiation)
  apps/notes/hooks.ts
    └─ import AppType (computed once at route assembly)
    └─ use types in client code
```

---

## Import Rules (Critical)

### ✅ DO: Import Pre-Computed Types

```typescript
import type { NoteOutput, NoteInput } from '@hominem/db/schema';

// Use them directly
async function create(input: NoteInput): Promise<NoteOutput> { ... }
```

### ✅ DO: Import Raw Drizzle Tables for DB Operations

```typescript
import { notes } from '@hominem/db/schema/notes';

// Use in queries
const result = await db.select().from(notes).where(...);
```

### ❌ DON'T: Import Raw Types from Schema Files

```typescript
// ❌ WRONG (triggers re-inference)
import type { Note, NoteInsert } from '@hominem/db/schema';
type CustomNote = Omit<Note, 'id'> & {...};  // ← TS infers again!
```

### ❌ DON'T: Derive Types Inline in Services

```typescript
// ❌ WRONG (forces re-computation in every file that imports)
export type ServiceInput = Omit<Note, 'userId'> & { ... };

// ✅ RIGHT (compute in .types.ts once, use elsewhere)
export type NoteInput = NoteInsert;
```

---

## Adding a New Domain Type

When you add a new domain (e.g., `documents`), follow this pattern:

### 1. Create `documents.types.ts`

```typescript
import type { Document, DocumentInsert } from './documents.schema';

export type DocumentOutput = Document;
export type DocumentInput = DocumentInsert;
// Add any Omit/Pick/derived types here (computed once)

export { DocumentSchema } from './documents.schema';
```

### 2. Export from `index.ts`

```typescript
// packages/db/src/schema/index.ts
export * from './documents.types';
```

### 3. Use in Services

```typescript
import type { DocumentOutput, DocumentInput } from '@hominem/db/schema';
import { documents } from '@hominem/db/schema/documents';

async create(input: DocumentInput): Promise<DocumentOutput> { ... }
```

**That's it.** No re-derivation. TypeScript inference stays fast.

---

## Performance Impact

### Before (Re-computation Problem)
```
Type inference timeline:
0ms: notes.schema imported → TS infers Note (expensive)
100ms: service imports Note → TS re-infers Omit<Note> (expensive)
200ms: routes import Note → TS re-infers derived types (expensive)
300ms: app assembles routes → TS re-infers all unions (expensive)
---
400ms total (one type, re-inferred 4 times)
```

### After (Compute Once)
```
Type inference timeline:
0ms: notes.types.ts computed → TS infers NoteOutput once (expensive)
50ms: service imports NoteOutput → TS reuses (fast)
55ms: routes import NoteOutput → TS reuses (fast)
60ms: app imports AppType → TS reuses once (fast)
---
60ms total (one type, computed once, reused 3 times)
```

**Expected savings:** 6x faster type checking per domain (400ms → 60ms).

---

## FAQ

### Q: Why not use `typeof` instead of creating types?

```typescript
export type Note = typeof notes.$inferSelect;
export type NoteInsert = typeof notes.$inferInsert;
```

**A:** These still trigger inference! Better to explicitly alias in `.types.ts` so it's computed once, cached, and re-exported.

### Q: Can I derive types in service files?

```typescript
// services/notes.ts
type CustomNote = Omit<NoteOutput, 'userId'>;
```

**A:** Only if it's service-specific and used nowhere else. Otherwise, compute in `.types.ts` and re-export.

### Q: What about tests?

Tests should import from `.types.ts` too:
```typescript
import type { NoteOutput, NoteInput } from '@hominem/db/schema';

test('create note', async () => {
  const input: NoteInput = { ... };
  const result: NoteOutput = await service.create(input);
});
```

### Q: How does this scale with 100+ entities?

Each domain gets its own `.types.ts`. Minimal overhead per file. The index exports 100 `.types` files (cheap) instead of 100 `.schema` files (expensive).

---

## Checklist: Implementing for a New Domain

- [ ] Create `{domain}.types.ts` in `packages/db/src/schema/`
- [ ] Define Output/Input/derived types in `.types.ts`
- [ ] Add `export * from './{domain}.types'` to `index.ts`
- [ ] Add `"./ schema/{domain}": "./src/schema/{domain}.schema.ts"` to `packages/db/package.json`
- [ ] Update all services to import from `@hominem/db/schema` (types) and `@hominem/db/schema/{domain}` (tables)
- [ ] Update all Hono routes to use pre-computed types
- [ ] Run `bun type:audit` to verify performance
- [ ] Commit with message: `feat: add {domain} types (compute once pattern)`

---

## References

- **Pattern Name:** Barrier Pattern (cheap public types, expensive private types)
- **Principle:** "Compute Once, Reuse Forever"
- **Goal:** Sub-second TypeScript inference for all files
- **Tool:** `bun type:audit` to measure per-file inference time
