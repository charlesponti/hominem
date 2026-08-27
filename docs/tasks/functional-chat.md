# Functional Generation Engine with Durable Event Replay

## Summary

Refactor the chat streaming loop into a pure state machine plus a sequential effect interpreter.

The engine will decide what should happen. An interpreter will perform provider calls, tool calls, persistence, retries, and live delivery. The durable generation event log becomes authoritative, while `chat_generation_runs` remains a current-state projection and lookup index.

This targets the chat generation/SSE protocol. The external MCP protocol remains unchanged.

## Current Progress

- [x] Add `@vitest/coverage-v8` to the chat, API, and database packages.
- [x] Move the provider-independent generation machine and generic interpreter into `@hominem/chat`.
- [x] Add deterministic reducer coverage for provider chunks, reasoning, tool reconstruction, sequential tool execution, confirmation, retry, cancellation, terminal no-ops, malformed input, and idempotency keys.
- [x] Add the API OpenRouter provider adapter, API MCP-tool adapter, and stable tool-effect replay support.
- [x] Thread internal idempotency context through the existing MCP tool registry without changing MCP HTTP behavior.
- [x] Add database migrations for event idempotency, encrypted snapshots, terminal-event uniqueness, and tool-effect storage.
- [x] Add the database generation repository for ordered event append/replay, snapshots, and idempotent tool effects.
- [x] Reach 100% focused statement, branch, function, and line coverage for the generation machine, interpreter, provider adapter, tools adapter, and tool registry.
- [x] Run local and test database migrations plus database code generation for the new schema.
- [x] Add transport-independent JSON, message snapshot, turn, retry, checkpoint, and terminal metadata primitives for the durable event contract.

## Architecture Changes

- `@hominem/chat` owns the provider-independent chat logic: generation state,
  domain events, commands, reducer, and interpreter ports. The API does not
  own the logical generation state machine.

- Extract a pure `generation-machine` module in `@hominem/chat` containing:
  - Immutable generation state.
  - Typed machine inputs and commands.
  - Provider chunk accumulation.
  - Tool-call parsing.
  - Approval decisions.
  - Retry and iteration-limit transitions.
- Add a sequential interpreter in `@hominem/chat` with injected ports:
  - Provider streaming.
  - Tool execution.
  - Event-store append/read.
  - Generation projection updates.
  - Sleep/retry timing.
  - Live event delivery.
- Remove database, SSE, logger, and provider dependencies from the reducer and
  the generic interpreter. Concrete adapters remain in the API.
- Replace callback-driven `onEvent` behavior with explicit domain commands such as:
  - `EmitLiveEvent`
  - `OpenProviderTurn`
  - `ExecuteTool`
  - `PreviewTool`
  - `AppendGenerationEvent`
  - `CommitGeneration`
  - `RetryProvider`
- Keep tool execution sequential and deterministic in the first implementation. Read-only parallelism remains a future optimization.

### Boundaries and ownership

- The machine accepts a prior immutable state plus one input and returns the next state plus ordered commands. It performs no I/O and does not depend on Hono, Kysely, OpenRouter, the tool registry, clocks, timers, or logging.
- The interpreter is the only component that executes commands. It feeds every provider result, tool result, cancellation request, and approval decision back to the machine as a machine input.
- Define explicit injected ports instead of importing concrete infrastructure in the interpreter: `provider`, `tools`, `generationEvents`, `generationRuns`, `sleep`, and `liveDelivery`.
- The production `tools` port wraps the existing `services/api/src/mcp/tool-registry.ts`. The MCP server continues to use that registry directly; the registry API and MCP HTTP protocol are not changed.
- Implement `appendEvent`, `readEventsAfter`, and run lookup/update in the chat database repository. Repository methods return hand-written JSON-serializable DTOs and keep Kysely row types private.
- Keep the existing `chat-completion-loop` behavior as the migration reference, then delete it only after its behavior is covered by the machine and interpreter tests. Do not retain a second production orchestration loop.

## Durable Protocol

Use the existing `chat_generation_events` table as the foundation.

Persist semantic events only:

- `generation.started`
- `generation.accepted`
- `generation.phase_changed`
- `generation.cancel_requested`
- `generation.checkpointed`
- `generation.retry_scheduled`
- `tool.requested`
- `tool.completed`
- `tool.failed`
- `confirmation.required`
- `confirmation.approved`
- `confirmation.rejected`
- `generation.committed`
- `generation.cancelled`
- `generation.failed`

Token and reasoning deltas remain live-only. Reconnection returns the latest durable state and future events; it does not reconstruct every previously streamed token.

Each persisted event has this typed envelope. `payload` is a discriminated, JSON-serializable union keyed by `type`; it is not `unknown` outside the database boundary.

```ts
{
  version: 1,
  generationId: string,
  sequence: number,
  type: GenerationEventType,
  payload: unknown
}
```

Required payload facts include:

- `generation.started`: `chatId`, generation `kind`, `userMessageId`, and request context needed to resume the generation.
- `generation.accepted`: the chat and user message DTOs needed for start-chat navigation and optimistic-message reconciliation.
- `generation.phase_changed`: the phase (`preparing`, `running`, `saving`, or `awaiting_confirmation`).
- `generation.cancel_requested`: requester and request timestamp; this is distinct from cancellation completing.
- `generation.checkpointed`: the partial assistant message ID and pending tool-call IDs. This records the durable assistant state shown while confirmation is pending.
- `generation.retry_scheduled`: operation (`provider`), attempt number, maximum attempts, retry time, and normalized transient error category.
- `tool.requested`, `tool.completed`, and `tool.failed`: `turnId`, iteration, tool-call ID, tool name, and normalized result/error metadata. Tool arguments are included only where required to resume or display confirmation.
- `confirmation.required`, `confirmation.approved`, and `confirmation.rejected`: message ID, tool-call ID, tool name, and the decision or rejection reason.
- Terminal events: the final message ID/DTO for `committed`, normalized error information for `failed`, and cancellation metadata for `cancelled`.

Every event that belongs to a provider/tool turn carries a stable `turnId` and `iteration`. These fields make ownership and resume position explicit without requiring separate turn events. Provider request IDs, raw prompts, token deltas, and detailed usage remain telemetry unless needed in `request context` for a safe resume.

`sequence` is a positive integer in the RPC/SSE contract. The database repository maps the PostgreSQL `bigint` to this value only after checking it is within JavaScript's safe-integer range; failure is terminal and recorded.

### Append, idempotency, and projection rules

- Add a nullable `idempotency_key` to `chat_generation_events` and a unique constraint on `(generation_id, idempotency_key)` when the key is present. The interpreter derives a stable key from the generation command that caused the append. Repeating the same command returns the already-persisted event rather than allocating a new sequence.
- Allocate sequences in one transaction by locking the owning `chat_generation_runs` row with `SELECT ... FOR UPDATE`, calculating `COALESCE(MAX(sequence), 0) + 1` for that generation, inserting the event, and returning it. The existing unique constraint remains a final integrity guard.
- Append every semantic event and update the affected `chat_generation_runs` projection in that same transaction. A failed transaction publishes nothing live. The event is authoritative; the run row is a query index/current-state cache and can be rebuilt from the event history.
- The repository verifies generation ownership before locking, appending, reading, or projecting. Replay queries are ordered by ascending sequence and return only events with `sequence > afterSequence`.
- The event store validates legal state transitions while holding the run lock. It rejects an append that would move a terminal generation back to an active state, approve a non-pending tool call, or complete a different terminal outcome.
- Terminal events (`generation.committed`, `generation.cancelled`, and `generation.failed`) are mutually exclusive. The machine emits at most one; repeated cancel/complete/fail inputs after a terminal event are no-ops.
- `generation.cancel_requested` transitions the projection to `cancel_requested` but does not claim that provider/tool work has stopped. The interpreter checks cancellation before every external effect and emits `generation.cancelled` only after the current effect stops safely.
- `generation.checkpointed` is the durable save of a partial assistant message containing a pending confirmation. It does not terminate the generation and must not set status to `committed`.
- `confirmation.required` transitions the projection to `awaiting_confirmation` and ends the active provider turn. Approval and rejection are separate authenticated commands addressed to the generation and the pending tool-call ID. `confirmation.approved` records the decision, returns the projection to `running`, and resumes one deterministic next step. `confirmation.rejected` records the decision, marks the pending tool call rejected, and emits the applicable continuation or terminal event without executing the tool.
- `generation.committed` is emitted only after the final assistant response is saved and no pending tool call remains. A partial checkpoint awaiting confirmation is never reported as committed.

### Event version and rollout

- This is a coordinated hard cutover: the API, web app, and Omiro ship the same `version: 1` contract. Do not support the old `ChatStreamEvent` shape in production after the migration.
- Replace transport-specific public types with `GenerationDomainEvent` and `GenerationLiveEvent` in `packages/rpc`. Both include `version: 1`, `generationId`, and a discriminant. Durable events additionally include `sequence`.
- The API owns a single SSE adapter that serializes these types into the wire format. It sets SSE `id` to the durable event sequence and never assigns an SSE ID to live-only deltas.
- Remove `ChatStreamEvent` only after web, Omiro, API routes, and their fixtures compile against the new contract. The external MCP protocol stays unchanged.

### Replay and live handoff

- The stream endpoint accepts `Last-Event-ID`; for clients that cannot set that header, accept an equivalent validated `afterSequence` request field. Reject malformed, negative, and unsafe-integer cursors with a typed client error.
- On connection, authenticate and authorize the generation, parse the cursor, read durable events after it, and write them in sequence order with SSE IDs before subscribing to live delivery.
- Register the live subscriber before the replay query, buffer newly published durable events for that subscriber, replay the query result, then flush buffered events whose sequence is greater than the final replayed sequence. Deduplicate by `(generationId, sequence)`. This prevents a lost event between replay and live attachment.
- Do not replay text or reasoning deltas. The client preserves deltas received during its current connection, reduces replayed semantic events, and renders the projection-derived terminal or confirmation state after recovery.
- When the run is terminal, replay remaining durable events, emit the SSE completion marker, and close without opening a provider turn. When it is awaiting confirmation, replay state and keep the stream available only for future durable updates; it must not execute a tool merely because a client reconnects.
- Web and Omiro retain the largest durable sequence received per generation in their in-memory generation state. On an interrupted stream they reconnect with that cursor, reduce returned events in order, and treat repeated sequences as no-ops. A fresh app launch obtains the current generation state through the existing generation lookup before attempting replay.

## Client and Route Changes

- Replace transport-shaped `ChatStreamEvent` types with the versioned domain and live event types in `packages/rpc`.
- Add route endpoints/commands for initial generation start, stream attachment/replay, cancellation, and confirmation approval/rejection. Route handlers validate/authenticate requests and invoke the interpreter; they do not contain generation transitions.
- Update web and Omiro consumers to use one local generation reducer each, reducing durable and live events in sequence. Preserve their platform-specific SSE transports: fetch/readable-stream on web and XHR on Omiro.
- Emit live-only token/reasoning events only to currently connected subscribers. Persist and deliver semantic events through the event store path first, then publish them live.
- Keep confirmation approval as a separate command/event cycle.

## Learnings

- `@hominem/chat` is the correct home for generation semantics. API code should adapt OpenRouter, MCP, persistence, and transport ports rather than define generation transitions.
- Database row types and chat-domain types have different ownership. The database keeps Kysely rows private and exposes hand-written DTOs; shared generation concepts come from `@hominem/chat`.
- The machine must own all transition semantics. The interpreter only executes commands and feeds returned inputs back into the machine.
- A save command is not complete until its interpreter returns `generation-saved`; otherwise the machine remains in `saving` indefinitely. Every command that advances state needs an explicit effect result or a deliberate terminal/no-op contract.
- Tool calls must remain queued when confirmation pauses execution. Approval must reinsert the confirmed call at the queue head before execution, or later tool calls can be silently dropped.
- Stable effect keys need the generation, turn, and tool-call identity. The API tool adapter must consult the durable effect ledger before invoking MCP and persist the original result after the first invocation, including failures.
- Provider streams are untrusted inputs: chunks may omit choices, deltas, IDs, names, arguments, or error objects. Normalization belongs in the API provider adapter; reconstruction and transition decisions belong in the pure machine.
- Token and reasoning deltas are live-only, while semantic events are durable. Coverage of the reducer does not prove replay correctness; the next testing priority is the event-store/SSE handoff and crash boundary.
- Removing unreachable guards improved both clarity and coverage. The registry handles `null` output before result-cap enforcement, so the cap helper only needs to handle records.

## Migration Plan

1. [x] Add the database migration for the idempotency key, encrypted snapshot, terminal uniqueness, and tool-effect ledger; run migration/test migration/codegen.
2. [ ] Introduce RPC v1 event types and DTOs without changing the existing stream route.
3. [x] Implement and test the pure machine and fake-port interpreter against the current loop's behavioral cases.
4. [ ] Move the API route to the interpreter and SSE adapter, including cursor replay and atomic durable publication.
5. [ ] Move web and Omiro consumers and their parsers to the v1 reducers and reconnect contract in the same change.
6. [ ] Delete the callback-based completion loop and old `ChatStreamEvent` protocol after all consumers use v1.

## Next Tasks

### Domain and persistence

- [ ] Define the complete typed `GenerationDomainEvent` payload union, including required chat/message, turn, confirmation, retry, checkpoint, and terminal metadata.
- [ ] Add explicit idempotency keys to every semantic persist command and verify repeated commands return the original durable event.
- [ ] Add encrypted snapshot serialization, key management, minimum resume state, and snapshot integrity/version validation.
- [ ] Finish exporting the generation repository through the database package boundary without introducing a runtime `@hominem/db` dependency into `@hominem/chat`.
- [ ] Add event-history-to-run projection rebuilding and verify `chat_generation_runs` can be reconstructed from authoritative events.
- [ ] Enforce repository-level legal transition checks, terminal-event exclusivity, safe-integer sequence conversion, and rollback behavior.
- [ ] Add concurrent database tests for sequence allocation, duplicate idempotency keys, projection atomicity, ownership, and terminal uniqueness.

### Interpreter and API

- [ ] Add injected sleep/retry timing and cancellation checks before every provider, tool, persistence, and delivery effect.
- [ ] Add crash-recovery orchestration around provider turns, confirmation waits, snapshots, and replayed write effects.
- [ ] Replace the existing callback-based completion loop with `runGenerationWithPorts` in the API.
- [ ] Implement the API event-store/live-delivery adapter and ensure durable events publish only after transactional append succeeds.
- [ ] Implement one SSE adapter for versioned domain/live events with durable-only SSE IDs.
- [ ] Add validated `Last-Event-ID` and `afterSequence` parsing, including negative, malformed, and unsafe-integer rejection.
- [ ] Register live subscribers before replay, buffer during replay, flush by sequence, and deduplicate by `(generationId, sequence)`.
- [ ] Add API routes/commands for generation start, stream attachment, cancellation, approval, rejection, and regeneration.
- [ ] Add API integration tests for terminal replay, confirmation replay, reconnect races, cancellation, retry, and crash recovery.

### Web and Omiro

- [ ] Replace `ChatStreamEvent` imports and fixtures with the versioned domain/live event contract.
- [ ] Add equivalent web and Omiro generation reducers with durable sequence tracking and duplicate no-op behavior.
- [ ] Update web reconnect logic to use `Last-Event-ID` and restore semantic state without token replay.
- [ ] Update Omiro reconnect logic to use the validated `afterSequence` fallback and preserve Apple-only transport behavior.
- [ ] Ensure committed, failed, cancelled, and awaiting-confirmation replay converge to equivalent state on web and Omiro.
- [ ] Add web and Omiro reducer/reconnect tests.

### Cleanup and verification

- [ ] Remove the old callback loop after route migration and delete `ChatStreamEvent` only after all consumers compile on v1.
- [ ] Remove obsolete duplicated generation types from API and database boundaries.
- [ ] Add 100% statement and branch coverage thresholds for the completed pure-machine and adapter test projects.
- [ ] Run database migration/test migration/codegen after any further schema change.
- [ ] Run focused tests for machine, interpreter, API, database, web, and Omiro.
- [ ] Run browser and simulator flows for send, approval, cancellation, retry, regeneration, and forced reconnect.
- [ ] Run the full `pnpm run check` gate and complete the evidence checklist before marking the plan complete.

## Testing

- Pure reducer tests for:
  - Text/reasoning accumulation.
  - Fragmented tool-call reconstruction.
  - Malformed arguments.
  - Read-only reuse.
  - Confirmation gating.
  - Tool failure continuation.
  - Retry limits.
  - Iteration exhaustion.
  - Cancellation.
- Interpreter tests with fake provider/tool/event-store ports.
- Database integration tests for:
  - Concurrent append attempts allocate unique, gap-free, monotonically increasing sequences per generation.
  - A repeated idempotency key returns the original event without changing the projection or consuming a sequence.
  - Event append and its run projection update commit or roll back together.
  - Ordered event replay strictly returns events after the requested cursor.
  - Ownership enforcement.
- API integration tests for:
  - Live SSE delivery.
  - Reconnection from `Last-Event-ID` and the Omiro-compatible cursor field.
  - No replay/live handoff event loss or duplicate application.
  - Commit/failure/cancellation terminal events.
  - Terminal and awaiting-confirmation reconnection behavior.
- Web and Omiro tests for event reduction and recovery.
- Browser and simulator acceptance flows for send, tool confirmation, cancel, provider failure/retry, regeneration, and a forced stream interruption followed by reconnect. Update the coverage status in `docs/chat.capabilities.md` only when each target flow has that evidence.
- Run the full repository check plus database migration/codegen validation because the event-log schema will be extended.

## Acceptance Criteria

- For every generation, the persisted event history is ordered, owner-scoped, idempotent, and sufficient to determine its latest semantic state without token replay.
- Two concurrent semantic appends to one generation produce distinct consecutive sequences; retrying either command does not add a second event.
- A reconnect from any durable sequence receives each later durable event exactly once at the reducer boundary, then receives future live updates without a replay/live gap.
- Web and Omiro show equivalent generation state after replay for committed, failed, cancelled, and awaiting-confirmation runs.
- A provider/tool/persistence failure produces one terminal durable failure event and never commits an assistant message after that failure.
- The current MCP tool invocation behavior and HTTP protocol remain unchanged.
- Focused machine, interpreter, database, API, web, and Omiro checks pass; database migration/codegen and `pnpm run check` pass.

## Assumptions

- This is a coordinated API, web, and Omiro protocol migration.
- The new v1 event protocol is a hard replacement for the current client-visible event shape; all three surfaces deploy together.
- Exact token replay is not required; durable recovery means correct generation state and future events.
- The MCP HTTP server continues using `tool-registry.ts`; only the chat orchestration layer is redesigned.
