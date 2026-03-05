# Calendar Capability Modernization

## Naming Lock (Canonical)
- This module is **Calendar**, not Events.
- Canonical schema/service surface is `calendar_events` + `calendar_attendees`.
- `events` naming is legacy umbrella terminology and must be removed during cutover (no alias/shim).

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## CALENDAR-01 Calendar Event CRUD With Attendees
### Capability ID and entry points
- ID: `CALENDAR-01`
- Entry points:
  - `packages/db/src/services/calendar.service.ts`
  - `packages/hono-rpc/src/routes/calendar.ts`
  - `packages/hono-rpc/src/schemas/calendar.schema.ts`

### Current inputs/outputs + guards
- Inputs: event create/update payloads, attendee commands, `userId`.
- Outputs: calendar event records and attendee rows.
- Guards: ownership enforced in service (`userId` scoped queries).

### Current failure modes
- Legacy events/calendar naming overlap can create route ambiguity if both are mounted.

### Modernization review
- Refactor options:
  - A) keep event CRUD + attendees mixed in route
  - B) service-owned command/query contract with ownership-first checks
  - C) route-level direct DB writes
- Selected modern contract: **B**

### Final target contract
- Commands:
  - `createEvent`
  - `updateEvent`
  - `deleteEvent`
  - `addEventAttendee`
  - `removeEventAttendee`
- Queries:
  - `getEvent`
  - `listEvents`
  - `listEventAttendees`
- All operations are ownership-scoped and deterministic.

### Required RED tests
- Cross-tenant event access blocked for get/update/delete.
- Attendee operations reject cross-tenant event ownership.
- Time filter results are deterministic and ordered by start time.
- Deletion removes event + attendee rows in same operation.

### Required GREEN tasks
- Lock calendar service contract as sole mutation/query surface.
- Add missing integration assertions for ownership + deterministic ordering.
- Keep API validation in `calendar.schema.ts` and ensure DTO contract parity with service methods.

### Legacy files/imports to delete
- Any direct calendar DB writes outside `calendar.service.ts`.
- Legacy event helper logic in non-calendar surfaces that duplicates attendee/event behavior.

### Execution status
- Calendar service and route contract now include attendee full-overwrite semantics (`replaceEventAttendees`).
- DB-backed integration suite is green for ownership, ordering/pagination, attendee lifecycle, replace semantics, and time filtering.

## CALENDAR-02 Provider Sync (Google Calendar)
### Capability ID and entry points
- ID: `CALENDAR-02`
- Entry points:
  - `packages/hono-rpc/src/routes/calendar.ts`
  - `packages/events/src/events.service.ts` (legacy sync orchestration)

### Current inputs/outputs + guards
- Inputs: sync commands, provider tokens, calendar metadata.
- Outputs: sync result and sync status payloads.
- Guards: auth checks in route, provider failures variably normalized.

### Current failure modes
- Provider errors are not normalized consistently.
- Legacy route/service naming (`events`) obscures calendar ownership and scope.

### Modernization review
- Refactor options:
  - A) keep sync under `/events`
  - B) move sync under canonical calendar module surface
  - C) parallel dual routes (`/events` + `/calendar`) temporarily
- Selected modern contract: **B**
- Rejected: C due no-shim/dual-path prohibition.

### Final target contract
- Provider sync is calendar-scoped and explicit in naming.
- Sync/status payloads have deterministic normalized envelope.
- Legacy `/events` sync route is removed after calendar route parity is green.

### Required RED tests
- Provider failure maps to deterministic internal error shape.
- Sync for user A never mutates user B data.
- No legacy `/events` route remains once calendar sync route is green.

### Required GREEN tasks
- Re-home sync/status behavior to calendar canonical surface.
- Remove legacy `events` route/service sync paths in same phase.

### Legacy files/imports to delete
- Legacy sync orchestration paths in `packages/events/src/events.service.ts`.

### Execution status
- Sync/status endpoints are now mounted on calendar canonical route surface.
- Legacy `events` route sync/status endpoints removed and route file deleted.
- `packages/hono-rpc/src/routes/calendar.ts` now resolves sync status via `GoogleCalendarService.getSyncStatus()` (no `@hominem/events-services` dependency).
- Legacy `getSyncStatus` branch removed from `packages/events/src/events.service.ts`.

## CALENDAR-03 Legacy Events Umbrella Decomposition
### Capability ID and entry points
- ID: `CALENDAR-03`
- Entry points:
  - `packages/events/src/events.service.ts`
  - `packages/hono-rpc/src/routes/vital.ts`

### Current inputs/outputs + guards
- Inputs: mixed event/habit/goal/health/visit payloads.
- Outputs: mixed domain responses.
- Guards: ownership checks vary by branch and route.

### Current failure modes
- “Events” naming hides domain boundaries and encourages monolithic coupling.
- Calendar and non-calendar capabilities are conflated.

### Modernization review
- Refactor options:
  - A) keep umbrella `events` domain
  - B) split domains: `calendar`, `habits`, `goals`, `health`, `places/visits`
  - C) keep events as public alias over split domains
- Selected modern contract: **B**
- Rejected: C due no-shim policy.

### Final target contract
- Calendar capabilities live only under calendar module contracts and routes.
- Non-calendar capabilities remain in their explicit domain modules.
- `/vital/events` path is removed or replaced with explicit domain routes only.

### Required RED tests
- Route-level contract tests prove calendar paths are explicit and ownership-enforced.
- No references to legacy `events` umbrella for calendar CRUD/type exports remain.

### Required GREEN tasks
- Remove legacy `events` naming from calendar capability surfaces and docs.
- Keep module boundaries explicit by capability domain.

### Legacy files/imports to delete
- Monolithic multipurpose branches in `packages/events/src/events.service.ts`.
- Legacy `/events` route mounts for calendar behaviors.

### Execution status
- `/vital/events` mount removed; calendar behavior is no longer aliased under events in vital routing.
- `packages/hono-rpc/src/routes/events.ts` deleted.
- `packages/hono-rpc/src/types/events.types.ts` deleted and no longer exported.
- Legacy monolithic branches were decomposed out of `packages/events/src/events.service.ts` into focused service files:
  - `packages/events/src/habits.service.ts`
  - `packages/events/src/goals.service.ts`
  - `packages/events/src/health.service.ts`
  - `packages/events/src/visits.service.ts`
- Residual `packages/events/src/events.service.ts` deleted after decoupling; shared internals now live in non-exported `packages/events/src/event-core.service.ts`.

### Remaining decomposition order (strict)
1. Completed: replaced `getSyncStatus` usage so `packages/hono-rpc/src/routes/calendar.ts` no longer imports from `@hominem/events-services`.
2. Completed: habit branches extracted to `packages/events/src/habits.service.ts`.
3. Completed: goal branches extracted to `packages/events/src/goals.service.ts`.
4. Completed: health branches extracted to `packages/events/src/health.service.ts`.
5. Completed: visit/place branches extracted to `packages/events/src/visits.service.ts`.
6. Completed: replaced remaining `@hominem/events-services` generic CRUD call sites in RPC routes:
   - `packages/hono-rpc/src/routes/habits.ts` now uses `getHabitById/deleteHabit`
   - `packages/hono-rpc/src/routes/goals.ts` now uses `getGoalById/deleteGoal`
   - `packages/hono-rpc/src/routes/health.ts` now uses `getHealthActivityById/deleteHealthActivity`
   - `packages/hono-rpc/src/routes/places.ts` now uses `createVisit/updateVisit/deleteVisit`
7. Completed: package public export surface no longer re-exports `packages/events/src/events.service.ts` from `packages/events/src/index.ts`.
8. Completed: residual internal generic event core file deleted; remaining shared logic moved to non-exported `packages/events/src/event-core.service.ts`.
