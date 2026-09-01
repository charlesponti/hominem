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

The façade currently proves the start-generation text path. It does not yet
cover the complete operation/scenario matrix or failure-injection contract.

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
  replay/publication, queue, and transport-disconnect seams.
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
