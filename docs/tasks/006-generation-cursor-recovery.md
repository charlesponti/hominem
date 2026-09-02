---
title: 'Restore generation cursors across reconnects'
status: 'Implemented'
priority: 'high'
labels: [chat, replay, web, omiro]
depends_on: [005-generation-crash-recovery.md]
blocks: [007-client-convergence.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome

Web and Omiro reconnect from a validated durable cursor, receive lossless
ordered events, and stop cleanly at terminal state without duplicate semantic
events.

## Scope

In scope: cursor persistence, replay ordering, live/replay handoff, terminal
lookup, and invalid-cursor handling. Out of scope: recovery policy and product
UI redesign.

## Work sequence

| ID    | Work item                    | Owner boundary              | Depends on | Validation / artifact       | Done when                                                              |
| ----- | ---------------------------- | --------------------------- | ---------- | --------------------------- | ---------------------------------------------------------------------- |
| W-001 | Persist lifecycle checkpoint | Web/Omiro lifecycle storage | Task 005   | platform tests              | Active generation, phase, and durable sequence are saved and restored. |
| W-002 | Validate replay cursor       | API replay operation        | W-001      | API cursor tests            | Only non-negative safe cursors are accepted.                           |
| W-003 | Handoff live and replay      | API transport               | W-002      | overlap/disconnect tests    | Subscribe-before-replay and buffering are lossless and duplicate-safe. |
| W-004 | Stop terminal replay         | Web/Omiro transport         | W-003      | terminal/fresh-launch tests | Terminal state renders without resuming completed work.                |

## Acceptance criteria

- [x] AC-001: Send, start, regenerate, confirmation, retry, reconnect, and fresh launch restore correctly.
- [x] AC-002: Live-only deltas never advance the durable cursor.
- [x] AC-003: Invalid cursors, overlap, early termination, and terminal replay have explicit results.

## Validation record

- `packages/chat`: the shared client reducer and checkpoint schema reject
  foreign generations, duplicate durable sequences, malformed checkpoints, and
  unsafe cursors; the shared tool round-trip fixture reaches the same committed
  semantic state in both client transport suites.
- Web: `use-stream-message` restores active and terminal checkpoints, reconnects
  with `Last-Event-ID`, reconciles a stream that closes after durable commit, and
  clears terminal checkpoints. `consume-sse-response` preserves durable
  sequences while suppressing duplicate frames.
- Omiro: `use-chat-generation` restores and persists MMKV checkpoints, resumes
  with the saved durable cursor, and clears terminal state. `consume-sse-xhr`
  covers fragmented frames, duplicate durable events, aborts, reconnect, and
  terminal reduction using the same shared fixture.
- API: replay tests cover subscribe-before-load handoff, history/live overlap,
  terminal races, Last-Event-ID framing, and malformed cursor rejection.
- Validation run: full uncached `TURBO_FORCE=true pnpm run check` passed
  (26/26 tasks; Web 184 tests, Omiro 481 tests, API 288 tests, DB 27 tests),
  and `git diff --check` passed.

## Exit gate

Closed. Both clients exercise the shared canonical fixture and their platform
transport checkpoint/replay paths; API integration tests prove lossless handoff
and explicit cursor rejection. Browser/Omiro product evidence remains owned by
Task 011 and is not duplicated here.
