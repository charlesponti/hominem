# Notes Capability Modernization

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## NOTES-01 Notes CRUD And Listing
### Capability ID and entry points
- ID: `NOTES-01`
- Entry points:
  - `packages/notes/src/notes.service.ts`
  - `packages/notes/src/types.ts`
  - `packages/hono-rpc/src/routes/notes.ts`

### Current inputs/outputs + guards
- Inputs: create/update/list DTOs and `userId`.
- Outputs: note entities and paged list payloads.
- Guards: ownership checks exist but are route/service mixed.

### Current failure modes
- Listing/filter behavior can drift from type contracts.
- Update payload semantics can leak `undefined` under strict optional types.

### Modernization review
- Refactor options:
  - A) keep class service with mixed concerns
  - B) split query/command services + strict DTOs
  - C) route-centric orchestration
- Selected modern contract: **B**

### Final target contract
- Query service: `list/get/getVersions`
- Command service: `create/update/delete`
- Explicit DTOs with no ambiguous optional/nullable combinations.

### Required RED tests
- Tenant-scoped CRUD behavior.
- Strict DTO validation failures.
- Deterministic list ordering/pagination.

### Required GREEN tasks
- Extract command/query surfaces.
- Normalize list query contract.

### Legacy files/imports to delete
- Mixed command/query branches in monolithic service methods.

## NOTES-02 Versioning, Publish, Archive, Unpublish
### Capability ID and entry points
- ID: `NOTES-02`
- Entry points:
  - `packages/notes/src/notes.service.ts`
  - `packages/hono-rpc/src/routes/notes.ts`

### Current inputs/outputs + guards
- Inputs: note id, publish/archive actions.
- Outputs: updated note/version snapshots.
- Guards: ownership checks mostly at route boundary.

### Current failure modes
- State transition rules are implicit, not contract-locked.
- Archive/publish edge cases inconsistently handled.

### Modernization review
- Refactor options:
  - A) keep free-form transitions
  - B) explicit state machine transitions with typed commands
  - C) route-level branching
- Selected modern contract: **B**

### Final target contract
- Allowed transitions:
  - draft -> published
  - published -> archived
  - archived -> published (explicit unarchive/unpublish path)
- Invalid transitions return `ConflictError`.

### Required RED tests
- Invalid transitions rejected.
- Valid transitions preserve version history.
- Non-owner transition attempts rejected.

### Required GREEN tasks
- Add explicit transition command handlers.
- Enforce state machine in service layer.

### Legacy files/imports to delete
- Implicit status mutation branches.

## NOTES-03 AI Transform Actions (Expand/Outline/Rewrite/Etc.)
### Capability ID and entry points
- ID: `NOTES-03`
- Entry points:
  - `packages/hono-rpc/src/routes/notes.ts`
  - `packages/notes/src/notes.service.ts`
  - `packages/notes/src/notes.tool-def.ts`

### Current inputs/outputs + guards
- Inputs: note content + transform command.
- Outputs: transformed content payload.
- Guards: route-level auth present, per-action limits inconsistent.

### Current failure modes
- Transform operations are endpoint-scattered.
- Hard to enforce common quotas/timeouts/retry policy.

### Modernization review
- Refactor options:
  - A) keep one endpoint per transform with repeated logic
  - B) generic `applyTransform` command dispatcher with typed transform IDs
  - C) synchronous inline AI calls per route
- Selected modern contract: **B**

### Final target contract
- `applyTransform(userId, noteId, transformId, options)` with:
  - centralized authorization
  - centralized timeout/retry policy
  - typed transform output envelope

### Required RED tests
- Unsupported transform rejected.
- Authorized transforms succeed with deterministic envelope.
- Timeout/retry policy behavior validated.

### Required GREEN tasks
- Implement transform dispatcher.
- Refactor route endpoints to thin adapters.

### Legacy files/imports to delete
- Repeated transform logic branches in `packages/hono-rpc/src/routes/notes.ts`.
