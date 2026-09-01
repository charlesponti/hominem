---
title: "Prove Web and Omiro client convergence"
status: "todo"
priority: "high"
labels: [chat, web, omiro, replay, testing]
depends_on: [002-chat-tool-event-round-trip.md, 005-generation-cursor-recovery.md]
blocks: [008-generation-runtime-consolidation.md]
estimated_size: "L"
---

## Objective

Build a reusable convergence matrix proving Web and Omiro produce the same
semantic generation state for each generation entry point and lifecycle.

## Context

The shared reducer and event adapter already exist in `@hominem/chat` and
`@hominem/rpc`; platform-specific entry points are
`apps/web/app/lib/hooks/use-stream-message.ts`,
`apps/web/app/lib/hooks/use-start-chat.ts`, and the Omiro send/start/regenerate
services. The test must compare state, not React Native versus browser markup.

## Requirements

- Define one fixture per terminal/active state using the v1 domain events and
  live events, including `tool.failed` and confirmation events.
- Feed each fixture into the Web and Omiro transport/reducer entry points for
  send, start, and regenerate.
- Compare phase, durable cursor, assistant content, tool-call state, error, and
  confirmation state after live delivery, replay, and forced interruption.
- Assert durable sequences are applied once and deltas are not treated as
  durable state.

## Implementation Notes

- Add shared fixture builders near the existing generation client tests rather
  than duplicating event literals in each platform test.
- Reuse `createGenerationEventDeduplicator` and the shared generation reducer.

## Acceptance Criteria

- [ ] Identical ordered fixtures produce equal semantic snapshots in Web and Omiro.
- [ ] Committed, failed, cancelled, awaiting-confirmation, retry, tool-step,
  terminal replay, interruption, and reconnect are covered for send, start, and
  regenerate.
- [ ] Forced interruption followed by replay equals uninterrupted delivery and
  does not duplicate a durable event.

## Testing

- Extend `packages/chat/src/generation-client.test.ts` and
  `packages/rpc/src/types/generation-events.test.ts` with shared fixtures.
- Update Web `use-stream-message`/start/regenerate tests and Omiro
  `use-send-message`, `use-start-chat`, and `use-regenerate-message` tests.
- Add one API-to-client replay/live integration scenario.
