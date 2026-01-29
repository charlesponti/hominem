# Type Optimization Plan — Implementation Status

## ✅ Completed

### Phase 1: Single Computation Point per Domain
- Created `.types.ts` files for all major domains:
  - `packages/db/src/schema/notes.types.ts`
  - `packages/db/src/schema/finance.types.ts`
  - `packages/db/src/schema/places.types.ts`
  - `packages/db/src/schema/events.types.ts`
  - `packages/db/src/schema/lists.types.ts`
  - `packages/db/src/schema/contacts.types.ts`
  - `packages/db/src/schema/users.types.ts`
  - `packages/db/src/schema/tags.types.ts`
  - `packages/db/src/schema/goals.types.ts`

**Principle:** Each `.types.ts` file contains all derived types computed ONCE from Drizzle schemas. No re-derivation.

### Phase 2: Update db/schema/index.ts
- Changed from `export * from './notes.schema'` (expensive wildcard expansion)
- To: `export * from './notes.types'` (pre-computed, stable types)
- Added explicit package.json exports for direct schema imports:
  - `@hominem/db/schema/notes`
  - `@hominem/db/schema/finance`
  - `@hominem/db/schema/places`

### Phase 3: Update Services (Partial)
- ✅ Updated `packages/notes/src/notes.service.ts`:
  - Changed imports from deriving inline types to importing pre-computed:
    - `NoteInsert` → `NoteInput` (from `@hominem/db/schema`)
    - `Note` → `NoteOutput` (from `@hominem/db/schema`)
    - `SyncClientItem` → `NoteSyncItem` (from `@hominem/db/schema`)
  - Service now imports raw `notes` table directly from `@hominem/db/schema/notes`

---

## 🚨 Currently Broken (Type Errors)

All packages have type errors because:
1. **Changed db/schema/index.ts exports** — now only exports `.types.ts` files
2. **Old services/routes still import from `@hominem/db/schema`** expecting Drizzle types (e.g., `FinanceAccount`, `PlaidItem`)
3. **Apps import types they expect but no longer available**

### Packages with Type Errors
- `apps/finance`, `apps/notes`, `apps/rocco` (missing type imports)
- `packages/finance`, `packages/services`, `packages/events`, `packages/places` (missing type imports)
- `packages/db`, `packages/ui` (broken imports)

---

## 📋 Remaining Work (High Priority)

### 1. Fix All Service Imports (Blocking)
Each service must:
- ✅ Import pre-computed types from `@hominem/db/schema` (e.g., `FinanceAccountOutput`, `FinanceAccountInput`)
- ✅ Import raw Drizzle tables directly from `@hominem/db/schema/{domain}` (e.g., `@hominem/db/schema/finance`)
- ❌ Remove inline type derivations (Omit/Pick patterns) ← Still needed in many places

**Files to Update:**
```
packages/finance/src/
  ├── core/institutions.repository.ts
  ├── core/budget-*.service.ts
  ├── features/accounts/accounts.repository.ts
  └── finance.transactions.service.ts

packages/services/src/
  ├── bookmarks.service.ts
  ├── content-strategies.service.ts
  ├── goals.service.ts
  ├── people.service.ts
  ├── possessions.service.ts
  ├── tags.service.ts
  └── vector.service.ts

packages/places/src/
  ├── places.service.ts
  └── trips.service.ts

packages/events/src/
  └── events.service.ts

packages/lists/src/
  ├── list-crud.service.ts
  ├── list-invites.service.ts
  ├── list-queries.service.ts
  └── list-collaborators.service.ts
```

### 2. Update All Hono RPC Routes
Routes import service types and define handlers. Must:
- ✅ Import pre-computed types from `@hominem/db/schema`
- ✅ Avoid re-deriving types in route handlers

**Key Files:**
```
packages/hono-rpc/src/routes/
  ├── finance.accounts.ts
  ├── finance.transactions.ts
  ├── notes.ts
  ├── places.ts
  ├── events.ts
  ├── lists.ts
  ├── bookmarks.ts
  ├── goals.ts
  ├── tags.ts
  └── people.ts
```

### 3. Add Missing .types.ts Files
Create for remaining domains (optional, but recommended for consistency):
- activity, auth, bookmarks, calendar, career, categories, chats, company, content, documents, health, interviews, items, movies, music, possessions, skills, surveys, travel, trip_items, trips, vector-documents

---

## 🎯 Type Inference Performance Expectations

### Before Optimization
- `packages/notes/src/notes.service.ts` → 1.47-4.47s
- `packages/hono-rpc/src/app.ts` → 1.07s
- `packages/db/src/schema/index.ts` → 2.21s

### After Full Implementation
- Each service file → **<0.3s** (no re-derivation, direct type imports)
- Hono RPC routes → **<0.2-0.3s** (no massive type unions)
- DB schema index → **<0.5s** (only `.types.ts` exports, not full schema wildcard)

**Expected Total:** 3.5s → ~1s overall type-check time

---

## 🔧 Implementation Commands

### Fix Service Imports (Template)
For each service file, change:
```typescript
// OLD (expensive re-derivation)
import type { Note, NoteInsert } from '@hominem/db/schema';
type UpdateInput = Omit<Note, 'id'> & {...};

// NEW (pre-computed, stable)
import type { NoteOutput, NoteInput } from '@hominem/db/schema';
import { notes } from '@hominem/db/schema/notes';
// Use NoteOutput, NoteInput directly
```

### Verify After Changes
```bash
bunx oxlint packages/notes/src/
bunx --cwd packages/notes tsc --noEmit
bun type:audit
```

---

## 📊 Architecture Diagram

```
@hominem/db/src/schema/
├── notes.schema.ts (Drizzle table)
├── notes.types.ts (✅ NoteOutput, NoteInput computed ONCE)
├── finance.schema.ts
├── finance.types.ts (✅ FinanceAccountOutput, TransactionOutput, etc.)
└── index.ts (✅ exports .types.ts only, NOT .schema.ts)

Services
├── notes/src/notes.service.ts (✅ imports NoteOutput, NoteInput)
├── finance/src/transactions.service.ts (❌ needs update)
└── places/src/places.service.ts (❌ needs update)

Hono RPC
└── routes/ (❌ all routes need import updates)

Apps
└── notes/src/hooks.ts (❌ import errors)
```

---

## 🚀 Next Steps for Developer

1. **Fix all service imports** using the template above
2. **Update all Hono RPC route imports** to use `.types` files
3. **Run `bun type:audit`** to verify improvements
4. **Run `bunx turbo run typecheck`** to ensure no regressions
5. **Commit with message:** `refactor: implement "compute once" type architecture for < 1s inference`

---

## 📝 Design Decisions Made

✅ **Zod Schemas in .types.ts:** Yes (centralized, computed once)
✅ **Service Type Re-exports:** No (consumers import from @hominem/db/schema directly)
✅ **Raw Table Exports:** Via package.json exports (e.g., `@hominem/db/schema/notes`)
✅ **Lazy Route Loading:** No (added complexity not justified; focus on type optimization first)

---

## 🔗 References

- **Principle:** TypeScript type inference is expensive; compute once, cache forever
- **Pattern:** Barrier pattern (public types are cheap, private types are expensive)
- **Goal:** Sub-second type-checking for all files; fast IDE/LSP feedback
