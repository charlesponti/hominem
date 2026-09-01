# Chat Generation Architecture

This document is the canonical description of the current functional chat
generation architecture, durable event contract, and recovery invariants.
The task status and remaining work are tracked in
[`tasks/functional-chat.md`](tasks/functional-chat.md). User-facing capability
status remains in [`chat.capabilities.md`](chat.capabilities.md).

## Current architecture

### `@hominem/chat`

`@hominem/chat` owns provider-independent generation semantics:

- immutable generation state and the pure generation machine;
- typed machine inputs, ordered interpreter commands, and lifecycle
  transitions;
- provider chunk accumulation and fragmented tool-call reconstruction;
- confirmation, retry, cancellation, iteration-limit, and terminal behavior;
- durable event payloads, event projection, and runtime validation;
- the sequential effect interpreter with injected provider, tool, persistence,
  timing, cancellation, and live-delivery ports; and
- the shared client reducer used to apply durable and live generation events.

The package performs no database, Hono, OpenRouter, MCP, React, or platform
I/O. It receives normalized inputs and returns state transitions or commands.

### API

The API is the composition root. It adapts:

- OpenRouter streaming into normalized provider inputs;
- the MCP tool registry into preview and execution ports;
- PostgreSQL generation repositories into event, snapshot, message, and tool
  effect persistence;
- the generation live bus into subscriber delivery; and
- owner-scoped authorization and cancellation checks into generation routes.

The current production route path uses the machine-backed runtime through the
`runChatGeneration` composition service. The route-level adapter is still a
legacy boundary because routes retain orchestration-shaped result handling and
the old callback loop remains in the repository for compatibility tests.

### Web

The web client consumes the v1 generation contract through fetch/readable
stream transport. It validates wire events, deduplicates durable replay/live
overlap, tracks the latest durable sequence for the active stream, and reduces
events through the shared generation reducer. Send and regeneration retain
web-specific message reconciliation and lifecycle callbacks.

Web has one automatic resume path after a stream interruption. Full persisted
cursor restoration and end-to-end convergence evidence remain open.

### Omiro

Omiro uses Apple-only XHR transport. It validates `afterSequence`, performs a
one-shot replay after interruption, deduplicates durable events, and consumes
the shared generation reducer through its chat services. Omiro-specific hook
state presents preparing, saving, cancellation, failure, and regeneration
behavior.

Fresh-launch recovery and full replay/convergence evidence remain open.

### Database

The database layer provides:

- owner-scoped generation runs as the stable identity and authorization
  anchor;
- ordered, idempotent semantic event append and replay;
- atomic event append plus run-projection updates;
- terminal-event exclusivity and legal transition checks;
- encrypted active-generation snapshots;
- idempotent tool-effect storage and reuse; and
- rebuilding of the mutable run projection from authoritative event history.

Database row types remain private to the database package. Repository methods
expose hand-written JSON-serializable domain DTOs.

## Runtime flow

1. A route authenticates the caller, validates the request, creates or loads a
   generation resource, and starts or attaches to its stream.
2. The machine opens a provider turn. The provider adapter normalizes provider
   chunks into machine inputs.
3. The machine accumulates text/reasoning and reconstructs tool calls. Tool
   commands are executed sequentially through the MCP adapter.
4. A confirmation-required tool produces a durable confirmation event and a
   checkpoint. The generation remains `awaiting_confirmation`; reconnecting
   does not execute the tool.
5. Semantic commands append durable events and update the run projection in
   one transaction. Only after a successful append does the API publish the
   event to live subscribers.
6. Token and reasoning deltas are delivered only to the current connection.
   Semantic events are durable and replayable.
7. The machine ends with a committed, cancelled, or failed terminal event.
   Terminal outcomes are mutually exclusive.
8. A reconnect supplies `Last-Event-ID` or the validated Omiro-compatible
   `afterSequence`. The server registers live delivery before replay, buffers
   concurrent durable publications, replays ordered events, flushes the
   buffer, and deduplicates by generation and sequence.

## Durable event contract

Persisted semantic events currently include:

- `generation.started`, `generation.accepted`, and `generation.phase_changed`;
- `generation.cancel_requested`, `generation.checkpointed`, and
  `generation.retry_scheduled`;
- `tool.requested`, `tool.completed`, and `tool.failed`;
- `confirmation.required`, `confirmation.approved`, and
  `confirmation.rejected`; and
- `generation.committed`, `generation.cancelled`, and `generation.failed`.

Each durable event has version `1`, a generation ID, a positive safe-integer
sequence, a discriminant, and a validated JSON-serializable payload. Durable
events receive SSE IDs. Live text and reasoning deltas do not.

## Current invariants

- Durable semantic event history is authoritative; the generation-run row is a
  projection and lookup/ownership anchor.
- Token and reasoning deltas are live-only and are not reconstructed during
  replay.
- Appends are owner-scoped, ordered, idempotent, transactionally projected,
  and safe against terminal-state regression.
- Concurrent appends to one generation receive distinct sequences; repeating
  an idempotency key returns the existing event.
- A failed append publishes nothing live.
- Terminal committed, cancelled, and failed events are mutually exclusive.
- Cancellation is a request followed by safe stopping; a cancel request alone
  does not claim that provider or tool work has stopped.
- Confirmation pauses execution and never implies commitment.
- Tool writes consult the durable effect ledger before invoking the underlying
  MCP operation and persist the original result, including failures.
- Replayed durable sequences are applied at most once while repeated live
  deltas remain deliverable.
- Web and Omiro must reach equivalent semantic generation state from the same
  durable event history.
