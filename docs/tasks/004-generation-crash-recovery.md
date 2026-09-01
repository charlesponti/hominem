---
title: "Implement deterministic generation crash recovery"
status: "Partial"
priority: "urgent"
labels: [chat, recovery, database, reliability]
depends_on: [001-chat-domain-contract.md, 003-typed-generation-boundaries.md]
blocks: [005-generation-cursor-recovery.md, 007-generation-observability.md, 008-generation-runtime-consolidation.md]
estimated_size: "XL"
---

## Objective

Implement restart/re-attach behavior around the existing generation repository,
machine interpreter, snapshot, cancellation, and effect ledger boundaries.

## Context

The current repository exposes `appendEvent`, `saveSnapshot`, `getSnapshot`,
`rebuildProjection`, `getToolEffect`, and `saveToolEffect`. The current
interpreter exposes provider/tool/persistence/stop ports, but there is no single
fresh-launch recovery entry point that drives the machine from durable state.

## Requirements

- Add a recovery service/facade that loads the owner-scoped run, snapshot, and
  events, rebuilds the projection, and chooses resume versus terminalization.
- Persist checkpoints at provider-turn completion and before confirmation waits;
  resume only from the latest valid checkpoint.
- Make provider, tool, snapshot, terminal-write, and cancellation failures
  return one durable failed/cancelled outcome according to the first terminal
  append.
- Ensure `saveToolEffect` is checked before invoking `callTool`, and that a
  replayed effect returns the stored result without invoking MCP again.
- Add an explicit recovery result containing generation ID, recovered phase,
  last durable sequence, and whether a new effect may run.

## Implementation Notes

- Primary implementation boundaries are
  `packages/db/src/services/chats/chat-generation.repository.ts`,
  `packages/chat/src/generation-interpreter.ts`,
  `packages/chat/src/generation-machine/lifecycle.ts`, and the API generation
  composition service.
- Treat durable events as authoritative and the run row as a projection.
- Use existing generation/tool idempotency-key helpers.

## Acceptance Criteria

- [ ] A recovery call for each active phase returns either a resumed machine
  state or one durable terminal result.
- [ ] Failure injection exists for provider output, confirmation wait, snapshot
  write/read, cancellation race, terminal append, and tool-effect replay.
- [ ] Recovered tool execution never invokes MCP when the effect ledger already
  contains the idempotency key.
- [ ] A second terminal append is rejected/idempotently resolved and cannot
  publish a contradictory live event.

## Testing

- Add failure-injection cases to `packages/chat/src/generation-interpreter.test.ts`
  and `packages/chat/src/generation-machine/lifecycle.test.ts`.
- Extend `packages/db/src/services/chats/chat-generation.repository.test.ts`
  for snapshot, terminal, and effect races.
- Add an API integration test that creates a run, interrupts it at each listed
  boundary, then re-attaches and inspects durable events/projection.
