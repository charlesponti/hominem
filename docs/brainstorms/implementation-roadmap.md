# Database Schema Implementation Roadmap

**Generated**: 2026-02-03  
**Status**: Planning Phase Complete  
**Estimated Effort**: ~2-3 Weeks

---

## Phase 1: Immediate Safety & Performance (Week 1)
**Goal**: Fix critical risks and performance issues without breaking changes.

- [ ] **Data Cleanup**
  - Run validation queries to find orphaned records (`career`, `calendar`, `transactions`)
  - Clean up orphaned records manually or via script
- [ ] **Index Creation**
  - Apply high-priority indexes from `missing-index-analysis.md`
  - Focus on `job_applications` and `events` tables
  - Use `CONCURRENTLY` for safe creation
- [ ] **Add Missing Constraints**
  - Add FK constraints to `job_applications`, `events`, `work_experiences`
  - Requires data cleanup first

## Phase 2: Standardization & cleanup (Week 1-2)
**Goal**: Align code patterns and file structure.

- [ ] **Standardize Zod Schemas**
  - Move schemas from `.validation.ts` to `.schema.ts`
  - Update imports in application code
- [ ] **Adopt Shared Helpers**
  - Refactor `finance.schema.ts` (verify usage)
  - Refactor `tasks.schema.ts`, `notes.schema.ts` to use helpers
- [ ] **Fix Timestamp Precision**
  - Update `health.schema.ts` and `career.schema.ts` timestamps
  - Verify no data truncation issues

## Phase 3: Critical Schema Fixes (Week 3)
**Goal**: Fix architectural violations (Requires maintenance window).

- [ ] **Fix `health` Table ID**
  - Migration: `serial` -> `uuid`
  - Create `new_id`, backfill, swap, drop old
- [ ] **Fix `auth.token` Table ID**
  - Migration: `serial` -> `uuid`
  - Similar backfill strategy
- [ ] **Fix `users.id` Generation**
  - Add `defaultRandom()` to `users.id` definition
  - Ensure no app code breaks (most app code creates UUIDs client-side, check this)

## Phase 4: Long-term Naming Alignment (Future)
**Goal**: Full compliance with naming standards.

- [ ] **Audit App Code**
  - Grep for raw SQL usage of camelCase columns (`"isAdmin"`, `"userId"`)
- [ ] **Rename Columns**
  - Rename DB columns to snake_case (`is_admin`, `user_id`)
  - Update Drizzle definitions to map to camelCase properties
  - Deploy carefully

---

## Execution Plan

### Step 1: Create Tracking Issue
Create a GitHub/Linear issue "Refactor Database Schema" and add this roadmap as the body.

### Step 2: Phase 1 PRs
- PR 1: "fix(db): clean up orphaned records" (SQL migration)
- PR 2: "perf(db): add missing foreign key indexes"

### Step 3: Phase 2 PRs
- PR 3: "refactor(db): consolidate zod schemas"
- PR 4: "refactor(db): adopt shared schema helpers"

### Step 4: Phase 3 PRs
- PR 5: "fix(db): migrate health ids to uuid" (Risky - deploy separately)

---

**Success Criteria**:
- All tables use UUIDs
- All FKs are indexed
- Schema file structure is consistent
- `SCHEMA_STANDARDS.md` is followed for new tables
