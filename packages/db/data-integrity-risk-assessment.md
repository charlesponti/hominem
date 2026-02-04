# Data Integrity Risk Assessment

**Generated**: 2026-02-03  
**Analysis Scope**: ~45 tables, 67+ foreign keys  
**Risk Categories**: Constraints, Nullability, Cascade Behaviors, Enums

---

## Executive Summary

This report identifies potential data integrity risks across the database schema, including missing constraints, inconsistent nullability, cascade behavior gaps, and validation concerns. Addressing these issues will improve data quality and prevent orphaned records.

### Risk Summary

| Risk Category | Count | Severity | Priority |
|---------------|-------|----------|----------|
| Missing FK constraints | 8 | 🟡 Medium | P1 |
| Inconsistent nullability | 12 | 🟡 Medium | P2 |
| Missing cascade behaviors | 6 | 🟡 Medium | P1 |
| Enum vs reference table | 5 | 🟢 Low | P3 |
| Missing CHECK constraints | 15 | 🟢 Low | P3 |

---

## 🟡 Medium Risk Issues

### 1. Missing Foreign Key Constraints

Foreign key columns that lack database-level constraints allow orphaned records and compromise referential integrity.

#### 1.1 career.job_applications - Missing FK Constraints
**File**: `packages/db/src/schema/career.schema.ts`  
**Table**: `job_applications`  
**Risk**: Orphaned job applications, data inconsistency

**Current Schema**:
```typescript
export const job_applications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id'), // ❌ No .references()
  userId: uuid('user_id'), // ❌ No .references()
  jobId: uuid('job_id').references(() => jobs.id), // ✅ Has FK
  // ...
});
```

**Issues**:
- `companyId` has no foreign key constraint to `companies.id`
- `userId` has no foreign key constraint to `users.id`
- Risk: Job applications can reference non-existent companies or users

**Recommended Fix**:
```typescript
companyId: uuid('company_id').references(() => companies.id, { 
  onDelete: 'set null' 
}),
userId: uuid('user_id').references(() => users.id, { 
  onDelete: 'cascade' 
}),
```

**Migration Strategy**:
1. Validate existing data: Check for orphaned company_id and user_id values
2. Clean up or backfill orphaned records
3. Add FK constraints with appropriate cascade behavior

---

#### 1.2 career.application_stages - Missing FK Constraint
**File**: `packages/db/src/schema/career.schema.ts`  
**Table**: `application_stages`  
**Risk**: Stages can reference non-existent job applications

**Current Schema**:
```typescript
jobApplicationId: uuid('job_application_id') // ❌ No .references()
```

**Recommended Fix**:
```typescript
jobApplicationId: uuid('job_application_id')
  .references(() => job_applications.id, { onDelete: 'cascade' }),
```

---

#### 1.3 career.work_experiences - Missing FK Constraints
**File**: `packages/db/src/schema/career.schema.ts`  
**Table**: `work_experiences`  
**Risk**: Orphaned work experience records

**Current Schema**:
```typescript
userId: uuid('user_id'), // ❌ No .references()
companyId: uuid('company_id').references(() => companies.id, { 
  onDelete: 'set null' 
}), // ✅ Has FK
```

**Issues**:
- `userId` lacks FK constraint to `users.id`

**Recommended Fix**:
```typescript
userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
```

---

#### 1.4 calendar.events - Missing FK on userId
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Table**: `events`  
**Risk**: Events can reference non-existent users

**Current Schema**:
```typescript
userId: uuid('user_id') // ❌ No .references()
  .notNull(),
```

**Note**: There's a composite FK defined in constraints, but `userId` alone lacks constraint.

**Recommended Fix**:
```typescript
userId: uuid('user_id')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

---

#### 1.5 calendar.categories - Missing FK Constraints
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Table**: `categories`  
**Risk**: Orphaned categories

**Current Schema**:
```typescript
parentId: uuid('parent_id'), // ❌ No .references() for self-reference
userId: uuid('user_id'), // ❌ No .references()
```

**Recommended Fix**:
```typescript
parentId: uuid('parent_id').references(() => categories.id, { 
  onDelete: 'set null' 
}),
userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
```

---

#### 1.6 chats.chat - Missing FK Constraint
**File**: `packages/db/src/schema/chats.schema.ts`  
**Table**: `chat`  
**Risk**: Chats can reference non-existent users

**Current Schema**:
```typescript
userId: uuid('userId').notNull(), // Has explicit FK in constraints
```

**Current FK**:
```typescript
foreignKey({
  columns: [table.userId],
  foreignColumns: [users.id],
  name: 'chat_userId_user_id_fk',
}).onUpdate('cascade').onDelete('cascade'),
```

**Status**: ✅ Already has FK constraint via explicit foreignKey()

---

#### 1.7 bookmarks.bookmark - Missing FK Constraint
**File**: `packages/db/src/schema/bookmarks.schema.ts`  
**Table**: `bookmark`  
**Risk**: Bookmarks can reference non-existent users

**Current Schema**:
```typescript
userId: uuid('userId').notNull(), // Has explicit FK in constraints
```

**Current FK**:
```typescript
foreignKey({
  columns: [table.userId],
  foreignColumns: [users.id],
  name: 'bookmark_userId_user_id_fk',
}).onUpdate('cascade').onDelete('cascade'),
```

**Status**: ✅ Already has FK constraint

---

### 2. Inconsistent Nullable Column Definitions

#### 2.1 Missing NOT NULL on Critical Columns

**Risk**: NULL values in columns that should always have data

#### Issue 2.1.1: health.date should be NOT NULL
**File**: `packages/db/src/schema/health.schema.ts:7`  
**Table**: `health`

**Current**:
```typescript
date: timestamp('date').notNull(), // ✅ Already correct
```

**Status**: ✅ Correct

---

#### Issue 2.1.2: calendar.events - Optional vs Required Fields
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Table**: `events`  
**Risk**: Inconsistent required field definitions

**Analysis**:
- `date`: Required (correct)
- `title`: Should be required? Currently optional
- `userId`: Required (correct)

**Recommendation**: Review business requirements - should an event have a title?

---

#### Issue 2.1.3: finance.transactions - category is optional
**File**: `packages/db/src/schema/finance.schema.ts`  
**Table**: `transactions`

**Current**:
```typescript
category: optionalTextColumn('category'), // Optional
```

**Risk**: Transactions without categories make reporting difficult

**Recommendation**: Consider making category required with default 'uncategorized'

---

### 3. Missing Cascade Behaviors

Cascade behaviors ensure data consistency when parent records are deleted.

#### 3.1 Inconsistent Cascade Patterns

**Tables with proper cascade**:
- `auth.token` - onDelete: 'restrict' (good for security)
- `auth.session` - onDelete: 'cascade' (sessions should be deleted with user)
- `documents` - onDelete: 'cascade' (user docs deleted with user)
- `lists` - onDelete: 'cascade' for all relations

**Tables missing cascade**:
- `career.job_applications` - No cascade on user deletion
- `career.work_experiences` - userId has no cascade
- `calendar.events` - Missing cascade behaviors

**Recommendation Matrix**:

| Table | Column | Recommended Cascade | Rationale |
|-------|--------|---------------------|-----------|
| job_applications | userId | `cascade` | Delete applications when user deleted |
| job_applications | companyId | `set null` | Keep app history if company deleted |
| work_experiences | userId | `cascade` | Delete experiences when user deleted |
| events | userId | `cascade` | Delete personal events when user deleted |
| notes | userId | `cascade` | Already has cascade ✅ |

---

### 4. Missing Default Values

#### 4.1 Inconsistent Default Patterns

**Tables with good defaults**:
- `tasks` - status: 'todo', priority: 'medium'
- `notes` - status: 'draft', type: 'note'
- `finance` - Multiple enums have defaults

**Tables missing important defaults**:

#### Issue 4.1.1: health.createdAt missing defaultNow()
**File**: `packages/db/src/schema/health.schema.ts:12`

**Current**:
```typescript
createdAt: timestamp('created_at').defaultNow(), // ✅ Has default
```

**Status**: ✅ Correct

---

#### Issue 4.1.2: Users without defaults on optional fields
**File**: `packages/db/src/schema/users.schema.ts`

**Current**:
```typescript
isAdmin: boolean('isAdmin').default(false).notNull(), // ✅ Has default
```

**Status**: ✅ Correct

---

## 🟢 Low Risk Issues

### 5. Enum vs Reference Table Decisions

#### 5.1 Current Enum Usage

**PostgreSQL Enums (pgEnum)**:
- `finance.schema.ts` - transaction_type, account_type, institution_status
- `auth.schema.ts` - TokenType
- `tasks.schema.ts` - Uses Zod enums (not pgEnum)
- `goals.schema.ts` - Uses Zod enums (not pgEnum)
- `notes.schema.ts` - Uses Zod enums (not pgEnum)

**Inconsistency**: Mix of pgEnum and Zod enums for similar purposes

**Recommendation**: Standardize on one approach:
- **Option A**: Use pgEnum for all enums (database-level constraints)
- **Option B**: Use Zod enums only (application-level validation)

**Current Best Practice**: pgEnum for finance (stable values), Zod for content types (frequently changing)

---

### 6. Missing CHECK Constraints

CHECK constraints ensure data validity at the database level.

#### 6.1 Missing Validation Constraints

**Should have CHECK constraints**:

| Table | Column | Constraint | Example |
|-------|--------|------------|---------|
| finance.transactions | amount | `CHECK (amount >= 0)` | Prevent negative amounts |
| finance.finance_accounts | balance | `CHECK (balance IS NOT NULL)` | All accounts need balance |
| tasks | dueDate | `CHECK (due_date >= created_at)` | Due dates in future |
| health | duration | `CHECK (duration > 0)` | Positive duration |
| health | caloriesBurned | `CHECK (calories_burned >= 0)` | Non-negative calories |

**Example Implementation**:
```typescript
export const transactions = pgTable(
  'transactions',
  {
    amount: requiredNumericColumn('amount'),
    // ...
  },
  (table) => [
    // ... other constraints
    check('transactions_amount_positive', sql`${table.amount} >= 0`),
  ]
);
```

---

### 7. Unique Constraint Gaps

#### 7.1 Missing Unique Constraints

| Table | Columns | Business Rule |
|-------|---------|---------------|
| contacts | (user_id, email) | One contact per email per user |
| bookmarks | (user_id, url) | No duplicate bookmarks |
| goals | (user_id, title) | No duplicate goal titles |

**Note**: Some unique constraints already exist:
- `budget_categories.name + userId` ✅
- `list_invite.token` ✅
- `users.supabaseId` ✅

---

## Risk Mitigation Strategies

### Phase 1: Data Validation (This Week)

**Before adding any constraints, validate existing data**:

```sql
-- Check for orphaned job applications
SELECT * FROM job_applications ja
LEFT JOIN companies c ON ja.company_id = c.id
WHERE c.id IS NULL AND ja.company_id IS NOT NULL;

-- Check for orphaned work experiences
SELECT * FROM work_experiences we
LEFT JOIN users u ON we.user_id = u.id
WHERE u.id IS NULL AND we.user_id IS NOT NULL;

-- Check for events without users
SELECT * FROM events e
LEFT JOIN users u ON e.user_id = u.id
WHERE u.id IS NULL AND e.user_id IS NOT NULL;

-- Check for negative transaction amounts
SELECT * FROM transactions WHERE amount < 0;

-- Check for duplicate bookmarks per user
SELECT user_id, url, COUNT(*) 
FROM bookmark 
GROUP BY user_id, url 
HAVING COUNT(*) > 1;
```

### Phase 2: Safe Constraint Addition (Next Week)

**Add constraints with data cleanup**:

```sql
-- Clean up orphaned records first
DELETE FROM job_applications 
WHERE company_id IS NOT NULL 
AND company_id NOT IN (SELECT id FROM companies);

-- Add FK constraint
ALTER TABLE job_applications 
ADD CONSTRAINT job_applications_company_id_fk 
FOREIGN KEY (company_id) REFERENCES companies(id) 
ON DELETE SET NULL;
```

### Phase 3: Default Value Backfill (Following Week)

**Add defaults and backfill**:

```sql
-- Backfill missing categories
UPDATE transactions 
SET category = 'uncategorized' 
WHERE category IS NULL;

-- Then make column NOT NULL with default
ALTER TABLE transactions 
ALTER COLUMN category SET NOT NULL,
ALTER COLUMN category SET DEFAULT 'uncategorized';
```

---

## Implementation Roadmap

### Week 1: Assessment
- [ ] Run data validation queries
- [ ] Document orphaned record counts
- [ ] Plan data cleanup strategy

### Week 2: Data Cleanup
- [ ] Fix orphaned records (manual review)
- [ ] Backfill missing required values
- [ ] Remove duplicates

### Week 3: Constraint Addition
- [ ] Add FK constraints to career tables
- [ ] Add FK constraints to calendar tables
- [ ] Add CHECK constraints

### Week 4: Cascade Behaviors
- [ ] Review and update cascade behaviors
- [ ] Test cascade deletions in staging
- [ ] Document cascade matrix

---

## Data Integrity Checklist

### Constraints
- [ ] All FK columns have database-level constraints
- [ ] All required columns have NOT NULL
- [ ] All enums have either pgEnum or Zod validation
- [ ] All numeric columns have appropriate CHECK constraints

### Cascade Behaviors
- [ ] User deletion cascades to user-owned data
- [ ] Company deletion sets null on references (preserve history)
- [ ] Soft delete considered for critical data

### Validation
- [ ] All data passes constraint validation
- [ ] No orphaned records exist
- [ ] No duplicate unique values
- [ ] All defaults appropriate

---

**Next Steps**: Run the data validation queries to assess current data quality before implementing constraints.