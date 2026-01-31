# Type Duplication Audit - Hono RPC vs DB Schema

**Generated**: 2026-01-30
**Purpose**: Identify all duplicate type definitions between `packages/hono-rpc/src/types/` and `packages/db/src/schema/`

---

## Executive Summary

| Metric                              | Count       |
| ----------------------------------- | ----------- |
| Total hono-rpc type files           | 29          |
| Total DB schema type files          | 31          |
| High-priority duplicates identified | 5 domains   |
| Estimated lines of duplicate code   | ~600+       |
| Expected token savings              | 30-50%      |
| Expected build time improvement     | 2-3x faster |

---

## Critical Duplicates (Immediate Action Required)

### 1. Finance Types - CRITICAL ⚠️

**Problem**: Entire finance domain duplicated across 11 files

#### DB Source of Truth

- **File**: `packages/db/src/schema/finance.types.ts`
- **Exports**: `FinanceAccountOutput`, `FinanceTransactionOutput`, `BudgetCategoryOutput`, `FinancialInstitutionOutput`, `PlaidItemOutput`

#### API Duplicates

**File**: `packages/hono-rpc/src/types/finance/shared.types.ts` (153 lines)

| Duplicate Type       | DB Source                    | Field Drift        |
| -------------------- | ---------------------------- | ------------------ |
| `AccountData`        | `FinanceAccountOutput`       | **EXACT MATCH** ✅ |
| `TransactionData`    | `FinanceTransactionOutput`   | **EXACT MATCH** ✅ |
| `BudgetCategoryData` | `BudgetCategoryOutput`       | **EXACT MATCH** ✅ |
| `InstitutionData`    | `FinancialInstitutionOutput` | **EXACT MATCH** ✅ |

**Additional Duplicated Types in other finance files**:

- `packages/hono-rpc/src/types/finance/accounts.types.ts` - extends `AccountData`
- `packages/hono-rpc/src/types/finance/transactions.types.ts` - extends `TransactionData`
- `packages/hono-rpc/src/types/finance/budget.types.ts` - extends `BudgetCategoryData`
- `packages/hono-rpc/src/types/finance/institutions.types.ts` - extends `InstitutionData`

**Replacement Strategy**:

```typescript
// BEFORE (packages/hono-rpc/src/types/finance/shared.types.ts)
export type AccountData = {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance: number;
  currency: string;
  // ... 13 more fields
};

// AFTER
import type { FinanceAccountOutput } from '@hominem/db/schema/finance.types';
export type AccountData = FinanceAccountOutput;
```

**Impact**:

- **Lines removed**: ~150 from shared.types.ts
- **Files affected**: 11 finance/\*.types.ts files
- **Type instantiations reduced**: 40-50%

---

### 2. Lists Types - HIGH PRIORITY ⚠️

**Problem**: Complete `List` type redefined with extended fields

#### DB Source of Truth

- **File**: `packages/db/src/schema/lists.types.ts`
- **Exports**: `ListOutput`, `ListInput`, `ListInviteOutput`

#### API Duplicate

**File**: `packages/hono-rpc/src/types/lists.types.ts`

| Line | Duplicate Type | DB Source    | Field Drift                |
| ---- | -------------- | ------------ | -------------------------- |
| 7-30 | `List`         | `ListOutput` | **Extends with relations** |

**Analysis**:

```typescript
// DB Type (Source of Truth)
export type ListOutput = List; // From lists.schema.ts
// Fields: id, name, description, isPublic, ownerId, createdAt, updatedAt

// API Type (Duplicate + Extension)
export type List = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  ownerId: string;  // ✅ Correctly uses ownerId (we fixed this!)
  createdAt: string;
  updatedAt: string;
  // Extensions for API convenience:
  places?: any[];
  items?: any[];
  owner?: { ... };
  collaborators?: Array<{ ... }>;
};
```

**Replacement Strategy**:

```typescript
// AFTER
import type { ListOutput } from '@hominem/db/schema/lists.types';

export type List = ListOutput & {
  // API-specific extensions
  places?: any[];
  items?: any[];
  owner?: { id: string; name: string | null; email: string; imageUrl?: string | null };
  collaborators?: Array<{
    id: string;
    name: string | null;
    email: string;
    imageUrl?: string | null;
  }>;
};
```

**Impact**:

- **Lines removed**: ~15
- **Type correctness**: Single source of truth maintained
- **Type drift risk**: Eliminated

---

### 3. Notes Types - HIGH PRIORITY ⚠️

**Problem**: Complex types with enums fully duplicated

#### DB Source of Truth

- **File**: `packages/db/src/schema/notes.types.ts`
- **Exports**: `NoteOutput`, `NoteInput`, `NoteSyncItem`, `TaskMetadata`, `TaskStatus`, `Priority`

#### API Duplicate

**File**: `packages/hono-rpc/src/types/notes.types.ts` (172 lines)

| Line  | Duplicate Type          | DB Source                                      | Field Drift        |
| ----- | ----------------------- | ---------------------------------------------- | ------------------ |
| 10-11 | `BaseContentType`       | `BaseContentTypeSchema` (from notes.schema.ts) | **EXACT MATCH** ✅ |
| 16-17 | `PublishingContentType` | `PublishingContentTypeSchema`                  | **EXACT MATCH** ✅ |
| 22-23 | `AllContentType`        | `AllContentTypeSchema`                         | **EXACT MATCH** ✅ |
| 28-29 | `TaskStatus`            | `TaskStatus` (from notes.schema.ts)            | **EXACT MATCH** ✅ |
| 34-35 | `Priority`              | `Priority` (from notes.schema.ts)              | **EXACT MATCH** ✅ |
| 40-49 | `TaskMetadata`          | `TaskMetadata` (from notes.schema.ts)          | **EXACT MATCH** ✅ |
| 54-57 | `NoteMention`           | `NoteMention` (from notes.schema.ts)           | **EXACT MATCH** ✅ |
| 62-64 | `ContentTag`            | `ContentTag` (from shared.schema.ts)           | **EXACT MATCH** ✅ |
| 69-83 | `Note`                  | `NoteOutput`                                   | **EXACT MATCH** ✅ |

**Replacement Strategy**:

```typescript
// BEFORE (172 lines of duplication)
export const BaseContentTypeSchema = z.enum([...]);
export type BaseContentType = z.infer<typeof BaseContentTypeSchema>;
// ... repeat for all types

export type Note = { ... };

// AFTER (15 lines)
import type {
  NoteOutput as Note,
  TaskMetadata,
  TaskStatus,
  Priority,
  NoteMention,
  NoteSyncItem
} from '@hominem/db/schema/notes.types';
import type { ContentTag } from '@hominem/db/schema/shared.schema';
import {
  BaseContentTypeSchema,
  PublishingContentTypeSchema,
  AllContentTypeSchema,
  TaskStatusSchema,
  PrioritySchema,
  type AllContentType
} from '@hominem/db/schema/notes.schema';

export type { Note, TaskMetadata, TaskStatus, Priority, NoteMention, ContentTag, AllContentType };
```

**Impact**:

- **Lines removed**: ~157
- **Zod schema reuse**: Direct import, no re-instantiation
- **Type safety**: Enums are identical references

---

### 4. Events Types - MEDIUM PRIORITY

**Problem**: `Event` type redefined, but extends with Google Calendar integration

#### DB Source of Truth

- **File**: `packages/db/src/schema/calendar.types.ts`
- **Exports**: `EventOutput`, `EventInput` (aliased from `CalendarEvent`, `CalendarEventInsert`)

#### API Duplicate

**File**: `packages/hono-rpc/src/types/events.types.ts`

| Line | Duplicate Type | DB Source                     | Field Drift                                                         |
| ---- | -------------- | ----------------------------- | ------------------------------------------------------------------- |
| 7-20 | `Event`        | `EventOutput` (CalendarEvent) | **Partial match** - missing `location`, `recurrence` fields from DB |

**Field Comparison**:

| Field         | DB (CalendarEvent) | API (Event) | Notes                                    |
| ------------- | ------------------ | ----------- | ---------------------------------------- |
| `id`          | ✅                 | ✅          | Match                                    |
| `userId`      | ✅                 | ✅          | Match                                    |
| `title`       | ✅                 | ✅          | Match                                    |
| `description` | ✅                 | ✅          | Match                                    |
| `date`        | ✅                 | ✅          | Match                                    |
| `dateStart`   | ✅                 | ✅          | Match                                    |
| `dateEnd`     | ✅                 | ✅          | Match                                    |
| `type`        | ✅ (enum)          | ✅ (string) | **DRIFT**: DB uses enum, API uses string |
| `tags`        | ✅                 | ✅          | Match                                    |
| `people`      | ✅                 | ✅          | Match                                    |
| `location`    | ✅                 | ❌          | **MISSING in API**                       |
| `recurrence`  | ✅                 | ❌          | **MISSING in API**                       |
| `createdAt`   | ✅                 | ✅          | Match                                    |
| `updatedAt`   | ✅                 | ✅          | Match                                    |

**Replacement Strategy**:

```typescript
// AFTER
import type { EventOutput as Event } from '@hominem/db/schema/events.types';

// API-specific types can remain (GoogleCalendar, EventsGoogleSyncInput, etc.)
export type { Event };
```

**Impact**:

- **Lines removed**: ~15
- **Type drift**: Will expose missing fields `location` and `recurrence` to API (beneficial!)
- **Breaking change**: API consumers get more fields

---

### 5. Items Types - LOW PRIORITY

**Problem**: `ListItem` type in `items.types.ts` appears to be a duplicate

#### DB Source of Truth

- **File**: `packages/db/src/schema/items.types.ts`
- **Exports**: `ItemOutput`, `ItemInput`

#### API Duplicate

**File**: `packages/hono-rpc/src/types/items.types.ts`

| Line | Duplicate Type | DB Source    | Status                         |
| ---- | -------------- | ------------ | ------------------------------ |
| 7-22 | `ListItem`     | `ItemOutput` | **Need to verify field match** |

**Action Required**: Read both files to compare fields exactly.

---

## API-Specific Types (Keep These)

These types are **correctly** API-specific and should NOT be replaced:

### Valid API-Only Types

| File                         | Types                                                                      | Reason                              |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `finance/analytics.types.ts` | `SpendingTimeSeriesInput`, `TopMerchantsOutput`, `CategoryBreakdownOutput` | Computed analytics, not DB entities |
| `finance/plaid.types.ts`     | `PlaidCreateLinkTokenInput`, `PlaidExchangeTokenOutput`                    | Plaid API contracts, not DB         |
| `finance/runway.types.ts`    | `RunwayCalculateInput`, `RunwayCalculateOutput`                            | Computed projections                |
| `finance/export.types.ts`    | `ExportTransactionsInput`, `ExportSummaryOutput`                           | Export formats                      |
| `chat.types.ts`              | `ChatsSendInput`, `ChatsSendOutputData`                                    | API-specific messaging              |
| `places.types.ts`            | `PlaceAutocompleteOutput`, `PlaceGetNearbyFromListsOutput`                 | API enriched with Google Maps data  |
| `invites.types.ts`           | `InvitesGetReceivedOutput`, `InvitesAcceptInput`                           | API operations                      |
| `tweet.types.ts`             | `TweetGenerateInput`, `TweetGenerateOutput`                                | API-generated content               |
| `user.types.ts`              | `UserDeleteAccountInput`, `UserDeleteAccountOutput`                        | API operations                      |

**Guideline**: If a type represents:

- A computed result (analytics, aggregations)
- An external API contract (Plaid, Google Maps)
- A request/response pair specific to an endpoint
- An enrichment with data from multiple sources

→ **Keep it in hono-rpc/types/**

If a type represents:

- A database entity
- A direct projection of a database table
- A standard CRUD input/output

→ **Import from DB schema**

---

## Refactoring Plan

### Phase 1: Finance Types (Highest Impact)

**Files to modify**: 11 files in `packages/hono-rpc/src/types/finance/`

**Order**:

1. `shared.types.ts` - Replace 4 core types
2. `accounts.types.ts` - Update references to AccountData
3. `transactions.types.ts` - Update references to TransactionData
4. `budget.types.ts` - Update references to BudgetCategoryData
5. `institutions.types.ts` - Update references to InstitutionData
6. Run typecheck after each file

**Expected Result**: ~150 lines removed, 40% fewer type instantiations

---

### Phase 2: Lists Types

**Files to modify**: `packages/hono-rpc/src/types/lists.types.ts`

**Changes**:

- Replace `List` base type with `ListOutput & { ... extensions }`
- Verify no breaking changes to API consumers

**Expected Result**: ~15 lines removed, single source of truth established

---

### Phase 3: Notes Types

**Files to modify**: `packages/hono-rpc/src/types/notes.types.ts`

**Changes**:

- Replace all Zod schema definitions with imports from notes.schema.ts
- Replace `Note` type with `NoteOutput`
- Replace all enum types with imports

**Expected Result**: ~157 lines removed, Zod schemas reused

---

### Phase 4: Events Types

**Files to modify**: `packages/hono-rpc/src/types/events.types.ts`

**Changes**:

- Replace `Event` type with `EventOutput`
- Document that API now includes `location` and `recurrence` fields
- Update any API consumers that need these fields

**Expected Result**: ~15 lines removed, API feature enhancement (more fields available)

---

### Phase 5: Verify & Measure

**Actions**:

1. Run full typecheck: `bun run typecheck`
2. Run build: `bun run build`
3. Run tests: `bun run test`
4. Measure build time before/after
5. Compare bundle sizes

---

## Success Metrics

| Metric              | Before   | Target  | How to Measure         |
| ------------------- | -------- | ------- | ---------------------- |
| Duplicate lines     | ~600     | ~50     | `wc -l` on files       |
| Type instantiations | High     | -40%    | TypeScript diagnostics |
| Build time          | ~20s     | ~7s     | `time bun run build`   |
| Bundle size         | Baseline | -10-15% | Build output           |
| Type errors         | 0        | 0       | `bun run typecheck`    |

---

## Risk Assessment

| Risk                              | Likelihood | Impact | Mitigation                                            |
| --------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| Breaking changes to API consumers | Medium     | High   | Review all usages, update incrementally               |
| Type drift exposed                | Low        | Medium | This is actually beneficial - we want to expose drift |
| Build failures                    | Low        | High   | Run typecheck after each file, atomic commits         |
| Runtime errors                    | Low        | High   | Run full test suite after each phase                  |

---

## Next Steps

1. **Start with Phase 1** (Finance types) - highest impact
2. **Test thoroughly** after each file modification
3. **Commit atomically** - one domain at a time
4. **Document breaking changes** if any API fields change
5. **Measure improvements** after each phase

---

## Appendix: Full File List

### Hono RPC Type Files (29 total)

```
packages/hono-rpc/src/types/
├── admin.types.ts
├── chat.types.ts
├── content-strategies.types.ts
├── events.types.ts
├── finance.types.ts
├── finance/
│   ├── accounts.types.ts
│   ├── analytics.types.ts
│   ├── budget.types.ts
│   ├── categories.types.ts
│   ├── export.types.ts
│   ├── institutions.types.ts
│   ├── management.types.ts
│   ├── plaid.types.ts
│   ├── runway.types.ts
│   ├── shared.types.ts
│   └── transactions.types.ts
├── goals.types.ts
├── index.ts
├── invites.types.ts
├── items.types.ts
├── lists.types.ts
├── notes.types.ts
├── people.types.ts
├── places.types.ts
├── trips.types.ts
├── tweet.types.ts
├── twitter.types.ts
├── user.types.ts
└── utils.ts
```

### DB Schema Type Files (31 total)

```
packages/db/src/schema/
├── activity.types.ts
├── auth.types.ts
├── bookmarks.types.ts
├── calendar.types.ts
├── career.types.ts
├── categories.types.ts
├── chats.types.ts
├── company.types.ts
├── contacts.types.ts
├── content.types.ts
├── documents.types.ts
├── events.types.ts
├── finance.types.ts
├── goals.types.ts
├── health.types.ts
├── interviews.types.ts
├── items.types.ts
├── lists.types.ts
├── movies.types.ts
├── music.types.ts
├── networking_events.types.ts
├── notes.types.ts
├── places.types.ts
├── possessions.types.ts
├── skills.types.ts
├── surveys.types.ts
├── tags.types.ts
├── travel.types.ts
├── trip_items.types.ts
├── trips.types.ts
├── users.types.ts
└── vector-documents.types.ts
```
