---
type: task
id: WEB-CHAT-07
title: Add assistant-message regeneration on web
status: ready
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - ai
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
  - WEB-CHAT-04
blocks: []
---

# Add assistant-message regeneration on web

Add the typed regeneration mutation and message action. Reuse the send-path
stream lifecycle, usage accounting, cancellation, and cache reconciliation.
Apply the approved ordering semantics for middle and final assistant messages.

## Acceptance criteria

- Eligible assistant messages expose regenerate.
- Regeneration cannot race with send or another regeneration.
- Cancellation and failure restore the approved prior state.
- Last and middle-message ordering behavior is covered by tests and a browser flow.

## Implementation update — 2026-08-24

- Added a typed web regeneration hook using the existing assistant-message regeneration endpoint.
- Assistant messages expose a disabled-while-active regenerate action and reconcile chat/list caches after completion.
- Added focused hook coverage for the request boundary and concurrent regeneration guard.
- Browser cancellation verification remains open until a Stop transition can be observed.
- Consolidated regeneration Storybook coverage into one interactive conversation harness with middle- and final-message states, plus a focused single-message action story.

## Implementation update — 2026-08-24

- Blocked regeneration while a normal send or another regeneration is active.
- Added server-backed cancellation with the browser abort signal and deterministic cache reconciliation for success, cancellation, and failure.
- Preserved the last regeneration target and response-length setting for retry after failure.
- Added focused hook and message-action tests for cancellation, retry, ordering guards, and recoverable errors.
- Added explicit regeneration lifecycle states and moved Thinking into the targeted assistant bubble with an interruptible in-place crossfade.
- Unified Submit and regeneration icon transitions, button press feedback, and reduced-motion shimmer behavior across chat controls.

## Validation update — 2026-08-24

- Web tests passed: 19 files, 56 tests.
- Web formatting, lint, typecheck, and diff checks passed.
- Browser ordering and cancellation flow remain partially unverified because the Stop transition completed before it became observable.

## Motion validation update — 2026-08-24

- Web tests passed: 19 files, 57 tests.
- Browser reload and regeneration completion preserved transcript ordering with no duplicate assistant row.
- The active Stop/Thinking frame remains timing-sensitive in the live browser because the local response completes before it can be sampled reliably.

## Browser verification attempt — 2026-08-24

- The authenticated chat tab exposed regeneration controls for both the middle and final assistant messages, and the transcript remained ordered after the action.
- The local regeneration response completed before the Stop control became actionable, so browser cancellation could not be observed.
