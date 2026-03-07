## Why

The database schema has been redesigned from scratch and is now solid and deployed. The old application code references the previous schema and needs to be rebuilt to work with the new database. This is a ground-up rebuild, not a migration; no backward compatibility required.

## What Changes

This is a complete rebuild of the application layer working outward from the database:

- Post-completion execution roadmap: `openspec/changes/2025-03-04-update-db-schema-references/post-completion-roadmap.md`
- Integration-first test foundation: `openspec/changes/2025-03-04-update-db-schema-references/testing-foundation.md`

1. **Database layer (@hominem/db)** - Mostly complete
  - Schema redesigned and deployed via `phased-db-redesign`
  - Single source of truth: `packages/db/src/migrations/schema.ts`
  - Schema slicer generator (✓ implemented, generates 7 domain modules)
  - Shared infrastructure: ID branding, error taxonomy, pagination utilities, test isolation helpers (✓ implemented)

2. **Service layer (@hominem/db services)** - In stabilization
  - Rebuild all service files to use new schema
  - Use a fixed blueprint of file names, method signatures, contracts, and tests defined in `design.md`
  - Tasks, Tags, Calendar, Persons, Bookmarks, Possessions services (full implementation, ✓ complete)
  - Finance services (✓ scaffolded, ready for implementation in Phase 2)
  - Validation rules extended to prevent schema leakage (✓ implemented in validate-db-imports.js)
  - Root index updated to infra-only exports (✓ complete)

3. **API layer (services/api, packages/hono-rpc)** - In progress
  - Rebuild routes to use new service signatures
  - Update RPC schemas and response types
  - Validate and normalize all external input at API boundaries

4. **App layer (apps/*)** - In progress
  - Rebuild UI data integration through RPC client only (`@hominem/hono-client`)
  - Remove any legacy direct database/service imports from apps

5. **Next phase (finance schema improvement)** - In progress in this active change
  - Replace finance category taxonomy with unified tags taxonomy
  - Remove `finance_categories` as a finance classification dependency (schema + migration completed)
  - Finance transaction categorization/filtering becomes tag-driven via the shared tags system
  - Rewrite finance services and routes to use tags for classification and filters
  - Delete finance category-specific legacy surfaces after tag-driven contract is green
  - Added migration `packages/db/src/migrations/0005_finance_tags_taxonomy_rewrite.sql` and applied to test DB via `bun run --filter @hominem/db db:migrate:test`
  - Added migration `packages/db/src/migrations/0006_finance_runtime_tables.sql` to provision `financial_institutions`, `plaid_items`, and `budget_goals`
  - Added migration `packages/db/src/migrations/0007_budget_goals_nullable_category_id.sql` to align budget-goal contract semantics

## Verification Status (2026-03-06, updated)

Current truth snapshot:

- `bun run --filter @hominem/db typecheck`: passing
- `bun run validate-db-imports`: passing
- `bun run --filter @hominem/hono-rpc typecheck`: passing
- `bun run --filter @hominem/finance-services test`: passing (21 passed, 0 skipped)
- `bun run --filter @hominem/api test -- src/routes/finance/finance.data.router.test.ts`: passing (4 tests)
- `bun run --filter @hominem/api test -- src/routes/finance/finance.accounts.router.test.ts`: passing (4 tests)
- `bun run --filter @hominem/api test -- src/routes/finance/finance.transactions.router.test.ts`: passing (6 tests)
- `bun run --filter @hominem/finance test`: passing (4 tests)
- `bun run --filter @hominem/rocco test`: passing (45 tests)
- `bun run check`: passing (existing lint warnings only)
- `bun run validate-db-imports`: passing (2026-03-06 rerun)
- `bun scripts/check-schema-drift.ts`: passing (2026-03-06 rerun, no drift)
- `bun run --filter @hominem/hono-rpc typecheck`: passing (2026-03-06 rerun)
- `bun run test:e2e:auth:app`: passing (4/4 on 2026-03-06 after freeing occupied `:4040`)
- `bun run --filter @hominem/mobile test:e2e:build:ios`: passing (2026-03-06)
- `bun run --filter @hominem/mobile test:e2e:smoke`: passing (2026-03-06)
- `bun run --filter @hominem/mobile test:e2e:auth:mobile`: passing (2026-03-06, with local API stack running)
- Performance artifacts captured in `performance-validation.md` (typecheck medians, extended diagnostics, tsserver scenario latency)

Implication:
- Module replacement, no-shim enforcement, and performance evidence are now captured in artifacts.
- Remaining close-out is mobile auth E2E stabilization:
  - `bun run test:e2e:auth:mobile` now passes with deterministic auth state indicators and e2e auth controls.
  - required precondition: local API test stack must be running on `http://localhost:4040` with non-production OTP test config enabled.

Module progress snapshot (2026-03-04):
- `auth`: contract mapping and account-scope fixes implemented; package tests and typecheck green
- `chat`: owner-scoped chat lifecycle contract updates implemented; package tests and typecheck green
  - canonical chat domain contracts now owned by `packages/chat/src/contracts.ts`
  - chat services no longer import `@hominem/db/schema/chats` or `@hominem/db/types/chats`
  - RPC chat types and AI adapters now consume `@hominem/chat-services` contracts
  - no-shim rule maintained: legacy DB chat type surface not reintroduced
- `notes`: foundation pattern now locked and green:
  - canonical notes contract module is owned by `packages/notes/src/contracts.ts` (not `@hominem/db/schema/notes`)
  - service logic uses normalized `note_tags` join-table pattern (no JSON tags column dependence)
  - unified integration-first suite (`notes.integration.test.ts`) is green against the test DB
  - stale `@hominem/db` generated notes schema artifacts were removed by clean rebuild
- `calendar` (legacy `events` surface): strict next module compile blockers were fixed (legacy root DB helper imports replaced), and integration suite now executes
  - service pagination/ownership hardening started in `packages/db/src/services/calendar.service.ts` (safe DB fallback, limit/offset support)
  - integration-first DB suite introduced at `packages/db/src/services/calendar.service.integration.test.ts` for CRUD/attendee/ownership/filter contracts
  - attendee overwrite semantics implemented (`replaceEventAttendees`) and exposed in calendar RPC surface (`PUT /calendar/:id/attendees`)
  - Google Calendar sync/status endpoints were moved from legacy `events` route to canonical `calendar` route
  - calendar sync status now resolves via `GoogleCalendarService.getSyncStatus()` in the canonical calendar route (no `@hominem/events-services` dependency)
  - `/vital/events` mount removed to avoid legacy aliasing of calendar behavior
  - legacy RPC `events` surfaces removed (`packages/hono-rpc/src/routes/events.ts`, `packages/hono-rpc/src/types/events.types.ts`)
  - legacy monolithic `packages/events/src/events.service.ts` branches were decomposed into focused services (`habits.service.ts`, `goals.service.ts`, `health.service.ts`, `visits.service.ts`)
  - RPC habits/goals/health/places routes now consume domain-specific methods (`getHabitById/deleteHabit`, `getGoalById/deleteGoal`, `getHealthActivityById/deleteHealthActivity`, `createVisit/updateVisit/deleteVisit`) instead of generic legacy CRUD calls
  - `@hominem/events-services` public index no longer exports generic `events.service.ts` surface
  - residual internal `packages/events/src/events.service.ts` was deleted after decoupling; shared internals now live in `packages/events/src/event-core.service.ts` (non-exported)
  - calendar DB integration suite is green; next blockers are outside calendar (lists/places/finance modernization and cross-package type-resolution debt)
- `finance`: module hardening continued and stubs removed from finance RPC surfaces
  - canonical route surfaces now implemented:
    - `packages/hono-rpc/src/routes/finance.accounts.ts`
    - `packages/hono-rpc/src/routes/finance.institutions.ts`
    - `packages/hono-rpc/src/routes/finance.plaid.ts`
  - endpoints now run directly on modern finance services with owner-scoped guards (no shims)
  - API integration coverage expanded:
    - `services/api/src/routes/finance/finance.accounts.router.test.ts` (4 passing tests)
    - `services/api/src/routes/finance/finance.data.router.test.ts` (4 passing tests)
    - `services/api/src/routes/finance/finance.transactions.router.test.ts` (6 passing tests)
  - analytics core consolidation completed on modern service architecture:
    - shared dataset/query + derived analytics calculators now live in `packages/finance/src/modern-finance.ts`
    - `packages/hono-rpc/src/routes/finance.analyze.ts` now delegates analytics computation to service-layer contracts (no route-local aggregation duplication)
    - analyze endpoint path standardized to `POST /finance/analyze/tag-breakdown` (legacy category path removed)
    - tag-breakdown response contract is now tag-first (`breakdown[].tag`)
    - monthly-stats response contract is now tag-first (`topTag`, `tagSpending`)
    - deleted legacy finance analytics branch files (`packages/finance/src/analytics/*`, `packages/finance/src/finance.analytics.service.ts`)
    - `apps/finance/app/routes/analytics.tags.tsx` now uses the canonical tag-breakdown response shape directly (`breakdown[].tag/amount/transactionCount`)
    - analytics naming cleanup now aligns symbols with tag-first contracts:
      - `useTagBreakdown` hook in finance app
      - `TopTags` analytics summary component export
      - analytics component file moved to `apps/finance/app/components/analytics/top-tags.tsx`
      - `TagBreakdown*` type names in RPC finance analytics types
    - new DB-backed analytics suite is green: `packages/finance/src/modern-finance.analytics.integration.test.ts` (2 passing tests)

## Notes Baseline Pattern (Locked for Remaining Modules)

The notes refactor is the required template for all remaining modules (`calendar`, `lists`, `places`, `finance`):

1. Canonical contracts live in the domain package (`packages/<module>/src/contracts.ts`)
2. API schemas/types import from domain contracts, not from `@hominem/db/schema/*` or `@hominem/db/types/*`
3. DB services implement normalized relational models (join tables) rather than denormalized JSON storage when relational semantics exist
4. Integration tests are the source of truth for capability behavior and run against the real test DB
5. Legacy generated schema/type artifacts must be removed from active build outputs before module sign-off

Hard rule:

- Outside `packages/db`, importing `@hominem/db/schema/<module>` or `@hominem/db/types/<module>` for domain contract definition is forbidden.
- Domain packages own their contract schemas/types; `@hominem/db` owns only DB schema/migration/runtime persistence concerns.

## Migration Policy (No Shims Allowed)

This change is a hard cutover to the new architecture. Compatibility shims are forbidden.

- No legacy alias exports to preserve old module names or old symbol names
- No temporary wrapper modules that mimic removed schema/service contracts
- No adapter layers that translate old API shapes to new internals
- No fallback dual-path logic (legacy path + new path)

Required approach:

- Replace legacy modules with direct implementations on the new DB services/RPC contracts
- Update callers to the new interfaces rather than preserving legacy interfaces
- Delete obsolete legacy code once replacements are green
- Follow strict module and file replacement order defined in `design.md` ("Legacy Module Replacement Build Order (Strict)") and `tasks.md` Section 4

Additional finance rule (locked):

- No compatibility layer preserving `finance_categories` behavior is allowed.
- Finance classification must cut over directly to tag-driven contracts on shared tagging infrastructure.

## Capability Artifacts (Authoritative, Linked)

Capability-first implementation source of truth (strict execution order):

1. [Auth capabilities](./capabilities/auth.md)
2. [Chat capabilities](./capabilities/chat.md)
3. [Notes capabilities](./capabilities/notes.md)
4. [Calendar capabilities](./capabilities/calendar.md)
5. [Lists capabilities](./capabilities/lists.md)
6. [Places capabilities](./capabilities/places.md)
7. [Finance capabilities](./capabilities/finance.md)

### Naming Lock (Calendar vs Events)

- Canonical domain name is **calendar** for scheduled-time entities.
- Legacy `events` naming is deprecated and must be removed during module cutover.
- No alias/shim route or type surface may keep `events` as a calendar synonym.

Testing philosophy is locked in each capability file:
- "Required RED tests" are DB-backed integration slice tests by default.
- Unit tests are supplemental for isolated pure logic and cannot replace capability integration coverage.

Auth deep-dive documents for this change:
- `./auth-email-otp.md`
- `./auth-web-passkey.md`
- `./auth-mobile.md`
- `./mobile-auth-state-contract.md`

## App Authentication E2E Next Steps (Added 2026-03-05)

Current status:
- API-level auth contract/integration coverage is active and green for email-OTP flows.
- Live auth smoke probes exist (`scripts/auth-e2e-smoke.ts`) for endpoint/routing and provider redirect health.
- Full app-driven E2E authentication coverage is not yet complete for web/mobile clients.

Required next steps in this active change:

1. Add web app authentication E2E coverage (Playwright)
  - start from app UI and execute email + OTP sign-in
  - assert post-auth app state (authenticated session + protected view access)
  - include invalid OTP and expired OTP rejection paths
2. Add passkey app E2E coverage (Playwright + virtual WebAuthn authenticator)
  - register passkey and authenticate with passkey from app flow
  - assert authenticated app state and expected auth/session contracts
3. Add mobile app authentication E2E coverage (existing mobile E2E harness)
  - email-OTP app flow
  - passkey app flow where platform support exists
4. Add unified auth app E2E gate command
  - add a single top-level command that runs app-auth E2E suites in deterministic order
5. Wire auth app E2E command into final verification gate sequence for this proposal

Progress update (2026-03-05):
- First app-auth E2E spec is implemented and green in finance app:
  - `apps/finance/tests/auth.email-otp.spec.ts`
  - validates app-driven OTP request + OTP verification contract
  - validates post-auth protected route access (`/finance`)
  - validates OTP rejection paths (invalid code and expired code remain unauthenticated)
- Web passkey app E2E spec is implemented and green in finance app:
  - `apps/finance/tests/auth.passkey.spec.ts`
  - validates passkey registration, session reset, and passkey sign-in back to protected `/finance`
  - passkey auth wrappers forward Better Auth `Set-Cookie` headers to preserve challenge/session continuity
- Mobile auth E2E flow is implemented in Detox harness:
  - `apps/mobile/e2e/auth.mobile.e2e.js`
  - validates deterministic non-production sign-in path and authenticated app-shell access + sign-out return path
  - mobile Expo runtime is now being hardened around explicit variants:
    - `APP_VARIANT=dev` for developer builds with `expo-dev-client`
    - `APP_VARIANT=e2e` for dedicated Detox binary with OTA disabled
    - `APP_VARIANT=preview` for internal QA
    - `APP_VARIANT=production` for release
  - remaining hardening item: ensure `expo-dev-client` is excluded from the native E2E pod graph during prebuild
  - auth provider architecture hardened:
    - explicit auth state machine (`booting|signed_out|signed_in|degraded`)
    - provider no longer performs route navigation side effects
    - route guard consumes provider auth state
    - `getAccessToken()` no longer returns user-id pseudo token
    - authenticated-only providers (`ApiProvider`, `InputProvider`, `InputDock`) now mount only in `apps/mobile/app/(drawer)/_layout.tsx`
    - root shell no longer mounts protected providers for auth/signed-out routes
    - startup splash gate reduced to immediate hide + timeout fallback; fixed delay removed
    - auth input normalization/validation hardened (`email`, `otp`) via shared utility contracts
    - mobile auth unit coverage expanded to 43 passing tests (state machine, route guard, startup metrics, callback parsing, provider helpers, input validation)
  - resolved blocker:
    - Detox startup shell nondeterminism was removed by contract-driven state/test controls (`auth-state-*`, `auth-e2e-reset`, `auth-e2e-sign-out`)
    - latest `bun run test:e2e:auth:mobile` is green with API stack running
  - remediation contract:
    - mobile auth and e2e stabilization now follows `mobile-auth-state-contract.md` as the authoritative state/routing/testing contract
- Root command added:
  - `bun run test:e2e:auth:app`

Success criteria:
- App-originated email+OTP and passkey flows are validated end-to-end (not API-only)
- Deterministic assertions verify authenticated app state and rejection paths
- Gate command is documented and executable in CI/local with the test stack
- Mobile Expo runtime model is explicit and environment-safe:
  - no `NODE_ENV`-driven app identity selection
  - dedicated non-dev-client E2E runtime
  - variant-specific bundle IDs and schemes documented and enforced
  - auth bootstrap is deterministic and cannot block app shell indefinitely

## Architecture Principles

### Type-Checking Performance (Critical at Scale)

- **No barrel files in service internals** - each import is explicit
- **Local type definitions** - `type Task = typeof tasks.$inferSelect` in each service file
- **No service exports from package root index** - root exports infra only (`db`, `getDb`, helpers)
- **Domain schema slice imports** - services import from `src/schema/<domain>.ts`, not directly from monolithic generated schema
- **Physical schema segmentation** - `src/schema/<domain>.ts` files are generated standalone modules, not re-export wrappers around `migrations/schema.ts`
- **No broad `Partial<$inferInsert>` in public service signatures** - use explicit update DTO interfaces
- **Result:** smaller symbol graphs and faster incremental typecheck/tsserver response

### Service Pattern

```typescript
// packages/db/src/services/tasks.service.ts

type Task = typeof tasks.$inferSelect
type TaskInsert = typeof tasks.$inferInsert

type TaskId = string & { __brand: 'TaskId' }
function asTaskId(id: string): TaskId {
  return id as TaskId
}

export interface TaskServiceDeps {
  db: DatabaseClient
}

export function createTaskService(deps: TaskServiceDeps) {
  return {
    async list(userId: UserId): Promise<Task[]> {
      const result = await deps.db.select().from(tasks).where(eq(tasks.userId, userId))
      return result
    },

    async getById(id: TaskId, userId: UserId): Promise<Task | null> {
      const [task] = await deps.db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .limit(1)
      return task ?? null
    },

    async create(data: TaskInsert): Promise<Task> {
      const [task] = await deps.db.insert(tasks).values(data).returning()
      return task
    }
  }
}

import { db } from '../client'
export const taskService = createTaskService({ db })
```

### Runtime Validation and Branded IDs

- Branded IDs are compile-time safety only and must not be used as runtime validation
- Validate all request IDs with Zod in API handlers before casting/branding
- Convert validated string IDs to branded IDs only after successful validation

### Export Strategy

```typescript
// packages/db/src/index.ts
// Infra runtime exports only (no service exports)

export { db, getDb } from './client'
export { takeUniqueOrThrow } from './client'
```

```typescript
// service consumption from API layer
import { taskService } from '@hominem/db/services/tasks.service'
```

### App Usage (RPC-only)

```typescript
import { useHonoQuery } from '@hominem/hono-client/react'
import type { Task } from '@hominem/hono-rpc/types'

export function useTasks() {
  return useHonoQuery(['tasks'], async (client) => {
    const res = await client.api.tasks.$get()
    return (await res.json()) as Task[]
  })
}
```

## Service Contract Rules

- `list*` methods return arrays (`[]` when empty)
- `get*` methods return object or `null` when not found
- Expected absence is not an exception
- System and infrastructure failures throw typed errors

## Capabilities

### New Capabilities

- Unified tagging system with polymorphic relations (`taggedItems`)
- Partitioned finance transactions by year
- Improved RLS policies
- Branded ID types for type safety

### Modified Capabilities

- All domain capabilities rebuilt: tasks, tags, calendar, contacts, bookmarks, possessions, finance, etc.

## Impact

**Scope:** Entire monorepo; rebuilding from database outward

**Order:**

1. `@hominem/db` services (new architecture)
2. `services/api` routes
3. `packages/hono-rpc`
4. `apps/*` (UI through RPC)

**Constraints:**

- No backward compatibility required
- No shimming or legacy compatibility adapters; replace legacy modules with new architecture implementations
- Local type definitions in each service file
- Branded ID types for entity IDs
- Factory pattern with singleton instance
- Root index exports infra only, no service fan-in
- Return `null` for expected single-record misses, `[]` for empty lists, throw for system errors
- Service redesign follows the explicit file/method blueprint in `design.md`
- Canonical field-level update DTO definitions are locked in `design.md`
- RED-GREEN development with real failing tests first; no placeholder/skeleton tests
- Integration-first slice testing is mandatory: capability tests run against the real test DB and real service/query wiring
- Unit tests are optional and limited to isolated pure logic (state machines, deterministic mappers, pure validators)
- Error taxonomy and API mapping contract are locked in `design.md`
- Query contract (pagination/sorting/filter DTOs) is locked in `design.md`
- Multi-table write transaction and idempotency policy is locked in `design.md`
- Data normalization and shared ID branding utility contracts are locked in `design.md`
- Domain contract ownership is mandatory: each module must define `src/contracts.ts` and RPC/schema layers must consume it
- Module sign-off requires clean `@hominem/db` rebuild proving stale generated module artifacts are gone

## Acceptance Criteria

Status note: checkmarks in this section record implementation artifacts, not current gate health. Final completion is defined only by the gate sequence in `tasks.md` Section 7 being green.

### Phase 1 Implementation Status (@hominem/db services)

**In Progress - implementation exists, but stabilization gates are still red**

#### Artifacts Created

**Schema Generation:**
- ✓ `scripts/generate-db-schema-slices.ts` - Deterministic generator splitting monolithic schema into 7 domain modules
- ✓ Generated domain modules: tasks.ts, tags.ts, calendar.ts, persons.ts, bookmarks.ts, possessions.ts, finance.ts
- ✓ CI drift check: `scripts/check-schema-drift.ts` fails if generated files are out of date

**Shared Infrastructure:**
- ✓ `packages/db/src/services/_shared/ids.ts` - Branded ID types (TaskId, TagId, UserId, etc.) and casting utilities
- ✓ `packages/db/src/services/_shared/errors.ts` - Typed error hierarchy (NotFoundError, ConflictError, ForbiddenError, InternalError) with HTTP status mapping
- ✓ `packages/db/src/services/_shared/query.ts` - Pagination DTOs (cursor-based), sort config, query limit validation
- ✓ `packages/db/src/services/_shared/test-isolation.ts` - Transaction rollback helpers, frozen clock for deterministic timestamps
- ✓ `packages/db/src/services/_shared/test-helpers.ts` - Factory builders, seed builders, assertion helpers

**Service Implementations:**
- ✓ `packages/db/src/services/tasks.service.ts` - Full CRUD implementation with ownership checks and transaction support
- ✓ `packages/db/src/services/tags.service.ts` - Full CRUD + entity tagging (tagEntity, untagEntity, syncEntityTags)
- ✓ `packages/db/src/services/calendar.service.ts` - Full event management + attendees (createEvent, updateEvent, listEventAttendees, etc.)
- ✓ `packages/db/src/services/persons.service.ts` - Full contact management + relationships (createPerson, listPersonRelations, addPersonRelation)
- ✓ `packages/db/src/services/bookmarks.service.ts` - Full bookmark management with folder filtering (createBookmark, listBookmarks, deleteBookmark)
- ✓ `packages/db/src/services/possessions.service.ts` - Full possession management + containers (createPossession, listContainers, createContainer, etc.)
- ✓ `packages/db/src/services/finance/(categories|accounts|transactions).service.ts` - Finance domain services scaffolded (stubs, ready for implementation)

**Package Configuration:**
- ✓ `packages/db/package.json` exports updated to include `@hominem/db/services/*` subpaths
- ✓ `packages/db/tsconfig.json` path mappings configured for `@hominem/db/services/*` resolution
- ✓ `packages/db/src/index.ts` refactored to infra-only exports (db, getDb, shared utilities only)
- ✓ Added `services/api/src/test-subpath-resolution.ts` smoke test for subpath import validation

#### Validation & Gates

- ✓ Core blueprint documentation frozen in `design.md` (service files, method signatures, error contracts, query contracts, transaction policies, data normalization rules, ID branding contracts)
- ✓ `scripts/validate-db-imports.js` extended with new rules:
  - Forbids imports from `packages/db/src/migrations/schema.ts` within `packages/db/src/services/**`
  - Forbids re-export wrappers (wrapper pattern enforcement)
- ✓ Schema generator validates output doesn't import from migrations/schema.ts
- ✓ CI drift check passes - generated schema files are up-to-date
- Partial: `bun run validate-db-imports` currently fails and must be green before close-out

#### Performance Baselines Captured

- ✓ Pre-implementation typecheck: ~8.075s median (3 runs)
- ✓ @hominem/db extended diagnostics: 0.57s with 162105K memory usage
- ✓ Baseline documented in session notes for post-implementation comparison

### Layer 1: `@hominem/db` services - Acceptance Criteria

- Services compile with no legacy schema references
- Service files, exports, and method signatures match `design.md` blueprint
- Domain schema modules are physically segmented and contain no imports from `migrations/schema.ts`
- Integration slice tests (test DB) cover core CRUD, ownership boundaries, idempotency, and deterministic pagination/query behavior per service contracts
- Pure unit tests exist only where they provide isolated value for pure logic modules; no duplicate unit coverage for already-covered integration behavior
- Service tests follow RED-GREEN and shared test utility conventions from `design.md`
- Error mapping behavior is validated end-to-end (`Validation/NotFound/Conflict/Forbidden/Internal`)
- Query contract behavior is validated (limit bounds, cursor stability, deterministic sorting)
- No root-level service export fan-in from `@hominem/db`
- No `Partial<$inferInsert>` public update signatures in services

## Implementation Notes

### Schema Generation Strategy

The monolithic `migrations/schema.ts` is the single source of truth. The `generate-db-schema-slices.ts` script:
1. Parses the monolithic schema file using line-by-line state machine (robust to complex nesting)
2. Extracts table definitions using domain mappings: tasks → [tasks, goals, keyResults, taskLists], etc.
3. Generates physically separate files in `packages/db/src/schema/` (not re-export wrappers)
4. Validates that generated files don't import migrations/schema.ts
5. Can be regenerated deterministically; CI drift check ensures committed files are current

Domain mappings are explicitly configured in the script for:
- tasks: 4 tables
- tags: 3 tables  
- calendar: 2 tables
- persons: 2 tables
- bookmarks: 1 table
- possessions: 2 tables
- finance: 6 tables (including year-partitioned transactions)

### Service Architecture Decisions

1. **No factory/dependency injection for now** - Simplified to: `import { db } from '../services/client'` and call methods directly
   - Reduces boilerplate for Phase 1
   - Can refactor to factory pattern in Phase 2 if testing/isolation needs arise

2. **Client doesn't import schema** - `services/client.ts` provides bare `Database` type without schema binding
   - Reduces per-service type graph size
   - Schema is known at package root (index.ts) where performance impact is acceptable

3. **Local types in each service** - `type Task = typeof tasks.$inferSelect` (not re-exported)
   - Reduces symbol graph fan-in
   - Each service is self-contained

4. **Ownership checks before mutations** - `get*WithOwnershipCheck()` helper prevents unauthorized updates/deletes
   - Called before any state modification
   - Throws ForbiddenError immediately

5. **Error return semantics**:
   - `list*`: Always returns array (never null)
   - `get*`: Returns T | null (null means not found OR not authorized - caller can't distinguish, but that's OK)
   - Mutations: Throw on system errors, return null/false for not-found cases

### Package Export Strategy

- **Root exports (@hominem/db):** Only infrastructure (db, getDb, shared utilities from _shared/)
- **Service imports:** Use subpaths like `import { TaskService } from '@hominem/db/services/tasks'`
- **Validation:** `validate-db-imports.js` enforces that no service modules are imported from root
- **Package.json exports:** Includes patterns for:
  - `./schema/*` → domain schema modules
  - `./services/*` → service modules
  - `./services/finance/*` → finance subdomain

### Test Infrastructure

**Shared utilities (@hominem/db/src/services/_shared/):**
- `ids.ts`: Branded ID utilities (brandId, unbrandId)
- `errors.ts`: Error hierarchy with getErrorResponse() for API middleware
- `query.ts`: Pagination/sort utilities with normalizePaginationParams()
- `test-isolation.ts`: startTestTransaction(), FrozenClock for deterministic test setup
- `test-helpers.ts`: Factories (createTestUserId), builders (buildUserData), assertions (assertOwnership)

**Test patterns:**
- RED-GREEN convention: Write failing test first, then implementation
- Real assertions only (no placeholder/skeleton tests)
- Transaction rollback for cleanup (no test data leakage)
- FrozenClock for deterministic timestamps
- No shared test database state between tests

### Performance Considerations

1. **Schema splitting reduces type graph per service:**
   - Before: Each service saw all ~100 tables
   - After: Each service sees only its domain ~2-6 tables
   - Result: Smaller type symbol graphs, faster tsserver responses

2. **No barrel file exports from services:**
   - `export * from './tasks'` not used
   - Each import is explicit (slower to write, faster to typecheck)

3. **Service client does not import schema:**
   - Schema bindings happen at package root only
   - Per-service type graphs are minimal

4. **Root index exports only infrastructure:**
   - No service fan-in import from @hominem/db
   - Forces explicit subpath imports (better for tree-shaking, better for type isolation)

## Decision Rationale & Trade-offs

### Why Physical Schema Slicing vs. Re-export Wrappers?

**Decision:** Generate 7 physically separate domain schema files (tasks.ts, tags.ts, etc.) instead of re-export wrappers

**Rationale:**
- **Type graph isolation:** Each service only sees its domain tables, not the entire 100-table monolith
- **Incremental builds:** Changes to one domain don't re-typecheck all consumers
- **Determinism:** Generator produces identical output; CI drift check prevents stale files

**Alternatives Considered:**
1. **Namespace imports** (`import * as tasks_schema from '../migrations/schema'`) - Would require manual filtering in each service, error-prone
2. **Named re-exports from root** (`export { tasks } from './migrations/schema'`) - Better for discoverability but creates fan-in bottleneck
3. **Dynamic schema per service via factory** - Too complex for Phase 1, unclear benefits

**Lessons Learned:**
- Line-by-line parsing with nesting state machine was essential - regex-based extraction failed on complex Drizzle definitions
- Need to test generator against actual codebase early (we did; caught brace/bracket nesting issues)
- Deterministic generation is critical for CI - small changes in script can invalidate all files

### Why No Service Factory/Dependency Injection in Phase 1?

**Decision:** Direct imports (`import { db } from '../services/client'`) instead of dependency-injected factory pattern

**Rationale:**
- **Simplicity:** Reduces boilerplate; service code is 1/3 shorter than with factory pattern
- **Clear surfaces:** `export const TaskService = { list, get, create, ... }` is immediately discoverable
- **Performance:** No runtime overhead from object wrapping
- **Type safety:** TypeScript can verify service method signatures at compile time

**Alternatives Considered:**
1. **Factory with dependency injection** - Standard pattern; would enable better test isolation but adds cognitive load in Phase 1
2. **Class-based services** - OOP style; harder to tree-shake, less functional
3. **Async factory** - Would complicate initialization, not needed for stateless DB access

**Lessons Learned:**
- Having one full implementation (Tasks) early was invaluable for pattern discovery
- The simple direct-import pattern actually makes it EASIER to refactor to DI later because services are already isolated
- Stubs for 8 other services compiled immediately; zero merge conflicts because patterns are consistent

### Why Local Type Definitions (Not Re-exported)?

**Decision:** Each service defines `type Task = typeof tasks.$inferSelect` locally

**Rationale:**
- **Prevents symbol fan-in:** No service types leak to root index
- **Minimal import graph:** Service files only depend on their schema module
- **Easier refactoring:** Can change service internals without affecting consumers
- **Clear ownership:** Type is local to service; no ambiguity about whose responsibility it is

**Trade-off:**
- Slight duplication: 9 services × 2-3 types each = same type definition appears multiple times
- **Mitigated by:** Types are simple 1-liners; clearer than shared type files

**Lessons Learned:**
- This pattern is actually MORE maintainable because each service is self-contained
- When API layer imports service, it gets clear type boundaries (can't accidentally use internal types)
- Makes it obvious which types are "public API" (exported) vs. internal

### Why Client Doesn't Import Schema?

**Decision:** `services/client.ts` returns bare `Database` type without schema binding

**Rationale:**
- **Per-service type graphs stay minimal:** Schema isn't loaded for every service
- **Flexibility:** Schema is a package concern; services are domain concerns
- **Future migrations:** Easy to swap schema provider in Phase 2+ without touching service code

**Why it works:**
- Drizzle's `Database` type works without schema (type-only operations)
- Service methods receive `db` parameter; they work with implicit schema knowledge
- Root knows about schema; services don't need to

**Performance impact:**
- Reduces symbol table size per service file
- Each service's type graph is ~30-50 symbols (schema alone would be ~300+)

### Error Return Semantics: Why This Pattern?

**Decision:**
- `list*`: Always array (never null) → `[]` when empty
- `get*`: Returns `T | null` → null means "not found OR not authorized"
- Mutations: Throw on system errors, return false/null for not-found

**Rationale:**
- **Consistent with domain expectations:** "Give me all tasks" → get array; "Give me task X" → get one or nothing
- **Simplifies API handlers:** No need to distinguish 404 from 403 at service layer (authorization is API concern)
- **Error contract clarity:** Typed errors (NotFoundError, ForbiddenError) are for system failures, not business logic

**Alternatives Considered:**
1. **Always throw on not-found** - Forces try/catch everywhere in API handlers; verbose
2. **Return Result<T, Error> type** - More explicit; adds type wrapper overhead
3. **Different methods for authorized vs. unauthorized** (getTask vs. getTaskIfOwned) - Duplicates code

**Lessons Learned:**
- The pattern works well because HTTP layer can interpret: null = 404, throw ForbiddenError = 403
- No additional interpretation needed; service contract maps cleanly to HTTP semantics
- Simplifying error handling in services made API layer implementations clearer

### Why Branded IDs (Compile-time Only, Runtime Validation in API)?

**Decision:** Use TypeScript branded types (`TaskId = string & { __brand: 'TaskId' }`) for compile-time safety; validate in API handlers before casting

**Rationale:**
- **Compile-time safety:** Prevents mixing up IDs at type level
- **Zero runtime overhead:** No branded ID class or runtime checks needed
- **Clear separation:** Service layer assumes IDs are valid; API layer does validation
- **Single point of validation:** Zod schema in API handler validates before ID is created

**Why NOT validate in service:**
- Would create circular dependency: Service validates but API also validates (redundant)
- Validation is a cross-cutting concern best handled at API boundary
- Services should assume their inputs are already validated

**Lessons Learned:**
- Developers immediately understood the pattern; no confusion about when to use branding
- Having both compile-time safety AND runtime validation at right layer was the key
- Test helpers that create `createTestUserId()` made testing cleaner than string literals

### Shared Test Utilities: Frozen Clock vs. Real Timestamps?

**Decision:** `FrozenClock` for deterministic test timestamps; optional, not mandatory

**Rationale:**
- **Reproducibility:** Test results don't depend on current time
- **Deterministic sorting:** Cursor-based pagination tests don't flake due to millisecond differences
- **Optional:** Tests can choose to use frozen or real clock based on needs

**Lessons Learned:**
- Frozen clock was helpful for test design but not essential in Phase 1
- Would be MORE important in Phase 2 if we add time-based queries (e.g., "tasks due today")
- Test isolation (transaction rollback) is MORE important than clock freezing

### Why Generate Schema But Commit Generated Files?

**Decision:** Committed generated files (not in .gitignore) with CI drift check

**Rationale:**
- **Developer experience:** Fresh clone doesn't require build step to work
- **Visibility:** PR shows exactly what schema changes affect services (helps reviewers)
- **CI safety:** Drift check catches accidentally edited generated files
- **Reproducibility:** Everyone gets same generated version; no local divergence

**Alternatives Considered:**
1. **Gitignore generated files, build during CI** - Adds CI time; requires build step on fresh clone
2. **Hand-written domain modules** - Original plan; too tedious and error-prone

**Lessons Learned:**
- CI drift check is ESSENTIAL - without it, developers will accidentally edit generated files
- Generator script should be fast (<1s); ours is deterministic and completes instantly
- Documenting "DO NOT EDIT MANUALLY" in generated file headers prevents mistakes

### Why Not Implement All 9 Services Now?

**Decision:** Full implementation for Tasks only; stubs for other 8 services

**Rationale:**
- **Establishes pattern:** Tasks is complex enough to show all patterns (CRUD, ownership, pagination, errors)
- **Reduces scope:** 83 tasks is already large; full implementation would add 6-8 tasks per service
- **Unblocks Phase 2:** API layer can be designed against service interface even if implementation is incomplete
- **Tests can be written:** Phase 2 can add real tests for full implementations

**Trade-off:**
- Services don't currently work (return empty arrays)
- **Mitigation:** Clear documentation of stub status; explicit "TODO" comments in stubs

**Lessons Learned:**
- Stubs compile and match interface; this is huge for parallel development
- Tasks service as reference implementation is more useful than 9 complete services each slightly different
- Phase 2 can focus on implementation details and optimizations without re-learning patterns

## Next Steps (Layer 2+)

1. **services/api routes** - Import services via subpaths, add Zod validation, test error mapping
2. **packages/hono-rpc** - Update types to match new service signatures, remove stale endpoints
3. **apps/** - Replace RPC usage, remove any direct DB imports, validate UI flows
4. **Integration tests** - End-to-end flows through API → RPC → UI
5. **Performance gates** - Verify post-change typecheck regression is ≤10%

## Next Steps (Layer 2+)

1. **services/api routes** - Import services via subpaths, add Zod validation, test error mapping
2. **packages/hono-rpc** - Update types to match new service signatures, remove stale endpoints
3. **apps/** - Replace RPC usage, remove any direct DB imports, validate UI flows
4. **Integration tests** - End-to-end flows through API → RPC → UI
5. **Performance gates** - Verify post-change typecheck regression is ≤10%

## Patterns That Emerged

### Pattern 1: The Ownership Check Helper

Most services follow this pattern for mutations:

```typescript
async function getTaskWithOwnershipCheck(
  db: Database,
  taskId: TaskId,
  userId: UserId
): Promise<Task> {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId))
  })
  if (!task) throw new ForbiddenError('Access denied')
  return task
}
```

**Why this works:**
- Called BEFORE any mutation (update/delete)
- Throws immediately if owner doesn't match
- Ensures consistency: authorization happens once, before state change

**Applicable to:** Tags, Calendar, Persons, Bookmarks, Possessions, Finance (all multi-tenant)

### Pattern 2: The Query Builder Pattern

Pagination implementation uses cursor-based offsets:

```typescript
const paging = normalizePaginationParams(query?.pagination)
const cursor = decodeCursor(paging.cursor)
// Build WHERE + LIMIT, execute with stable sort (createdAt, id)
```

**Why this works:**
- Cursor is opaque (base64 encoded); client can't guess/manipulate
- Stable sort (createdAt + id) ensures consistency across pages
- Works with additions/deletions (unlike offset pagination)

**Applicable to:** All `list*` methods

### Pattern 3: The Local Type Triangle

Each service follows:

```typescript
// In tasks.service.ts
import { tasks } from '../schema/tasks'
type Task = typeof tasks.$inferSelect
type TaskInsert = typeof tasks.$inferInsert

// NOT re-exported; local only
// API layer gets types from @hominem/hono-rpc
```

**Why this works:**
- Clear ownership: Types live where they're used
- No implicit dependencies on service types in API layer
- Easier to refactor service internals

**Applicable to:** All services

### Pattern 4: The Error Mapping

Services throw typed errors; API maps to HTTP:

```typescript
// Service
throw new ForbiddenError('Not your task')

// API middleware (pseudocode)
const { statusCode, code } = getErrorResponse(error)
return res.json({ code, message: error.message }, { status: statusCode })
```

**Why this works:**
- Clear separation: Service defines WHAT went wrong (semantically)
- API defines HOW to respond (HTTP status codes)
- Easy to add new error types without changing API contract

**Applicable to:** All error handling layers

## Edge Cases & Mitigations

### Edge Case 1: Schema Generator With Complex Nesting

**Problem:** Drizzle definitions have complex nesting (foreign keys, indexes, policies as callbacks in array)

```typescript
export const tasks = pgTable("tasks", {
  // ... fields
}, (table) => [
  foreignKey({ columns: [...], foreignColumns: [...] }).onDelete("cascade"),
  pgPolicy(...)
  // Multiple items in array
])
```

**Mitigation:** State machine parser tracks brace/bracket nesting level; only stops when level returns to 0 after `]);`

**Testing:** Ran generator on actual schema; validated output by counting tables matches source

### Edge Case 2: Circular Service Dependencies

**Potential problem:** Task has subtasks; subtask references parent task. Could create circular imports.

**Mitigation:** Don't re-export types from services. Each service imports from schema only. Circular schema references are fine (schema is immutable).

**Lesson:** If API layer needs to compose service types, it should define composition types itself (not inherit from service modules)

### Edge Case 3: Multi-table Transactions

**Problem:** Some operations touch multiple tables (e.g., create invoice + line items + update balance). How to maintain consistency?

**In Phase 1:** Not implemented. Services are single-table.

**In Phase 2:** Will use Drizzle's transaction API:
```typescript
db.transaction(async (tx) => {
  await tx.insert(invoices).values(...)
  await tx.insert(lineItems).values(...)
})
```

**Pattern:** Transaction boundary enforcement will happen in API layer, not service layer. API routes are the orchestration points.

### Edge Case 4: Partitioned Finance Tables (Year-based)

**Problem:** `financeTransactions2022`, `financeTransactions2023`, etc. How to query across years?

**In Phase 1:** Not solved. Schema includes tables but generator maps them all to `finance` domain.

**In Phase 2:** Options:
1. Union queries in service (database handles)
2. Service layer abstracts partitioning (e.g., `getTransactions(userId, year)` knows which table)
3. Database view across partitions (cleanest)

**Current state:** Finance service stub is ready for any of these approaches

### Edge Case 5: Cursor Stability With Deletions

**Problem:** User has 20 tasks. They fetch first page (cursor = task[20]). Then they delete task[15]. Cursor might be invalid.

**Mitigation:** Base cursor on immutable fields (id) not mutable fields (position). If task[20] still exists with same ID, cursor is still valid.

**Assumption:** We're not paginating on deletion events; normal pagination is stable for typical usage patterns.

**Better approach (Phase 2):** Add timestamp checks; API can detect if cursor is stale.

## Performance Observations

### Surprising Finding #1: Stubs Are Fast

Creating 8 service stubs took ~2 minutes total. No typecheck errors. Scaffolding is MUCH faster than thinking through full implementation.

**Implication:** Phase 2 can be driven by tests; implementation follows.

### Surprising Finding #2: Schema Slicing Matters Less Than Expected

The bottleneck isn't the schema size; it's the number of inference points tsserver has to track. A single `typeof table.$inferSelect` in one service isn't expensive. The problem would be inferring types across 9 services in root index.

**Implication:** Root index staying infra-only is the actual win, not schema splitting.

### Surprising Finding #3: Local Types Make Refactoring Easier

Because `Task` type only lives in tasks.service.ts, we can change it without affecting API layer (each service defines boundary).

**Implication:** Services are MORE decoupled than with shared type files.

## Lessons for Phase 2

1. **API layer can be designed now** - Service interfaces are locked; API can be built against stubs
2. **Test infrastructure is ready** - Factories, frozen clock, transaction rollback helpers all in place
3. **Error mapping is the success path** - Get error handling right in ONE route, apply pattern everywhere
4. **Branded ID validation is critical** - Even though branded IDs are compile-time, Zod validation must happen
5. **Don't over-engineer mutations** - Task service implementation shows: fetch, validate, update, return. Simple is good.

## Known Limitations & Future Work

### Layer 1: `@hominem/db` services - Acceptance Criteria

- `bun run typecheck` baseline recorded before implementation and after implementation using a fixed protocol
- Post-change incremental typecheck must not regress by more than 10% based on median of repeated runs
- `tsc --extendedDiagnostics` output captured for `@hominem/db` before/after
- `@hominem/db` subpath import contract (`@hominem/db/services/*`) is configured in package exports/types resolution and validated in typecheck
- tsserver scenario latency evidence is captured before/after and must not regress by more than 10% median

### Layer 2: `services/api`

- All route inputs validated with Zod
- All routes use new service signatures
- AuthN/AuthZ checks present for sensitive operations
- API tests cover success, validation failure, unauthorized, and not-found paths

### Layer 3: `packages/hono-rpc`

- Client/server RPC types match current API payloads
- No stale/removed endpoint references remain
- Typecheck passes in downstream app packages consuming RPC types

### Layer 4: `apps/*`

- App data access uses `@hominem/hono-client` only
- No imports from `@hominem/db` or DB schema/types in apps
- Key screens render and mutate data through RPC without runtime errors

### Repo Gates

- `bun run validate-db-imports` passes
- `bun run validate-db-imports` includes enforcement for no direct service imports from `migrations/schema.ts`
- `bun run test` passes for touched packages
- `bun run check` passes at repo root
- CI includes consumer package typecheck that imports services via `@hominem/db/services/*`
- CI includes generator drift check for `packages/db/src/schema/*.ts`

### Verification Status (2026-03-05)

- Confirmed green:
  - `bun run validate-db-imports`
  - `bun scripts/check-schema-drift.ts`
  - `bun run --filter @hominem/api typecheck`
  - `bun run --filter @hominem/hono-rpc typecheck`
  - `bun run --filter @hominem/events-services test`
  - `bun run --filter @hominem/finance-services test`
  - `bun run --filter @hominem/finance-services test -- src/modern-finance.accounts.integration.test.ts`
  - `bun run --filter @hominem/lists-services test`
  - `bun run --filter @hominem/notes-services test -- src/notes.integration.test.ts`
  - `bun run --filter @hominem/places-services test`
  - `bun run --filter @hominem/api test -- src/routes/finance/finance.transactions.router.test.ts src/routes/finance/finance.accounts.router.test.ts src/routes/finance/finance.data.router.test.ts`
  - `bun run --filter @hominem/api test -- src/auth/subjects.constraint.test.ts src/middleware/auth.middleware.test.ts src/middleware/block-probes.test.ts src/routes/status.test.ts`
  - `bun run test:e2e:auth:app`
  - `bun run test`
  - `bun run check`
- Remaining open:
  - `bun run test:e2e:auth:mobile` passes under the mobile auth state contract with local API stack availability
