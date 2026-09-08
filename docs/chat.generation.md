# Chat generation

This document describes the current chat-generation contract: deterministic
generation semantics, durable semantic events, replay, and Web/Omiro client
recovery. MCP HTTP behavior is outside this document.

## Architecture

`@hominem/chat` is the domain and runtime owner. Its server runtime contains
generation orchestration, provider-chunk normalization, fragmented tool-call
reconstruction, tool idempotency, durable event sequencing, persistence before
publication, cancellation, retry, and final context accounting. Its client
runtime owns the canonical HTTP/SSE protocol, parsing, projections,
deduplication, checkpoints, replay, and reconnect recovery.

The API application boundary supplies those effects through adapters for
repositories, OpenRouter, MCP, cancellation, publication, and context cache.
RPC authenticates and delegates to the package runtime. Web and Omiro supply
only authentication, platform transport/storage, and product-specific typed
event reactions; equivalent semantic event histories produce equivalent state.

The database stores generation runs, ordered durable events, projections,
snapshots, idempotency records, and tool effects. Durable event history is
authoritative; run and client state are projections or recovery aids. The
deterministic test and evidence contract is documented in
[`chat.testing.md`](chat.testing.md).

## Runtime contract

1. A route authenticates and validates the request, then invokes the relevant
   application operation.
2. The application service prepares a generation and the machine starts a
   provider turn.
3. The provider adapter normalizes chunks. The machine accumulates text and
   reasoning deltas and reconstructs tool calls from fragments sharing a tool
   call index and ID.
   Invalid chunks produce a safe diagnostic containing validation paths and
   structural shape only; content and tool arguments are never logged.
4. The interpreter executes planned tool effects sequentially. A
   confirmation-required tool persists a checkpoint and pauses in
   `awaiting_confirmation`; approval or rejection resumes the original
   generation identity.
5. Semantic events are appended durably before they are published or yielded.
   Token and reasoning deltas are live-only.
   Provider usage is optional metadata: a valid semantic response may commit
   without it, and the usage record marks `usageAvailable: false` rather than
   inventing token or cost values.
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

## Governing records

Stable decisions are recorded in [the canonical contract ADR](decisions/chat.canonical-contract.md),
[the application workflows ADR](decisions/chat.application-workflows.md),
[the durable events ADR](decisions/chat.durable-events.md),
[the typed boundaries ADR](decisions/chat.typed-boundaries.md), and
the [chat testing contract](chat.testing.md).

Historical execution records are not part of the durable generation contract.
Current testing and evidence requirements live in the
[chat testing contract](chat.testing.md); active follow-up work belongs in
the task tracker and must not be treated as an architectural source of truth.

User-facing capability status is maintained in
[`chat.capabilities.md`](chat.capabilities.md).
