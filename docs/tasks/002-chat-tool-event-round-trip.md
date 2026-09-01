---
title: "Complete chat tool event round trips"
status: "Partial"
priority: "high"
labels: [chat, events, rpc, clients]
depends_on: [001-chat-domain-contract.md]
blocks: [006-client-convergence.md, 008-generation-runtime-consolidation.md]
estimated_size: "M"
---

## Objective

Add one executable round-trip fixture that starts with a v1 domain event and
proves the resulting tool state is identical after persistence, replay, RPC
mapping, and reduction in both clients.

## Context

`tool.failed` exists in `packages/chat/src/generation-machine/types.ts` and the
v1 schemas, but the API/client round trip is not covered as one path. The test
must expose any mismatch between `ChatMessageToolCallRecord`, the RPC event
schema, and the shared client reducer.

## Requirements

- Create a fixture sequence containing `tool.requested`,
  `confirmation.required`, `confirmation.rejected`, a second requested call,
  and `tool.failed`.
- Feed the same sequence through `ChatGenerationRepository.appendEvent` and
  `rebuildProjection` in `packages/db/src/services/chats/chat-generation.repository.ts`.
- Validate the serialized event with `GenerationDomainEventSchema`, map it
  through the RPC adapter, and reduce it with the shared generation client.
- Assert that the failed call retains its call ID, tool name, arguments, and
  failure state after every hop.
- Use the split status contract from task 001 rather than adding client-local
  status translation.

## Implementation Notes

- Primary test locations are
  `packages/db/src/services/chats/chat-generation.repository.test.ts`,
  `packages/rpc/src/types/generation-events.test.ts`,
  `packages/chat/src/generation-client.test.ts`, and the existing Web/Omiro
  chat service tests.
- Compare semantic reducer state, not platform-specific rendered components.

## Acceptance Criteria

- [ ] The ordered fixture rebuilds the same projection before and after a
  repository round trip.
- [ ] RPC parsing preserves `tool.failed` and the split tool status fields.
- [ ] Web and Omiro reduce the fixture to equivalent failed-tool and
  confirmation state.
- [ ] The changed path contains no type assertion used only to bridge DTOs.

## Testing

- Run the focused repository, RPC, shared reducer, Web, and Omiro tests named
  in Implementation Notes.
- Add one regression test for replaying the same failed durable event twice and
  assert that the reducer applies it once.
