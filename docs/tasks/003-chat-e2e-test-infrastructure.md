---
title: 'Build the chat end-to-end test infrastructure'
status: 'Open'
priority: 'urgent'
labels: [chat, testing, e2e, api, database, web, omiro]
depends_on: [002-chat-tool-event-round-trip.md]
blocks: [004-typed-generation-boundaries.md, 005-generation-crash-recovery.md, 006-generation-cursor-recovery.md, 007-client-convergence.md, 008-generation-observability.md, 009-generation-runtime-consolidation.md, 010-remove-generation-compatibility.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'XL'
---

## Objective

Create one deterministic test harness for the complete Hominem chat path. Tests
must call real API chat/generation routes and run the real application service,
generation machine, interpreter, repositories, transactions, durable event
store, live bus, replay adapter, SSE framing, and client reducers. Only the
LLM/provider boundary is scripted so tests do not spend tokens or depend on
OpenRouter timing.

## Implementation boundary

Boundary: test request → API route → application runtime → test PostgreSQL →
SSE/client consumer.

Add a scripted provider that emits realistic normalized chunks: text,
reasoning, fragmented tool calls, multiple calls, usage, provider errors, and
cancellation timing. Add deterministic in-process test tools or a test MCP
server for tool execution and confirmation; do not mock repositories,
application services, the machine, event persistence, or replay. Use the real
test database and existing auth/test environment. Keep queue, storage, Redis,
and telemetry doubles narrow and observable only where their external service
cannot run in the test process.

Provide helpers to:

- Create and clean owner-scoped users, chats, messages, files, and generation
  runs in the test database.
- Call authenticated Hono routes and parse canonical SSE events, including
  durable IDs and exactly one `[DONE]` marker.
- Script provider turns and tool outcomes without changing production code.
- Inspect durable events, projection, snapshots, tool effects, usage, and
  client reducer state after a route completes or disconnects.
- Inject failures at provider, tool, append, snapshot, cancellation, replay,
  and publication seams for later tasks.

## Required scenarios

Build reusable route-to-state scenarios for send, start, regenerate,
confirmation approval/rejection, successful and failed tools, provider retry,
cancellation before/during persistence, repeated generation IDs, reconnect
with replay overlap, and terminal replay. Include assertions for request
authorization, durable ordering, projection state, message/tool records,
idempotency reuse, SSE framing, and final client state.

## Progress

`services/api/src/rpc/routes/chats.generation.e2e.test.ts` now runs the real
start-stream route against the test PostgreSQL database. It proves committed
text generation, durable event sequencing, projection and assistant-message
persistence, canonical SSE parsing, exactly one `[DONE]`, owner isolation, and
fragmented provider tool-call reconstruction through the real tool registry and
the second provider turn. Only the LLM routing/stream calls and external queue
submission are controlled.

The harness is not complete yet: reusable setup/parsing/assertion helpers,
confirmation approval/rejection, tool failure, provider retry, cancellation,
replay overlap, repeated generation IDs, failure injection, and Web/Omiro
route-to-client scenarios remain open.

## Progress

The first route-to-database-to-SSE harness is in
`services/api/src/rpc/routes/chats.generation.e2e.test.ts`. It currently proves
real `start-stream` text generation, durable event ordering, committed run and
assistant-message persistence, canonical SSE parsing, exactly one `[DONE]`, and
owner isolation. The provider routing and streaming calls are scripted at the
`@hominem/ai` boundary; repositories, application services, generation runtime,
and event persistence are not mocked.

## Exit gate

Task 003 is complete only when a single documented harness can execute the
route-to-durable-state-to-SSE path against the test database; provider scripts
cover text, fragmented tools, confirmation, failure, retry, cancellation, and
usage; test tools execute through the real tool boundary; and no repository,
service, machine, event-store, replay, or SSE implementation is mocked in the
integration suite. The harness must prove owner isolation and clean teardown.

Run and record the focused Chat, DB, API, Web, and Omiro tests, API typecheck,
and the full relevant validation gate. Attach one passing scenario artifact per
required behavior and one failure-injection demonstration. Do not start Task
004 until these artifacts and commands are recorded.
