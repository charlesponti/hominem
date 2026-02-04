# Missing Index Analysis Report

**Generated**: 2026-02-03  
**Analysis Scope**: ~45 tables, 67+ foreign keys  
**Priority**: Performance optimization

---

## Executive Summary

This report identifies missing indexes that impact query performance, particularly on foreign key columns and frequently filtered fields. Adding these indexes will improve query response times, especially for high-volume tables like `transactions`, `events`, and `notes`.

### Index Coverage Overview

| Category | Count | Status |
|----------|-------|--------|
| Tables with good index coverage | 8 | ✅ |
| Tables missing FK indexes | 12 | ⚠️ |
| Tables needing composite indexes | 5 | ⚠️ |
| High-priority missing indexes | 8 | 🔴 |

---

## 🔴 High Priority Missing Indexes

### 1. Foreign Key Indexes (Critical)

Foreign keys without indexes cause full table scans during joins and cascade operations.

#### 1.1 career.job_applications - Missing FK Indexes
**File**: `packages/db/src/schema/career.schema.ts`  
**Table**: `job_applications`  
**Priority**: 🔴 High  
**Risk**: Job application queries are common; missing indexes cause slow lookups

**Missing Indexes**:
```sql
-- Company ID lookups
CREATE INDEX CONCURRENTLY "job_applications_company_id_idx" 
ON "job_applications" ("company_id");

-- Job ID lookups
CREATE INDEX CONCURRENTLY "job_applications_job_id_idx" 
ON "job_applications" ("job_id");

-- User ID lookups (high priority - users query their applications)
CREATE INDEX CONCURRENTLY "job_applications_user_id_idx" 
ON "job_applications" ("user_id");
```

**Current State**:
```typescript
// Current columns without indexes
companyId: uuid('company_id') // No .references(), no index
jobId: uuid('job_id').references(() => jobs.id), // Has FK, no index
userId: uuid('user_id') // No .references(), no index
```

**Query Impact**:
```sql
-- Slow query without index
SELECT * FROM job_applications WHERE user_id = 'uuid';
-- Full table scan: O(n) complexity

-- Fast query with index
SELECT * FROM job_applications WHERE user_id = 'uuid';
-- Index scan: O(log n) complexity
```

---

#### 1.2 calendar.events - Missing placeId Index
**File**: `packages/db/src/schema/calendar.schema.ts:32`  
**Table**: `events`  
**Priority**: 🔴 High  
**Risk**: Event location queries are slow without index

**Missing Index**:
```sql
CREATE INDEX CONCURRENTLY "events_place_id_idx" 
ON "events" ("place_id");
```

**Current State**:
```typescript
placeId: uuid('place_id').references(() => place.id), // Has FK, no index
```

---

#### 1.3 calendar.events_users - Missing Composite Index
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Table**: `events_users`  
**Priority**: 🔴 High  
**Risk**: Join table lookups are slow

**Missing Index**:
```sql
-- Composite index for efficient lookups by event or user
CREATE INDEX CONCURRENTLY "events_users_event_id_idx" 
ON "events_users" ("event_id");

CREATE INDEX CONCURRENTLY "events_users_person_id_idx" 
ON "events_users" ("person_id");
```

---

#### 1.4 calendar.events_transactions - Missing Indexes
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Table**: `events_transactions`  
**Priority**: 🔴 High

**Missing Indexes**:
```sql
CREATE INDEX CONCURRENTLY "events_transactions_event_id_idx" 
ON "events_transactions" ("event_id");

CREATE INDEX CONCURRENTLY "events_transactions_transaction_id_idx" 
ON "events_transactions" ("transaction_id");
```

---

#### 1.5 finance.transactions - Missing fromAccountId/toAccountId Indexes
**File**: `packages/db/src/schema/finance.schema.ts`  
**Table**: `transactions`  
**Priority**: 🔴 High  
**Risk**: Transfer queries are slow

**Current Indexes** (Good):
```typescript
index('transactions_user_id_idx').on(table.userId),
index('transactions_date_idx').on(table.date),
index('transactions_account_id_idx').on(table.accountId),
```

**Missing Indexes**:
```sql
-- Transfer account lookups
CREATE INDEX CONCURRENTLY "transactions_from_account_id_idx" 
ON "transactions" ("from_account_id");

CREATE INDEX CONCURRENTLY "transactions_to_account_id_idx" 
ON "transactions" ("to_account_id");

-- Composite for transfer queries
CREATE INDEX CONCURRENTLY "transactions_from_to_idx" 
ON "transactions" ("from_account_id", "to_account_id");
```

---

#### 1.6 finance.plaid_items - Missing institutionId Index
**File**: `packages/db/src/schema/finance.schema.ts`  
**Table**: `plaid_items`  
**Priority**: 🔴 High

**Current Schema**:
```typescript
institutionId: text('institution_id')
  .references(() => financialInstitutions.id)
  .notNull(), // No index
```

**Missing Index**:
```sql
CREATE INDEX CONCURRENTLY "plaid_items_institution_id_idx" 
ON "plaid_items" ("institution_id");
```

---

#### 1.7 finance.finance_accounts - Missing Indexes
**File**: `packages/db/src/schema/finance.schema.ts`  
**Table**: `finance_accounts`  
**Priority**: 🔴 High

**Missing Indexes**:
```sql
-- Institution lookups
CREATE INDEX CONCURRENTLY "finance_accounts_institution_id_idx" 
ON "finance_accounts" ("institution_id");

-- Plaid item lookups
CREATE INDEX CONCURRENTLY "finance_accounts_plaid_item_id_idx" 
ON "finance_accounts" ("plaid_item_id");

-- User lookups (if not already indexed)
CREATE INDEX CONCURRENTLY "finance_accounts_user_id_idx" 
ON "finance_accounts" ("user_id");
```

---

#### 1.8 documents - Missing userId Index
**File**: `packages/db/src/schema/documents.schema.ts`  
**Table**: `documents`  
**Priority**: 🔴 High

**Current Schema**:
```typescript
userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
// Has FK, but no explicit index
```

**Current Indexes**:
```typescript
userIdx: index('doc_user_id_idx').on(table.userId), // ✅ Already exists
```

**Status**: ✅ Already has index

---

## 🟡 Medium Priority Missing Indexes

### 2. Frequently Filtered Columns

#### 2.1 calendar.events - Additional Status/Type Indexes
**File**: `packages/db/src/schema/calendar.schema.ts`  
**Table**: `events`  
**Priority**: 🟡 Medium

**Current Indexes** (Good coverage):
```typescript
index('events_status_idx').on(table.status),
index('events_type_idx').on(table.type),
index('events_date_idx').on(table.date),
```

**Recommended Additional**:
```sql
-- Composite for status + date queries (common pattern)
CREATE INDEX CONCURRENTLY "events_status_date_idx" 
ON "events" ("status", "date");

-- User + date range queries
CREATE INDEX CONCURRENTLY "events_user_id_date_idx" 
ON "events" ("user_id", "date");
```

---

#### 2.2 notes - Missing Composite Indexes
**File**: `packages/db/src/schema/notes.schema.ts`  
**Table**: `notes`  
**Priority**: 🟡 Medium

**Current Indexes** (Excellent):
```typescript
index('notes_status_idx').on(table.status),
index('notes_type_idx').on(table.type),
index('notes_user_idx').on(table.userId),
index('notes_published_at_idx').on(table.publishedAt),
```

**Recommended Additional**:
```sql
-- User + status queries
CREATE INDEX CONCURRENTLY "notes_user_status_idx" 
ON "notes" ("user_id", "status");

-- User + type queries
CREATE INDEX CONCURRENTLY "notes_user_type_idx" 
ON "notes" ("user_id", "type");
```

---

#### 2.3 tasks - Missing Composite Indexes
**File**: `packages/db/src/schema/tasks.schema.ts`  
**Table**: `tasks`  
**Priority**: 🟡 Medium

**Current Indexes** (Good):
```typescript
index('tasks_user_idx').on(table.userId),
index('tasks_status_idx').on(table.status),
index('tasks_due_date_idx').on(table.dueDate),
```

**Recommended Additional**:
```sql
-- User + status (common filter pattern)
CREATE INDEX CONCURRENTLY "tasks_user_status_idx" 
ON "tasks" ("user_id", "status");

-- User + priority
CREATE INDEX CONCURRENTLY "tasks_user_priority_idx" 
ON "tasks" ("user_id", "priority");

-- Status + due date
CREATE INDEX CONCURRENTLY "tasks_status_due_date_idx" 
ON "tasks" ("status", "due_date");
```

---

#### 2.4 career.work_experiences - Missing Indexes
**File**: `packages/db/src/schema/career.schema.ts`  
**Table**: `work_experiences`  
**Priority**: 🟡 Medium

**Current Indexes**:
```typescript
index('work_exp_user_id_idx').on(table.userId),
index('work_exp_company_id_idx').on(table.companyId),
index('work_exp_visible_idx').on(table.isVisible),
```

**Missing Index**:
```sql
-- Date range queries (common for work history)
CREATE INDEX CONCURRENTLY "work_exp_start_date_idx" 
ON "work_experiences" ("start_date");

CREATE INDEX CONCURRENTLY "work_exp_end_date_idx" 
ON "work_experiences" ("end_date");
```

---

### 3. Join Table Indexes

#### 3.1 career.application_stages - Missing jobApplicationId Index
**File**: `packages/db/src/schema/career.schema.ts`  
**Table**: `application_stages`  
**Priority**: 🟡 Medium

**Current Schema**:
```typescript
jobApplicationId: uuid('job_application_id') // No FK, no index
```

**Current Index**:
```typescript
jobApplicationIdIdx: index('app_stage_job_app_id_idx').on(table.jobApplicationId), // ✅
```

**Status**: ✅ Already has index

---

#### 3.2 skills.user_skills - Missing Indexes
**File**: `packages/db/src/schema/skills.schema.ts`  
**Table**: `user_skills`  
**Priority**: 🟡 Medium

**Missing Indexes**:
```sql
CREATE INDEX CONCURRENTLY "user_skills_user_id_idx" 
ON "user_skills" ("user_id");

CREATE INDEX CONCURRENTLY "user_skills_skill_id_idx" 
ON "user_skills" ("skill_id");
```

---

#### 3.3 skills.job_skills - Missing Indexes
**File**: `packages/db/src/schema/skills.schema.ts`  
**Table**: `job_skills`  
**Priority**: 🟡 Medium

**Missing Indexes**:
```sql
CREATE INDEX CONCURRENTLY "job_skills_job_id_idx" 
ON "job_skills" ("job_id");

CREATE INDEX CONCURRENTLY "job_skills_skill_id_idx" 
ON "job_skills" ("skill_id");
```

---

#### 3.4 networking_events.networking_event_attendees
**File**: `packages/db/src/schema/networking_events.schema.ts`  
**Table**: `networking_event_attendees`  
**Priority**: 🟡 Medium

**Current Indexes** (Good):
```typescript
eventIdx: index('nea_event_id_idx').on(table.networkingEventId),
contactIdx: index('nea_contact_id_idx').on(table.contactId),
```

**Status**: ✅ Already has indexes

---

#### 3.5 interviews.interview_interviewers
**File**: `packages/db/src/schema/interviews.schema.ts`  
**Table**: `interview_interviewers`  
**Priority**: 🟡 Medium

**Current Indexes** (Good):
```typescript
interviewIdx: index('ii_interview_id_idx').on(table.interviewId),
contactIdx: index('ii_contact_id_idx').on(table.contactId),
```

**Status**: ✅ Already has indexes

---

#### 3.6 movies.movie_viewings
**File**: `packages/db/src/schema/movies.schema.ts`  
**Priority**: 🟡 Medium

**Missing Indexes**:
```sql
CREATE INDEX CONCURRENTLY "movie_viewings_movie_id_idx" 
ON "movie_viewings" ("movie_id");

CREATE INDEX CONCURRENTLY "movie_viewings_user_id_idx" 
ON "movie_viewings" ("user_id");
```

---

#### 3.7 music.user_artists
**File**: `packages/db/src/schema/music.schema.ts`  
**Table**: `user_artists`  
**Priority**: 🟡 Medium

**Current Indexes** (Good):
```typescript
user_id_idx: index('user_id_idx').on(table.userId),
artist_id_idx: index('artist_id_idx').on(table.artistId),
```

**Status**: ✅ Already has indexes

---

### 4. Unique Constraint Indexes

#### 4.1 lists.list_invite - Already has unique index
**File**: `packages/db/src/schema/lists.schema.ts:116`  
**Status**: ✅ Already has `uniqueIndex('list_invite_token_unique')`

---

#### 4.2 finance.budget_categories - Already has unique index
**File**: `packages/db/src/schema/finance.schema.ts:209`  
**Status**: ✅ Already has `uniqueIndex('budget_categories_name_user_id_unique')`

---

## 🟢 Low Priority Indexes

### 5. Search and Full-Text Indexes

#### 5.1 Additional Full-Text Search Opportunities

**Tables with good GIN indexes**:
- `finance.transactions` - Comprehensive search index ✅
- `finance.financial_institutions` - Search index ✅
- `finance.finance_accounts` - Search index ✅
- `notes` - Excellent weighted search index ✅

**Tables that could benefit**:
- `contacts` - Name/email search
- `documents` - Content search
- `bookmarks` - URL/title search

---

## Migration Scripts

### Phase 1: High Priority (Safe to add)

```sql
-- =============================================
-- HIGH PRIORITY INDEX MIGRATIONS
-- Phase 1: Non-blocking index creation
-- Run during low-traffic period
-- =============================================

-- Career module indexes
CREATE INDEX CONCURRENTLY "job_applications_company_id_idx" 
ON "job_applications" ("company_id");

CREATE INDEX CONCURRENTLY "job_applications_job_id_idx" 
ON "job_applications" ("job_id");

CREATE INDEX CONCURRENTLY "job_applications_user_id_idx" 
ON "job_applications" ("user_id");

-- Calendar indexes
CREATE INDEX CONCURRENTLY "events_place_id_idx" 
ON "events" ("place_id");

CREATE INDEX CONCURRENTLY "events_users_event_id_idx" 
ON "events_users" ("event_id");

CREATE INDEX CONCURRENTLY "events_users_person_id_idx" 
ON "events_users" ("person_id");

CREATE INDEX CONCURRENTLY "events_transactions_event_id_idx" 
ON "events_transactions" ("event_id");

CREATE INDEX CONCURRENTLY "events_transactions_transaction_id_idx" 
ON "events_transactions" ("transaction_id");

-- Finance indexes
CREATE INDEX CONCURRENTLY "transactions_from_account_id_idx" 
ON "transactions" ("from_account_id");

CREATE INDEX CONCURRENTLY "transactions_to_account_id_idx" 
ON "transactions" ("to_account_id");

CREATE INDEX CONCURRENTLY "plaid_items_institution_id_idx" 
ON "plaid_items" ("institution_id");

CREATE INDEX CONCURRENTLY "finance_accounts_institution_id_idx" 
ON "finance_accounts" ("institution_id");

CREATE INDEX CONCURRENTLY "finance_accounts_plaid_item_id_idx" 
ON "finance_accounts" ("plaid_item_id");
```

### Phase 2: Medium Priority

```sql
-- =============================================
-- MEDIUM PRIORITY INDEX MIGRATIONS
-- Phase 2: Composite and date indexes
-- =============================================

-- Task composite indexes
CREATE INDEX CONCURRENTLY "tasks_user_status_idx" 
ON "tasks" ("user_id", "status");

CREATE INDEX CONCURRENTLY "tasks_user_priority_idx" 
ON "tasks" ("user_id", "priority");

-- Event composite indexes
CREATE INDEX CONCURRENTLY "events_status_date_idx" 
ON "events" ("status", "date");

CREATE INDEX CONCURRENTLY "events_user_id_date_idx" 
ON "events" ("user_id", "date");

-- Note composite indexes
CREATE INDEX CONCURRENTLY "notes_user_status_idx" 
ON "notes" ("user_id", "status");

-- Skills join table indexes
CREATE INDEX CONCURRENTLY "user_skills_user_id_idx" 
ON "user_skills" ("user_id");

CREATE INDEX CONCURRENTLY "user_skills_skill_id_idx" 
ON "user_skills" ("skill_id");
```

---

## Performance Impact Estimates

| Index | Query Improvement | Estimated Benefit |
|-------|-------------------|-------------------|
| `job_applications_user_id_idx` | 10-100x faster | High - User dashboard queries |
| `events_place_id_idx` | 5-50x faster | Medium - Location-based queries |
| `transactions_from_account_id_idx` | 5-20x faster | High - Transfer history |
| `tasks_user_status_idx` | 10-50x faster | High - Task filtering |
| Composite indexes | 2-10x faster | Medium - Multi-column filters |

---

## Implementation Checklist

### Phase 1 (This Week)
- [ ] Run high-priority index migrations
- [ ] Monitor query performance before/after
- [ ] Verify no locking issues during creation (used CONCURRENTLY)

### Phase 2 (Next Week)
- [ ] Run medium-priority index migrations
- [ ] Update schema files to include index definitions
- [ ] Document index rationale in comments

### Ongoing
- [ ] Monitor pg_stat_user_indexes for unused indexes
- [ ] Review slow query logs monthly
- [ ] Update index strategy based on query patterns

---

**Next Steps**: Add these indexes to the Drizzle schema files and generate migration using `bun run db:generate`.