---
title: 'Make generation recovery observable'
status: 'Partial'
priority: 'medium'
labels: [chat, observability, tracing]
depends_on: [007-client-convergence.md]
blocks: [009-generation-runtime-consolidation.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'M'
---

## Outcome so far

Telemetry helpers exist for event delivery, deduplication, tool effects, and
recovery decisions. AI usage recording remains in the existing telemetry
boundary. Safe diagnostics do not include provider chunks, message content,
tool arguments, or tool results.

## Remaining change

Boundary: application generation/replay/effect operations → telemetry.

Complete correlation for generation ID, attempt/turn, durable sequence, replay
cursor, delivery mode, recovery decision, terminal outcome, error category, and
tool-effect result (`executed`, `reused`, `failed`). Add redaction assertions
and make the correlation usable without exposing sensitive payloads.

## Exit gate

Task 008 is complete only when telemetry tests produce one correlated redacted
record spanning generation, replay, reconnect, deduplication, recovery,
tool-effect reuse, and terminalization. The record must include generation and
attempt identity, event/cursor data, delivery mode, recovery decision, error
category, terminal outcome, and effect outcome without message content,
provider chunks, arguments, or results. Redaction tests and focused API tests
must pass.

Task 009 may be treated as already implemented, but no new runtime-consolidation
work may be started until this gate is satisfied.
