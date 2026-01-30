## Research Findings

### Barrel Import Usage (bg_67df594a)
Complete list of files still using '@hominem/db/schema' barrel import:

**apps/** (4 files)
- apps/notes/app/components/goals/goal-card.tsx (GoalMilestone)
- apps/notes/app/lib/types/chat.ts (ChatMessageToolCall)
- apps/notes/app/routes/content-strategy/*.tsx (ContentStrategy)
- apps/rocco/scripts/debug-check-photos.ts, app/lib/*.ts (Places)

**services/** (5 files)
- services/api/src/routes/possessions.ts (PossessionOutput)
- services/api/src/types/hono.d.ts (User)
- services/workers/src/plaid*.ts (Finance types)

**packages/** (~45 files)
- packages/services/src/* (15 files - various domains)
- packages/lists/src/* (7 files)
- packages/finance/src/* (8 files)
- packages/notes/src/* (4 files)
- packages/places/src/* (3 files)
- packages/hono-rpc/src/routes/* (4 files)
- packages/invites/src/index.ts (1 file)

**Wildcard import found:**
- packages/services/src/test-utils/db-transaction.ts uses `import * as schema`

### Drizzle-Zod Usage (bg_46c63335)
**Current definitions:**
1. Career domain: schemas in SERVICE files (job.service.ts, job-application.service.ts)
2. Finance domain: DUPLICATED in finance.validation.ts AND finance.types.ts
3. Users domain: in users.validation.ts

**Recommendation:**
- Keep zod schemas in *.validation.ts files (NOT in .types.ts or .schema.ts)
- Move career zod schemas out of service files into career.validation.ts
- Remove duplicate zod schemas from finance.types.ts (keep in finance.validation.ts)

### Cross-Domain Dependencies (bg_e7d6b3f4)
**No circular dependencies detected!** ✅

**Foundation schemas (no deps):**
- users, company, shared, health, activity

**Critical dependency chains:**
- company → career → interviews, skills
- lists → items → places
- trips + items → trip_items
- ALL → calendar (most downstream: depends on places, tags, contacts, finance, users)

**Safe migration order:**
1. users, company, shared (foundation)
2. User-dependent: auth, bookmarks, categories, chats, contacts, content, docs, finance, goals, lists, notes, tags, trips
3. Career (after company+users)
4. Items/travel (after lists+users)
5. Places (after items+tags)
6. Trip_items (after trips+items)
7. Calendar (after places+tags+contacts+finance+users)


## Batch 5: Travel, Lists & Places (COMPLETE)

### Files Migrated (18 total)

**packages/lists/src/** (9 files):
1. ✅ index.ts - re-exports only (no barrel imports)
2. ✅ types.ts - `import type { ListOutput as DbListOutput } from '@hominem/db/types/lists'`
3. ✅ list-crud.service.ts - `import { list } from '@hominem/db/schema/lists'`
4. ✅ list-queries.service.ts - split barrel into: items, lists, places, users
5. ✅ list-items.service.ts - split barrel into: items, lists, places, users
6. ✅ list-collaborators.service.ts - `import { list, listInvite, userLists } from '@hominem/db/schema/lists'`
7. ✅ list-invites.service.ts - split barrel into: lists, users; separate type imports
8. ✅ tools.ts - AI tool definitions (no barrel imports)
9. ✅ lists.service.test.ts - split into items, lists, users

**packages/places/src/** (9 files):
1. ✅ index.ts - re-export PlaceOutput, PlaceInput from `@hominem/db/types/places`
2. ✅ places.service.ts - split barrel into: items, lists, places; separate type imports
3. ✅ trips.service.ts - split into: trips, trip_items (separate modules!); types separate
4. ✅ flights.service.ts - no barrel imports (Zod schemas only)
5. ✅ place-cache.ts - no barrel imports (pure utility class)
6. ✅ place-images.service.ts - no barrel imports (image processing)
7. ✅ flights.tool-def.ts - tool definition (no barrel imports)
8. ✅ places.service.test.ts - `import type { PlaceInsert } from '@hominem/db/types/places'`
9. ✅ place-images.service.test.ts - no barrel imports

### Key Patterns Applied

1. **Type imports always separate**: `import type { ... } from '@hominem/db/types/{domain}'`
2. **Runtime values split by domain**: `import { table } from '@hominem/db/schema/{domain}'`
3. **Cross-domain imports work fine**: When tables have relationships (list→item→place, trips→items, etc.)
4. **Trip-related issue discovered**: 
   - `tripItems` table is in SEPARATE schema file `trip_items.schema.ts` (not `trips.schema.ts`)
   - Types are in `trip_items.types.ts` (not `trips.types.ts`)
   - This is correct design: junction tables get their own module
5. **Users always comes from users schema**: Never mixed with lists/items/places

### Critical Learning

**Junction Tables & Split Modules:**
- trip_items is a junction table connecting trips and items
- It has its OWN schema file and types file
- This pattern should be followed: `trip_items` imports → `@hominem/db/schema/trip_items`, `@hominem/db/types/trip_items`
- Not co-located with either parent table

### Final Verification
```bash
bun run typecheck
# Result: 41/41 packages pass ✅
# Time: 30.605s
# Cache hits: 27 cached items
```

Zero TypeScript errors after migration.
