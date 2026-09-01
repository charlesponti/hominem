---
title: 'Prove Web and Omiro client convergence'
status: 'Partial'
priority: 'high'
labels: [chat, web, omiro, replay, testing]
depends_on: [006-generation-cursor-recovery.md]
blocks: [008-generation-observability.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome so far

Web and Omiro import the shared generation contract, parser, deduplicator, and
reducer from `@hominem/chat`. Platform transport and lifecycle code remain
separate, while semantic state is shared.

## Remaining change

Boundary: canonical wire events → Web/Omiro transport lifecycle reducers.

Build a shared fixture matrix for send, start, regenerate, confirmation,
cancellation, retry, provider/tool failure, committed completion, reconnect,
and fresh launch. Compare phase, cursor, assistant content, tool-call state,
error, confirmation, and terminal meaning after uninterrupted delivery,
replay/live overlap, and forced interruption.

## Exit gate

Task 007 is complete only when the same fixtures produce equal semantic state
for Web and Omiro across send, start, regenerate, confirmation, cancellation,
retry, provider/tool failure, committed completion, reconnect, and fresh launch.
The API-to-client tests must prove replay/live convergence, no duplicate
durable application, no cursor advance from deltas, and equivalent lifecycle
meaning for active and terminal states.

Task 008 must not start until the convergence matrix and API integration tests
are green and attached to the task record.
