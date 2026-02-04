# Migration Safety Assessment

**Generated**: 2026-02-03  
**Analysis Scope**: Existing migration history (16+ files) & Proposed changes  
**Focus**: Identifying safe migration paths for critical schema updates

---

## Executive Summary

This assessment evaluates the safety of applying proposed schema standardizations to the production database. The database has a significant migration history with 16+ existing migration files, indicating a mature schema with existing data.

### Risk Profile Overview

| Change Category | Risk Level | Mitigation Strategy |
|-----------------|------------|---------------------|
| **ID Type Changes** | 🔴 **Critical** | Multi-step migration (Add → Copy → Drop) |
| **Column Renaming** | 🔴 **Critical** | Dual-write + View-based transition |
| **Constraint Addition** | 🟡 **High** | Pre-validation & Data cleanup |
| **Timestamp Precision** | 🟡 **Medium** | Safe casting |
| **Index Creation** | 🟢 **Low** | `CONCURRENTLY` creation |

---

## 🔴 Critical Risk Migrations

### 1. Migrating `health.id` from Serial to UUID

**Current State**: `id: serial` (Integer)  
**Target State**: `id: uuid` (String-like)

**Risk**: Direct type change is impossible without dropping data or complex casting. All foreign keys referencing this ID (if any) will also break.

**Recommended Strategy (Zero-Downtime)**:
1. **Migration A**: Add `new_id` UUID column (nullable)
   ```sql
   ALTER TABLE health ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
   ```
2. **Data Backfill**: Populate `new_id` for existing rows
   ```sql
   UPDATE health SET new_id = gen_random_uuid() WHERE new_id IS NULL;
   ```
3. **Constraint Switch**: Make `new_id` NOT NULL and Primary Key
   ```sql
   ALTER TABLE health ALTER COLUMN new_id SET NOT NULL;
   -- Drop old PK
   ALTER TABLE health DROP CONSTRAINT health_pkey;
   -- Add new PK
   ALTER TABLE health ADD CONSTRAINT health_pkey PRIMARY KEY (new_id);
   ```
4. **Cleanup**: Drop old `id` column and rename `new_id`
   ```sql
   ALTER TABLE health DROP COLUMN id;
   ALTER TABLE health RENAME COLUMN new_id TO id;
   ```

**Rollback Plan**: Restore backup or reverse steps (add serial column, drop uuid).

---

### 2. Standardizing Column Names (CamelCase to Snake_Case)

**Affected Tables**: `users`, `auth.*`, `notes`, `lists`

**Risk**: Breaking application code that relies on current column names. Drizzle ORM maps these, but raw SQL queries or external tools will break.

**Recommended Strategy**:
1. **Rename in DB**: Rename columns to snake_case
   ```sql
   ALTER TABLE users RENAME COLUMN "isAdmin" TO is_admin;
   ```
2. **Update Drizzle Schema**: Map snake_case DB column to camelCase TS property
   ```typescript
   // In users.schema.ts
   isAdmin: boolean('is_admin').default(false).notNull(),
   ```

**Safety Check**:
- Drizzle handles the mapping `isAdmin: boolean('is_admin')` automatically.
- **Risk**: Any raw SQL queries (`sql\`SELECT "isAdmin"...\``) in the codebase will break.
- **Mitigation**: Grep codebase for raw SQL usage of these column names before applying.

---

## 🟡 High Risk Migrations

### 3. Adding Missing Foreign Key Constraints

**Affected Tables**: `career.job_applications`, `calendar.events`

**Risk**: Migration will fail if orphaned records exist (referencing non-existent IDs).

**Recommended Strategy**:
1. **Validation Step**: Run check queries (see `data-integrity-risk-assessment.md`)
2. **Cleanup Migration**: Delete or fix orphaned records *before* adding constraint
   ```sql
   -- Example cleanup
   DELETE FROM job_applications 
   WHERE company_id IS NOT NULL 
   AND company_id NOT IN (SELECT id FROM companies);
   ```
3. **Constraint Migration**: Add constraint with safety
   ```sql
   ALTER TABLE job_applications 
   ADD CONSTRAINT ... FOREIGN KEY ...;
   ```

---

## 🟡 Medium Risk Migrations

### 4. Timestamp Precision Standardization

**Change**: `timestamp` -> `timestamp(3)`

**Risk**: Potential data truncation (loss of precision beyond milliseconds) or format mismatch.

**Assessment**:
- PostgreSQL `timestamp` is typically higher precision (microseconds) than `timestamp(3)` (milliseconds).
- Reducing precision is a lossy operation but generally safe for application logic.
- **Strategy**: `ALTER COLUMN ... TYPE timestamp(3)` works implicitly.

---

## 🟢 Low Risk Migrations

### 5. Index Creation

**Risk**: Table locking during creation on large tables.

**Strategy**: Always use `CONCURRENTLY`.
```sql
CREATE INDEX CONCURRENTLY ...
```
**Note**: `CONCURRENTLY` cannot run inside a transaction block. Drizzle Kit might generate transaction-wrapped migrations.
**Action**: Manually edit generated SQL to remove transaction wrapping for index migrations if necessary, or accept brief lock for small tables.

---

## Existing Migration History Analysis

Review of `packages/db/src/migrations/`:
- **0000_fast_madrox.sql**: Initial auth setup
- **0030_clerk_to_supabase_auth.sql**: Major auth migration (indicates user data migration occurred)
- **0036_funny_fat_cobra.sql**: Large migration (11KB) - likely a major feature add
- **0049_wise_dormammu.sql**: Recent large update (9KB)

**Observation**: The team is comfortable with migrations, but frequent large migrations increase conflict risk.
**Recommendation**: encourage smaller, atomic migrations (one logical change per file).

---

## Final Recommendation on Execution Order

1. **Phase 1 (Safe)**: Add missing indexes (CONCURRENTLY) and clean up orphaned data.
2. **Phase 2 (Standardization)**: Fix timestamp precision and add missing defaults.
3. **Phase 3 (Critical)**: Address `health.id` serial -> uuid migration (requires dedicated downtime or careful maintenance window).
4. **Phase 4 (Renaming)**: Rename columns only after verifying no raw SQL dependencies exist.

---

**Next Steps**: Create the `SCHEMA_STANDARDS.md` guide to prevent future drift.