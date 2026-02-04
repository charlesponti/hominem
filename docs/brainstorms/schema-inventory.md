# Database Schema Inventory

**Generated**: 2026-02-03  
**Total Schema Files**: 30  
**Total Tables**: ~45+  
**Total Foreign Keys**: 67+

## Schema Files Overview

### Users & Auth

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `users.schema.ts` | 2 (users, account) | uuid (no defaultRandom) | **camelCase** | precision: 3, mode: string | No |
| `auth.schema.ts` | 3 (verification_token, token, session) | **serial** (token), uuid (session) | **camelCase** | precision: 3 (most), **no precision** (expiration) | No |

### Content & Knowledge

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `notes.schema.ts` | 1 (notes) | uuid + defaultRandom | **camelCase** | precision: 3, mode: string | No |
| `documents.schema.ts` | 1 (documents) | uuid + defaultRandom | snake_case | Not analyzed | No |
| `bookmarks.schema.ts` | 1 (bookmark) | uuid (no defaultRandom) | **camelCase** | Not analyzed | No |

### Finance

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `finance.schema.ts` | 6 (financial_institutions, plaid_items, finance_accounts, transactions, budget_categories, budget_goals) | text (institutions), uuid + defaultRandom (others) | snake_case | precision: 3 via shared helpers | **Yes** |

### Calendar & Events

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `calendar.schema.ts` | 4 (events, events_tags, events_users, events_transactions) | uuid | snake_case | **Mixed** (some precision: 3, some plain) | No |

### Tasks

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `tasks.schema.ts` | 1 (tasks) | uuid + defaultRandom | snake_case | precision: 3, mode: string | No |

### Travel

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `trips.schema.ts` | 1 (trips) | Not analyzed | Not analyzed | Not analyzed | No |
| `trip_items.schema.ts` | 1 (trip_items) | Not analyzed | Not analyzed | Not analyzed | No |
| `travel.schema.ts` | 3 (flight, hotel, transport) | Not analyzed | Not analyzed | Not analyzed | No |
| `places.schema.ts` | 4 (place, place_tags, route_waypoints, transportation_routes) | Not analyzed | Not analyzed | Not analyzed | No |

### Career & Professional

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `career.schema.ts` | 4 (jobs, job_applications, application_stages, work_experiences) | uuid + defaultRandom | snake_case | **Plain timestamp** (no precision) | No |
| `skills.schema.ts` | 3 (skills, user_skills, job_skills) | Not analyzed | Not analyzed | Not analyzed | No |
| `interviews.schema.ts` | 2 (interviews, interview_interviewers) | Not analyzed | Not analyzed | Not analyzed | No |
| `networking_events.schema.ts` | 2 (networking_events, networking_event_attendees) | Not analyzed | Not analyzed | Not analyzed | No |

### Media & Entertainment

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `movies.schema.ts` | 2 (movie, movie_viewings) | Not analyzed | Not analyzed | Not analyzed | No |
| `music.schema.ts` | 2 (artists, user_artists) | Not analyzed | Not analyzed | Not analyzed | No |

### Lists & Items

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `lists.schema.ts` | 3 (list, user_lists, list_invite) | uuid (no defaultRandom on some) | **camelCase** | precision: 3, mode: string | No |
| `items.schema.ts` | 1 (item) | Not analyzed | Not analyzed | Not analyzed | No |

### Social & Communication

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `contacts.schema.ts` | 1 (contacts) | uuid + defaultRandom | snake_case | Not analyzed | No |
| `chats.schema.ts` | 2 (chat, chat_message) | uuid (no defaultRandom) | **camelCase** | Not analyzed | No |
| `company.schema.ts` | 1 (companies) | uuid + defaultRandom | snake_case | Not analyzed | No |

### Taxonomy

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `tags.schema.ts` | 1 (tags) | Not analyzed | Not analyzed | Not analyzed | No |
| `categories.schema.ts` | 1 (categories) | uuid + defaultRandom | snake_case | Not analyzed | No |

### Goals & Planning

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `goals.schema.ts` | 1 (goals) | Not analyzed | Not analyzed | Not analyzed | No |
| `surveys.schema.ts` | 3 (surveys, survey_options, survey_votes) | Not analyzed | Not analyzed | Not analyzed | No |

### Health

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `health.schema.ts` | 1 (health) | **serial** | snake_case | **Plain timestamp** (no precision, no default) | No |

### Possessions

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `possessions.schema.ts` | 1 (possessions) | Not analyzed | Not analyzed | Not analyzed | No |

### Vector Search

| File | Tables | ID Pattern | Naming Convention | Timestamp Pattern | Shared Helpers |
|------|--------|------------|-------------------|-------------------|----------------|
| `vector-documents.schema.ts` | 1 (vector_documents) | Not analyzed | Not analyzed | Not analyzed | No |

## Pattern Summary

### ID Generation Patterns

| Pattern | Count | Files |
|---------|-------|-------|
| `uuid + defaultRandom()` (Standard) | ~20 tables | tasks, notes, finance, career, etc. |
| `uuid` (NO defaultRandom) | ~10 tables | users, auth.session, bookmarks, lists, chats |
| `serial` (INCORRECT) | 2 tables | auth.token, health |

**Issues Identified**:
1. `health.schema.ts:5` - Uses `serial()` instead of `uuid().defaultRandom()`
2. `auth.schema.ts:38` - Uses `serial()` for token table
3. `users.schema.ts:17` - Uses `uuid()` without `defaultRandom()`
4. Multiple tables use `uuid()` without `defaultRandom()` - requires explicit UUID generation

### Naming Convention Summary

| Convention | Count | Files |
|------------|-------|-------|
| **snake_case** (Standard) | ~15 files | tasks, finance, career, calendar, contacts, etc. |
| **camelCase** (INCORRECT) | ~8 files | users, auth, bookmarks, chats, lists, notes |

**Files with camelCase column names (violating standards)**:
- `users.schema.ts` - `userId`, `createdAt`, `isAdmin`, `supabaseId`, `emailVerified`
- `auth.schema.ts` - `userId`, `createdAt`, `updatedAt`, `emailToken`, `accessToken`, `refreshToken`
- `bookmarks.schema.ts` - `userId`
- `chats.schema.ts` - `userId`, `chatId`, `parentMessageId`
- `lists.schema.ts` - `ownerId`, `isPublic`, `createdAt`, `userId`, `invitedUserId`, `listId`
- `notes.schema.ts` - `userId`, `createdAt`, `updatedAt`, `parentNoteId`, `versionNumber`, `isLatestVersion`, `publishedAt`, `scheduledFor`

### Timestamp Patterns

| Pattern | Count | Files |
|---------|-------|-------|
| `precision: 3, mode: 'string'` (Standard) | ~25 tables | tasks, notes, finance, lists, auth (most), etc. |
| `defaultNow()` only (no precision) | ~10 tables | calendar (some), career, health, categories, company |
| **Plain timestamp()** (INCORRECT) | 3 tables | health, calendar (some), auth (expiration) |

**Files with non-standard timestamps**:
- `health.schema.ts:12` - `timestamp('created_at').defaultNow()` (NO precision, NO mode)
- `career.schema.ts` - Multiple tables use plain `timestamp().defaultNow()` without precision
- `calendar.schema.ts` - Some columns use plain `timestamp()`
- `auth.schema.ts:45` - `expiration` uses non-standard format

### Foreign Key Patterns

| Pattern | Count | Usage |
|---------|-------|-------|
| Inline `.references()` | ~45 | Simple FKs without cascade |
| Explicit `foreignKey()` | ~22 | Complex FKs with cascade behaviors |

**Files using explicit `foreignKey()`**:
- `auth.schema.ts` - token, session tables
- `lists.schema.ts` - list, user_lists, list_invite tables
- `notes.schema.ts` - parentNoteId self-reference

### Shared Helpers Usage

| File | Uses Shared Helpers |
|------|---------------------|
| `finance.schema.ts` | **Yes** - uses `requiredUuidColumn`, `createdAtColumn`, etc. |
| All other files | **No** - define columns inline |

**Shared helpers available in `shared.schema.ts`**:
- `createdAtColumn()`, `updatedAtColumn()`
- `requiredTextColumn()`, `optionalTextColumn()`
- `requiredUuidColumn()`, `optionalUuidColumn()`
- `requiredNumericColumn()`, `optionalNumericColumn()`
- `booleanColumn()`, `jsonColumn()`
- `requiredTimestampColumn()`, `optionalTimestampColumn()`

### Zod Schema Locations

| Location | Count | Files |
|----------|-------|-------|
| `.schema.ts` files | ~15 schemas | goals, notes, finance, tasks, etc. |
| `.validation.ts` files | ~5 schemas | users, finance |

**Files with Zod schemas in .schema.ts**:
- `tasks.schema.ts` - TaskStatusSchema, TaskPrioritySchema
- `goals.schema.ts` - GoalStatusSchema, GoalMilestoneSchema, GoalSchema
- `notes.schema.ts` - NoteStatusSchema, PublishingMetadataSchema
- `finance.schema.ts` - TransactionTypeEnum, AccountTypeEnum

**Files with .validation.ts**:
- `users.validation.ts`
- `finance.validation.ts`

## Relations Coverage

All tables exported in `tables.ts` have corresponding relations defined in `relations.ts`.

**Relations file**: `packages/db/src/schema/relations.ts` (394 lines)
- Well-organized by domain
- Covers all major relationships
- Uses proper `relationName` for bidirectional relationships

## Indexes Overview

**Tables with good index coverage**:
- `finance.transactions` - 4 indexes (user_id, date, account_id, search)
- `notes` - 7 indexes (search, status, type, user, published_at, parent, version)
- `calendar.events` - 8+ indexes

**Tables potentially missing indexes** (FK columns without explicit indexes):
- Many join tables need review
- Some FK columns in high-volume tables

## Critical Issues Summary

### 🔴 Critical (Must Fix)

1. **health.schema.ts** - Uses `serial()` for ID instead of `uuid`
2. **auth.schema.ts:38** - Token table uses `serial()` instead of `uuid`
3. **users.schema.ts:17** - Users table lacks `defaultRandom()` on UUID

### 🟡 High Priority (Significant Impact)

4. **Naming convention drift** - 8 files use camelCase column names
5. **Timestamp inconsistency** - Multiple files lack precision settings
6. **Missing shared helper adoption** - Only finance uses shared helpers

### 🟢 Medium Priority (Quality Improvements)

7. **Zod schema location inconsistency** - Mixed between .schema.ts and .validation.ts
8. **Foreign key pattern inconsistency** - Mix of inline and explicit FKs
9. **Index coverage gaps** - Some FK columns lack indexes

---

**Next Steps**: See `docs/plans/2026-02-03-refactor-database-schema-analysis-plan.md` for detailed analysis and implementation roadmap.