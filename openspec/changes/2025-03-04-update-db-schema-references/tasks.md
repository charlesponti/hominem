## 0. Reality Reset (Must Be True Before Any New Work)

- [x] 0.1 Re-read canonical artifacts (`proposal.md`, `design.md`, `tasks.md`) and lock scope to this change only
- [x] 0.2 Re-run health snapshot on 2026-03-04:
  - `bun run validate-db-imports` (passes)
  - `bun run --filter @hominem/db typecheck` (passes)
  - `bun run --filter @hominem/hono-rpc typecheck` (fails)
- [x] 0.3 Re-open checklist items whose gates are currently red so task status matches repo reality
- [x] 0.4 Create capability artifact directory: `openspec/changes/archive/2025-03-04-update-db-schema-references/capabilities/`
- [x] 0.5 Create module capability modernization artifacts (in strict order): `auth.md`, `chat.md`, `notes.md`, `calendar.md`, `lists.md`, `places.md`, `finance.md`
- [x] 0.6 For every capability entry, include required fields:
  - capability ID + entry points
  - current IO + guards
  - current failure modes
  - modernization review (options, selected, rejected)
  - final target contract
  - required RED tests
  - required GREEN tasks
  - legacy deletions

## 1. Hard Blockers First (Compile + Import Contract)

- [x] 1.1 Fix `validate-db-imports` blocker in `packages/db/src/services/client.ts` so services no longer import from `migrations/schema.ts`
- [x] 1.2 Re-run `bun run validate-db-imports` and require zero violations before proceeding
- [ ] 1.3 Stabilize remaining DB service compile surface and ensure no `database.query.<table>` gaps remain in:
  - `tasks.service.ts`
  - `tags.service.ts`
  - `calendar.service.ts`
  - `persons.service.ts`
  - `bookmarks.service.ts`
  - `possessions.service.ts`
- [ ] 1.4 Ensure `@hominem/db` continues to pass typecheck after 1.1-1.3

## 2. Test Foundation (Integration-First RED-GREEN, No Skeletons)

- [ ] 2.1 Build/confirm shared test scaffolding in `packages/db/src/test/services/_shared/`:
  - test DB lifecycle harness (isolation, rollback/reset, deterministic seed path)
  - deterministic user factories
  - deterministic domain seed builders
  - shared assertion helpers (not-found, ownership, idempotency)
  - frozen clock utility and seeded randomness utility
- [ ] 2.2 Remove duplicated fixture wiring from service and route integration tests by centralizing common setup/teardown
- [ ] 2.3 Enforce integration-first test policy:
  - capability tests default to DB-backed integration slice tests
  - integration tests assert both flow and invariants (ownership, idempotency, deterministic pagination/order)
  - unit tests only for isolated pure logic modules (state machines/mappers/validators)
  - no placeholder/skeleton tests
  - every test has concrete arrange/act/assert
  - every RED step must be observable (failing assertion/error) before GREEN implementation
- [ ] 2.4 Add/confirm test docs in this change describing how to add new service tests without duplication

## 3. DB Services RED-GREEN Completion (`@hominem/db`)

- [ ] 3.1 Tasks service:
  - write failing DB-backed integration behavior tests
  - implement minimal GREEN code
  - refactor while keeping tests green
- [ ] 3.2 Tags service:
  - include DB-backed `replaceEntityTags` idempotency and ownership tests
- [ ] 3.3 Calendar service:
  - include DB-backed attendee replacement overwrite semantics and cross-tenant tests
- [ ] 3.4 Persons service:
  - include DB-backed exact optional update field semantics
- [ ] 3.5 Bookmarks service:
  - include DB-backed folder filter and ownership checks
- [ ] 3.6 Possessions service:
  - include DB-backed container lifecycle + container deletion nullification behavior
- [ ] 3.7 Finance services:
  - categories/accounts/transactions full DB-backed RED-GREEN
  - `(date,id)` partition-key point op behavior for transactions
- [ ] 3.8 Validate transaction boundaries in all replace/multi-table writes
- [ ] 3.9 Validate service error taxonomy behavior with real tests (`Validation/NotFound/Conflict/Forbidden/Internal`)
- [ ] 3.10 Validate query contract behavior with real tests (limit clamping, stable cursor sorting, deterministic pagination)

## 4. API + RPC Integration Stabilization (Replacement-Only, No Shims)

- [ ] 4.1 Fix strict typing and module resolution regressions in `packages/hono-rpc/src/routes/(economy|knowledge|vital|people).ts`
- [ ] 4.2 Build a legacy replacement inventory for remaining failing modules (auth/chat/notes/calendar/lists/places/finance), including:
  - legacy module path
  - replacement target (new DB service/RPC route/type)
  - owner/timeline for deletion of legacy module
- [ ] 4.3 Replace `auth` files in strict order (from `design.md`), then run module tests + typecheck
- [ ] 4.4 Replace `chat` files in strict order (from `design.md`), then run module tests + typecheck
- [ ] 4.5 Replace `notes` files in strict order (from `design.md`), then run module tests + typecheck
- [ ] 4.6 Replace `calendar` files in strict order (from `design.md`), then run module tests + typecheck and remove legacy `events` calendar surfaces
- [ ] 4.7 Replace `lists` files in strict order (from `design.md`), then run module tests + typecheck
- [ ] 4.8 Replace `places` files in strict order (from `design.md`), then run module tests + typecheck
- [ ] 4.9 Replace `finance` files in strict order (from `design.md`), then run module tests + typecheck
- [ ] 4.10 For each module in 4.3-4.9:
  - write/update DB-backed integration slice tests for new contract behavior (RED first)
  - implement GREEN on new architecture interfaces only
  - add targeted pure unit tests only when logic is isolated and non-DB
  - delete legacy module implementation and imports in the same phase
  - create `packages/<module>/src/contracts.ts` and route all domain schema/type imports through it
  - forbid `@hominem/db/schema/<module>` and `@hominem/db/types/<module>` imports outside `packages/db`
- [ ] 4.11 Enforce no-shim policy after each module cutover:
  - no alias exports for legacy symbols
  - no adapter/wrapper modules preserving legacy contract names
  - no dual-path execution
- [ ] 4.12 Ensure API boundary validation remains Zod-first with branded IDs applied only after validation
- [ ] 4.13 Add/expand API and RPC tests that prove:
  - success path
  - validation failure
  - unauthorized/forbidden
  - not found
  - conflict
- [ ] 4.14 Run and pass `bun run --filter @hominem/hono-rpc typecheck`
- [ ] 4.15 After each module cutover, run clean DB rebuild gate:
  - `bun run --filter @hominem/db clean`
  - `cd packages/db && bunx tsc -b --force`
  - verify stale module artifacts are absent from `packages/db/build/schema`

## 5. Consumer and App Layer Contract Verification

- [ ] 5.1 Verify all app data access remains RPC-only (`@hominem/hono-client`, `@hominem/hono-rpc/types`)
- [ ] 5.2 Verify no app imports from `@hominem/db` schema/types/services directly
- [ ] 5.3 Run `bun run validate-db-imports` again after app and RPC updates
- [ ] 5.4 Validate key UI read/write flows through rebuilt RPC endpoints

## 6. Performance and Type-Server Validation

- [ ] 6.1 Clear turbo cache; capture post-change `bun run typecheck` 3x and median
- [ ] 6.2 Capture post-change `bun run --filter @hominem/db typecheck -- --extendedDiagnostics`
- [ ] 6.3 Capture post-change tsserver latency scenario logs and median
- [ ] 6.4 Compare against baseline and enforce <=10% regression threshold
- [ ] 6.5 Attach timing/diagnostic artifacts to change notes

## 7. Final Gates (In This Exact Order)

- [ ] 7.1 `bun run validate-db-imports`
- [ ] 7.2 Run module integration slice suites (touched packages first, in strict module order)
- [ ] 7.3 `bun run test` (touched packages first, then broader run)
- [ ] 7.4 `bun run check` (repo root)
- [ ] 7.5 Consumer subpath resolution gate (at least one package importing `@hominem/db/services/*`)
- [ ] 7.6 Generator drift gate passes (schema slice regeneration produces no diff)
- [ ] 7.7 No-shim gate passes:
  - grep-based check confirms no shim/adapter/legacy-alias modules remain in replaced surfaces
  - no new root exports added solely for legacy compatibility

## 8. Close-Out Integrity

- [ ] 8.1 Add verification status note to proposal/tasks with concrete gate results and timing values
- [ ] 8.2 Mark checklist items complete only after corresponding command evidence is green
- [ ] 8.3 If any gate remains red, keep affected checklist items open and document blockers explicitly

## 9. Progress Log (2026-03-04)

- [x] 9.1 Auth module modernization step executed:
  - user mapper contract tests added
  - account service updated to new schema contract
  - `@hominem/auth` tests + typecheck passing
- [x] 9.2 Chat module modernization step executed:
  - owner-scoped lifecycle behavior enforced in service/query layer
  - chat contract tests added
  - canonical chat contracts added at `packages/chat/src/contracts.ts`
  - chat service/query layer moved to local table mapping (no `@hominem/db/schema|types/chats` imports)
  - RPC chat types + AI adapters rewired to `@hominem/chat-services` contracts
  - `@hominem/chat-services` tests + typecheck passing
- [x] 9.3 Notes module modernization step executed:
  - canonical domain contracts added at `packages/notes/src/contracts.ts`
  - notes service and note state logic consume local contracts (no `@hominem/db/schema|types/notes`)
  - split state/service suites replaced with unified integration-first suite `notes.integration.test.ts`
  - join-table tag architecture enforced (`note_tags`) and legacy JSON-tag dependence removed from service behavior
  - RPC notes schema/types now consume `@hominem/notes-services` contracts
  - clean `@hominem/db` rebuild removed stale generated notes module artifacts
  - `@hominem/notes-services` tests + typecheck passing
- [ ] 9.4 Calendar module started (strict next order item; legacy `events` decomposition in same phase):
  - replace legacy `@hominem/db` root helper imports with explicit modern query helpers
  - then add DB-backed integration slice tests for calendar contract invariants
  - calendar service contract hardened:
    - `listEvents` now supports deterministic `limit/offset` pagination
    - `removeEventAttendee` no longer relies on unsafe nullable DB context access
    - `replaceEventAttendees` added with transactional full-overwrite semantics and deduplication
  - calendar RPC surface updated:
    - `PUT /calendar/:id/attendees` added for full attendee-set replacement
    - calendar query schema now coercively validates `limit` and `offset` query parameters
    - Google Calendar sync/status endpoints moved to calendar canonical route surface
      - `GET /calendar/google/calendars`
      - `POST /calendar/google/sync`
      - `GET /calendar/sync/status`
      - calendar sync status lookup now comes from `GoogleCalendarService.getSyncStatus()` in the calendar route (no `@hominem/events-services` dependency)
      - legacy `getSyncStatus` branch removed from `packages/events/src/events.service.ts`
    - `/vital/events` mount removed; vital calendar behavior now exposed via `/vital/calendar`
    - legacy `events` RPC surfaces removed:
      - `packages/hono-rpc/src/routes/events.ts` deleted
      - `packages/hono-rpc/src/types/events.types.ts` deleted
      - `packages/hono-rpc/src/types/index.ts` no longer re-exports `events.types`
  - calendar integration-first suite added at `packages/db/src/services/calendar.service.integration.test.ts`
    - verified green with 5 passing tests (ownership, ordering/pagination, attendee lifecycle, replace semantics, time filters)
  - blocker discovered when integration suites were executed against running test DB:
    - `notes` table in test DB is legacy shape (missing `type/status/...` columns expected by `@hominem/db/schema/notes`)
    - legacy multipurpose branches in `packages/events/src/events.service.ts` were decomposed into focused services (`habits/goals/health/visits`)
    - RPC generic CRUD dependencies were cut over to domain-specific service methods in habits/goals/health/places routes
    - `@hominem/events-services` package index no longer re-exports `events.service.ts` generic CRUD surface
    - residual internal `packages/events/src/events.service.ts` deleted; shared internals moved to non-exported `packages/events/src/event-core.service.ts`
