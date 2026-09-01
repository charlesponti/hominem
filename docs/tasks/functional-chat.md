# Functional Chat Generation

## Purpose

This document describes the current chat-generation architecture and the work
still required to make durable generation recovery complete. It covers the
generation machine, provider and tool execution, durable semantic events,
replay, live delivery, and the web and Omiro clients.

The external MCP HTTP protocol is outside this document. The existing MCP
registry remains the API adapter used by chat tool execution.

Status uses four values:

- **Implemented** — present in the current source and supported by focused
  evidence.
- **Partial** — implemented in part, but an integration path or required
  evidence is still missing.
- **Open** — not complete.
- **Blocked** — cannot proceed until an explicit product or architecture
  decision is made.

## Current status

The provider-independent generation machine, sequential interpreter, v1 event
contract, durable generation repository, replay-safe transports, and shared
client reducer are implemented. The generation runtime is machine-backed in
production, but the API still exposes a composition adapter around
`runChatGeneration` and the legacy callback loop/types have not been fully
removed.

The remaining work is concentrated in five areas:

1. complete the domain contract for confirmation and failed tool execution;
2. finish crash recovery and durable cursor restoration;
3. prove replay/live convergence across API, web, and Omiro;
4. remove the remaining legacy orchestration boundary; and
5. complete focused and interactive shipping evidence.

User-facing capability status remains in
[`docs/chat.capabilities.md`](../chat.capabilities.md).

## Architecture and protocol

The current architecture, runtime flow, durable event contract, and generation
invariants live in [`../chat-generation.md`](../chat-generation.md). This task
document intentionally keeps only the current status, verified implementation
state, open work, and completion criteria.

## Verified implementation status

### Implemented

- Pure generation machine and sequential effect interpreter in
  `@hominem/chat`.
- OpenRouter provider normalization and MCP tool preview/execution adapters.
- Stable generation/tool idempotency keys and persisted tool-effect reuse.
- Versioned domain/live event types, runtime schemas, and v1 SSE
  serialization.
- Ordered and idempotent generation repository operations, projection
  rebuilding, encrypted snapshots, ownership checks, terminal uniqueness,
  safe sequence conversion, and rollback coverage.
- Shared client reducer and RPC wire-to-domain adapter.
- Web and Omiro durable replay/live deduplication and one-shot interruption
  resume behavior.
- Focused machine, interpreter, repository, schema, transport, web, and
  Omiro service coverage for the scenarios currently represented by tests.

### Partial

- The API production path is machine-backed, but route-level composition still
  depends on `runChatGeneration`; the legacy callback loop and
  `ChatStreamEvent` compatibility types remain.
- Web and Omiro observe durable cursors during streaming, but durable cursor
  ownership/restoration and fresh-launch recovery are not complete.
- Route-level replay/live handoff coverage exists, but full client convergence
  and interactive reconnect evidence is missing.
- Focused coverage is complete for several chat, RPC, repository, web, and
  regeneration boundaries; API adapters, remaining Omiro hooks, replay/e2e
  paths, and interactive flows are not fully evidenced.

## Open work

### Domain contract

**Blocked — confirmation and execution status decision**

Decide whether confirmation state and tool execution state remain represented
by one persisted status or become separate fields. The decision must preserve
the meaning of existing persisted rows and define the RPC representation for
pending, approved, rejected, completed, and failed tool calls.

Completion evidence: an explicit domain decision recorded here, compatible
schema/types, migration behavior if required, and passing repository/RPC
fixtures for existing and new values.

**Open — failed-tool round trip**

Add fixtures proving `tool.failed` survives machine output, persistence,
projection rebuild, RPC encoding/decoding, and web/Omiro client reduction.

Completion evidence: one focused round-trip test covering the persisted event,
message/tool-call DTO, and resulting client state.

**Open — message DTO alignment**

Finish alignment between the full RPC message DTO and the widened execution
status union, including every supported message/tool status variant.

Completion evidence: type-level fixtures and runtime schema tests for every
message/tool status variant, with no assertion-based escape hatch.

### Boundary validation

**Open — typed external parsers**

Replace generic JSON parsing in provider, tool, snapshot, request-context, and
SSE boundaries with typed success/error results or checked decoders. Each
boundary must define its malformed-input behavior instead of allowing an
unclassified throw or trusting `JSON.parse<T>`.

Completion evidence: malformed JSON, missing fields, unsupported enums,
unexpected provider chunks, invalid snapshots, and callback exceptions are
covered at the boundary where they enter the system.

**Open — uncached CI validation**

Make the uncached declaration/build validation currently exercised with
`TURBO_FORCE=true pnpm run check` an explicit CI guarantee, including the
required environment and the command recorded in CI evidence.

Completion evidence: a CI run proves the uncached gate and reports the
expected typecheck, lint, build, and test tasks.

### Crash recovery

**Open — provider and persistence crash semantics**

Define and implement recovery around provider turns, confirmation waits,
checkpoint writes, cancellation, terminal persistence, and replayed write
effects. Recovery must resume from durable state without replaying a completed
effect or committing an assistant message after a durable failure.

Completion evidence: failure-injection tests at each effect boundary and an
integration test that restarts/re-attaches to an interrupted generation.

**Open — fresh-launch recovery**

Define how web and Omiro restore an active generation and its durable cursor
after the client process is restarted. The lookup state must be reconciled with
replayed events before new live events are applied.

Completion evidence: a fresh-launch test for running, awaiting-confirmation,
cancelled, failed, and committed generations.

### Replay and client convergence

**Open — durable cursor ownership and restoration**

Make the durable sequence cursor part of the generation client state with a
single owner per stream. Restore it consistently on interruption, retry, and
fresh launch for web and Omiro.

Completion evidence: transport tests show the exact cursor sent after each
reconnect and prove no event is skipped or replayed twice.

**Open — cross-client convergence matrix**

Complete replay/live convergence tests for web and Omiro send, start, and
regenerate entry points. Cover committed, failed, cancelled,
awaiting-confirmation, retry, tool-step, terminal replay, forced interruption,
and reconnect behavior.

Completion evidence: the same ordered durable event fixtures produce equivalent
final semantic state in both clients, including confirmation and failed-tool
states.

**Open — interactive acceptance evidence**

Run browser and iOS simulator/Maestro flows for send, confirmation,
cancellation, failure/retry, regeneration, forced reconnect, terminal replay,
and fresh-launch recovery. Services must already be running; test execution
must not start them implicitly.

Completion evidence: each flow records its environment, observed states,
artifacts, and any unverified condition. Update
`docs/chat.capabilities.md` only when the corresponding capability has that
evidence.

### Legacy removal

**Open — single production orchestration path**

Move route handlers fully behind the resource-oriented chat facade so they no
longer own orchestration-shaped state or call the transitional composition
boundary directly. Remove `runChatGeneration` only after equivalent API
integration coverage exists.

Completion evidence: route search shows one production generation entry path,
and API integration tests cover send, start, regenerate, confirmation,
cancellation, retry, failure, and recovery through that path.

**Open — compatibility cleanup**

Remove the legacy callback completion loop, `ChatStreamEvent`, and duplicated
generation types after all consumers and fixtures use the v1 contract.

Completion evidence: repository search finds no production imports or
definitions of those compatibility surfaces, followed by the full validation
gate.

## Definition of done

This document’s work is complete when:

- there is one production generation orchestration path;
- durable history can recover the latest semantic generation state;
- provider and tool failures produce correct durable terminal behavior;
- replay/live handoff is lossless and duplicate-safe;
- confirmation state, failed-tool state, and execution state are unambiguous;
- web and Omiro converge after reconnect and fresh launch;
- focused coverage and browser/iOS acceptance evidence are complete; and
- the legacy orchestration loop, compatibility event types, and duplicated
  generation types are removed.

## Validation record

This document is a current-state specification, not a substitute for runtime
evidence. When implementation work changes the generation boundary, record:

- the exact command or flow;
- the source/test scope;
- the environment and database state;
- the observed result and artifact location; and
- anything that remains unverified.

The minimum documentation evidence for changes to this file is a clean
read-through, `git diff --check`, and targeted verification that referenced
paths exist.
