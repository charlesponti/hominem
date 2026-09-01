# Chat generation

This document describes the current chat-generation contract: deterministic
generation semantics, durable semantic events, replay, and Web/Omiro client
recovery. MCP HTTP behavior is outside this document.

## Architecture

`@hominem/chat` is the domain owner. It contains the generation machine and
interpreter, provider-chunk normalization and fragmented tool-call
reconstruction, event schemas and parsers, projections, client reduction, and
SSE primitives. It does not perform database, HTTP, provider, MCP, or platform
I/O.

The API application boundary supplies those effects through repositories,
OpenRouter and MCP adapters, cancellation, event publication, and route
composition. Application services own coordinated workflows; RPC validates
transport input, invokes an application operation, and adapts its result to
HTTP/SSE.

Web uses fetch/readable-stream transport and Omiro uses Apple-only XHR
transport. Both consume the canonical `@hominem/chat` events and reducer.
Their transports and presentation may differ, but equivalent semantic event
histories produce equivalent generation state.

The database stores generation runs, ordered durable events, projections,
snapshots, idempotency records, and tool effects. Durable event history is
authoritative; run and client state are projections or recovery aids.

## Runtime contract

1. A route authenticates and validates the request, then invokes the relevant
   application operation.
2. The application service prepares a generation and the machine starts a
   provider turn.
3. The provider adapter normalizes chunks. The machine accumulates text and
   reasoning deltas and reconstructs tool calls from fragments sharing a tool
   call index and ID.
4. The interpreter executes planned tool effects sequentially. A
   confirmation-required tool persists a checkpoint and pauses in
   `awaiting_confirmation`; approval or rejection resumes the original
   generation identity.
5. Semantic events are appended durably before they are published or yielded.
   Token and reasoning deltas are live-only.
6. The run reaches one durable terminal decision: committed, failed, or
   cancelled. Failures preserve durable state and can be retried as a new
   attempt under the same generation identity.
7. A reconnect supplies the latest durable cursor. The server subscribes
   before loading history, buffers concurrent publications, replays ordered
   events, flushes the buffer, and deduplicates by generation and sequence.

## Event contract

Every durable event has a version, generation ID, positive safe-integer
sequence, discriminant, and validated JSON payload. Durable events receive
SSE IDs. Live text and reasoning deltas do not.

Durable semantic events cover generation start/acceptance/phase changes,
cancellation requests and checkpoints, retries, tool requests/completions/
failures, confirmation required/approved/rejected, and committed/cancelled/
failed terminal outcomes.

The contract guarantees owner scoping, ordered and idempotent appends,
transactional projection updates, terminal exclusivity, replay safety, and
idempotent tool effects. Confirmation is neither execution nor commitment.
The first durable terminal decision wins cancellation races.

## Task references

Implementation work and release evidence are tracked in the task records:

- [001 — Chat domain contract](tasks/001-chat-domain-contract.md)
- [002 — Chat tool event round trip](tasks/002-chat-tool-event-round-trip.md)
- [003 — Typed generation boundaries](tasks/003-typed-generation-boundaries.md)
- [004 — Generation crash recovery](tasks/004-generation-crash-recovery.md)
- [005 — Generation cursor recovery](tasks/005-generation-cursor-recovery.md)
- [006 — Client convergence](tasks/006-client-convergence.md)
- [007 — Generation observability](tasks/007-generation-observability.md)
- [008 — Generation runtime consolidation](tasks/008-generation-runtime-consolidation.md)
- [009 — Remove generation compatibility](tasks/009-remove-generation-compatibility.md)
- [010 — Functional chat shipping evidence](tasks/010-functional-chat-shipping-evidence.md)

User-facing capability status is maintained in
[`chat.capabilities.md`](chat.capabilities.md).
