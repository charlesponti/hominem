# Drizzle Type Import Refactor - Standardizing @hominem/db Imports

## TL;DR

> **Quick Summary**: Standardize database imports across the monorepo by replacing the barrel import `@hominem/db/schema` with domain-specific paths. This improves TypeScript compilation speed and bundle size by ensuring types are computed once in `.types.ts` files and reused everywhere.
> 
> **Deliverables**: 
> - Finalized `packages/db/package.json` exports with wildcards
> - All ~50 files updated to use specific schema/type imports
> - 2 new `.types.ts` files created (`trips.types.ts`, `trip_items.types.ts`)
> - Type performance tracked across all batches (via `type-audit`)
> 
> **Estimated Effort**: Large (11 batches × 5-50 files per batch)
> **Parallel Execution**: YES - Batches 1-11 can overlap slightly after initial Batch 1 verification
> **Critical Path**: Batch 1 (core identity) → Batch 5 (travel/lists) → Final typecheck + type-audit

---

## Context

### Original Request
Standardize database imports across the monorepo to improve TypeScript performance. Replace barrel imports from `@hominem/db/schema` with specific paths:
- Runtime values: `@hominem/db/schema/[domain]`
- Types: `@hominem/db/types/[domain]`

### Interview Summary
**Key Discussions**:
- Test strategy: **Tests after** (not TDD) - run full suite after all batches complete
- Batch strategy: **By schema domain** - 11 clusters with logical grouping
- Verification: **TypeScript performance tracking** - run `type-audit` after each batch and store metrics
- Type safety: Use explicit casting (`as Output`) in services, not rely on barrel inference

**Research Findings**:
- 11 schema domain clusters identified with minimal cross-domain dependencies
- ~50 files across `packages/`, `services/`, and `apps/` still use barrel imports
- `type-audit` produces JSON reports suitable for tracking `durationSec`, `checkMs`, `instantiations`
- Missing `.types.ts` files: `trips.types.ts`, `trip_items.types.ts`
- Widespread unsafe casts like `as unknown as Promise<T>` should be replaced with guarded patterns

---

## Work Objectives

### Core Objective
Systematically migrate all database imports from the barrel `@hominem/db/schema` to domain-specific paths, ensuring TypeScript compilation stays under performance budget (< 1s per package) and all types are computed once and reused.

### Concrete Deliverables
- ✅ Finalized `packages/db/package.json` with wildcard exports (already partially done)
- ✅ All files updated to specific imports: `@hominem/db/schema/[domain]` and `@hominem/db/types/[domain]`
- ✅ New `.types.ts` files created: `trips.types.ts`, `trip_items.types.ts`
- ✅ Type performance metrics saved to `.sisyphus/metrics/type-audit-{batch}.json` after each batch
- ✅ Final full typecheck and type-audit run passing with no regressions

### Definition of Done
- [ ] All 11 batches completed and merged
- [ ] `bun run typecheck` passes with no errors across monorepo
- [ ] `bun run type-audit` shows no performance regressions or flags slowness
- [ ] All type metrics tracked in `.sisyphus/metrics/` directory
- [ ] Existing tests pass (`bun run test --force`)

### Must Have
- All barrel imports replaced with specific paths
- Type inference depth reduced (verified by `type-audit`)
- No circular import issues introduced
- Cross-domain dependencies preserved and tested

### Must NOT Have (Guardrails)
- ❌ No schema definition changes (only import/export changes)
- ❌ No changes to database logic or service implementations (only imports)
- ❌ No removal of backward compatibility in `packages/db/index.ts` barrel exports
- ❌ No unsafe `as unknown as T` casts introduced (use guarded casts only)
- ❌ No incomplete migrations (each batch must be fully committed)

---

## Verification Strategy

### Test Infrastructure
- **Framework**: Vitest 4.0.16 (already set up across monorepo)
- **Strategy**: **Tests After** (not TDD)
  - Implementation tasks: Update imports across all batches
  - After completion: Run full test suite to verify no regressions
  - Command: `bun run test --force`

### Type Performance Tracking (Automated)

Each batch ends with:
1. `bun run typecheck` - Verify no type errors
2. `bun run type-perf:audit --json` - Capture metrics to `.sisyphus/metrics/type-audit-batch-{N}.json`
3. Compare with previous batch to detect regressions

**Metrics captured**:
- Per-package `durationSec` (target: < 1s)
- Per-file `checkMs` and `instantiations` (identify hot spots)
- `topSlowFiles` list (watch for regressions)
- `summary` totals (trending)

**Acceptance criteria for each batch**:
- [ ] No type errors from `bun run typecheck`
- [ ] No performance regression vs previous batch (or within 5% threshold)
- [ ] All slow files identified from `type-audit` have explanatory notes
- [ ] Metrics saved to `.sisyphus/metrics/type-audit-batch-{N}.json`

### Final Verification (After All Batches)

**Command**: 
```bash
bun run typecheck && bun run type-audit --json .sisyphus/metrics/final-type-audit.json && bun run test --force
```

**Evidence**:
- [ ] `typecheck` passes (no output)
- [ ] `type-audit` JSON saved with full metrics
- [ ] All tests pass
- [ ] Compare final metrics to baseline (first batch)

---

## Execution Strategy

### Batch Ordering (Dependency-Based)

```
Batch 1: Core identity        [FOUNDATION - must complete first]
  ↓
Batches 2-4: Taxonomy + Career [Can run parallel after 1]
  ↓
Batch 5: Travel/Lists          [Depends on 1 for users]
Batch 6: Finance               [Depends on 1 for users]
  ↓
Batches 7-11: Remaining        [Can run parallel]
  ↓
Final typecheck + tests + metrics comparison
```

### Parallel Wave Strategy

| Wave | Batches | Dependency | Timing |
|------|---------|------------|--------|
| **Wave 1** | 1 | Foundation | Start immediately |
| **Wave 2** | 2, 3, 4 | After 1 complete | ~Hour 1 |
| **Wave 3** | 5, 6, 7, 8 | After 1 complete | ~Hour 1.5 |
| **Wave 4** | 9, 10, 11 | After 1 complete | ~Hour 2 |
| **Wave 5** | Final typecheck + tests | All batches | End |

---

## TODOs

### Batch 1: Core Identity/Auth/Shared

- [x] 1.1 Update packages/db/package.json exports
  - **What**: Finalize wildcard exports (partially done in working changes)
  - **Files**: `packages/db/package.json`
  - **Expected**: Exports include `./schema/*` → `./src/schema/*.schema.ts`, `./types/*` → `./src/schema/*.types.ts`
  - **Verification**: `jq '.exports' packages/db/package.json` shows wildcard patterns
  - **Completed**: Commit 9bf8ce19

- [x] 1.2 Update packages/auth/src/user.ts
  - **What**: Change `import type { UserSelect } from '@hominem/db/schema'` to `import type { UserSelect } from '@hominem/db/types/users'`
  - **Files**: `packages/auth/src/user.ts`
  - **Verify**: `bun run typecheck` passes
  - **Completed**: Commit 9bf8ce19

- [x] 1.3 Type-audit after Batch 1
  - **What**: Run type performance audit and save metrics
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-1.json`
  - **Verify**: JSON file created with metrics
  - **Completed**: Commit 9bf8ce19

### Batch 2: Taxonomy & People Base (tags, categories, contacts, company)

- [x] 2.1 Update packages/services/src files
  - **What**: Replace barrel imports with specific paths for `tags`, `categories`, `contacts`, `company`
  - **Files affected**:
    - `packages/services/src/tags.service.ts`
    - `packages/services/src/content-strategies.service.ts`
    - `packages/services/src/people.service.ts`
    - `packages/services/src/content-strategies.tools.ts`
  - **Pattern**: `import type { TagOutput } from '@hominem/db/types/tags'` and `import { tags } from '@hominem/db/schema/tags'`
  - **Verify**: `bun run typecheck` passes
  - **Completed**: Commit 49159477

- [x] 2.2 Update packages/hono-rpc/src/routes
  - **What**: Update content-strategies.ts for content types
  - **Files**: `packages/hono-rpc/src/routes/content-strategies.ts`: `ContentStrategySchema` -> `@hominem/db/schema/content`
  - **Verify**: `bun run typecheck` passes
  - **Completed**: Commit 49159477

- [x] 2.3 Type-audit after Batch 2
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-2.json`
  - **Completed**: Commit 49159477

### Batch 3: Career & Networking (career, interviews, skills, networking_events)

- [x] 3.1 Create career.types.ts if missing
  - **What**: Ensure `CareerOutput`, `CareerInput`, `JobOutput`, `JobInput` types are exported
  - **Files**: Check if `packages/db/src/schema/career.types.ts` exists; create if needed
  - **Verify**: File exists with type exports
  - **Completed**: Already exists, company types exported separately in company.types.ts

- [x] 3.2 Update packages/career/src services
  - **What**: Replace barrel imports with specific paths
  - **Files affected**:
    - `packages/career/src/company.service.ts`
    - `packages/career/src/job.service.ts`
    - `packages/career/src/job-application.service.ts`
  - **Pattern**: `import type { CompanyOutput } from '@hominem/db/types/career'` and `import { companies } from '@hominem/db/schema/career'`
  - **Verify**: `bun run typecheck` passes
  - **Completed**: Commit 6c0c5c29

- [x] 3.3 Update packages/hono-rpc/src/routes
  - **What**: Update routes/events.ts for event types if career-related
  - **Files**: `packages/hono-rpc/src/routes/events.ts`
  - **Verify**: `bun run typecheck` passes
  - **Completed**: No changes needed - events.ts doesn't use career types

- [x] 3.4 Type-audit after Batch 3
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-3.json`
  - **Completed**: Commit 6c0c5c29 - Total typecheck: 9.2s (41/41 packages pass)

### Batch 4: Content & Knowledge (notes, content, documents, vector-documents, bookmarks, surveys)

- [ ] 4.1 Update packages/notes/src services
  - **What**: Replace barrel imports with specific paths
  - **Files affected**:
    - `packages/notes/src/notes.service.ts`
    - `packages/notes/src/content.service.ts`
    - `packages/notes/src/notes.tool-def.ts`
    - `packages/notes/src/types.ts`
  - **Pattern**: `import type { NoteOutput } from '@hominem/db/types/notes'` and `import { notes } from '@hominem/db/schema/notes'`
  - **Verify**: `bun run typecheck` passes

- [ ] 4.2 Update packages/services/src
  - **What**: Update bookmarks.service.ts, vector.service.ts
  - **Files**: `packages/services/src/bookmarks.service.ts`, `packages/services/src/vector.service.ts`
  - **Verify**: `bun run typecheck` passes

- [ ] 4.3 Update packages/hono-rpc/src/routes
  - **What**: Update content.ts, notes.ts routes
  - **Files**: `packages/hono-rpc/src/routes/content.ts`, `packages/hono-rpc/src/routes/notes.ts`
  - **Verify**: `bun run typecheck` passes

- [ ] 4.4 Type-audit after Batch 4
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-4.json`

### Batch 5: Travel, Lists & Places (lists, items, travel, places, trips, trip_items)

- [x] 5.1 Create trips.types.ts
  - **What**: Create `packages/db/src/schema/trips.types.ts` with `TripOutput`, `TripInput` exports
  - **Files**: Create `packages/db/src/schema/trips.types.ts`
  - **Content**: Export types based on `trips.schema.ts` table definitions
  - **Verify**: File exists with type exports

- [x] 5.2 Create trip_items.types.ts
  - **What**: Create `packages/db/src/schema/trip_items.types.ts` with `TripItemOutput`, `TripItemInput` exports
  - **Files**: Create `packages/db/src/schema/trip_items.types.ts`
  - **Verify**: File exists with type exports

- [x] 5.3 Update packages/lists/src services
  - **What**: Replace barrel imports with specific paths
  - **Files affected**:
    - `packages/lists/src/index.ts`
    - `packages/lists/src/list-crud.service.ts`
    - `packages/lists/src/list-queries.service.ts`
    - `packages/lists/src/list-items.service.ts`
    - `packages/lists/src/list-collaborators.service.ts`
    - `packages/lists/src/list-invites.service.ts`
    - `packages/lists/src/types.ts`
  - **Pattern**: `import type { ListOutput } from '@hominem/db/types/lists'` and `import { list } from '@hominem/db/schema/lists'`
  - **Verify**: `bun run typecheck` passes

- [x] 5.4 Update packages/places/src services
  - **What**: Replace barrel imports with specific paths
  - **Files affected**:
    - `packages/places/src/index.ts`
    - `packages/places/src/places.service.ts`
    - `packages/places/src/trips.service.ts`
  - **Verify**: `bun run typecheck` passes

- [x] 5.5 Type-audit after Batch 5
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-5.json`

### Batch 6: Finance (finance institutions, accounts, transactions, budgets)

- [x] 6.1 Update packages/finance/src services
  - **What**: Replace barrel imports with specific paths
  - **Files affected**:
    - `packages/finance/src/core/institutions.repository.ts`
    - `packages/finance/src/core/budget-*.ts` (all budget services)
    - `packages/finance/src/analytics/aggregation.service.ts`
    - `packages/finance/src/features/accounts/*.ts`
    - `packages/finance/src/processing/bank-adapters/*.ts`
    - `packages/finance/src/finance.transactions.service.ts`
    - `packages/finance/src/finance.types.ts`
    - `packages/finance/src/finance.schemas.ts`
    - `packages/finance/src/plaid.service.ts`
  - **Pattern**: `import type { FinanceTransactionOutput } from '@hominem/db/types/finance'` and `import { transactions } from '@hominem/db/schema/finance'`
  - **Note**: Watch for `drizzle-zod` schemas like `TransactionInsertSchema` - keep in `.schema.ts` or re-export from `.types.ts`
  - **Verify**: `bun run typecheck` passes

- [x] 6.2 Update services/workers and services/api
  - **What**: Replace barrel imports in Plaid processor files
  - **Files**:
    - `services/workers/src/plaid-sync.processor.ts`
    - `services/workers/src/plaid.service.ts`
    - `services/api/src/routes/possessions.ts`
  - **Verify**: `bun run typecheck` passes

- [x] 6.3 Update packages/hono-rpc/src/routes
  - **What**: Update finance routes
  - **Files**: `packages/hono-rpc/src/routes/finance.*.ts`
  - **Verify**: `bun run typecheck` passes

- [x] 6.4 Type-audit after Batch 6
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-6.json`

### Batch 7: Calendar & Events (calendar, events + relations)

- [x] 7.1 Update packages/events/src services
  - **What**: Replace barrel imports with specific paths for calendar/events
  - **Files affected**:
    - `packages/events/src/events.service.ts`
  - **Pattern**: `import type { EventOutput, EventTypeEnum } from '@hominem/db/types/events'` and `import { events, eventTypeEnum } from '@hominem/db/schema/calendar'`
  - **Verify**: `bun run typecheck` passes ✅ (22.7s, 41/41 packages)

- [x] 7.2 Update packages/hono-rpc/src/routes
  - **What**: Update events routes
  - **Files**: `packages/hono-rpc/src/routes/events.ts`
  - **Verify**: `bun run typecheck` passes ✅

- [x] 7.3 Update packages/services/src
  - **What**: Update google-calendar.service.ts
  - **Files**: `packages/services/src/google-calendar.service.ts`
  - **Verify**: `bun run typecheck` passes ✅ (37.3s, 41/41 packages)

- [x] 7.4 Type-audit after Batch 7
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-7.json` ✅

### Batch 8: Assets (possessions)

- [x] 8.1 Update packages/services/src
  - **What**: Replace barrel imports in possessions.service.ts ✅
  - **Files**: `packages/services/src/possessions.service.ts` ✅
  - **Pattern**: `import type { PossessionOutput } from '@hominem/db/types/possessions'` and `import { possessions } from '@hominem/db/schema/possessions'` ✅
  - **Verify**: `bun run typecheck` passes ✅

- [x] 8.2 Update services/api
  - **What**: Update routes/possessions.ts ✅
  - **Files**: `services/api/src/routes/possessions.ts` ✅
  - **Verify**: `bun run typecheck` passes ✅

- [x] 8.3 Type-audit after Batch 8
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-8.json` ✅

### Batch 9: Lifestyle (goals, activity, health)

- [ ] 9.1 Update packages/services/src
  - **What**: Replace barrel imports in goals.service.ts, activities, health
  - **Files**:
    - `packages/services/src/goals.service.ts`
  - **Pattern**: `import type { GoalOutput } from '@hominem/db/types/goals'` and `import { goals } from '@hominem/db/schema/goals'`
  - **Verify**: `bun run typecheck` passes

- [ ] 9.2 Update apps/notes/app
  - **What**: Update goal-card.tsx
  - **Files**: `apps/notes/app/components/goals/goal-card.tsx`
  - **Verify**: `bun run typecheck` passes

- [ ] 9.3 Type-audit after Batch 9
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-9.json`

### Batch 10: Media (music, movies)

- [x] 10.1 Update packages/services/src
  - **What**: Replace barrel imports in music, movies services ✅
  - **Files**: `packages/services/src/spotify.service.ts` ✅
  - **Pattern**: `import type { MusicOutput } from '@hominem/db/types/music'` ✅
  - **Verify**: `bun run typecheck` passes ✅

- [x] 10.2 Type-audit after Batch 10
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-10.json` ✅

### Batch 11: Chat (chats, chat_message)

- [ ] 11.1 Verify chat updates (already done in working changes)
  - **What**: Already migrated in working changes - verify no regressions
  - **Files**: Already done - `packages/chat/src/service/*.ts`
  - **Verify**: `bun run typecheck` passes

- [ ] 11.2 Update packages/hono-rpc/src/types
  - **What**: Update content-strategies.types.ts if it references chat
  - **Files**: `packages/hono-rpc/src/types/content-strategies.types.ts`
  - **Verify**: `bun run typecheck` passes

- [ ] 11.3 Type-audit after Batch 11
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-11.json`

### Final Verification & Tests

- [ ] 12.1 Full typecheck across all packages
  - **Command**: `bun run typecheck`
  - **Verify**: No errors or warnings

- [ ] 12.2 Generate final type-audit report
  - **Command**: `bun run type-perf:audit --json .sisyphus/metrics/final-type-audit.json`
  - **Verify**: JSON file created with full metrics

- [ ] 12.3 Compare metrics (Batch 1 vs Final)
  - **What**: Create summary comparing type trace performance
  - **File**: `.sisyphus/metrics/type-audit-summary.json`
  - **Content**: Before/after for total duration, slow files, instantiations

- [ ] 12.4 Run full test suite
  - **Command**: `bun run test --force`
  - **Verify**: All tests pass, no regressions

- [ ] 12.5 Build verification
  - **Command**: `bun run build --force`
  - **Verify**: No errors, all packages build successfully

---

## Success Criteria

### Verification Commands
```bash
# After each batch
bun run typecheck
bun run type-perf:audit --json .sisyphus/metrics/type-audit-batch-{N}.json

# Final verification
bun run typecheck && bun run type-audit --json .sisyphus/metrics/final-type-audit.json && bun run test --force && bun run build --force
```

### Final Checklist
- [ ] All ~50 files updated to specific imports
- [ ] 2 new `.types.ts` files created (trips, trip_items)
- [ ] `bun run typecheck` passes with no errors
- [ ] `bun run type-audit` shows no regressions (metrics tracked)
- [ ] Type performance improved or maintained vs baseline
- [ ] All tests pass
- [ ] All packages build successfully

---

## Guardrails & Notes

### What NOT to Change
- ❌ Schema definitions (`*.schema.ts` table/enum definitions stay unchanged)
- ❌ Database logic or service implementations
- ❌ Barrel export in `packages/db/index.ts` (for backward compatibility)
- ❌ Unsafe type casts - use guarded patterns only

### Key Patterns to Follow
- ✅ `import type { UserSelect } from '@hominem/db/types/users'` (NOT from barrel)
- ✅ `import { users } from '@hominem/db/schema/users'` (specific, not barrel)
- ✅ `const result = await db...returning(); return result as UserOutput` (guarded when safe)
- ✅ Cross-domain imports: `import { users } from '@hominem/db/schema/users'` (still allowed)

### Type Casting Best Practices
- Guard before asserting: `if (!row) throw Error(); return row as Output`
- Avoid `as unknown as T` - it defeats type safety
- Keep casts local: `const user = row as UserOutput` not wide array casts
- Validate external inputs before casting to enums

---

## Commit Strategy

After each batch:
- **Commit**: YES (grouped by batch)
- **Message Format**: `chore(db): migrate [batch-name] to specific imports`
  - Example: `chore(db): migrate core-identity to specific imports`
  - Example: `chore(db): migrate travel-lists to specific imports`
- **Include**: All file changes + type-audit JSON metrics
- **Pre-commit**: `bun run typecheck` passes

Final commit:
- **Message**: `chore(db): complete drizzle import refactor - all batches migrated`

---

## References

### Pattern References (existing code to follow)
- `packages/chat/src/service/chat.queries.ts:1-10` - Correct import pattern after migration
- `packages/auth/src/user.ts` - Simple single-file type import example
- `packages/career/src/company.service.ts` - Service file migration pattern

### Type References (contracts to implement)
- `packages/db/src/schema/*.types.ts` - Existing type export patterns
- `packages/db/src/schema/types.ts` - Barrel type re-export pattern

### Documentation References
- `.github/skills/type-audit/SKILL.md` - Type audit tool documentation
- `AGENTS.md` - Monorepo build and typecheck commands
- `.github/instructions/performance-first.instructions.md` - TypeScript performance budget

### External References
- Drizzle ORM: https://orm.drizzle.team/ (schema patterns)
- TypeScript compiler options: https://www.typescriptlang.org/tsconfig (performance tuning)
