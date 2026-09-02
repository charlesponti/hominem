---
title: 'Prove chat tool event round trips'
status: 'Implemented'
priority: 'high'
labels: [chat, events, clients]
depends_on: [001-chat-domain-contract.md]
blocks: [003-chat-e2e-test-infrastructure.md, 006-generation-cursor-recovery.md]
estimated_size: 'M'
---

## Outcome

One shared fixture reconstructs fragmented provider tool calls and reduces
durable tool, confirmation, failure, retry, commit, and duplicate events
consistently across persistence, replay, Web, and Omiro.

## Scope

In scope: canonical event fixtures, parsers, reducers, and round-trip tests.
Out of scope: generation recovery policy, provider integration, and release
evidence.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Define the lifecycle fixture | shared chat package | Task 001 | Shared fixture test | Tool request, execution, confirmation, rejection, retry, failure, and commit are represented. |
| W-002 | Verify persistence and replay | DB/API replay | W-001 | DB and API tests | IDs, cursor, status, and terminal ordering survive round trip. |
| W-003 | Verify client reduction | Web/Omiro adapters | W-002 | Web SSE and Omiro XHR tests | Duplicate delivery produces one semantic result on both clients. |

## Acceptance criteria

- [x] AC-001: Fragmented and multiple tool calls reconstruct correctly.
- [x] AC-002: Confirmation rejection is distinct from execution failure.
- [x] AC-003: Shared fixture tests and focused typechecks pass.

## Evidence

Focused Chat, DB, API replay/service/route, Web SSE, and Omiro XHR outputs are
the authoritative evidence. Volatile run IDs belong in generated artifacts.

## Exit gate

Implemented. Any new canonical event behavior requires a shared fixture and
round-trip assertion before client-specific changes.
