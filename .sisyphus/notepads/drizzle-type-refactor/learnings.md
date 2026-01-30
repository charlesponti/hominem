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

