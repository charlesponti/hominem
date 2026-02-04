# Hominem Database Schema Refactor: Master Plan

**Generated**: 2026-02-03  
**Status**: Planning Complete  
**Total Issues Identified**: 37  
**Estimated Effort**: 2-3 weeks  
**Risk Level**: Multi-phase (Low → High)

---

## Executive Summary

This master plan consolidates comprehensive analysis of the Hominem database schema across ~45 tables and 67+ foreign keys. The analysis identified **37 critical and medium-risk inconsistencies** that impact data integrity, performance, and maintainability. This document provides:

1. **Complete problem inventory** - All issues across data integrity, performance, consistency, and architecture
2. **Phased implementation roadmap** - 4 phases from safe improvements to critical migrations
3. **Standardization framework** - Database Schema Standards to prevent future drift
4. **Type architecture optimization** - "Compute Once" pattern for sub-second TypeScript inference
5. **Migration safety protocols** - Detailed strategies for high-risk changes

---

## Part 1: Complete Issue Inventory

### 1.1 Critical Issues Summary

| Issue | Count | Severity | Impact |
|-------|-------|----------|--------|
| ID pattern violations (serial vs uuid) | 3 | 🔴 Critical | Data migration required |
| Missing FK constraints | 8 | 🟡 Medium | Orphaned records possible |
| Naming convention violations (camelCase vs snake_case) | 6 tables | 🟡 High | App code refactoring needed |
| Inconsistent timestamp precision | 15+ | 🟠 Medium | Potential data loss |
| Missing indexes on FKs | 12 | 🔴 High | Query performance degradation |

### 1.2 Data Integrity Risks (Medium Priority)

#### Missing Foreign Key Constraints

**career.job_applications** - Missing FK constraints
- `companyId` lacks FK to `companies.id` → Risk of orphaned job applications
- `userId` lacks FK to `users.id` → Risk of orphaned records
- **Fix**: Add FKs with `onDelete: 'cascade'` or `'set null'`

**career.application_stages** - No FK to job_applications
- `jobApplicationId` is orphaned
- **Fix**: Add `.references(() => job_applications.id, { onDelete: 'cascade' })`

**career.work_experiences** - Missing userId FK
- Only `companyId` has FK constraint
- **Fix**: Add `userId` FK with cascade behavior

**calendar.events** - Missing userId FK
- `userId` lacks constraint despite being required
- **Fix**: Add `.references(() => users.id, { onDelete: 'cascade' })`

**calendar.categories** - Missing FKs
- `parentId` (self-reference) lacks FK
- `userId` lacks FK
- **Fix**: Both need constraints with appropriate cascade behavior

**chats.chat** - Status: ✅ Has FK via explicit foreignKey()

**bookmarks.bookmark** - Status: ✅ Has FK via explicit foreignKey()

#### Inconsistent Nullable Column Definitions

Critical columns with inconsistent nullability across tables. Example: `calendar.events.title` should be required but is currently optional.

### 1.3 Performance Risks (High Priority)

#### Missing Indexes on Foreign Keys

All foreign key columns must be indexed to avoid full table scans during joins and cascade operations.

**career.job_applications** - 3 missing indexes
```sql
CREATE INDEX CONCURRENTLY "job_applications_company_id_idx" ON "job_applications" ("company_id");
CREATE INDEX CONCURRENTLY "job_applications_job_id_idx" ON "job_applications" ("job_id");
CREATE INDEX CONCURRENTLY "job_applications_user_id_idx" ON "job_applications" ("user_id");
```

**calendar.events** - 1 missing index
```sql
CREATE INDEX CONCURRENTLY "events_place_id_idx" ON "events" ("place_id");
```

**calendar.events_users & calendar.events_transactions** - 4 missing indexes
```sql
CREATE INDEX CONCURRENTLY "events_users_event_id_idx" ON "events_users" ("event_id");
CREATE INDEX CONCURRENTLY "events_users_person_id_idx" ON "events_users" ("person_id");
CREATE INDEX CONCURRENTLY "events_transactions_event_id_idx" ON "events_transactions" ("event_id");
CREATE INDEX CONCURRENTLY "events_transactions_transaction_id_idx" ON "events_transactions" ("transaction_id");
```

**finance.transactions** - 2 missing indexes
```sql
CREATE INDEX CONCURRENTLY "transactions_from_account_id_idx" ON "transactions" ("from_account_id");
CREATE INDEX CONCURRENTLY "transactions_to_account_id_idx" ON "transactions" ("to_account_id");
```

**finance.plaid_items, finance.finance_accounts** - 3 missing indexes
```sql
CREATE INDEX CONCURRENTLY "plaid_items_institution_id_idx" ON "plaid_items" ("institution_id");
CREATE INDEX CONCURRENTLY "finance_accounts_institution_id_idx" ON "finance_accounts" ("institution_id");
CREATE INDEX CONCURRENTLY "finance_accounts_plaid_item_id_idx" ON "finance_accounts" ("plaid_item_id");
```

**documents** - Status: ✅ Already has FK index

### 1.4 Schema Inconsistencies

#### ID Generation Patterns

**Standard**: `uuid('id').primaryKey().defaultRandom()`

| File | Pattern | Status |
|------|---------|--------|
| health.schema.ts | `serial('id').primaryKey()` | 🔴 **CRITICAL** |
| auth.schema.ts (token) | `serial('id').primaryKey().notNull()` | 🔴 **CRITICAL** |
| users.schema.ts | `uuid('id').primaryKey().notNull()` | 🟡 **MISSING defaultRandom()** |
| Most others | `uuid('id').primaryKey().defaultRandom()` | ✅ Correct |

**Impact**: 
- `health` and `auth.token` tables incompatible with UUID-based joins
- `users.id` requires explicit UUID generation in all user creation code
- **Data migration required** for health and token tables

#### Naming Convention Violations

**Standard**: `snake_case` for DB columns, `camelCase` for TS properties

Affected tables with **camelCase** columns (incorrect):
- `users.schema.ts` - 7 violations: `supabaseId`, `isAdmin`, `emailVerified`, etc.
- `auth.schema.ts` - 6 violations: `emailToken`, `accessToken`, `refreshToken`, `userId`, etc.
- `bookmarks.schema.ts` - 1 violation: `userId`
- `chats.schema.ts` - 5 violations: `userId`, `chatId`, `parentMessageId`, etc.
- `lists.schema.ts` - 9 violations: `ownerId`, `isPublic`, `invitedUserId`, etc.

**Impact**: 
- 80% of schema files use correct `snake_case` convention
- Inconsistency complicates DB administration and raw SQL queries
- Requires application-level mapping for consistency

#### Timestamp Precision Inconsistencies

**Standard**: `timestamp('created_at', { precision: 3, mode: 'string' })`

| File | Pattern | Status |
|------|---------|--------|
| users.schema.ts | precision: 3, mode: string | ✅ Correct |
| finance.schema.ts | Uses shared helpers | ✅ Correct |
| calendar.schema.ts | Mixed (some precision: 3, some plain) | ⚠️ Inconsistent |
| career.schema.ts | Plain timestamp (no precision) | 🟡 Should be 3 |
| health.schema.ts | Plain timestamp | 🟡 Should be 3 |
| notes.schema.ts | precision: 3, mode: string | ✅ Correct |

**Impact**: 
- Potential microsecond precision loss when reduced to milliseconds
- Inconsistent application behavior across domains
- Generally safe to fix via `ALTER COLUMN ... TYPE timestamp(3)`

---

## Part 2: Standardization Framework

### 2.1 Hominem Database Schema Standards

#### File Organization
```
packages/db/src/schema/
├── {domain}.schema.ts        # Drizzle tables, relations, enums, Zod schemas
├── {domain}.types.ts         # TypeScript type exports
├── shared.schema.ts          # Shared helpers and common patterns
└── index.ts                  # Barrel exports
```

**Key Rule**: Zod schemas must be defined in `.schema.ts` (never `.validation.ts`)

#### Table Definition Standards

**ID Generation** (REQUIRED for all new tables):
```typescript
id: uuid('id').primaryKey().defaultRandom().notNull(),
```

**Naming Conventions**:
```typescript
// DB columns: snake_case
// TS properties: camelCase
isAdmin: boolean('is_admin').default(false),
createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
```

**Timestamps** (REQUIRED for all tables with data):
```typescript
import { createdAtColumn, updatedAtColumn } from './shared.schema';

createdAt: createdAtColumn(),
updatedAt: updatedAtColumn(),
```

**Foreign Keys**:
```typescript
// Simple FKs: inline
userId: uuid('user_id').references(() => users.id),

// Cascading FKs: explicit declaration
(table) => ({
  fk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id]
  }).onDelete('cascade')
})
```

**Indexes on Foreign Keys** (REQUIRED):
```typescript
(table) => [
  index('table_user_id_idx').on(table.userId),
]
```

#### Shared Helpers
Use these helpers from `shared.schema.ts` for consistency:
- `requiredUuidColumn('name')` → `uuid('name').notNull()`
- `optionalUuidColumn('name')` → `uuid('name')`
- `requiredTextColumn('name')` → `text('name').notNull()`
- `createdAtColumn()` → Standard `created_at` with precision 3
- `updatedAtColumn()` → Standard `updated_at` with precision 3

---

## Part 3: Type Architecture Optimization

### 3.1 The Problem: Type Inference Bottleneck

Complex Drizzle types are expensive to infer. When re-derived multiple times across layers, they compound:

```
notes.schema.ts (Drizzle table — expensive)
    ↓ import
service.ts (derive Omit<Note, 'id'>)  ← RE-INFERS
    ↓ import
routes.ts (derive Pick<Note, ...>)     ← RE-INFERS AGAIN
    ↓ import
app.ts (assemble routes)               ← RE-INFERS MULTIPLE TIMES
```

**Result**: Single type instantiated 5-10 times = 400-1000ms type checking time per type.

### 3.2 The Solution: "Compute Once" Pattern

Create `.types.ts` files with pre-computed type aliases:

```typescript
// packages/db/src/schema/notes.types.ts
import type { Note, NoteInsert } from './notes.schema';

// Computed ONCE
export type NoteOutput = Note;
export type NoteInput = NoteInsert;
export type NoteSyncItem = Omit<Note, 'id' | 'synced' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  synced?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
```

Then use throughout the codebase without re-deriving:

```typescript
// packages/notes/src/notes.service.ts
import type { NoteOutput, NoteInput, NoteSyncItem } from '@hominem/db/schema';

async create(input: NoteInput): Promise<NoteOutput> { ... }
```

### 3.3 Import Rules (Critical for Performance)

✅ **DO**: Import pre-computed types from `@hominem/db/schema`
```typescript
import type { NoteOutput, NoteInput } from '@hominem/db/schema';
```

✅ **DO**: Import raw tables for DB operations
```typescript
import { notes } from '@hominem/db/schema/notes';
const result = await db.select().from(notes).where(...);
```

❌ **DON'T**: Import raw types from schema files (triggers re-inference)
```typescript
import type { Note, NoteInsert } from '@hominem/db/schema';
type CustomNote = Omit<Note, 'id'> & {...};  // ← Forces re-computation
```

---

## Part 4: Migration Safety Assessment

### 4.1 Risk Levels by Change Type

| Change Type | Risk | Mitigation |
|-------------|------|-----------|
| ID type changes (serial → uuid) | 🔴 Critical | Multi-step migration (Add → Copy → Drop) |
| Column renaming | 🔴 Critical | Dual-write + view-based transition |
| FK constraint addition | 🟡 High | Pre-validation & data cleanup |
| Timestamp precision | 🟠 Medium | Safe type casting |
| Index creation | 🟢 Low | CONCURRENTLY flag |

### 4.2 Critical Migration Strategies

#### Strategy 1: health.id (serial → uuid)

**Current**: `id: serial` | **Target**: `id: uuid`

**Zero-downtime approach**:
1. Add `new_id UUID DEFAULT gen_random_uuid()` column
2. Backfill existing rows: `UPDATE health SET new_id = gen_random_uuid() WHERE new_id IS NULL`
3. Make NOT NULL: `ALTER TABLE health ALTER COLUMN new_id SET NOT NULL`
4. Drop old PK: `ALTER TABLE health DROP CONSTRAINT health_pkey`
5. Add new PK: `ALTER TABLE health ADD CONSTRAINT health_pkey PRIMARY KEY (new_id)`
6. Drop old column: `ALTER TABLE health DROP COLUMN id`
7. Rename: `ALTER TABLE health RENAME COLUMN new_id TO id`

**Rollback**: Restore backup or reverse the steps.

#### Strategy 2: auth.token.id (serial → uuid)

Same approach as health.id (see above).

#### Strategy 3: Column Renaming (camelCase → snake_case)

**Approach**:
1. Rename in database: `ALTER TABLE users RENAME COLUMN "isAdmin" TO is_admin`
2. Update Drizzle schema: `isAdmin: boolean('is_admin').default(false)`
3. Verify no raw SQL uses old names: `grep -r "\"isAdmin\"" .`

**Safety check**: Drizzle handles the property ↔ column mapping automatically.

#### Strategy 4: Adding Foreign Key Constraints

**Before adding constraint**:
1. Run validation queries to find orphaned records
2. Clean up or backfill orphaned records
3. Then add constraint

**Example**:
```sql
-- Validate before adding constraint
SELECT COUNT(*) FROM job_applications 
WHERE company_id NOT IN (SELECT id FROM companies);

-- Clean up if found
DELETE FROM job_applications 
WHERE company_id IS NOT NULL 
AND company_id NOT IN (SELECT id FROM companies);

-- Add constraint
ALTER TABLE job_applications 
ADD CONSTRAINT job_applications_company_id_fk 
FOREIGN KEY (company_id) REFERENCES companies(id);
```

#### Strategy 5: Index Creation

Always use `CONCURRENTLY` to avoid locking on large tables:
```sql
CREATE INDEX CONCURRENTLY "table_column_id_idx" 
ON "table" ("column_id");
```

**Note**: Drizzle Kit may wrap migrations in transactions. For concurrent index creation, manually edit generated SQL to remove transaction wrapping.

---

## Part 5: Phased Implementation Roadmap

### Phase 1: Immediate Safety & Performance (Week 1)

**Goal**: Fix critical risks and performance issues without breaking changes.  
**Risk Level**: 🟢 Low  
**Estimated Effort**: 6-8 hours

#### Tasks:
- [ ] **Data Cleanup**
  - Run validation queries for `career.job_applications`, `calendar.events`, `finance.transactions`
  - Document and clean up orphaned records
  - **Rationale**: Required before adding FK constraints

- [ ] **Index Creation** (High Priority)
  - Add 8+ missing FK indexes (see Part 1.3)
  - Use `CONCURRENTLY` flag for large tables
  - **Rationale**: Improves query performance immediately

- [ ] **Add Missing Foreign Key Constraints**
  - `career.job_applications` - Add FK to companies, users
  - `career.application_stages` - Add FK to job_applications
  - `career.work_experiences` - Add FK to users
  - `calendar.events` - Add FK to users
  - `calendar.categories` - Add self-reference and user FK
  - **Rationale**: Prevents orphaned records

#### Acceptance Criteria:
- All orphaned records identified and cleaned
- 8+ FK indexes created successfully
- 5+ FK constraints added without errors
- No production data affected (validation-only)

#### PR Strategy:
```
PR 1: "fix(db): clean up orphaned records" (SQL migration)
PR 2: "perf(db): add missing foreign key indexes" (Drizzle + migration)
PR 3: "fix(db): add missing foreign key constraints" (Drizzle + migration)
```

---

### Phase 2: Low-Risk Standardization (Week 1-2)

**Goal**: Align code patterns and consolidate Zod schemas.  
**Risk Level**: 🟢 Low  
**Estimated Effort**: 2-4 hours

#### Tasks:
- [ ] **Consolidate Zod Schemas**
  - Move `users.validation.ts` schemas → `users.schema.ts`
  - Move `finance.validation.ts` schemas → `finance.schema.ts`
  - Update `schema/validations.ts` barrel exports
  - Delete old `.validation.ts` files
  - **Rationale**: Single source of truth for schema + validation

- [ ] **Adopt Shared Helpers**
  - Refactor timestamp columns to use `createdAtColumn()`, `updatedAtColumn()`
  - Refactor UUID columns to use `requiredUuidColumn()`, `optionalUuidColumn()`
  - **Rationale**: Consistency and DRY principle

- [ ] **Fix Timestamp Precision**
  - Update `career.schema.ts` timestamps to `precision: 3`
  - Update `calendar.schema.ts` to consistent precision
  - Verify no data truncation
  - **Rationale**: Prevent precision loss

#### Acceptance Criteria:
- `users.validation.ts` and `finance.validation.ts` deleted
- All timestamp columns have `precision: 3, mode: 'string'`
- All TypeScript checks pass
- All tests pass
- No breaking changes to exports

#### PR Strategy:
```
PR 4: "refactor(db): Phase 2 - Consolidate Zod schemas" (no migrations)
PR 5: "refactor(db): standardize timestamps to precision 3" (Drizzle + migration)
```

---

### Phase 3: Critical Schema Fixes (Week 2-3)

**Goal**: Fix architectural violations requiring downtime or careful planning.  
**Risk Level**: 🔴 High  
**Estimated Effort**: 8-12 hours

#### Tasks:
- [ ] **Fix health.id (serial → uuid)** ⚠️ Maintenance Window Required
  - Multi-step zero-downtime migration (see Part 4.2)
  - Test thoroughly in staging
  - Deploy with monitoring
  - **Rationale**: Align with standard UUID pattern

- [ ] **Fix auth.token.id (serial → uuid)** ⚠️ Maintenance Window Required
  - Same approach as health.id
  - **Rationale**: Consistency across auth module

- [ ] **Fix users.id Missing defaultRandom()**
  - Add `defaultRandom()` to `users.schema.ts`
  - Verify app code doesn't break
  - Update migration
  - **Rationale**: Auto-generate UUIDs; remove manual generation from app code

#### Acceptance Criteria:
- Both serial → uuid migrations complete
- Zero data loss
- `users.id` now auto-generates UUIDs
- All tests pass
- Production verification (if applicable)

#### PR Strategy:
```
PR 6: "fix(db): migrate health.id from serial to uuid" (risky - deploy separately)
PR 7: "fix(db): migrate auth.token.id from serial to uuid" (risky - deploy separately)
PR 8: "fix(db): add defaultRandom to users.id" (moderate risk)
```

---

### Phase 4: Long-Term Naming Alignment (Future)

**Goal**: Full compliance with snake_case naming standards.  
**Risk Level**: 🔴 Critical  
**Estimated Effort**: 2-3 weeks  
**Prerequisites**: Phase 1, 2, 3 merged + production stability verified

#### Tasks:
- [ ] **Audit App Code for Raw SQL**
  - Grep for raw SQL usage of camelCase columns
  - Map all occurrences: `grep -r '"isAdmin"' .`, `grep -r '"userId"' .`, etc.
  - **Rationale**: Identify breaking changes before rename

- [ ] **Rename DB Columns to snake_case**
  - Rename `isAdmin` → `is_admin` across all tables
  - Rename `userId` → `user_id` across all tables
  - Rename other camelCase columns
  - **Rationale**: Standard naming convention

- [ ] **Update Drizzle Schema Definitions**
  - Map snake_case DB columns to camelCase TS properties
  - Example: `isAdmin: boolean('is_admin')`
  - Verify all imports and exports

- [ ] **Deploy Carefully**
  - Coordinate with app teams
  - Rolling rollout if applicable
  - Verify no raw SQL breakage

#### Acceptance Criteria:
- All DB columns use snake_case
- All TS properties use camelCase
- Drizzle mapping maintained
- Zero breaking changes for app code
- No raw SQL queries use old column names

---

## Part 6: Success Criteria & Validation

### 6.1 Phase 1 Validation
```bash
# Run these after Phase 1
bun run typecheck           # No errors
bun run test                # All tests pass
bun run lint --parallel     # No linting errors
bun run check               # Safety check passes

# Verify data integrity
SELECT COUNT(*) FROM job_applications WHERE company_id NOT IN (SELECT id FROM companies);
# Should return 0

# Verify index creation
SELECT schemaname, tablename, indexname FROM pg_indexes 
WHERE tablename IN ('job_applications', 'events', 'transactions');
# Should show 8+ new indexes
```

### 6.2 Phase 2 Validation
```bash
# No TypeScript errors on schema files
bun run typecheck packages/db

# All exports still exist
grep -r "from '@hominem/db/schema/validations'" apps/ packages/

# Timestamps consistent
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name IN ('notes', 'users', 'calendar');
```

### 6.3 Phase 3 Validation
```bash
# Verify ID type changes
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('health', 'token') AND column_name = 'id';
# Should all show 'uuid'

# Verify foreign key constraints
SELECT constraint_name FROM information_schema.constraint_column_usage 
WHERE table_name IN ('health', 'token');
```

### 6.4 Overall Success Metrics
- ✅ All 42 packages pass TypeScript checks
- ✅ All 35 test suites pass
- ✅ 100% of linting checks pass
- ✅ All safety checks pass
- ✅ SCHEMA_STANDARDS.md documented and followed
- ✅ Zero data loss across migrations
- ✅ Zero breaking changes to public APIs
- ✅ Type inference consistently under 1 second

---

## Part 7: Execution Checklist

### Before Starting Any Phase:
- [ ] Read `SCHEMA_STANDARDS.md` (Part 2 of this document)
- [ ] Create tracking issue in GitHub/Linear
- [ ] Review migration strategies (Part 4)
- [ ] Set up staging environment for testing

### Phase 1 Execution:
- [ ] Create data cleanup script for orphaned records
- [ ] Generate migration files for indexes
- [ ] Generate migration files for FK constraints
- [ ] Test in staging environment
- [ ] Create 3 PRs (cleanup, indexes, constraints)
- [ ] Wait for all tests to pass
- [ ] Merge to main

### Phase 2 Execution:
- [ ] Move Zod schemas to `.schema.ts` files
- [ ] Update barrel exports
- [ ] Run full typecheck
- [ ] Run all tests
- [ ] Create 2 PRs (Zod consolidation, timestamp standardization)
- [ ] Merge to main

### Phase 3 Execution:
- [ ] Test serial → uuid migration in staging
- [ ] Schedule maintenance window
- [ ] Execute health.id migration
- [ ] Execute auth.token.id migration
- [ ] Execute users.id defaultRandom() fix
- [ ] Verify all data post-migration
- [ ] Create 3 PRs (one per critical fix)
- [ ] Merge to main

### Phase 4 Execution (Future):
- [ ] Complete Phase 1, 2, 3 successfully
- [ ] Wait for production stability
- [ ] Audit all raw SQL usage
- [ ] Create column renaming migrations
- [ ] Test in staging extensively
- [ ] Coordinate with app teams
- [ ] Execute deployment with monitoring
- [ ] Create final PRs

---

## Part 8: Dependencies & Timeline

### Critical Path:
```
Phase 1 (Week 1, 6-8 hrs)
    ↓ (Must complete before Phase 2)
Phase 2 (Week 1-2, 2-4 hrs)
    ↓ (Must complete before Phase 3)
Phase 3 (Week 2-3, 8-12 hrs) ⚠️ Requires maintenance window
    ↓ (Must stabilize production)
Phase 4 (Future, 2-3 weeks) 🔴 High risk
```

### Parallel Work:
- Type architecture optimization can start in Phase 2
- SCHEMA_STANDARDS.md documentation can be created now
- App code audits can happen in parallel with Phase 1-2

### Blocking Issues:
- Phase 1 must complete before Phase 3
- Production data validation must pass before adding any FK constraints
- Phase 3 requires maintenance window or zero-downtime migration testing

---

## Part 9: Rollback Procedures

### Phase 1 Rollback:
```bash
# Revert migration commits
git revert <migration-commit-hash>

# Drop created indexes
DROP INDEX CONCURRENTLY "job_applications_company_id_idx";
DROP INDEX CONCURRENTLY ... (all 8+ indexes)

# Drop added FK constraints
ALTER TABLE job_applications DROP CONSTRAINT job_applications_company_id_fk;
```

### Phase 2 Rollback:
```bash
# Restore .validation.ts files from git
git restore packages/db/src/schema/users.validation.ts
git restore packages/db/src/schema/finance.validation.ts

# Revert Drizzle changes
git revert <schema-changes-commit>
```

### Phase 3 Rollback:
```bash
# Restore from pre-migration backup
# Manually reverse multi-step migration steps
# See detailed rollback plan in Part 4.2
```

---

## Part 10: Monitoring & Alerting

### During Phase 1:
- Monitor index creation for locks
- Verify FK constraints don't reject inserts
- Check query performance improvements

### During Phase 2:
- Run TypeScript performance checks
- Verify no circular dependencies
- Monitor test execution time

### During Phase 3:
- Real-time migration monitoring
- Rollback threshold alerts
- Verify referential integrity post-migration
- Application error monitoring

### Metrics to Track:
- TypeScript compile time (target: <1s)
- Query latency (should improve with indexes)
- Data validation errors (should be zero)
- Failed deployments (should be zero)

---

## Conclusion

This master plan provides a comprehensive, phased approach to standardizing the Hominem database schema. By following these phases in order, we can:

1. **Immediately improve** performance and data integrity (Phase 1)
2. **Maintain consistency** through standardization (Phase 2)
3. **Fix architectural issues** safely (Phase 3)
4. **Future-proof the schema** with naming standards (Phase 4)

**Success requires**: strict adherence to SCHEMA_STANDARDS.md, thorough testing at each phase, and careful planning around maintenance windows for Phase 3.

---

**Document Owner**: Database Architecture Team  
**Last Updated**: 2026-02-03  
**Status**: Ready for Implementation  
**Next Step**: Create GitHub/Linear tracking issue and begin Phase 1
