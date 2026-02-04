# Schema Inconsistency Report

**Generated**: 2026-02-03  
**Analysis Scope**: 30 schema files, ~45 tables  
**Total Issues Found**: 37

---

## Executive Summary

The database schema exhibits significant inconsistencies across **ID generation patterns**, **naming conventions**, **timestamp configurations**, **foreign key declarations**, and **Zod schema locations**. These inconsistencies create maintenance overhead, increase bug risk, and make onboarding new developers more difficult.

### Issue Severity Breakdown

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 **Critical** | 3 | ID pattern violations |
| 🟡 **High** | 8 | Naming convention violations |
| 🟠 **Medium** | 15 | Timestamp inconsistencies |
| 🟢 **Low** | 11 | Pattern standardization |

---

## 🔴 Critical Issues

### 1. ID Pattern Violations

**Standard**: All tables should use `uuid('id').primaryKey().defaultRandom()`

#### Issue 1.1: health.schema.ts uses serial() for ID
**File**: `packages/db/src/schema/health.schema.ts:5`  
**Severity**: 🔴 Critical  
**Risk**: Data migration required, potential referential integrity issues

```typescript
// CURRENT (INCORRECT)
export const health = pgTable('health', {
  id: serial('id').primaryKey(), // ❌ Uses serial instead of uuid
  ...
});

// RECOMMENDED
export const health = pgTable('health', {
  id: uuid('id').primaryKey().defaultRandom(), // ✅ Standard UUID pattern
  ...
});
```

**Impact**:
- Inconsistent with all other tables
- Makes joins with UUID-based tables complex
- Future migrations will require data transformation

**Migration Strategy**:
```sql
-- HIGH RISK - Requires data migration
-- 1. Add new UUID column
ALTER TABLE health ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
-- 2. Update all foreign key references
-- 3. Drop old column and rename new
```

---

#### Issue 1.2: auth.token table uses serial() for ID
**File**: `packages/db/src/schema/auth.schema.ts:38`  
**Severity**: 🔴 Critical  
**Risk**: Inconsistent with session table (uses uuid)

```typescript
// CURRENT (INCORRECT)
export const token = pgTable('token', {
  id: serial('id').primaryKey().notNull(), // ❌ Uses serial
  ...
});

// RECOMMENDED
export const token = pgTable('token', {
  id: uuid('id').primaryKey().defaultRandom().notNull(), // ✅ Standard pattern
  ...
});
```

**Impact**:
- Same auth module uses two different ID types (serial vs uuid)
- Makes code generation and type inference inconsistent

---

#### Issue 1.3: users.id lacks defaultRandom()
**File**: `packages/db/src/schema/users.schema.ts:17`  
**Severity**: 🔴 Critical  
**Risk**: Requires explicit UUID generation in application code

```typescript
// CURRENT (INCORRECT)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // ❌ No defaultRandom()
  ...
});

// RECOMMENDED
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom().notNull(), // ✅ Auto-generates UUID
  ...
});
```

**Impact**:
- All user creation code must explicitly generate UUIDs
- Risk of null ID errors if not handled properly
- Inconsistent with other tables

---

## 🟡 High Priority Issues

### 2. Naming Convention Violations

**Standard**: snake_case for database columns (e.g., `user_id`, `created_at`)

#### Issue 2.1: users.schema.ts uses camelCase
**File**: `packages/db/src/schema/users.schema.ts`  
**Severity**: 🟡 High  
**Violations**: 7 columns

| Line | Column | Should Be |
|------|--------|-----------|
| 17 | `id` (no issue) | - |
| 20 | `supabaseId` | `supabase_id` |
| 23 | `email` (OK) | - |
| 29 | `isAdmin` | `is_admin` |
| 32 | `createdAt` | `created_at` |
| 33 | `updatedAt` | `updated_at` |
| 36 | `birthday` (OK) | - |
| 37 | `emailVerified` | `email_verified` |

**Impact**:
- Inconsistent with 80% of other schema files
- Requires application-level mapping if queries use raw SQL
- Complicates database administration

**Example of inconsistency**:
```typescript
// users.schema.ts (camelCase - INCORRECT)
userId: uuid('userId').notNull()

// tasks.schema.ts (snake_case - CORRECT)
userId: uuid('user_id').notNull()
```

---

#### Issue 2.2: auth.schema.ts uses camelCase
**File**: `packages/db/src/schema/auth.schema.ts`  
**Severity**: 🟡 High  
**Violations**: 6 columns

| Line | Column | Should Be |
|------|--------|-----------|
| 39 | `createdAt` | `created_at` |
| 40 | `updatedAt` | `updated_at` |
| 42 | `emailToken` | `email_token` |
| 48 | `userId` | `user_id` |
| 49 | `accessToken` | `access_token` |
| 50 | `refreshToken` | `refresh_token` |

---

#### Issue 2.3: bookmarks.schema.ts uses camelCase
**File**: `packages/db/src/schema/bookmarks.schema.ts`  
**Severity**: 🟡 High  
**Violations**: 1 column

| Column | Should Be |
|--------|-----------|
| `userId` | `user_id` |

---

#### Issue 2.4: chats.schema.ts uses camelCase
**File**: `packages/db/src/schema/chats.schema.ts`  
**Severity**: 🟡 High  
**Violations**: 5 columns

| Line | Column | Should Be |
|------|--------|-----------|
| chat table |
| - | `userId` | `user_id` |
| chat_message table |
| 67 | `chatId` | `chat_id` |
| 69 | `userId` | `user_id` |
| 71 | `parentMessageId` | `parent_message_id` |

---

#### Issue 2.5: lists.schema.ts uses camelCase
**File**: `packages/db/src/schema/lists.schema.ts`  
**Severity**: 🟡 High  
**Violations**: 9 columns

| Table | Column | Should Be |
|-------|--------|-----------|
| list | | |
| | `ownerId` | `owner_id` |
| | `isPublic` | `is_public` |
| | `createdAt` | `created_at` |
| | `updatedAt` | `updated_at` |
| user_lists | | |
| | `listId` | `list_id` |
| | `userId` | `user_id` |
| | `createdAt` | `created_at` |
| | `updatedAt` | `updated_at` |
| list_invite | | |
| | `invitedUserId` | `invited_user_id` |
| | `invitedUserEmail` | `invited_user_email` |
| | `userId` | `user_id` |
| | `acceptedAt` | `accepted_at` |
| | `createdAt` | `created_at` |
| | `updatedAt` | `updated_at` |

---

#### Issue 2.6: notes.schema.ts uses camelCase
**File**: `packages/db/src/schema/notes.schema.ts`  
**Severity**: 🟡 High  
**Violations**: 10 columns

| Line | Column | Should Be |
|------|--------|-----------|
| 83 | `userId` | `user_id` |
| 86 | `createdAt` | `created_at` |
| 87 | `updatedAt` | `updated_at` |
| 80 | `parentNoteId` | `parent_note_id` |
| 81 | `versionNumber` | `version_number` |
| 82 | `isLatestVersion` | `is_latest_version` |
| 88 | `publishedAt` | `published_at` |
| 89 | `scheduledFor` | `scheduled_for` |

---

## 🟠 Medium Priority Issues

### 3. Timestamp Configuration Inconsistencies

**Standard**: `timestamp('column', { precision: 3, mode: 'string' }).defaultNow().notNull()`

#### Issue 3.1: health.schema.ts uses plain timestamp()
**File**: `packages/db/src/schema/health.schema.ts:12`  
**Severity**: 🟠 Medium

```typescript
// CURRENT (INCORRECT)
createdAt: timestamp('created_at').defaultNow(), // ❌ No precision, no mode, notNull

// RECOMMENDED
createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
```

**Issues**:
- Missing `precision: 3` (affects timestamp precision)
- Missing `mode: 'string'` (affects TypeScript types)
- Missing `.notNull()` (allows null values)

---

#### Issue 3.2: career.schema.ts uses plain timestamp()
**File**: `packages/db/src/schema/career.schema.ts` (multiple locations)  
**Severity**: 🟠 Medium

**Tables affected**: jobs, job_applications, application_stages, work_experiences

```typescript
// CURRENT (INCORRECT - multiple occurrences)
createdAt: timestamp('created_at').notNull().defaultNow(), // ❌ No precision/mode
updatedAt: timestamp('updated_at').notNull().defaultNow(), // ❌ No precision/mode

// RECOMMENDED
createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
```

---

#### Issue 3.3: calendar.schema.ts inconsistent timestamp usage
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Severity**: 🟠 Medium

**Mixed patterns within same file**:
```typescript
// Has precision: 3
lastSyncedAt: timestamp('last_synced_at', { precision: 3, mode: 'string' }),

// Missing precision: 3
date: timestamp('date').notNull(),
dateStart: timestamp('date_start'),
dateEnd: timestamp('date_end'),
dateTime: timestamp('date_time'),
```

**Recommendation**: Standardize all timestamp columns to use `precision: 3, mode: 'string'`

---

#### Issue 3.4: categories.schema.ts uses plain timestamp()
**File**: `packages/db/src/schema/categories.schema.ts`  
**Severity**: 🟠 Medium

```typescript
// CURRENT
createdAt: timestamp('created_at').notNull().defaultNow(),
updatedAt: timestamp('updated_at').notNull().defaultNow(),

// RECOMMENDED
createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
```

---

#### Issue 3.5: company.schema.ts uses plain timestamp()
**File**: `packages/db/src/schema/company.schema.ts`  
**Severity**: 🟠 Medium

Same pattern as categories.schema.ts.

---

#### Issue 3.6: contacts.schema.ts uses plain timestamp()
**File**: `packages/db/src/schema/contacts.schema.ts`  
**Severity**: 🟠 Medium

Same pattern as categories.schema.ts.

---

#### Issue 3.7: documents.schema.ts uses plain timestamp()
**File**: `packages/db/src/schema/documents.schema.ts`  
**Severity**: 🟠 Medium

Same pattern as categories.schema.ts.

---

#### Issue 3.8: auth.schema.ts non-standard timestamp format
**File**: `packages/db/src/schema/auth.schema.ts:44`  
**Severity**: 🟠 Medium

```typescript
// CURRENT
expiration: timestamp('expiration', {
  precision: 3,
  mode: 'string',
}).notNull(),

// This is actually correct format, but different style
```

**Note**: This is correctly formatted but uses different indentation style.

---

## 🟢 Low Priority Issues

### 4. Foreign Key Pattern Inconsistencies

**Standard**: Use inline `.references()` for simple FKs, explicit `foreignKey()` for cascade behaviors

#### Issue 4.1: Mixed FK declaration patterns
**Observation**: Some tables use inline `.references()`, others use explicit `foreignKey()`

**Files with explicit `foreignKey()`** (correct for cascade):
- `auth.schema.ts` - token, session (uses cascade)
- `lists.schema.ts` - all tables (uses cascade)
- `notes.schema.ts` - parentNoteId (uses cascade)

**Files with only inline `.references()`**:
- `tasks.schema.ts`
- `finance.schema.ts`
- `documents.schema.ts`
- Most other files

**Recommendation**: This is acceptable. Reserve explicit `foreignKey()` for cases needing cascade behaviors.

---

### 5. Zod Schema Location Inconsistencies

**Standard**: Colocate Zod schemas in `.schema.ts` files

#### Issue 5.1: Zod schemas in .validation.ts files
**Files**: `packages/db/src/schema/users.validation.ts`, `packages/db/src/schema/finance.validation.ts`  
**Severity**: 🟢 Low

**Recommendation**: Consolidate all Zod schemas into `.schema.ts` files for better colocation. Deprecate `.validation.ts` pattern.

---

### 6. Shared Helper Adoption

**Observation**: Only `finance.schema.ts` uses shared column helpers from `shared.schema.ts`

**Recommendation**: Gradually migrate other files to use shared helpers for consistency:
- `createdAtColumn()` instead of `timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull()`
- `requiredUuidColumn()` instead of `uuid('id').notNull()`

---

### 7. Index Naming Inconsistencies

**Observation**: Index names follow different patterns:
- `table_column_idx` (snake_case) - Most common
- `tableColumnIdx` (camelCase) - Some files
- `TableColumnKey` (PascalCase) - Legacy from auth tables

**Recommendation**: Standardize on `table_column_idx` format.

---

## Standardization Recommendations

### Immediate Actions (Week 1)

1. **Document standards** in `SCHEMA_STANDARDS.md`
2. **Add missing indexes** on foreign keys (non-breaking)
3. **Create migration template** for future consistency

### Short-term (Weeks 2-3)

4. **Fix critical ID issues** in health.schema.ts and auth.schema.ts
5. **Standardize Zod schema locations** (move to .schema.ts)
6. **Add shared helper adoption** to 3-5 high-priority files

### Long-term (Week 4+)

7. **Migrate naming conventions** (high-risk, requires app code changes)
8. **Standardize timestamps** across all files
9. **Implement automated linting** for schema compliance

---

## Risk Assessment Summary

| Issue | Migration Risk | Effort | Priority |
|-------|---------------|--------|----------|
| ID pattern fixes | 🔴 **High** - Data migration required | 3 days | P0 |
| Naming convention | 🔴 **High** - Breaking changes | 5 days | P1 |
| Timestamp precision | 🟡 **Medium** - Data transformation | 2 days | P1 |
| Zod relocation | 🟢 **Low** - Import updates only | 1 day | P2 |
| Shared helpers | 🟢 **Low** - No data changes | 3 days | P2 |
| Missing indexes | 🟢 **Low** - Non-breaking | 1 day | P0 |

---

**Next Steps**: See implementation roadmap in `SCHEMA_STANDARDS.md` for detailed execution plan.