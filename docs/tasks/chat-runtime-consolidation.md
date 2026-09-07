---
status: 'Implemented'
owner: 'architecture'
depends_on: []
---

# Consolidate Chat Plumbing in `@hominem/chat`

`@hominem/chat` becomes the shared adapter-based server and client runtime for
generation orchestration, tools, durable events, context accounting, HTTP/SSE,
replay, checkpoints, and recovery. Applications retain only domain adapters
and product-specific UI reactions.

## Acceptance criteria

- Server consumers create one runtime and provide adapters instead of wiring
  lifecycle callbacks for every generation.
- Web and Omiro share the package client/controller and canonical protocol.
- Durable event ordering, idempotency, confirmation, cancellation, retry, and
  final context accounting have one implementation owner.
- Low-level state-machine machinery is internal to the package.
- Existing version-1 generation events remain replayable.

## Evidence

- Package adapter-contract and protocol-conformance tests.
- API generation route integration tests.
- Web browser interaction evidence.
- Omiro iPhone simulator evidence.
- `pnpm run check`.

## Progress evidence — 2026-09-04

- `@hominem/chat` now owns the server runtime adapter boundary, canonical SSE
  response framing, Fetch/XHR transports, client checkpoints, durable-event
  deduplication, replay after disconnect, and typed client error state.
- API generation routes delegate SSE framing to the package runtime and pass
  provider usage to one final context-cache completion write.
- Focused package, Web, and Omiro stream tests pass; the full repository gate
  passed with 28 successful test tasks, including 295 API, 185 Web, and 494
  Omiro tests.
- The package HTTP handler now owns canonical generation route matching,
  cursor validation, JSON responses, status propagation, and SSE framing;
  Hono retains authentication, validation, and adapter composition.
- API runtime construction is module-scoped and reusable across turns. Redis
  effect/context adapters are package-owned and structural, with context usage
  written once after a committed provider response.
- Web and Omiro confirmation, send, start, regenerate, retry, cancellation,
  and reload recovery all use the shared client/controller. The callback-based
  `chat-sdk.ts` compatibility surface and root projection reducer exports were
  removed.
- Final validation: `pnpm run check` passed with 28 successful tasks; API,
  Web, Omiro, Chat, route, runtime, and Redis adapter suites passed. Recorded
  browser and Apple simulator evidence is preserved by Task 011 artifacts.
