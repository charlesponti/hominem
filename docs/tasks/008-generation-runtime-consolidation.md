---
title: "Consolidate the production generation runtime"
status: "Implemented"
priority: "high"
labels: [chat, api, architecture, refactor]
depends_on: [002-chat-tool-event-round-trip.md, 004-generation-crash-recovery.md, 006-client-convergence.md, 007-generation-observability.md]
blocks: [009-remove-generation-compatibility.md]
estimated_size: "XL"
---

## Objective

Replace the four route-local `runChatGeneration` compositions with one
resource-oriented API generation facade that owns lifecycle orchestration.

## Context

`services/api/src/rpc/routes/chats.ts` currently repeats the same orchestration
for send, start, regenerate, and retry/continuation handlers around lines
1269, 1572, 1840, and 2159. Each block owns result variables, persistence
callbacks, live publication, usage accounting, cancellation checks, and final
message updates. This duplication is the production boundary to remove.

## Requirements

- Add a facade in `services/api/src/application` with explicit operations for
  create/attach generation, continue after confirmation, cancel, and replay.
- Move the repeated `ChatClient`/interpreter wiring, `persistEvent`, durable
  publication, usage accounting, cancellation check, and terminal handling into
  that facade.
- Make the four route handlers translate HTTP/RPC input and output only; they
  must not own assistant text, reasoning, tool records, or pending-tool state.
- Preserve owner checks, event ordering, SSE `[DONE]`, `Last-Event-ID`, and the
  current intended resource semantics. Legacy response compatibility is not a
  constraint.
- Add API integration coverage before deleting the old service boundary.

## Implementation Notes

- Candidate extraction points are
  `services/api/src/application/chat-generation-service.ts`,
  `services/api/src/application/chat-generation-provider.ts`, and
  `services/api/src/rpc/routes/chats.ts`.
- Define the current resource-oriented response contract at the facade
  boundary; do not add adapters for the legacy route result shape.
- Remove obsolete compatibility types as part of this consolidation when they
  are no longer needed by a current consumer.

## Acceptance Criteria

- [ ] The four route blocks delegate to the same facade operation and contain no
  duplicated orchestration state.
- [ ] API integration tests cover send, start, regenerate, confirmation,
  cancellation, retry, failure, and recovery through that facade.
- [ ] `rg` finds no route-level `runChatGeneration` call after the migration.
- [ ] Existing v1 semantic events, replay ordering, authorization, and current
  resource flows remain correct without a legacy compatibility adapter.

## Testing

- Extend `services/api/src/rpc/routes/chats.test.ts` for each facade operation.
- Move/adapt `services/api/src/application/chat-generation-service.test.ts`
  around the new facade contract.
- Run the API test, typecheck, and build commands before task 009 begins.
