# Lists Capability Modernization

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## LISTS-01 List CRUD And Ownership
### Capability ID and entry points
- ID: `LISTS-01`
- Entry points:
  - `packages/lists/src/list-crud.service.ts`
  - `packages/hono-rpc/src/routes/lists.mutation.ts`

### Current inputs/outputs + guards
- Inputs: list create/update/delete payloads.
- Outputs: list entity or boolean success.
- Guards: ownership checks exist but differ by operation.

### Current failure modes
- Output shape drift (`ListOutput` mismatches).
- Legacy imports from deprecated schema symbols.

### Modernization review
- Selected modern contract: ownership-scoped commands on new list tables only.

### Final target contract
- `createList(userId, input): List`
- `updateList(userId, listId, patch): List`
- `deleteList(userId, listId): boolean`
- No mutation without ownership.

### Required RED tests
- Non-owner update/delete denied.
- Duplicate-name conflicts handled deterministically.

### Required GREEN tasks
- Rewrite CRUD service against new schema contracts.
- Align output DTOs with RPC contracts.

### Legacy files/imports to delete
- `@hominem/db/schema/tables` legacy list symbols.

### Execution status
- `LISTS-01` foundation implemented on `task_lists`-backed CRUD with owner-scoped create/update/delete behavior.
- Deterministic duplicate-name handling implemented per owner in `createList`/`updateList`.
- DB-backed integration suite added and green:
  - `packages/lists/src/list-crud.integration.test.ts` (owner success, non-owner deny, duplicate conflict determinism).
- `packages/hono-rpc/src/routes/lists.mutation.ts` update path now returns the modernized CRUD result directly (no legacy list query backfill call).

## LISTS-02 Query Projections And Counts
### Capability ID and entry points
- ID: `LISTS-02`
- Entry points:
  - `packages/lists/src/list-queries.service.ts`
  - `packages/hono-rpc/src/routes/lists.query.ts`

### Current inputs/outputs + guards
- Inputs: userId, list filters.
- Outputs: list views with ownership/collaboration metadata and item counts.
- Guards: query visibility rules vary by endpoint.

### Current failure modes
- Count queries may trigger expensive repeated queries.
- Shared vs owned query semantics not consistently centralized.

### Modernization review
- Selected modern contract: projection repository with explicit query DTOs and stable sort.

### Final target contract
- `listOwned(userId, pagination)`
- `listAccessible(userId, pagination)`
- `getListById(userIdOrNull, listId)` with strict visibility semantics.

### Required RED tests
- Owned vs shared visibility tested separately.
- Stable pagination sort behavior.
- Count projections match item membership.

### Required GREEN tasks
- Build projection queries with minimal joins and precomputed count strategy.

### Legacy files/imports to delete
- Ad hoc list projection helpers that bypass shared query contract.

### Execution status
- `LISTS-02` query service is now rebuilt on `task_lists` + `tasks` only:
  - `getOwnedLists` and `getOwnedListsWithItemCount` use single-query projections with stable ordering (`created_at desc, id asc`).
  - `getListById` now enforces strict owner visibility (anonymous/non-owner returns `null`).
  - `getAllUserListsWithPlaces` projects owned lists only and returns shared as empty in the current schema.
- DB-backed integration coverage added and green in `packages/lists/src/lists.service.test.ts`:
  - owner-only visibility, deterministic counts, strict `getListById` guards, and containing-place projection behavior.

## LISTS-03 List Items And Place Membership
### Capability ID and entry points
- ID: `LISTS-03`
- Entry points:
  - `packages/lists/src/list-items.service.ts`
  - `packages/hono-rpc/src/routes/lists.mutation.ts`

### Current inputs/outputs + guards
- Inputs: list id, item/place id payloads.
- Outputs: list item mutations and item collections.
- Guards: membership and ownership are separated across services.

### Current failure modes
- Duplicate membership insertion race risk.
- Remove/delete semantics differ across endpoints.

### Modernization review
- Selected modern contract: transactional add/remove with idempotent behavior.

### Final target contract
- `addItemToList(command)` idempotent on duplicate.
- `removeItemFromList(command)` idempotent on missing.
- List membership checks run inside service.

### Required RED tests
- Concurrent add does not duplicate membership.
- Remove missing item succeeds idempotently.
- Non-member/non-owner mutation denied.

### Required GREEN tasks
- Transactional membership mutation layer.
- Unify delete/remove semantics.

### Legacy files/imports to delete
- Route-level fallback mutations.

### Execution status
- `LISTS-03` service is migrated off legacy `items/lists/places` schema imports.
- `list-items.service.ts` now uses `tasks` row ownership for list-item mutation semantics:
  - owner-scoped `deleteListItem`
  - owner-guarded `addItemToList`/`removeItemFromList`
  - deterministic `getItemsByListId` ordering.
- Place projection helpers are explicitly no-op in the current `task_lists` architecture (`[]`/`null`) until a dedicated place-membership table exists.

## LISTS-04 Invite Lifecycle
### Capability ID and entry points
- ID: `LISTS-04`
- Entry points:
  - `packages/lists/src/list-invites.service.ts`
  - `services/api/src/routes/invites.incoming.ts`
  - `services/api/src/routes/invites.outgoing.ts`

### Current inputs/outputs + guards
- Inputs: invite create/accept/delete tokens and emails.
- Outputs: invite entities and acceptance results.
- Guards: token and ownership checks exist but scattered.

### Current failure modes
- Token lookup/update patterns inconsistent.
- Email-to-user binding edge cases are fragile.

### Modernization review
- Selected modern contract: invite state machine (`pending|accepted|revoked|expired`) with strict transition checks.

### Final target contract
- Token operations are single-purpose command handlers.
- Accept/decline/revoke are explicit transitions.

### Required RED tests
- Invalid token rejected.
- Double-accept rejected.
- Owner cannot accept own invite.
- Accepted invite cannot be revoked as pending.

### Required GREEN tasks
- Implement invite state transitions with typed errors.
- Normalize invite query and mutation contracts.

### Legacy files/imports to delete
- Old token helper signatures that accept string/object interchangeably.

### Execution status
- `LISTS-04` now runs on persisted `task_list_invites` storage (no placeholder behavior).
- `sendListInvite` creates normalized-email pending invites with deterministic conflict checks.
- `acceptListInvite` enforces strict token/list/user guards and performs accepted transition plus collaborator creation.
- `getListInvites`, `getInvitesForUser`, `getOutboundInvites`, token lookup, and delete operations are DB-backed and deterministic.
- DB-backed integration suite added and green in `packages/lists/src/list-sharing.integration.test.ts` (invite create/query/accept/remove lifecycle).

## LISTS-05 Collaborator Membership
### Capability ID and entry points
- ID: `LISTS-05`
- Entry points:
  - `packages/lists/src/list-collaborators.service.ts`

### Current inputs/outputs + guards
- Inputs: list ids, user ids for membership checks/removals.
- Outputs: membership flags and link records.
- Guards: membership checks rely on old query symbols.

### Current failure modes
- Missing symbol issues against new schema.
- Incomplete tenant isolation guarantees.

### Modernization review
- Selected modern contract: collaborator repository with strict owner/member semantics.

### Final target contract
- `isUserMemberOfList(listId, userId)`
- `removeUserFromList(ownerId, listId, memberId)`
- `listMembershipLinks(listIds)`

### Required RED tests
- Owner can remove collaborator.
- Collaborator cannot remove owner.
- Non-member removal is idempotent.

### Required GREEN tasks
- Rewrite collaborator queries against new schema.
- Introduce strict membership role checks.

### Legacy files/imports to delete
- Legacy query calls referencing old relational symbol names.

### Execution status
- `LISTS-05` now runs on persisted `task_list_collaborators` storage.
- Membership contract:
  - `isUserMemberOfList` checks owner or collaborator membership.
  - `getUserListLinks` returns owner and collaborator links for each requested list.
  - `removeUserFromList` enforces owner guard, rejects owner-removal, and performs real collaborator deletion.
- Query projection behavior now includes shared visibility:
  - `getUserLists`/`getUserListsWithItemCount` return owned + collaborator-accessible lists.
  - `getAllUserListsWithPlaces` now splits owned vs shared projections deterministically.
