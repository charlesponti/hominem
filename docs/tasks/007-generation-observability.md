---
title: "Add generation recovery observability"
status: "todo"
priority: "medium"
labels: [chat, observability, tracing]
depends_on: [004-generation-crash-recovery.md]
blocks: [010-functional-chat-shipping-evidence.md]
estimated_size: "M"
---

## Objective

Add a stable correlation record for one generation from start through replay,
recovery, tool-effect reuse, and terminal outcome.

## Context

The API already records AI usage through `recordAIUsageEvent` in the generation
routes. Extend the existing Hominem logging/tracing boundary rather than adding
a second telemetry system. Payloads from messages, providers, and MCP tools
must remain redacted.

## Requirements

- Add `generationId`, attempt/turn identity, event sequence, and terminal outcome
  to generation logs/traces at the API boundary.
- Record replay cursor received/sent and whether a durable event was replayed,
  live, or deduplicated.
- Record tool name plus idempotency outcome (`executed`, `reused`, `failed`),
  never arguments or result content.
- Record recovery decision (`resumed` or `terminalized`) and stable error
  category, never raw provider/tool payloads.
- Add redaction assertions for message content, provider chunks, tool args, and
  tool results.

## Implementation Notes

- Start from the instrumentation used by `recordAIUsageEvent` and the API
  generation live bus; do not introduce a new transport.
- Keep observability additive to behavior and do not change event semantics.

## Acceptance Criteria

- [ ] A test record contains generation ID, attempt, sequence/cursor, recovery,
  tool-effect, and terminal fields.
- [ ] Replay, reconnect, live delivery, deduplication, and effect reuse have
  distinct observable outcomes.
- [ ] Redaction tests prove representative sensitive payloads are absent.

## Testing

- Extend the API generation telemetry tests around `recordAIUsageEvent` and the
  live bus.
- Add redaction tests with representative provider chunks and MCP results.
- Inspect one recovery integration trace containing replay and effect reuse.
