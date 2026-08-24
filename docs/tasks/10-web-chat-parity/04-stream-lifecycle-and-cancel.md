---
type: task
id: WEB-CHAT-04
title: Implement durable web generation lifecycle and cancellation
status: completed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - streaming
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
blocks:
  - WEB-CHAT-05
  - WEB-CHAT-06
---

# Implement durable web generation lifecycle and cancellation

Refactor `useStreamMessage` so the request signal is actually connected to the
stream, and call the generation cancel endpoint when the user stops a reply.
Model preparing, active, stopping, cancelled, committed, and failed states
without leaving stale optimistic rows.

## Acceptance criteria

- Browser cancellation aborts the reader and requests server cancellation.
- The UI distinguishes cancellation from failure.
- No duplicate or orphan assistant message remains after cancellation.
- Query invalidation and draft recovery are deterministic after every terminal state.

## Implementation update — 2026-08-24

- Updated `useStreamMessage` to connect the browser abort signal to the typed stream request.
- Added server-backed generation cancellation before aborting the browser stream.
- Modeled preparing, streaming, stopping, cancelled, committed, and failed states.
- Added hook coverage for abort-signal wiring, committed responses, and cancellation ordering.
- Live browser verification observed the preparing/thinking and committed states; automated tests cover cancellation because the local response completed before the Stop control became actionable.
