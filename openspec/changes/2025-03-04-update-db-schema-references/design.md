## Context

The database schema is complete and deployed. This change defines the exact `@hominem/db` service redesign so implementation is mechanical and low-decision.

## Implementation Lock

The following items are fixed for this change and should not vary during implementation:

- Service files and export names
- Method signatures and return contracts
- Ownership filters (`userId`/`ownerUserId`) on all user-scoped queries
- Error contract (`null` or `[]` for expected misses, typed errors for system failures)
- API boundary validation (Zod in API layer before calling DB services)
- Testing philosophy and gate order (integration-first slice tests, then selective pure unit tests)
- Domain contract ownership (`packages/<module>/src/contracts.ts`) and strict no-import rule for `@hominem/db/schema/<module>` and `@hominem/db/types/<module>` outside `packages/db`
- Finance taxonomy rule: no `finance_categories` dependency; finance classification/filtering is tag-driven on shared tags infrastructure

## Execution Order Lock (Authoritative)

Implementation and stabilization must execute in this sequence:

1. Restore hard gates for DB service layer (`validate-db-imports`, `@hominem/db` typecheck)
2. Finalize shared test scaffolding to eliminate duplicate test wiring
3. Run service-by-service RED-GREEN with real tests only
4. Stabilize API and RPC consumers against new service contracts
5. Verify app-layer RPC-only usage and remove contract violations
6. Run full repo gates and performance validation

No downstream phase begins while any upstream phase has red gate status.

## Naming Lock (Calendar Is Canonical)

- Calendar domain naming is canonical for scheduled-time entities.
- `events` naming is legacy and must be retired as part of replacement, not preserved.
- No alias/shim route, type, or package surface may keep `events` as a calendar synonym.

## Testing Philosophy Lock (Integration-First Slice Testing)

Testing is contract-first and integration-first:

1. Primary RED-GREEN tests are DB-backed integration slice tests
2. Slice tests must hit real service/query code paths with the test DB
3. Assertions must include both flow outcomes and capability invariants (ownership, idempotency, deterministic ordering/pagination, conflict behavior)
4. Pure unit tests are allowed only for isolated pure logic modules where DB integration adds no signal
5. Unit tests must not duplicate already-covered integration behavior unless needed for fast failure localization

Forbidden:

- Test skeleton/placeholders without concrete arrange/act/assert
- Mock-only service coverage when capability behavior depends on query/DB semantics
- Declaring a module green without DB-backed contract tests for its capabilities

### No-Shim Enforcement (Hard Requirement)

During integration/cutover phases:

- Legacy compatibility shims are forbidden
- Legacy alias exports are forbidden
- Wrapper modules preserving removed schema/service contracts are forbidden
- Dual-path execution (legacy + new) is forbidden

Cutover rule:

- Each legacy module is replaced directly on new architecture interfaces and then deleted
- Replaced surfaces must not reintroduce old contract names via aliases

## Legacy Module Replacement Build Order (Strict)

The remaining legacy surfaces must be replaced in this exact order:

1. `auth`
2. `chat`
3. `notes`
4. `calendar` (including deletion of legacy `events` calendar surfaces)
5. `lists`
6. `places`
7. `finance`

For each module, implementation order is fixed:

1. Domain package internals (`packages/<module>/src/**`) on new DB service contracts
2. RPC route integration (`packages/hono-rpc/src/routes/**`) on new domain package interfaces
3. API route integration (`services/api/src/routes/**`) where applicable
4. Module tests in strict order:
   - DB-backed integration slice RED tests for modern contract
   - GREEN implementation to pass those integration tests
   - targeted pure unit tests only for isolated pure logic
   - deletion of obsolete legacy files/imports in the same phase

No module may advance to step N+1 while step N has failing tests or type errors.

## Notes Baseline Blueprint (Authoritative for Remaining Modules)

The completed notes refactor defines the canonical construction sequence for each remaining module.

For module `<module>`:

1. Create `packages/<module>/src/contracts.ts`
  - Own all domain Zod schemas and exported domain types here
  - RPC schemas/types must consume this module directly
2. Refactor `packages/<module>/src/types.ts` and internal services to consume `./contracts`
3. Refactor `packages/hono-rpc/src/schemas/<module>.schema.ts` and `packages/hono-rpc/src/types/<module>.types.ts` to consume `@hominem/<module>-services` contracts
4. Replace denormalized JSON relationship storage with normalized join-table patterns where relational semantics exist
5. Consolidate module tests into integration-first suite(s) and remove duplicated/legacy split tests
6. Rebuild `@hominem/db` from clean output and verify stale generated artifacts for that module are absent

Required invariant checks per module:

- No import of `@hominem/db/schema/<module>` outside `packages/db`
- No import of `@hominem/db/types/<module>` outside `packages/db`
- Integration suite green against test DB
- Module typecheck green
- DB build outputs do not contain stale module-generated schema/type artifacts

### Module File Order

#### 1) auth

1. `packages/auth/src/user-auth.service.ts`
2. `packages/auth/src/account.service.ts`
3. `packages/auth/src/user.ts`
4. `packages/auth/src/types.ts`
5. `packages/auth/src/auth.types.ts`
6. `packages/auth/src/index.ts`
7. `services/api/src/routes/auth.ts`

#### 2) chat

1. `packages/chat/src/service/chat.types.ts`
2. `packages/chat/src/service/chat.queries.ts`
3. `packages/chat/src/service/message.service.ts`
4. `packages/chat/src/service/chat.service.ts`
5. `packages/chat/src/index.ts`
6. `packages/hono-rpc/src/routes/chats.ts`

#### 3) notes

1. `packages/notes/src/types.ts`
2. `packages/notes/src/contracts.ts`
3. `packages/notes/src/notes.service.ts`
4. `packages/notes/src/notes.tool-def.ts`
5. `packages/notes/src/index.ts`
6. `packages/hono-rpc/src/schemas/notes.schema.ts`
7. `packages/hono-rpc/src/types/notes.types.ts`
8. `packages/hono-rpc/src/routes/notes.ts`

#### 4) calendar

1. `packages/db/src/services/calendar.service.ts`
2. `packages/hono-rpc/src/schemas/calendar.schema.ts`
3. `packages/hono-rpc/src/routes/calendar.ts`
4. `packages/events/src/events.service.ts` (legacy surface decomposition/removal for calendar behaviors)
5. `packages/hono-rpc/src/routes/events.ts` (legacy calendar surface removal)

#### 5) lists

1. `packages/lists/src/types.ts`
2. `packages/lists/src/list-crud.service.ts`
3. `packages/lists/src/list-queries.service.ts`
4. `packages/lists/src/list-items.service.ts`
5. `packages/lists/src/list-collaborators.service.ts`
6. `packages/lists/src/list-invites.service.ts`
7. `packages/lists/src/tools.ts`
8. `packages/lists/src/index.ts`
9. `packages/hono-rpc/src/routes/lists.query.ts`
10. `packages/hono-rpc/src/routes/lists.mutation.ts`
11. `packages/hono-rpc/src/routes/lists.ts`
12. `services/api/src/routes/invites.incoming.ts`
13. `services/api/src/routes/invites.outgoing.ts`
14. `services/api/src/routes/invites/index.ts`

#### 6) places

1. `packages/places/src/place-cache.ts`
2. `packages/places/src/google-places.service.ts`
3. `packages/places/src/place-images.service.ts`
4. `packages/places/src/places.service.ts`
5. `packages/places/src/trips.service.ts`
6. `packages/places/src/index.ts`
7. `packages/hono-rpc/src/routes/places.ts`

#### 7) finance (last)

1. `packages/finance/src/features/accounts/accounts.domain.ts`
2. `packages/finance/src/features/accounts/accounts.repository.ts`
3. `packages/finance/src/features/accounts/accounts.service.ts`
4. `packages/finance/src/core/budget-categories.service.ts`
5. `packages/finance/src/core/budget-goals.service.ts`
6. `packages/finance/src/core/budget-tracking.service.ts`
7. `packages/finance/src/core/budget-analytics.service.ts`
8. `packages/finance/src/core/institutions.repository.ts`
9. `packages/finance/src/core/institution.service.ts`
10. `packages/finance/src/core/runway.service.ts`
11. `packages/finance/src/finance.transactions.service.ts`
12. `packages/finance/src/finance.analytics.service.ts`
13. `packages/finance/src/finance.calculators.service.ts`
14. `packages/finance/src/plaid.service.ts`
15. `packages/finance/src/cleanup.service.ts`
16. `packages/finance/src/finance.schemas.ts`
17. `packages/finance/src/finance.types.ts`
18. `packages/finance/src/index.ts`
19. `packages/hono-rpc/src/routes/finance.tags.ts`
20. `packages/hono-rpc/src/routes/finance.accounts.ts`
21. `packages/hono-rpc/src/routes/finance.transactions.ts`
22. `packages/hono-rpc/src/routes/finance.budget.ts`
23. `packages/hono-rpc/src/routes/finance.runway.ts`
24. `packages/hono-rpc/src/routes/finance.institutions.ts`
25. `packages/hono-rpc/src/routes/finance.plaid.ts`
26. `packages/hono-rpc/src/routes/finance.data.ts`
27. `packages/hono-rpc/src/routes/finance.analyze.ts`
28. `packages/hono-rpc/src/routes/finance.export.ts`
29. `packages/hono-rpc/src/routes/finance.ts`
30. `services/api/src/routes/finance/finance.tags.ts`
31. `services/api/src/routes/finance/finance.import.ts`
32. `services/api/src/routes/finance/index.ts`
33. `services/api/src/routes/finance/plaid/finance.plaid.create-link-token.ts`
34. `services/api/src/routes/finance/plaid/finance.plaid.exchange-token.ts`
35. `services/api/src/routes/finance/plaid/finance.plaid.sync.ts`
36. `services/api/src/routes/finance/plaid/finance.plaid.disconnect.ts`
37. `services/api/src/routes/finance/plaid/finance.plaid.webhook.ts`
38. `services/api/src/routes/finance/plaid/index.ts`

### Finance Next Phase Lock: Tags-Driven Taxonomy Rewrite (No `finance_categories`)

This is the next execution phase for finance inside this same active change.

Hard rules:

- `finance_categories` is not a long-term contract surface for finance classification.
- Finance classification/filtering must use shared tags only.
- No shim that preserves category-shaped APIs internally is allowed.

#### Finance schema and service rewrite order (strict)

1. `packages/finance/src/contracts.ts` (create/extend canonical tag-driven finance contracts)
2. `packages/db/src/schema/tags.ts` (ensure finance transaction tagging contract support is explicit)
3. `packages/db/src/schema/finance.ts` (remove `finance_categories` dependency from finance service-facing contract)
4. `packages/db/src/migrations/<next_finance_tags_phase>.sql` (DDL for tag-driven finance contract, index strategy, category-surface removal)
5. `packages/db/src/services/tags.service.ts` (lock idempotent replace/get APIs used by finance transaction tagging)
6. `packages/finance/src/modern-finance.ts` (rewrite category/taxonomy queries and mutations to tags-based behavior)
7. `packages/finance/src/modern-finance.*.integration.test.ts` (RED first for new tag-driven behavior, then GREEN)
8. `packages/hono-rpc/src/schemas/finance*.schema.ts` (remove category DTOs, add tag-driven DTOs)
9. `packages/hono-rpc/src/routes/finance.tags.ts` (replace legacy category route surface with tag surface)
10. `packages/hono-rpc/src/routes/finance.transactions.ts` (tag-based filter/query behavior)
11. `services/api/src/routes/finance/finance.tags.ts` (replace legacy category route surface; no category shim route)
12. Delete legacy finance category-specific files/imports in same phase

#### Finance tag-driven capability contract (locked)

- Finance transaction classification: tags attached through shared tagged-item model
- Finance filters: `tagIds`/`tagNames` + deterministic pagination/sort
- Finance analytics: aggregate by tag (and optional tag groups), not by finance category table
- Finance budgeting: budget targets reference tags (or explicit rule sets), not finance category rows
- Cross-module consistency: same tag semantics used by notes/tasks/finance for filtering and organization

## Target Directory Layout

```
packages/db/src/
├── schema/
│   ├── tasks.ts
│   ├── tags.ts
│   ├── calendar.ts
│   ├── persons.ts
│   ├── bookmarks.ts
│   ├── possessions.ts
│   └── finance.ts
├── services/
│   ├── tasks.service.ts
│   ├── tags.service.ts
│   ├── calendar.service.ts
│   ├── persons.service.ts
│   ├── bookmarks.service.ts
│   ├── possessions.service.ts
│   └── finance/
│       ├── accounts.service.ts
│       └── transactions.service.ts
├── client.ts
└── index.ts
```

## Shared Service Rules

### Local Types

Each service file defines its own local table types:

- `type Entity = typeof table.$inferSelect`
- `type EntityInsert = typeof table.$inferInsert`

No service type re-exports from `packages/db/src/index.ts`.

### Schema Imports

- Services import table symbols from `packages/db/src/schema/<domain>.ts`
- `schema/<domain>.ts` files expose only domain tables used by that service
- Services do not import directly from `migrations/schema.ts`
- Goal: shrink per-file type graph and reduce tsserver work

### Physical Schema Segmentation (Hard Requirement)

- `packages/db/src/schema/*.ts` files are physically generated domain modules, not thin re-export wrappers
- Re-export wrappers are forbidden:
  - Forbidden: `export { tasks } from '../migrations/schema'`
  - Forbidden: `import * as schema from '../migrations/schema'`
- Domain modules are generated from a single source (`migrations/schema.ts`) using a generator step to avoid manual duplication
- Generator output is deterministic and committed; services import only generated domain modules
- Generator contract:
  - Input: `packages/db/src/migrations/schema.ts`
  - Outputs: `packages/db/src/schema/tasks.ts`, `tags.ts`, `calendar.ts`, `persons.ts`, `bookmarks.ts`, `possessions.ts`, `finance.ts`
  - Validation: generated files must not contain imports from `migrations/schema.ts`

### Performance-Critical Anti-Patterns (Forbidden)

- Service imports from `packages/db/src/migrations/schema.ts`
- Root package service fan-in exports from `packages/db/src/index.ts`
- Public service signatures using `Partial<typeof table.$inferInsert>`
- `export *` from service modules
- Catch-all schema namespaces (`import * as schema from ...`) in service files

### Branded IDs

Each service defines local branded IDs for entities it owns:

- `type TaskId = string & { __brand: 'TaskId' }`
- `type UserId = string & { __brand: 'UserId' }`

Branding is compile-time only. Runtime validation is in API handlers.

### Method Contracts

- `list*` returns arrays (`[]` when empty)
- `get*` returns `T | null`
- `create*` returns created record
- `update*` returns updated record or `null` and takes explicit `XUpdateInput` DTO
- `delete*` returns boolean (deleted or not)
- Infrastructure/DB errors throw typed errors

### Error Taxonomy (Locked)

Service layer throws only these error classes:

- `ValidationError` for invalid internal invariants (not external payload validation)
- `NotFoundError` when explicit throw semantics are required (default is `null`/`[]` per contract)
- `ConflictError` for uniqueness/constraint conflicts and stale-write conflicts
- `ForbiddenError` for tenant/ownership violations inside service constraints
- `InternalError` for infrastructure or unknown failures

API mapping contract:

- `ValidationError` -> `400`
- `NotFoundError` -> `404`
- `ConflictError` -> `409`
- `ForbiddenError` -> `403`
- `InternalError` -> `500`

### Update DTO Rule

- Do not expose `Partial<typeof table.$inferInsert>` in service public signatures
- Each service defines narrow update DTOs with only mutable fields
- Goal: reduce generic instantiation complexity and prevent accidental writes

### Canonical Update DTO Specifications (Field-Level)

The following DTO names and fields are locked. Implementation must match exactly unless this design is updated.

```typescript
export interface TaskUpdateInput {
  title?: string
  description?: string | null
  status?: string
  priority?: string | null
  dueDate?: string | null
  completedAt?: string | null
  parentId?: string | null
  listId?: string | null
}

export interface TagUpdateInput {
  groupId?: string | null
  name?: string
  emojiImageUrl?: string | null
  color?: string | null
  description?: string | null
}

export interface CalendarEventUpdateInput {
  eventType?: string
  title?: string
  description?: string | null
  startTime?: string
  endTime?: string | null
  allDay?: boolean
  location?: string | null
  locationCoords?: Record<string, unknown> | null
  source?: string | null
  externalId?: string | null
  color?: string | null
  recurring?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

export interface PersonUpdateInput {
  personType?: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  dateStarted?: string | null
  dateEnded?: string | null
}

export interface BookmarkUpdateInput {
  url?: string
  title?: string | null
  description?: string | null
  favicon?: string | null
  thumbnail?: string | null
  source?: string | null
  folder?: string | null
  data?: Record<string, unknown>
}

export interface PossessionUpdateInput {
  containerId?: string | null
  name?: string
  description?: string | null
  category?: string | null
  purchaseDate?: string | null
  purchasePrice?: string | null
  currentValue?: string | null
  condition?: string | null
  location?: string | null
  serialNumber?: string | null
  data?: Record<string, unknown>
}

export interface PossessionContainerUpdateInput {
  name?: string
  location?: string | null
  description?: string | null
}

export interface FinanceCategoryUpdateInput {
  name?: string
  parentId?: string | null
  icon?: string | null
  color?: string | null
}

export interface FinanceAccountUpdateInput {
  name?: string
  accountType?: string
  institutionName?: string | null
  institutionId?: string | null
  balance?: string | null
  currency?: string | null
  isActive?: boolean
  data?: Record<string, unknown>
}

export interface FinanceTransactionUpdateInput {
  accountId?: string
  amount?: string
  transactionType?: string
  categoryId?: string | null
  category?: string | null
  description?: string | null
  merchantName?: string | null
  dateRaw?: string | null
  pending?: boolean
  source?: string | null
  externalId?: string | null
  data?: Record<string, unknown>
}
```

Immutability contract:

- All update DTOs exclude primary keys, owner keys, and `createdAt`
- `FinanceTransactionUpdateInput` excludes `date` because `(date, id)` is part of identity in partitioned storage

### Query Contract (Pagination + Sorting + Filters)

List endpoints/services must use consistent query DTOs:

- `limit` default `50`, max `200`
- Cursor-based pagination preferred over offset
- Stable sort required for pagination correctness (`createdAt desc, id desc` unless domain-specific override)
- All filters are explicit DTO fields; no dynamic arbitrary key filters
- Query DTOs are shared across API and RPC types to avoid drift

### Transaction and Idempotency Policy

Use DB transactions for multi-statement writes that must be atomic:

- `replaceEntityTags`
- `replaceAttendees`
- Cross-table possession/container operations
- Any write that modifies more than one table or performs read-modify-write with race risk

Idempotency expectations:

- Replace-style methods are idempotent by contract
- Create methods with natural uniqueness keys use upsert/constraint handling and return deterministic errors on conflict

### Construction Pattern

Every service file uses factory + singleton:

```typescript
export interface ServiceDeps {
  db: DatabaseClient
}

export function createXService(deps: ServiceDeps) {
  return {
    // methods
  }
}

import { db } from '../client'
export const xService = createXService({ db })
```

## Service Catalog (Exact Exports)

### `tasks.service.ts`

- `createTaskService`
- `taskService`
- Methods:
  - `list(userId: UserId): Promise<Task[]>`
  - `getById(id: TaskId, userId: UserId): Promise<Task | null>`
  - `create(input: TaskInsert): Promise<Task>`
  - `update(id: TaskId, userId: UserId, patch: TaskUpdateInput): Promise<Task | null>`
  - `delete(id: TaskId, userId: UserId): Promise<boolean>`
  - `updateStatus(id: TaskId, userId: UserId, status: string): Promise<Task | null>`

### `tags.service.ts`

- `createTagService`
- `tagService`
- Methods:
  - `list(ownerId: UserId): Promise<Tag[]>`
  - `getById(id: TagId, ownerId: UserId): Promise<Tag | null>`
  - `getByName(ownerId: UserId, name: string): Promise<Tag | null>`
  - `create(input: TagInsert): Promise<Tag>`
  - `update(id: TagId, ownerId: UserId, patch: TagUpdateInput): Promise<Tag | null>`
  - `delete(id: TagId, ownerId: UserId): Promise<boolean>`
  - `listForEntity(ownerId: UserId, entityType: string, entityId: string): Promise<Tag[]>`
  - `replaceEntityTags(ownerId: UserId, entityType: string, entityId: string, tagIds: TagId[]): Promise<void>`

### `calendar.service.ts`

- `createCalendarService`
- `calendarService`
- Methods:
  - `listInRange(userId: UserId, fromIso: string, toIso: string): Promise<CalendarEvent[]>`
  - `getById(id: CalendarEventId, userId: UserId): Promise<CalendarEvent | null>`
  - `create(input: CalendarEventInsert): Promise<CalendarEvent>`
  - `update(id: CalendarEventId, userId: UserId, patch: CalendarEventUpdateInput): Promise<CalendarEvent | null>`
  - `delete(id: CalendarEventId, userId: UserId): Promise<boolean>`
  - `listAttendees(eventId: CalendarEventId, userId: UserId): Promise<CalendarAttendee[]>`
  - `replaceAttendees(eventId: CalendarEventId, userId: UserId, attendees: CalendarAttendeeInsert[]): Promise<void>`

### `persons.service.ts`

- `createPersonService`
- `personService`
- Methods:
  - `list(ownerUserId: UserId): Promise<Person[]>`
  - `getById(id: PersonId, ownerUserId: UserId): Promise<Person | null>`
  - `create(input: PersonInsert): Promise<Person>`
  - `update(id: PersonId, ownerUserId: UserId, patch: PersonUpdateInput): Promise<Person | null>`
  - `delete(id: PersonId, ownerUserId: UserId): Promise<boolean>`

### `bookmarks.service.ts`

- `createBookmarkService`
- `bookmarkService`
- Methods:
  - `list(userId: UserId): Promise<Bookmark[]>`
  - `getById(id: BookmarkId, userId: UserId): Promise<Bookmark | null>`
  - `create(input: BookmarkInsert): Promise<Bookmark>`
  - `update(id: BookmarkId, userId: UserId, patch: BookmarkUpdateInput): Promise<Bookmark | null>`
  - `delete(id: BookmarkId, userId: UserId): Promise<boolean>`

### `possessions.service.ts`

- `createPossessionService`
- `possessionService`
- Methods:
  - `list(userId: UserId): Promise<Possession[]>`
  - `getById(id: PossessionId, userId: UserId): Promise<Possession | null>`
  - `create(input: PossessionInsert): Promise<Possession>`
  - `update(id: PossessionId, userId: UserId, patch: PossessionUpdateInput): Promise<Possession | null>`
  - `delete(id: PossessionId, userId: UserId): Promise<boolean>`
  - `listContainers(userId: UserId): Promise<PossessionContainer[]>`
  - `createContainer(input: PossessionContainerInsert): Promise<PossessionContainer>`
  - `updateContainer(id: PossessionContainerId, userId: UserId, patch: PossessionContainerUpdateInput): Promise<PossessionContainer | null>`
  - `deleteContainer(id: PossessionContainerId, userId: UserId): Promise<boolean>`

### `finance/categories.service.ts`

- `createFinanceCategoryService`
- `financeCategoryService`
- Methods:
  - `list(userId: UserId): Promise<FinanceCategory[]>`
  - `getById(id: FinanceCategoryId, userId: UserId): Promise<FinanceCategory | null>`
  - `getByName(userId: UserId, name: string): Promise<FinanceCategory | null>`
  - `create(input: FinanceCategoryInsert): Promise<FinanceCategory>`
  - `update(id: FinanceCategoryId, userId: UserId, patch: FinanceCategoryUpdateInput): Promise<FinanceCategory | null>`
  - `delete(id: FinanceCategoryId, userId: UserId): Promise<boolean>`

### `finance/accounts.service.ts`

- `createAccountService`
- `accountService`
- Methods:
  - `list(userId: UserId): Promise<FinanceAccount[]>`
  - `getById(id: FinanceAccountId, userId: UserId): Promise<FinanceAccount | null>`
  - `create(input: FinanceAccountInsert): Promise<FinanceAccount>`
  - `update(id: FinanceAccountId, userId: UserId, patch: FinanceAccountUpdateInput): Promise<FinanceAccount | null>`
  - `delete(id: FinanceAccountId, userId: UserId): Promise<boolean>`

### `finance/transactions.service.ts`

- `createTransactionService`
- `transactionService`
- Methods:
  - `listByDateRange(userId: UserId, fromDate: string, toDate: string): Promise<FinanceTransaction[]>`
  - `listByAccount(userId: UserId, accountId: FinanceAccountId, fromDate?: string, toDate?: string): Promise<FinanceTransaction[]>`
  - `getById(userId: UserId, id: FinanceTransactionId, date: string): Promise<FinanceTransaction | null>`
  - `create(input: FinanceTransactionInsert): Promise<FinanceTransaction>`
  - `update(userId: UserId, id: FinanceTransactionId, date: string, patch: FinanceTransactionUpdateInput): Promise<FinanceTransaction | null>`
  - `delete(userId: UserId, id: FinanceTransactionId, date: string): Promise<boolean>`

## Finance Partition Strategy

- Service targets the parent partitioned table `finance_transactions` for list/create where possible
- For point update/delete/get requiring partition key, use `(date, id)` composite key
- Date is required in update/delete/get method signatures to avoid partition ambiguity
- If Drizzle schema for parent table is not present, define a local service-only table mapping for `finance_transactions`
- No migration work in this change

## `packages/db/src/index.ts` Export Contract

`index.ts` exports infrastructure runtime symbols only:

```typescript
export { db, getDb } from './client'
export { takeUniqueOrThrow } from './client'
```

Service imports use explicit subpaths:

```typescript
import { taskService } from '@hominem/db/services/tasks.service'
```

## Package Resolution Contract

- `packages/db/package.json` `exports` maps service subpaths (`./services/*`) to built outputs
- `packages/db/package.json` includes matching type resolution for subpaths
- Monorepo TS path mappings resolve `@hominem/db/services/*` consistently for editor and CI
- No consumer relies on deep relative imports into `packages/db/src`
- CI typecheck gate includes at least one consumer package importing from `@hominem/db/services/*`

## Generator Drift Contract

- Schema slice generation is deterministic and reproducible
- CI runs the generator and fails on diff
- Local workflow includes a dedicated script for regeneration before commit

## API and App Boundaries

- API layer validates external input with Zod and then calls DB services
- Apps only use `@hominem/hono-client` and `@hominem/hono-rpc/types`
- Apps do not import `@hominem/db` or DB schema/types

## Test Blueprint (TDD)

Each service file gets a corresponding test file under `packages/db/src/test/services/`.

### RED-GREEN Discipline (Required)

- Write real failing tests first for each service behavior in scope
- Implement only enough code to make those tests pass
- Refactor only after GREEN while keeping tests passing
- No test skeletons, placeholders, or TODO-only test cases are allowed
- Each RED step must have an observable failure before GREEN implementation
- Each GREEN step must include immediate refactor for duplication removal while preserving behavior

For each service, minimum required tests:

- `list` returns empty array for new user
- `getById` returns `null` for missing record under same user
- `create` persists and returns created row
- `update` returns updated row for owner and `null` for missing/non-owned row
- `delete` returns `true` when deleted and `false` when already missing
- Cross-tenant guard: user A cannot read/update/delete user B row

Additional required tests:

- `tags.service`: `replaceEntityTags` is idempotent
- `calendar.service`: attendee replacement fully overwrites previous set
- `possessions.service`: container delete behavior (set null on possessions)
- `finance/transactions.service`: partition key behavior for `(date,id)` point operations

### Shared Test Utilities (KISS + No Duplication)

- Centralize repeated setup in `packages/db/src/test/services/_shared/`
- Shared helpers must cover:
  - user/entity factory builders
  - ownership/tenant seed helpers
  - common assertions for not-found/forbidden/update-delete semantics
- Service test files focus on behavior only; avoid repeating fixture wiring
- If two service test files duplicate setup logic, that setup must be moved into `_shared/`
- Shared helpers must remain deterministic (stable IDs, stable timestamps, seeded test data)

### Real Test Requirement (No Skeleton Policy)

- Forbidden:
  - Empty test blocks
  - Placeholder assertions (`expect(true).toBe(true)`)
  - TODO-only tests
  - Committed skipped tests as coverage stand-ins
- Required:
  - Assertions against real behavior and persisted state
  - Ownership/tenant isolation checks on every user-scoped service
  - Idempotency checks on replace/upsert behavior
  - Error taxonomy checks where behavior maps to API status contracts

### Test Isolation Contract

- Default isolation strategy: per-test transaction rollback where supported; otherwise deterministic truncate/reset utilities
- No test depends on execution order
- Time-dependent tests use frozen clock helpers from shared test utilities
- Random data generation uses shared seeded helpers for reproducibility

## Data Normalization Contract

- Numeric DB values (finance amounts, balances, prices) are normalized to string in service/API contracts unless a domain-specific value object is introduced
- Temporal values use ISO 8601 strings with timezone where applicable
- JSON columns are typed as `Record<string, unknown>` at service boundary unless narrowed by schema-specific DTO

## ID Branding Utility Contract

- Shared branding utility module at `packages/db/src/services/_shared/ids.ts`
- Services consume shared helpers for branded ID creation/parsing; avoid per-file duplicated branding helpers
- Branding helpers do not perform runtime validation; runtime validation remains at API boundary

## Type Performance Validation

### Measurement Protocol

- Use same machine, same Node/Bun versions, and no concurrent heavy jobs
- Clear turbo cache once before baseline and once before post-change run
- Run baseline and post-change measurements with three runs each
- Use median runtime for comparison
- Compare incremental run medians and reject if regression exceeds 10%

### Commands

- `bun run typecheck` (3x baseline, 3x post-change)
- `bun run --filter @hominem/db typecheck -- --extendedDiagnostics` (baseline/post-change capture)

### TS Server Validation

- Capture tsserver trace for a fixed scenario before and after redesign
- Scenario:
  - open one API file importing three DB services by subpath
  - trigger go-to-definition on one service method and one table type
  - capture request latency from tsserver log timestamps
- Command shape (example):
  - `TSS_LOG='-level verbose -file .tmp/tsserver.log' node ./node_modules/typescript/lib/tsserver.js`
- Gate:
  - median request latency regression for the scenario must be <=10%

### Enforcement

- Store results in change notes for review
- CI fails if threshold is exceeded
- PR is blocked if tsserver scenario evidence is missing

## Open Decisions

- `vector_documents` table/feature direction
- `financial_institutions` and `plaid_items` direction

Resolved policy:

- Legacy non-service files are not retained as compatibility layers; they are replaced and removed after parity tests pass
