---
title: "Restore generation cursors across reconnects"
status: "todo"
priority: "high"
labels: [chat, replay, web, omiro]
depends_on: [004-generation-crash-recovery.md]
blocks: [006-client-convergence.md]
estimated_size: "L"
---

## Objective

Make the durable sequence cursor a single, testable piece of generation client
state for Web SSE and Omiro XHR reconnects and fresh launches.

## Context

Web currently tracks `lastDurableSequence` in
`apps/web/app/lib/hooks/use-stream-message.ts` and sends it as
`Last-Event-ID`. Omiro tracks the cursor inside
`apps/omiro/services/chat/consume-sse-xhr.ts` and sends it as `afterSequence`.
The server replay adapter is in `services/api/src/rpc/routes/chats.ts`.

## Requirements

- Define the cursor field and update ownership in the shared generation client
  state rather than maintaining independent hook-local counters.
- Persist/restore the active generation ID, phase, and last durable sequence in
  each platform's existing chat-generation lifecycle storage.
- Pass the restored cursor through the existing Web `Last-Event-ID` and Omiro
  `afterSequence` replay URL paths after validating it as a non-negative safe
  integer.
- Preserve server live-subscription-before-replay ordering and the shared
  `createGenerationEventDeduplicator` behavior.
- Reconcile a terminal lookup before opening a new live stream; do not resume a
  committed, failed, or cancelled run as active work.

## Implementation Notes

- Keep token and reasoning deltas live-only.
- Update `apps/web/app/lib/hooks/use-stream-message.ts`,
  `apps/omiro/services/chat/consume-sse-xhr.ts`, and the generation lifecycle
  services that call them.
- Use the existing v1 event IDs and `afterSequence`/`Last-Event-ID` adapters.
- Do not add Android behavior to Omiro.

## Acceptance Criteria

- [ ] A reconnect after every durable event sequence sends exactly the last
  applied sequence to the server.
- [ ] Replay/live overlap is applied once and a live-only delta never advances
  the durable cursor.
- [ ] Fresh launch restores running and awaiting-confirmation state, while
  terminal runs are rendered terminal without reopening work.
- [ ] Web and Omiro pass equivalent cursor values for the same event fixture.

## Testing

- Extend `apps/web/app/lib/hooks/use-stream-message.test.tsx` and
  `apps/web/app/lib/chat/consume-sse-response.test.ts`.
- Extend `apps/omiro/tests/services/chat/consume-sse-xhr.test.ts` and the
  send/start/regenerate service tests.
- Extend `services/api/src/rpc/routes/chats.test.ts` for replay cursor and
  live-before-replay ordering.
- Add fresh-launch fixtures for running, awaiting-confirmation, committed,
  failed, and cancelled runs.
