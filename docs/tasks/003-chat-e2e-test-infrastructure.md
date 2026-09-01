---
title: 'Build the chat integration test SDK'
status: 'Partial'
priority: 'urgent'
labels: [chat, testing, e2e, api, database, web, omiro]
depends_on: [002-chat-tool-event-round-trip.md]
blocks:
  [
    004-typed-generation-boundaries.md,
    005-generation-crash-recovery.md,
    006-generation-cursor-recovery.md,
    007-client-convergence.md,
    008-generation-observability.md,
    009-generation-runtime-consolidation.md,
    010-remove-generation-compatibility.md,
    011-functional-chat-shipping-evidence.md,
  ]
estimated_size: 'XL'
---

## Objective

Build one deterministic, API-local SDK for testing the complete Hominem chat
path. It must exercise real Hono routes, application services, generation
runtime, repositories, PostgreSQL, durable events, replay, SSE, and canonical
client reduction. Only provider behavior and external infrastructure that
cannot run in-process may be controlled.

## Current status

`Partial`. The first SDK façade exists at
`services/api/src/testkit/hominem-tests.ts`. It creates an authenticated test
user, mounts real generation routes with a real `ChatGenerationService`, injects
a scripted model/planner/tool runtime, parses canonical SSE, reduces events to
client state, and provides durable database inspection. The route factory and
service dependency seams preserve production defaults.

The façade currently proves start text, optional usage persistence, fragmented and
multiple tool execution, send, terminal replay, duplicate-safe reduction,
transient retry, permanent provider failure, confirmation approval/resume and
rejection, tool failure continuation, regeneration, and four named failure
seams. The rejection scenario also established the required lifecycle rule: a
rejected tool may produce a `tool.failed` semantic result, but it must not be
persisted as an execution failure. The complete operation/scenario matrix,
browser evidence, and iOS simulator evidence remain open. The repeatable
browser procedure is documented in
[`../chat-browser-playbook.md`](../chat-browser-playbook.md). The former
module-mocked generation E2E file has been removed; the SDK is now the
API-local integration entry point.

## SDK contract

The public test entry point is `HominemTests.create({ provider })` and returns a
disposable test context. The context must provide:

- `chat.start`, `chat.send`, `chat.regenerate`,
  `chat.respondToConfirmation`, `chat.replay`, and `chat.cancel`.
- Typed scripted provider turns for text, reasoning, fragmented/multiple tool
  calls, usage, retry, permanent failure, and cancellation timing.
- Typed in-process tools with input/output schemas, confirmation metadata, and
  observable idempotency keys.
- Parsed SSE results containing response metadata, canonical events, durable
  versus live events, durable sequence IDs, `[DONE]` count, and reduced client
  state.
- Inspectors for runs, events, projections, snapshots, messages, usage, and
  tool effects.
- Named failure injection at provider, tool, append, snapshot, cancellation,
  replay/publication, queue, and transport-disconnect seams. The current SDK
  implements append, snapshot, publication, and cancellation commit injection;
  provider and tool failures are scripted through their real boundaries.
- Deterministic `close()` cleanup for every created user and chat record.

The SDK must not mock repositories, application services, the generation
machine/interpreter, event persistence, replay, or SSE framing in integration
tests.

## Required scenarios

Implement SDK-backed route-to-state tests for:

- Start and send with text, reasoning, usage, and committed projections.
- Fragmented and multiple tool calls through the real tool boundary.
- Successful tools, confirmation approval, confirmation rejection, and tool
  failure.
- Provider retry, permanent provider failure, and repeated generation IDs.
- Cancellation before execution and during persistence.
- Replay overlap, terminal replay, fresh reducer reconstruction, and request
  disconnect.
- Regeneration, authorization/owner isolation, idempotency reuse, and usage
  aggregation.
- Equivalent Web and Omiro reducer state from the same canonical events.

Every scenario must assert the relevant durable ordering, terminal behavior,
projection/message/tool records, SSE framing, and final client state.

## Implementation boundary

The API route factory accepts an injected `ChatGenerationService`; the default
export continues to use the production singleton. The service accepts optional
provider/model, planner, tool-runtime, and narrow external-infrastructure
adapters, all defaulting to production implementations. These seams are for
composition and testing only and must not move domain behavior into the route.

External queue, storage, Redis, and telemetry replacements must be narrow,
explicit, observable, and isolated from repository/application behavior.

The chat repository keeps `lastMessageAt` monotonic using a database-side
`GREATEST` update. This makes the timestamp invariant deterministic when the
application and database clocks differ; the testkit relies on that invariant
when creating and appending messages.

## Evidence ledger

Implemented evidence currently includes:

- `services/api/src/testkit/hominem-tests.test.ts`: 16 passing SDK scenarios
  covering start, send, reasoning/usage, missing usage, fragmented tools, tool failure,
  multiple tools, confirmation approval/rejection, retry, permanent provider
  failure, regeneration, terminal replay, duplicate-safe reduction, owner
  isolation, and named append/snapshot/publication/cancellation failure seams.
- `pnpm --filter @hominem/db test`: 27 passing tests.
- `pnpm --filter @hominem/api test`: 265 passing tests after removing the
  module-mocked generation E2E.
- `pnpm --filter @hominem/api typecheck`, API build/lint, and `pnpm run check`:
  passing; lint reports existing warnings but no errors.
- Web and Omiro focused reducer/transport tests pass as part of `pnpm run
check`; these are app-local fixtures, not yet SDK-backed route flows.
- Browser playbook runs: B-001 direct-load/reload passed with no browser
  warnings or errors; B-002 send/stream/reload passed with a completed
  tool-backed response and no browser warnings or errors. B-002 intentionally
  created the disposable `Browser Playbook B-002 Test` collection through the
  real tool boundary; its cleanup is still outstanding.

Open evidence remains explicitly unverified: cancellation before execution,
cancellation during persistence, request disconnect, replay subscription
failure, queue submission failure, fresh-launch recovery, SDK-backed Web/Omiro
convergence, most browser flows, and iOS simulator flows. The Web server is not
listening and all available iOS simulators are shut down in the current
environment, so those flows require user-started services and a booted
simulator before this task can pass its exit gate.

### Web browser verification — 2026-09-01

Environment: revision `06717d926`; Codex In-app Browser; Web
`http://localhost:4445`; API `http://localhost:4040`; authenticated disposable
test user; default Browser viewport (the explicit `320x568` override was not
honored by the Browser backend). Disposable chat IDs:
`01a03442-bce8-743f-a412-c22cffdeea42` and
`01a05eb5-096e-7548-bb0a-2fe3312b7297`.

- B-001: Implemented — direct reload restored persisted seed and assistant
  history; composer present; no Browser warnings or errors.
- B-002: Implemented — normal send rendered once, streamed `B002-READY`, and
  survived reload; no Browser warnings or errors.
- B-003: Implemented — conversation-actions → New chat created
  `01a05eb5-096e-7548-bb0a-2fe3312b7297`, persisted the first response, and
  listed the chat.
- B-004: Implemented on a clean tab — `/chats` → detail → back → detail
  restored the same history with no warnings or errors. An earlier stale-tab
  attempt recorded a transient Vite dynamic-import error and recovered after
  reload.
- B-005: Partial/Blocked — regeneration produced no new visible generation or
  error after approximately 23 seconds. The Web hook is wired and focused
  unit-tested; the live runtime did not expose a Web-fix signal.
- B-006: Implemented — `list_collections` transitioned to a completed tool
  card and the assistant response ended with `TOOL-B006-READY`.
- B-007: Partial/Blocked — the live flow created the disposable collection
  without exposing confirmation controls, despite the tool being marked
  confirmation-required in the API source. No additional disposable writes
  were attempted.
- B-008–B-015: Blocked — confirmation/failure-injection/disconnect states were
  not available through the running Web environment without changing the API
  or relying on arbitrary provider behavior.
- B-016: Implemented — a fresh Browser tab reconstructed the disposable chat,
  tool-backed response, and composer without warnings or errors.
- B-017: Open — active-generation reload/replay was not run after the live
  regeneration blocker.
- B-018: Implemented — an unowned UUID showed “Conversation unavailable” and
  leaked no private messages or tool data.
- B-019: Partial — unowned send was denied without rendering or persisting a
  message; the other requested operations had no actionable controls in the
  denied state.
- B-022: Partial — editing a user message persisted across reload. Delete was
  not executed because it requires action-time confirmation before removing
  disposable data.
- B-020–B-021: Open/Blocked — slow/empty loading and forced load/generation
  error states were not independently produced in the running environment.
- B-023: Partial — copy/listen controls rendered; share and a successful
  regeneration outcome were not verified.
- B-024: Blocked — the Browser viewport override remained `1280x720`, so the
  smallest-viewport assertion could not be verified.
- B-025: Partial — composer and submit controls were named and present; one
  unlabeled input remained in the interactive DOM inventory.

Artifacts are the Browser DOM snapshots and console-log captures from the
recorded run. API durable cursor/generation correlation was not available from
the Browser surface for this run and remains unverified.

### Blocker fixes — 2026-09-01

- Web now preserves `awaiting_confirmation` as an explicit stream status,
  prevents the transient composer message from being treated as an ordinary
  streaming response, and marks its pending tool call so approval controls can
  render. Approval and rejection controls also have explicit accessible names.
- The `create_collection` capability is now marked confirmation-required so the
  real tool boundary checkpoints the write before execution.
- Focused Web coverage passes for the confirmation phase and accessible tool
  actions. The live Browser rerun remained inconclusive because the already
  running API process did not reload the capability metadata; it continued to
  execute the test write immediately. Re-run B-007 after restarting/reloading
  the API service, then continue the ordered browser matrix.

## Exit gate

Task 003 is `Implemented` only when:

- The SDK façade executes every required operation and scenario against the
  test database through real routes and runtime components.
- Provider scripts cover text, reasoning, fragmented/multiple tools,
  confirmation, tool/provider failure, retry, usage, cancellation, and
  disconnect timing.
- Failure-injection tests prove durable terminal behavior and identify whether
  state was persisted, published, replayed, or intentionally absent.
- Replay-overlap tests prove lossless, duplicate-safe convergence.
- Web and Omiro tests reduce equivalent canonical events to equivalent semantic
  state.
- Cleanup leaves no test users, chats, messages, runs, events, snapshots, or
  tool effects.
- Focused Chat, DB, API, Web, and Omiro tests, API typecheck/build/lint, and
  `pnpm run check` pass.
- Browser and iOS simulator flows are recorded when the user-started services
  are available.
- Evidence is recorded using the Hominem evidence template.

Do not start Task 004 until every item above has an observable passing artifact.
