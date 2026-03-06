# Chat Capability Modernization

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## CHAT-01 Chat Lifecycle (Create/List/Get/Delete)
### Capability ID and entry points
- ID: `CHAT-01`
- Entry points:
  - `packages/chat/src/service/chat.queries.ts`
  - `packages/chat/src/service/chat.service.ts`
  - `packages/hono-rpc/src/routes/chats.ts`

### Current inputs/outputs + guards
- Inputs: `userId`, chat metadata, optional note link.
- Outputs: chat records and lists.
- Guards: user ownership filters present but not centralized.

### Current failure modes
- Ownership checks repeated per query.
- Deletion semantics inconsistent across routes.

### Modernization review
- Bottlenecks: query logic spread across route + query files.
- Refactor options:
  - A) keep query-per-function style
  - B) create `ChatService` with ownership-scoped methods
  - C) perform checks in route only
- Selected modern contract: **B**
- Rejected: A/C for duplication and leaky boundaries.

### Final target contract
- `createChat(userId, input)`
- `listChats(userId, query)`
- `getChatById(userId, chatId)`
- `deleteChat(userId, chatId)`
- All methods enforce ownership internally.

### Required RED tests
- User lists only own chats.
- Cannot fetch/delete another tenant chat.
- Delete is idempotent.

### Required GREEN tasks
- Build ownership-scoped service.
- Route refactor to service-only use.
- Add canonical module contracts at `packages/chat/src/contracts.ts`.
- Remove `@hominem/db/schema|types/chats` imports from chat and RPC layers.

### Legacy files/imports to delete
- Duplicate direct query usage in route handlers.
- `@hominem/db/schema/chats` imports outside `packages/db`.
- `@hominem/db/types/chats` imports outside `packages/db`.

## CHAT-02 Message Send And History
### Capability ID and entry points
- ID: `CHAT-02`
- Entry points:
  - `packages/chat/src/service/message.service.ts`
  - `packages/hono-rpc/src/routes/chats.ts`

### Current inputs/outputs + guards
- Inputs: messages payload, chat id, user context.
- Outputs: appended message, message list.
- Guards: per-endpoint checks, no single invariant layer.

### Current failure modes
- Potential ordering instability on message fetch.
- Validation and persistence concerns mixed.

### Modernization review
- Refactor options:
  - A) route-driven pipeline
  - B) service pipeline with validated command object
  - C) event-based async write path
- Selected modern contract: **B**

### Final target contract
- `sendMessage(command)` validates/authorizes/persists in one pipeline.
- `listMessages(userId, chatId, pagination)` deterministic sort by `(createdAt,id)`.

### Required RED tests
- Unauthorized send rejected.
- Message ordering stable across pagination.
- Invalid payload rejected at boundary.

### Required GREEN tasks
- Introduce command DTO and validation gateway.
- Apply deterministic pagination strategy.
- Route persistence typing through `@hominem/chat-services` contract exports.

### Legacy files/imports to delete
- Route-level message mutation logic.

## CHAT-03 Note-Linked Chat, Search, And Active Chat Semantics
### Capability ID and entry points
- ID: `CHAT-03`
- Entry points:
  - `packages/chat/src/service/chat.queries.ts`
  - `packages/hono-rpc/src/routes/chats.ts`

### Current inputs/outputs + guards
- Inputs: `noteId`, text query, userId.
- Outputs: linked chat, search results.
- Guards: ownership checks are fragmented.

### Current failure modes
- Search consistency and ranking may vary.
- Active chat acquisition logic can race.

### Modernization review
- Refactor options:
  - A) keep ad hoc query set
  - B) explicit `getOrCreateActiveChat` transaction + search contract
  - C) retain route-level fallback behavior
- Selected modern contract: **B**

### Final target contract
- `getOrCreateActiveChat(userId, noteId?)` transactional and idempotent.
- `searchChats(userId, query, pagination)` deterministic response shape.

### Required RED tests
- Concurrent active-chat acquisition remains single-active.
- Note-linked lookup never leaks cross-tenant.
- Search excludes non-owned chats.

### Required GREEN tasks
- Implement transactional active-chat path.
- Normalize search query/pagination contract.
- Preserve no-shim cutover by deleting legacy DB chat type/schema dependency usage.

### Legacy files/imports to delete
- Non-transactional active chat fallback branches.

## Execution Status (2026-03-04)
- `packages/chat/src/contracts.ts` created as chat domain source of truth.
- Chat service/query/message files no longer import `@hominem/db/schema/chats` or `@hominem/db/types/chats`.
- `packages/hono-rpc/src/types/chat.types.ts` and `packages/hono-rpc/src/utils/ai-adapters.ts` now import chat contracts from `@hominem/chat-services`.
- `@hominem/chat-services` gates for this slice are green:
  - `bun run --filter @hominem/chat-services typecheck`
  - `bun run --filter @hominem/chat-services test`
