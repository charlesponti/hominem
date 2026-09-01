# Durable Event-Sourced Chat Workflow

This is the canonical current-state architecture and open-work document for
functional chat generation. It describes a durable event-sourced workflow:
the generation machine makes deterministic decisions, the interpreter runs
effectful workflow steps, durable semantic events preserve workflow history,
and projections recover the state presented to clients.

The document covers chat generation, durable semantic events, replay, crash
recovery, and Web/Omiro convergence. MCP HTTP behavior remains outside this
document.

This is a greenfield system. Backward compatibility with legacy generation
paths, aliases, consumers, or persisted shapes is not a release requirement.
The current semantic contract is the contract to implement; obsolete data and
code may be replaced or removed directly.

User-facing capability status remains in
[`chat.capabilities.md`](chat.capabilities.md).

## Status vocabulary

- **Implemented** — present in the current source and supported by focused
  evidence.
- **Partial** — implemented in part, but an integration path or required
  evidence is still missing.
- **Open** — not complete.
- **Blocked** — cannot proceed until an explicit product or architecture
  decision is made.

## Architectural model

Functional chat combines several established patterns:

- **Event sourcing:** durable semantic events are the authoritative history;
  mutable run state and client state are projections rebuilt from that history.
- **Durable workflow execution:** a generation can pause for confirmation,
  survive process loss, retry a failed attempt, and resume or terminalize from
  durable checkpoints.
- **Process manager:** the generation runtime coordinates provider turns, tool
  effects, confirmation, cancellation, retries, and terminal decisions.
- **Ports and adapters:** provider, tool, persistence, timing, cancellation,
  and delivery effects are injected into the provider-independent domain.
- **Replayable projections:** Web and Omiro reduce the same semantic event
  history to equivalent generation state while using platform-specific
  transports and presentation.
- **Idempotent effect protocol:** external writes are at-least-once from the
  runtime's perspective and are safe to reuse only when the tool honors the
  durable idempotency contract.

This is not automatically full CQRS, a general actor system, or a saga
framework. Those terms apply only where their stronger operational contracts
are intentionally implemented.

## Current architecture

### `@hominem/chat` — deterministic workflow core

`@hominem/chat` owns provider-independent generation semantics:

- immutable generation state and the pure generation machine;
- typed machine inputs, ordered interpreter commands, and lifecycle
  transitions;
- provider chunk accumulation and fragmented tool-call reconstruction;
- confirmation, retry, cancellation, iteration-limit, and terminal behavior;
- durable event payloads, event projection, and runtime validation;
- the sequential effect interpreter with injected workflow ports; and
- the shared client reducer for durable and live generation events.

The package performs no database, Hono, OpenRouter, MCP, React, or platform
I/O. Provider calls, tool calls, persistence, timers, cancellation checks, and
live delivery are activities/effects at its boundary.

### `@hominem/api` — composition and resource boundary

The API adapts:

- OpenRouter streaming into normalized provider inputs;
- the MCP tool registry into preview and execution effects;
- PostgreSQL repositories into generation, event, snapshot, message, and tool
  effect persistence;
- the generation live bus into subscriber delivery; and
- owner-scoped authorization and cancellation checks into resource routes.

The production runtime is machine-backed, but route-level composition still
uses `runChatGeneration`; the legacy callback loop and compatibility types are
the cleanup target for the current migration.

### `@hominem/web` — browser projection and transport

Web uses fetch/readable-stream transport. It validates wire events, tracks the
latest durable sequence, deduplicates replay/live overlap, and reduces events
through the shared generation reducer. Send and regeneration retain
web-specific message reconciliation and lifecycle callbacks.

### `@hominem/omiro` — Apple-only projection and transport

Omiro uses Apple-only XHR transport. It validates `afterSequence`, performs a
one-shot replay after interruption, deduplicates durable events, and consumes
the shared reducer through its chat services. Omiro-specific lifecycle state
covers preparing, saving, cancellation, failure, and regeneration.

### Database — workflow history and effect ledger

The database provides:

- owner-scoped generation runs as stable identity and authorization anchors;
- ordered, idempotent semantic event append and replay;
- atomic event append plus run-projection updates;
- terminal-event exclusivity and legal transition checks;
- encrypted active-generation snapshots;
- idempotent tool-effect storage and reuse; and
- rebuilding of mutable run projections from authoritative event history.

Database row types remain private to the database package. Repository methods
expose hand-written JSON-serializable domain DTOs.

## Runtime flow

1. A resource route authenticates and validates the request, then creates or
   loads a generation and starts or attaches to its stream.
2. The workflow opens a provider turn. The provider adapter normalizes chunks
   into machine inputs.
3. The machine accumulates text/reasoning deltas and reconstructs fragmented
   tool calls by index. The interpreter executes tool commands sequentially.
4. A confirmation-required tool emits a durable confirmation event and a
   checkpoint. The generation remains `awaiting_confirmation`; reconnecting
   does not execute the tool.
5. Semantic commands append durable events and update the run projection in
   one transaction. Only a successful append is published to live subscribers.
6. Token and reasoning deltas go only to the current connection. Semantic
   events receive durable SSE IDs and remain replayable.
7. The workflow ends with one committed, failed, or cancelled terminal event.
   A failed run remains a durable, recoverable interruption; retry creates a
   new attempt under the same generation identity without rewriting history.
8. A reconnect supplies `Last-Event-ID` or validated Omiro `afterSequence`.
   The server registers live delivery before replay, buffers concurrent durable
   publications, replays ordered events, flushes the buffer, and deduplicates
   by generation and sequence.

## Durable event contract and invariants

Persisted semantic events currently include:

- `generation.started`, `generation.accepted`, and
  `generation.phase_changed`;
- `generation.cancel_requested`, `generation.checkpointed`, and
  `generation.retry_scheduled`;
- `tool.requested`, `tool.completed`, and `tool.failed`;
- `confirmation.required`, `confirmation.approved`, and
  `confirmation.rejected`; and
- `generation.committed`, `generation.cancelled`, and `generation.failed`.

Each durable event has version `1`, a generation ID, a positive safe-integer
sequence, a discriminant, and a validated JSON-serializable payload. Durable
events receive SSE IDs. Live text and reasoning deltas do not.

The governing invariants are:

- Durable semantic history is authoritative; the generation-run row is a
  projection and lookup/ownership anchor.
- Token and reasoning deltas are live-only and are not reconstructed during
  replay.
- Appends are owner-scoped, ordered, idempotent, transactionally projected,
  and safe against terminal-state regression.
- Concurrent appends receive distinct sequences; repeating an idempotency key
  returns the existing event.
- A failed append publishes nothing live.
- Committed, cancelled, and failed terminal events are mutually exclusive; the
  first durable terminal decision wins cancellation races.
- Cancellation is a request followed by safe stopping; a cancel request alone
  does not claim provider or tool work has stopped.
- Confirmation pauses execution and never implies commitment or execution.
- Tool writes consult the durable effect ledger before invoking MCP and persist
  the original result, including failures.
- Replayed durable sequences are applied at most once while repeated live
  deltas remain deliverable.
- Web and Omiro reach equivalent semantic generation state from equivalent
  durable event history, even when timing and presentation differ.

## Verified implementation status

### Implemented

- Pure generation machine and sequential effect interpreter in `@hominem/chat`.
- OpenRouter provider normalization and MCP preview/execution adapters.
- Stable generation/tool idempotency keys and persisted tool-effect reuse.
- Versioned domain/live event types, runtime schemas, and v1 SSE
  serialization.
- Ordered and idempotent generation repository operations, projection
  rebuilding, encrypted snapshots, ownership checks, terminal uniqueness,
  safe sequence conversion, and rollback coverage.
- Shared client reducer and RPC wire-to-domain adapter.
- Web and Omiro durable replay/live deduplication and one-shot interruption
  resume behavior.
- Focused machine, interpreter, repository, schema, transport, Web, and
  Omiro service coverage for scenarios represented by current tests.

### Partial

- The API production path is machine-backed, but route-level composition still
  depends on `runChatGeneration`; the legacy callback loop and
  `ChatStreamEvent` compatibility types are still present and must be removed.
- Web and Omiro observe durable cursors during streaming, but durable cursor
  ownership/restoration and fresh-launch recovery are incomplete.
- Route-level replay/live handoff coverage exists, but full client convergence
  and interactive reconnect evidence is missing.
- Focused coverage exists for several boundaries, but API adapters, remaining
  Omiro hooks, replay/end-to-end paths, and interactive flows are not fully
  evidenced.

## Ordered open-work tasks

Each task is implementation-ready and names its subsystem boundary, rationale,
required changes, and observable evidence. The dependency graph is the release
order; it is not a historical phase plan.

1. [001 — Chat domain contract](tasks/001-chat-domain-contract.md)
2. [002 — Chat tool event round trip](tasks/002-chat-tool-event-round-trip.md)
3. [003 — Typed generation boundaries](tasks/003-typed-generation-boundaries.md)
4. [004 — Generation crash recovery](tasks/004-generation-crash-recovery.md)
5. [005 — Generation cursor recovery](tasks/005-generation-cursor-recovery.md)
6. [006 — Client convergence](tasks/006-client-convergence.md)
7. [007 — Generation observability](tasks/007-generation-observability.md)
8. [008 — Generation runtime consolidation](tasks/008-generation-runtime-consolidation.md)
9. [009 — Remove generation compatibility](tasks/009-remove-generation-compatibility.md)
10. [010 — Functional chat shipping evidence](tasks/010-functional-chat-shipping-evidence.md)

## Definition of done

The durable event-sourced chat workflow is complete when:

- one production generation orchestration path remains;
- durable history recovers the latest semantic generation state;
- provider and tool failures produce correct durable terminal behavior;
- replay/live handoff is lossless and duplicate-safe;
- confirmation, failed-tool, and execution state are unambiguous;
- Web and Omiro converge after reconnect and fresh launch;
- run/event/tool-effect correlation is observable without sensitive payloads;
- focused API, replay, and end-to-end tests pass;
- browser and iOS simulator evidence covers all required lifecycle flows; and
- `runChatGeneration`, the legacy callback loop, `ChatStreamEvent` aliases,
  and duplicated generation types are removed after route parity is proven.

The final release gate is task 010. MCP HTTP behavior remains outside this
document.

## Evidence record

When implementation changes this boundary, record the exact command or flow,
source/test scope, environment and database state, observed result, artifact
location, and anything that remains unverified using Hominem’s evidence
requirements.
