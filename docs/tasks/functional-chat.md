# Functional Generation Engine with Durable Event Replay

## Summary

Refactor the chat streaming loop into a pure state machine plus a sequential effect interpreter.

The engine will decide what should happen. An interpreter will perform provider calls, tool calls, persistence, retries, and live delivery. The durable generation event log becomes authoritative, while `chat_generation_runs` remains a current-state projection and lookup index.

This targets the chat generation/SSE protocol. The external MCP protocol remains unchanged.

Current status: the resource-oriented generation runtime, v1 event contract, API
integration, durable repository/recovery primitives, replay-safe web/Omiro
transport, and shared client reducer integrations are implemented. Remaining
work is persisted cursor ownership, full replay-convergence evidence, and
removal of legacy paths.

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

The public chat package now exposes a resource-oriented entry point:
`ChatClient.generations.create(...).run()`. API code configures the model,
tools, persistence, and delivery ports; consumers do not construct the machine
or provider loop directly.

The target public facade is a factory, not a constructor. New integrations must
use `createChat(...)`; `ChatClient` is the current transitional implementation
name and may remain as the returned client type if that is useful for typing.
Do not add new application call sites that instantiate `new ChatClient(...)`.

### Boundaries and ownership

- The machine accepts a prior immutable state plus one input and returns the next state plus ordered commands. It performs no I/O and does not depend on Hono, Kysely, OpenRouter, the tool registry, clocks, timers, or logging.
- The interpreter is the only component that executes commands. It feeds every provider result, tool result, cancellation request, and approval decision back to the machine as a machine input.
- Define explicit injected ports instead of importing concrete infrastructure in the interpreter: `provider`, `tools`, `generationEvents`, `generationRuns`, `sleep`, and `liveDelivery`.
- The production `tools` port wraps the existing `services/api/src/mcp/tool-registry.ts`. The MCP server continues to use that registry directly; the registry API and MCP HTTP protocol are not changed.
- Implement `appendEvent`, `readEventsAfter`, and run lookup/update in the chat database repository. Repository methods return hand-written JSON-serializable DTOs and keep Kysely row types private.
- Keep the existing `chat-completion-loop` behavior as the migration reference, then delete it only after its behavior is covered by the machine and interpreter tests. Do not retain a second production orchestration loop.

### Target SDK usage and adapter composition

These examples are the implementation contract for the resource-oriented SDK.
They show ownership, not necessarily the final internal file names. API, web,
and Omiro layers should use resource methods; they should not create a machine,
interpreter, provider turn, idempotency key, or persistence callback.

#### Composition root

The API constructs one configured chat client from infrastructure adapters. The
client is configured at process startup and reused by route handlers.

```ts
const chat = createChat({
  model: openrouter({
    apiKey: env.OPENROUTER_API_KEY,
    model: 'anthropic/claude-sonnet-4',
  }),
  tools: mcp({
    registry: toolRegistry,
    effects: postgresToolEffects(db),
  }),
  generations: postgresGenerations(db),
  delivery: generationLiveBus(),
});
```

`openrouter`, `mcp`, `postgresGenerations`, `postgresToolEffects`, and
`generationLiveBus` are adapters. They may depend on OpenRouter, MCP, Kysely,
and the API runtime. `@hominem/chat` must not depend on those implementations.

#### Start and stream a generation

Route code performs authentication, authorization, and request mapping. The
generation resource owns execution and streaming.

```ts
const generation = await chat.generations.create({
  userId: user.id,
  chatId,
  message: {
    role: 'user',
    content: input.content,
  },
  request: {
    kind: 'send',
  },
});

return generation.stream({
  signal: request.raw.signal,
});
```

The route must not call `runGenerationWithPorts`, `runChatGeneration`,
`OpenRouterChatModel`, `callTool`, or `persistEvent` directly. Those are
composition or adapter concerns during the migration and must disappear from
route-level orchestration.

#### Resource actions

Long-running generations are addressable resources. Commands target the
resource and are safe to retry through repository idempotency.

```ts
const generation = await chat.generations.retrieve({
  userId: user.id,
  generationId,
});

await generation.confirmTool({ toolCallId });
await generation.cancel();
```

Replay is also a resource operation and never replays token or reasoning
deltas:

```ts
return generation.events({
  afterSequence,
  signal: request.raw.signal,
});
```

`stream()` is the initial live execution path. `events()` is the replay/live
attachment path for an existing resource. Both return versioned generation
events; transport adapters decide whether those events become SSE, fetch
streams, or XHR callbacks.

#### Model adapter

The provider adapter translates OpenRouter mechanics into provider-independent
machine inputs. It does not decide lifecycle transitions or persist events.

```ts
export type ChatModel = {
  open(input: {
    state: GenerationState;
    turnId: string;
    iteration: number;
  }): AsyncIterable<GenerationInput>;

  retry(input: { state: GenerationState; attempt: number }): AsyncIterable<GenerationInput>;

  appendToolResult(input: {
    state: GenerationState;
    call: GenerationToolCall;
    result: ToolResult;
  }): Promise<void>;
};
```

Provider chunk normalization, fragmented tool-call reconstruction, usage
mapping, and transient-error classification belong inside this adapter. The
machine receives normalized inputs only.

#### Tool adapter

The MCP adapter translates a machine tool call into the existing registry
without changing MCP HTTP behavior. The idempotency key is mandatory for both
preview and execution, and execution must consult the effect store before
performing a write.

```ts
export type ChatTools = {
  preview(input: { call: GenerationToolCall; idempotencyKey: string }): Promise<ToolResult>;

  execute(input: { call: GenerationToolCall; idempotencyKey: string }): Promise<ToolResult>;
};
```

The adapter may call `tool-registry.ts`, but the machine and route must not
know that it does. A replayed write returns the previously persisted result
instead of invoking the underlying tool again.

#### Generation store and delivery adapters

Persistence exposes generation operations, not database rows or generic event
callbacks:

```ts
export type GenerationStore = {
  create(input: CreateGenerationInput): Promise<GenerationIdentity>;
  retrieve(input: RetrieveGenerationInput): Promise<GenerationSnapshot>;
  appendEvent(input: AppendGenerationEvent): Promise<GenerationEvent>;
  readEvents(input: ReadGenerationEvents): Promise<GenerationEvent[]>;
  saveSnapshot(input: SaveGenerationSnapshot): Promise<void>;
  saveMessage(input: SaveGenerationMessage): Promise<ChatMessageDto>;
};

export type GenerationDelivery = {
  publish(event: GenerationEvent): Promise<void>;
  subscribe(generationId: string): AsyncIterable<GenerationEvent>;
};
```

The store owns transactions, ownership checks, sequence allocation, projection
updates, snapshot encryption boundaries, and effect idempotency. Delivery is
called only after a durable append succeeds. Neither adapter decides whether an
event is legal; that remains the machine/projector's responsibility.

#### Machine/interpreter ownership

The intended call graph is:

```text
route command
  -> Chat resource
    -> generation machine
      -> ordered interpreter command
        -> model/tools/store/delivery adapter
          -> normalized effect result
            -> generation machine
```

There must be one production orchestration path. `runChatGeneration` may remain
as a temporary API composition adapter, but it must shrink to construction of
configured resources and disappear before the legacy cleanup phase ends.

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

- This is a coordinated hard cutover: the API, web app, and Omiro ship the same `version: 1` contract. The v1 path is wired and shipped in PR #274; the old `ChatStreamEvent` type/file remains only until the final cleanup phase removes it.
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

## Shipped implementation slice

- [x] Added the resource-oriented `ChatClient`/`generations` API and wired API generation routes through `runChatGeneration` and the port-based interpreter.
- [x] Replaced the API's production generation path with the machine-backed runtime while retaining the old loop only as an explicitly removable legacy file.
- [x] Added the OpenRouter model adapter, MCP tool adapter, stable effect idempotency keys, and persisted tool-effect reuse.
- [x] Added the v1 domain/live event contract, runtime parsers, v1 SSE serialization, and web/Omiro v1 imports.
- [x] Added generation projection rebuilding, encrypted active-generation snapshots, terminal-event exclusivity, and repository-level ordered/idempotent append behavior.
- [x] Added focused machine, interpreter, provider, tool, repository, snapshot, live-bus, RPC, web, and Omiro tests.
- [x] Merged the implementation in PR #274; CI passed and the branch was left clean after merge.

The Expo development-client onboarding workaround and Maestro launch URL are
release/test infrastructure, not part of the generation protocol. A rebuilt
development client is required before the onboarding configuration affects an
installed simulator.

## Learnings

- `@hominem/chat` is the correct home for generation semantics. API code should adapt OpenRouter, MCP, persistence, and transport ports rather than define generation transitions.
- Database row types and chat-domain types have different ownership. The database keeps Kysely rows private and exposes hand-written DTOs; shared generation concepts come from `@hominem/chat`.
- The machine must own all transition semantics. The interpreter only executes commands and feeds returned inputs back into the machine.
- A save command is not complete until its interpreter returns `generation-saved`; otherwise the machine remains in `saving` indefinitely. Every command that advances state needs an explicit effect result or a deliberate terminal/no-op contract.
- Tool calls must remain queued when confirmation pauses execution. Approval must reinsert the confirmed call at the queue head before execution, or later tool calls can be silently dropped.
- Stable effect keys need the generation, turn, and tool-call identity. The API tool adapter must consult the durable effect ledger before invoking MCP and persist the original result after the first invocation, including failures.
- Semantic event keys belong on the machine's persist commands, not in an infrastructure callback. This keeps replay identity deterministic before the database or transport adapter runs.
- The durable event contract can be strengthened incrementally: metadata primitives and discriminated payloads are now canonical, while unresolved message/navigation DTO decisions remain explicit follow-up work.
- Provider streams are untrusted inputs: chunks may omit choices, deltas, IDs, names, arguments, or error objects. Normalization belongs in the API provider adapter; reconstruction and transition decisions belong in the pure machine.
- Token and reasoning deltas are live-only, while semantic events are durable. Coverage of the reducer does not prove replay correctness; the next testing priority is the event-store/SSE handoff and crash boundary.
- Removing unreachable guards improved both clarity and coverage. The registry handles `null` output before result-cap enforcement, so the cap helper only needs to handle records.
- Phase 1 keeps internal recovery snapshots and external full message DTOs separate: the RPC contract carries the existing full chat/message response shapes, while `@hominem/chat` remains infrastructure-independent.
- Runtime event validation belongs at the RPC boundary. The shared Zod schemas reject unsupported versions, mismatched discriminants, unknown event types, and unsafe sequence cursors before reducers receive data.
- Legacy streaming remains safe during the hard cutover by naming its types explicitly as `LegacyChatStreamEvent`; this lets clients migrate their imports without changing stream behavior prematurely.
- The generation run row remains the stable ownership and foreign-key anchor; rebuilding means recomputing its mutable projection fields from event history without deleting the anchor.
- Active resume snapshots use an API-managed 32-byte key and AES-256-GCM with generation/owner-bound associated data; terminal events clear the ciphertext in the same transaction.
- Terminal events are mutually exclusive at both layers: the database has one partial unique index per generation, and the pure projector rejects post-terminal events before persistence.
- Coverage evidence must scope to changed source files: package-wide reports include unrelated legacy code and can hide whether the generation boundary itself is covered. Web, Omiro, RPC, and chat now expose package-level V8 coverage commands for focused gates.
- Removing repository casts requires a checked JSON-to-domain mapper. The mapper must validate persisted event/tool discriminants before projection rebuilds; otherwise Kysely's generic JSON type merely moves the unsafety downstream.
- TypeScript declaration output has two independent cache layers here: Turbo's task cache and each app's `tsbuildinfo`. A dependency edge alone is insufficient when app typechecking can reuse stale incremental state; app validation must disable incremental reuse or explicitly clean it.
- The changed generation TypeScript surface now has no value assertions after
  excluding namespace imports and mapped-type key remapping. This is a scoped
  audit result, not evidence that unrelated repository code is assertion-free.
- The web chat message/search/response-length hooks now use inferred RPC data,
  explicit status narrowing, and literal-value validation without assertions;
  their focused V8 matrix is 100% statements, branches, functions, and lines.
- Web file-upload and speech-recognition browser boundaries now use checked
  object/property inspection instead of assertions. They compile and pass the
  changed-file assertion gate. File-upload error parsing and the speech
  recognition lifecycle now have dedicated focused tests. The Uppy lifecycle
  matrix covers lazy initialization, concurrent callers, uploads, progress,
  restrictions, malformed responses, failed responses, cleanup, and reset at
  100% across statements, branches, functions, and lines. The speech-
  recognition file covers its SSR, browser, fallback, transcript, toggle, and
  cleanup paths at 100% across all four metrics.
- The Uppy lifecycle audit found a real concurrency defect: caching only the
  module-load promise still allowed concurrent callers to construct separate
  instances. The cache now represents the complete instance initialization,
  and a concurrent-upload regression test proves both callers share it. This
  is why the earlier implementation missed the issue: sequential happy-path
  tests validated behavior after initialization but never exercised the
  initialization race.
- The generation stream route already registers its live subscriber before
  reading durable history and filters replay/live events through one cursor.
  A route-level race test now publishes a phase event and a terminal event
  while replay is loading and proves all three ordered durable events reach
  the client exactly once. The remaining gap is a real transport/client
  reconnect flow, not the basic handoff ordering.
- Durable replay/live overlap is now deduplicated once at the shared RPC
  boundary and applied by both web fetch streams and Omiro XHR streams. The
  focused transport tests prove repeated durable sequences are dropped while
  repeated live deltas remain deliverable; this avoids duplicating dedupe logic
  inside each client reducer.
- The first shared client reducer now lives in `@hominem/chat`: it owns text,
  reasoning, tool-step, phase, terminal-error, and durable-cursor transitions
  without RPC, React, or transport dependencies. Web and Omiro send/regenerate
  hooks now consume the same reducer through the exhaustive RPC adapter; the
  remaining client work is persisted cursor ownership and replay convergence
  coverage.
- `@hominem/rpc` now owns the single exhaustive wire-to-domain adapter for the
  shared reducer. It preserves durable sequences, normalizes DTO messages into
  provider-independent snapshots, converts confirmation arguments, and drops
  invalid message roles without assertions. Its full durable/live matrix is
  covered at 100%.
- Web now reduces every validated stream event through the shared reducer while
  retaining web-specific message reconciliation and lifecycle callbacks. This
  makes replay and live delivery use the same semantic state path; Omiro’s
  thinner hook state still needs the equivalent integration.
- Both stream transports now report the latest accepted durable sequence to
  their caller. Cursor observation is covered independently from deduplication,
  leaving automatic reconnect policy and persisted cursor restoration as the
  remaining client work.
- Web streaming now performs one automatic resume after a transport
  interruption, using `Last-Event-ID` from the durable cursor and the same
  deduplicator for replay. Committed and cancelled replay tests cover terminal
  convergence. Omiro now uses an XHR-specific resume adapter with validated
  generation events, `afterSequence`, one-shot replay, and the same durable
  deduplicator; its transport matrix covers network interruption, replay,
  domain-handler failure, and abort setup at 100%.
- The API v1 bridge now routes accepted, checkpoint, confirmation, terminal,
  and machine-emitted semantic events through the durable event store. Internal
  message snapshots are enriched into full RPC DTOs only at the API delivery
  boundary. Pending confirmations remain `awaiting_confirmation`; they no
  longer follow a terminal committed event.
- Cancellation and retry timing belong to interpreter ports, not provider or
  route code. The interpreter now checks cancellation between provider inputs
  and before tool, preview, and save effects, and delegates retry waiting to
  an injected clock. Tests cover streamed cancellation, synchronous retry
  cancellation, retry ordering, and skipped effects; API generation routes
  now inject an owner-scoped cancellation probe.
- The web chat fixture audit also removed the `FileList`, message-DTO, and
  composer fixture assertions; focused chat-message and search tests now cover
  every branch of their changed production hooks.
- The TypeScript AST inventory found 995 real assertions in the repository's
  selected source files: 532 under apps, 256 under services, and 207 under
  packages. The diff-only checker gates newly changed TypeScript files while
  the legacy inventory is migrated in stages.
- The local API is reachable at `/api/status` with a connected database, and
  Maestro is available at `~/.maestro/bin/maestro`. The booted simulator can
  launch Omiro, but the current interactive flows expose acceptance failures:
  the New Chat toolbar disappears after typing, and the stream route renders
  blank. Interactive iOS evidence remains open.
- Shipping validation on 2026-08-28 passed the full `pnpm run check`, focused
  V8 tests for chat/RPC/database/API/web, all 472 Omiro tests, and the iOS
  release bundle export. Career Playwright ran with server reuse but had four
  unrelated editor-flow failures. Maestro ran on the booted iPhone but the
  chat flows failed at the mobile UI acceptance boundary; artifacts are under
  `~/.maestro/tests/2026-08-28_053821` and `~/.maestro/tests/2026-08-28_053616`.

## Remediation Plan — Assertion-Free Boundaries and Review Gaps

This plan records the work required after reviewing PRs #274 and #275. The
misses were not only absent test cases: unchecked trust boundaries, duplicated
client lifecycle handling, and stale declaration-cache results made defects
easy to hide. Each phase closes one class of ambiguity before expanding the
next test surface.

### Assertion policy

- A TypeScript assertion means `value as Type`, `value as const`, or
  `value as never`; all must be removed from tracked TypeScript source and
  tests.
- SQL aliases and prose containing the word `as` are not TypeScript assertions
  and remain out of scope.
- Replace assertions with runtime decoders/type guards at external
  boundaries, typed constructors/builders for fixtures, explicit return types,
  discriminated unions, and `satisfies` where compile-time checking is enough.
  `satisfies` must not bypass runtime validation.
- Do not replace assertions with `any`, `never`, a wider cast, or an
  unvalidated generic JSON parser. Every replacement must preserve the narrow
  type and define the failure path.
- Generated files and third-party declarations are excluded from the inventory;
  the exclusion command must be recorded as evidence.

### Phase A — Lock down generation trust boundaries `[~]`

- [x] Use checked JSON-to-domain mappers in the generation repository and
      verify the exact safe-integer sequence boundary.
- [x] Validate decoded v1 generation events before web and Omiro reducers;
      centralize durable/live failure classification.
- [~] Align the RPC full message DTO schema with the widened execution-status
  union without an assertion; add type-level fixtures for every message
  variant, including failed tool execution.
- [ ] Make provider, tool, snapshot, and SSE parsers return typed success/error
      results instead of trusting generic `JSON.parse<T>` calls.
- [~] Add an uncached validation command (`TURBO_FORCE=true pnpm run check` now
  proves the current declarations; CI wiring still needs to be made explicit).

### Phase B — Finish the changed generation path with zero assertions `[~]`

- [x] Remove assertions from generation machine, projection, repository,
      provider, tool adapter, snapshot codec, and live-delivery production paths.
- [x] Replace remaining generation test assertions with typed fixture builders
      for provider chunks, tool definitions/results, RPC envelopes, DTOs, Omiro
      XHR responses, and API tool contexts in the changed generation surface.
- [x] Add the Omiro regenerate test through a supported Expo/Vitest import
      boundary; cover committed, cancelled, failed, retry, and idle-cancel
      outcomes.
- [~] Complete API/web/Omiro matrices for failed, cancelled, approval, retry,
  tool-step, reconnect, and terminal replay behavior.
- [~] Report statement, branch, function, and line coverage per changed file;
  an aggregate package percentage is not proof for legacy code. The focused
  web transport, generation, message, search, response-length, file-upload,
  and speech boundaries now pass 100% across all four metrics; API adapters,
  Omiro hooks, and replay/e2e paths still need their scoped matrices.

### Phase C — Remove assertions from shared infrastructure `[ ]`

- [ ] Replace row casts in remaining DB repositories with typed selected-row
      helpers and checked enum/JSON mappers: chat, vector, finance, notes, tasks,
      files, career, then AI.
- [ ] Replace RPC/client response casts with shared response decoders or Hono
      inferred response types, including auth, loaders, query keys, and voice.
- [ ] Replace API/MCP casts with typed auth guards, MCP adapter helpers,
      JSON-schema conversion results, and typed tool-result readers. MCP HTTP
      behavior and `tool-registry.ts` remain unchanged.
- [ ] Replace Omiro native-module/audio/media casts with platform return types
      and narrow error helpers while preserving Apple-only behavior.
- [ ] Remove `as const` from application/test fixtures with literal typed
      constants or `satisfies` declarations where appropriate.

### Phase D — Repository-wide enforcement `[ ]`

- [x] Add a deterministic TypeScript AST inventory that excludes generated
      output and fails on any remaining TypeScript assertion in its selected
      scope. The full inventory remains a migration report; the diff-only
      inventory is the enforcement boundary.
- [x] Add a CI check preventing new assertions in changed TypeScript files via
      `check:assertions:changed`. Any temporary compiler interop exception needs
      an owner, issue, and expiry; the generation path has no allowlist.
- [ ] Run production and test inventories separately so fixture shortcuts
      cannot conceal production boundary problems.
- [ ] Add regression tests for malformed external JSON, unsupported enums,
      missing fields, unexpected provider chunks, and callback exceptions.
- [ ] Update this plan with file-level evidence after each phase; no `[~]` item
      becomes `[x]` without its focused test result.

### Phase E — Validation and shipping evidence `[ ]`

- [~] Run focused V8 coverage for chat, RPC, DB generation repository, API
      generation, web chat transport/hooks, and Omiro chat transport/hooks.
      Chat is 100% across statements, branches, functions, and lines; the
      package lanes all pass, while Omiro's aggregate report is 88.86% / 76.86%
      because it includes unrelated app code.
- [x] Run formatting, `git diff --check`, package typechecks/builds, and an
      uncached full `pnpm run check` with the required test environment. The
      forced gate passed all 34 typecheck, 17 lint, 17 build, and 26 test tasks;
      focused changed-file coverage remains a separate gate.
- [ ] Run browser and iOS simulator/Maestro flows for send, approval,
      cancellation, failure/retry, regeneration, forced reconnect, and terminal
      replay without starting services inside the agent.
- [ ] Capture command/flow, environment, observed result, artifacts, and
      explicitly unverified conditions using the Hominem evidence checklist.

## Review Remediation Plan

The merged implementation exposed a set of boundary failures: durable terminal
failures were not handled consistently by every client stream, the XHR adapter
did not reject callback exceptions, sequence allocation missed the exact safe
integer boundary, and type assertions hid invalid domain values. This plan
closes those seams before the next runtime cutover.

Status: `[x]` complete · `[~]` in progress · `[ ]` not started.

### [~] Phase A — Shared failure boundary

Make durable and live failures follow one client-facing rule on web and Omiro.

- [x] Add one RPC-level failure classifier for durable `generation.failed` and live `error` events.
- [x] Apply it to web send, start, and regenerate streams.
- [x] Apply it to Omiro send and start streams.
- [x] Make the Omiro XHR adapter convert callback exceptions into rejected stream promises.
- [x] Add the Omiro regenerate service test and verify committed, cancelled,
      failed, retry, and idle-cancel behavior through the Expo/Vitest import
      boundary.
- [ ] Add replay/live convergence tests for every client stream entry point.

### [~] Phase B — Domain and repository correctness

Ensure invalid values cannot cross the generation or persistence boundaries.

- [x] Reject appends when the previous sequence is already `Number.MAX_SAFE_INTEGER`.
- [x] Add an exact maximum-safe-sequence repository test.
- [x] Remove the generation RPC parser assertions by preserving literal event discriminants in the schema builder.
- [x] Correct the accepted-event fixture to use a user-role message.
- [x] Represent failed tool execution in the persisted tool-call status contract instead of hiding it with a cast.
- [ ] Decide whether confirmation and execution status should become separate fields, preserving existing persisted data.
- [ ] Add failed-tool persistence and RPC round-trip fixtures.

### [ ] Phase C — Unsafe assertion elimination

Remove runtime casts rather than merely making them compile.

- [~] Remove `as never`, `as unknown as`, JSON parsing casts, response-body casts, and database-row casts from the generation path; production generation paths are clean, but fixture assertions remain.
- [x] Replace external JSON casts with typed boundary decoders in the generation SSE and RPC paths.
- [x] Replace database-row casts with checked mappers and narrow type guards in the generation repository.
- [~] Replace test fixture casts with typed builders and `satisfies`; new boundary tests avoid casts, while older generation fixtures still contain them.
- [ ] Audit the remaining repository-wide assertions and document only unavoidable non-runtime TypeScript syntax.
- [ ] Add CI enforcement for unsafe assertion patterns in changed runtime code.

### [ ] Phase D — Cross-boundary coverage and shipping evidence

Prove the fixes across the machine, repository, transports, and applications.

- [ ] Add event-matrix coverage for every durable event across machine, RPC, repository, web, and Omiro.
- [ ] Add replayed failure, terminal, confirmation, cancellation, and reconnect tests.
- [~] Run focused coverage with 100% statements, branches, functions, and lines for changed generation code; chat source, RPC event contract, DB generation repository, web transport/hooks, and Omiro regeneration now have focused evidence. API adapters, remaining Omiro hooks, and replay/e2e paths still have uncovered branches.
- [ ] Run database migrations/codegen, formatting, typechecks, `git diff --check`, and `pnpm run check`.
- [ ] Run browser and iOS Maestro flows for send, failure/retry, approval, cancellation, regeneration, and forced reconnect.
- [ ] Complete the evidence checklist before merging or shipping.

## Migration Plan — Sequential Phases

Each phase produces a reviewable boundary and must pass its gate before the next phase starts. The external MCP HTTP protocol remains unchanged throughout the migration.

Status: `[x]` complete · `[~]` in progress · `[ ]` not started.

### [x] Phase 0 — Foundation

The pure machine, generic interpreter, API provider/tool adapters, durable recovery schema, repository, idempotency plumbing, and focused tests shipped in PR #274.

Gate: focused machine, interpreter, provider, tools, registry, and database tests pass; the changed generation components have 100% focused statement/branch/function/line coverage; migrations and code generation pass.

- [x] Add `@vitest/coverage-v8` to the chat, API, and database packages.
- [x] Move the provider-independent generation machine and generic interpreter into `@hominem/chat`.
- [x] Add deterministic reducer coverage for provider chunks, reasoning, tool reconstruction, sequential tool execution, confirmation, retry, cancellation, terminal no-ops, malformed input, and idempotency keys.
- [x] Reach 100% focused statement, branch, function, and line coverage for the machine, interpreter, provider adapter, tools adapter, and registry.
- [x] Run focused tests, typechecks, lint, formatting, and the repository CI gate for the shipped change.

### [x] Phase 1 — Canonical domain and RPC contract

Define the complete versioned event contract before changing any route or client.

Gate: API, web, Omiro, and database DTO consumers compile against the v1 types while the existing stream route still operates unchanged.

- [x] Define the complete `GenerationDomainEvent` payload union with required chat/message, turn, confirmation, retry, checkpoint, and terminal metadata.
- [x] Define transport-independent metadata primitives and the discriminated event envelope in `@hominem/chat`.
- [x] Attach typed durable metadata variants to the canonical event payload contract.
- [x] Decide and document the accepted/start-generation message DTO: use the existing full `Chat` and `ChatMessageDto` response shapes.
- [x] Add versioned `GenerationDomainEvent` and `GenerationLiveEvent` types to `packages/rpc` with compile-time payload alignment.
- [x] Add shared Zod parsers and fixtures for durable events, live deltas, malformed versions, mismatched payloads, unsafe sequences, and unknown event types.
- [x] Establish the explicit legacy boundary and keep the legacy alias isolated to compatibility fixtures/adapters.
- [x] Migrate API, database DTO, web, and Omiro runtime stream consumers to v1 events during the coordinated cutover.

### [x] Phase 2 — Durable repository correctness

Complete repository invariants and recovery primitives before production orchestration depends on them.

Gate: event history can rebuild the run projection; concurrent append, idempotency, ownership, terminal uniqueness, rollback, snapshot, and safe-sequence tests pass.

- [x] Add event idempotency, encrypted-snapshot, terminal-uniqueness, and tool-effect schema migrations.
- [x] Implement ordered event append/replay, snapshot access, and idempotent tool-effect repository operations.
- [x] Run local and test database migrations plus database code generation for the new schema.
- [x] Export the generation repository through the database package boundary without creating a runtime `@hominem/db` dependency in `@hominem/chat`.
- [x] Implement encrypted snapshot serialization, API environment key management, minimum resume state, and snapshot version/integrity validation.
- [x] Implement event-history-to-run projection rebuilding and prove the run projection is disposable while retaining its identity anchor.
- [x] Enforce legal transitions, terminal-event exclusivity, safe-integer sequence conversion, and atomic append/projection transactions.
- [x] Add repository tests for ordered/idempotent append, ownership, projection rebuild, snapshots, tool effects, concurrent appends, and terminal uniqueness.
- [x] Add failure-injection and rollback tests for every repository transaction boundary, including unsafe sequence values and concurrent duplicate idempotency requests.

### [~] Phase 3 — Interpreter-backed API generation

Replace the API’s production completion loop with the port-based interpreter while keeping the current client stream temporarily available behind the adapter.

Gate: send, tool execution, confirmation, retry, cancellation, regeneration, failure, and write-effect replay use the interpreter and pass API integration tests.

- [x] Implement the pure generation machine, sequential interpreter, OpenRouter provider adapter, and MCP tools adapter.
- [x] Thread stable idempotency keys through semantic persist commands and write-tool execution.
- [x] Thread internal idempotency context through the existing MCP tool registry without changing MCP HTTP behavior.
- [x] Add cancellation checks and injected retry timing before every external
      effect through the interpreter control port; API generation routes inject
      the owner-scoped cancellation probe.
- [ ] Define crash recovery around provider turns, confirmation waits, snapshots, and replayed write effects.
- [x] Replace the production callback-based completion loop with `runGenerationWithPorts` through the resource-oriented chat runtime.
- [~] Adapt transcript/message persistence to machine turn and checkpoint semantics; the current adapter persists assistant output, but full checkpoint/resume semantics remain.
- [~] Add API commands and integration tests for start, approval, rejection, cancellation, retry, regeneration, failure, and crash recovery; the main route paths are covered, while crash-boundary coverage remains.

### [ ] Phase 4 — Replay-safe SSE transport

Introduce the single v1 SSE adapter and close the replay/live subscription race before exposing the new stream to clients.

Gate: durable events receive sequence IDs, live deltas receive no IDs, cursors are validated, and reconnect tests prove no durable event is lost or duplicated.

- [~] Implement the API event-store/live-delivery adapter and publish durable events only after transactional append succeeds. Accepted, checkpoint, confirmation, terminal, and machine-emitted semantic events now use the durable path; the final crash-boundary integration evidence remains.
- [x] Implement the v1 SSE adapter with IDs only on durable events.
- [ ] Validate `Last-Event-ID` and `afterSequence`, including malformed, negative, and unsafe-integer cursors.
- [x] Register subscribers before replay, buffer concurrent publications, flush after replay, and deduplicate by `(generationId, sequence)`.
- [~] Define terminal completion and awaiting-confirmation stream lifetime behavior. Terminal replay and checkpoint ordering are covered; a full awaiting-confirmation reconnect flow remains.
- [~] Add SSE replay, handoff-race, duplicate-delivery, terminal, confirmation, and authorization tests. Replay handoff, cursor validation, terminal, and client-side duplicate coverage exist; confirmation authorization and crash-boundary coverage remain.

### [ ] Phase 5 — Coordinated client cutover

Move web and Omiro to v1 event reducers and reconnect behavior in one coordinated hard cutover.

Gate: both clients converge on equivalent committed, failed, cancelled, and awaiting-confirmation state after replay and forced reconnect.

- [x] Replace `ChatStreamEvent` imports and fixtures with the v1 domain/live contract.
- [x] Deduplicate durable replay/live overlap at the shared RPC transport
      boundary in both web and Omiro while preserving repeated live deltas.
- [~] Extract and wire one equivalent client reducer for web and Omiro with
  durable sequence tracking and duplicate no-op behavior. The pure reducer,
  exhaustive RPC wire-to-domain adapter, and both platform hook integrations
  are complete; persisted cursor ownership and convergence coverage remain.
- [~] Update web reconnect logic to use `Last-Event-ID` without token replay;
  one-shot resume and terminal replay coverage are complete, while persisted
  cursor ownership and full convergence coverage remain.
- [~] Update Omiro reconnect logic to use validated `afterSequence` with
  Apple-only transport behavior; one-shot XHR resume and transport coverage
  are complete, while persisted cursor ownership and full convergence coverage
  remain.
- [~] Verify committed, failed, cancelled, and awaiting-confirmation replay convergence.
      Committed, failed, cancelled, and forced reconnect paths have focused
      coverage; awaiting-confirmation convergence and fresh-launch recovery
      remain.
- [~] Add web and Omiro reducer, replay, reconnect, and forced-disconnect tests.
      The shared reducer and both client integrations are covered, including
      Omiro phase/cancellation transitions; end-to-end client flows remain.

### [ ] Phase 6 — Remove legacy paths and release evidence

Delete the callback loop and `ChatStreamEvent`, remove duplicate types, enforce coverage thresholds, and complete end-to-end evidence.

Gate: full `pnpm run check`, migration/codegen checks, browser flows, Omiro simulator flows, and the evidence checklist pass before the remaining legacy cleanup is released.

- [ ] Remove the callback loop after the v1 route is proven in integration tests.
- [ ] Delete `ChatStreamEvent` after all clients and fixtures compile on v1.
- [ ] Remove obsolete duplicated generation types from API and database boundaries.
- [ ] Add 100% statement and branch thresholds to completed machine, interpreter, repository, API, web, and Omiro tests.
- [ ] Run migrations, test migrations, code generation, focused checks, browser flows, and simulator flows.
- [ ] Update `docs/chat.capabilities.md` only with completed evidence.
- [ ] Run the full `pnpm run check` gate and complete the evidence checklist.

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
