---
title: 'Define the canonical chat domain contract'
status: 'Implemented'
priority: 'high'
labels: [chat, domain, schema]
depends_on: []
blocks: [002-chat-tool-event-round-trip.md]
estimated_size: 'L'
---

## Outcome

The shared chat package is the single runtime owner of chat snapshots,
attachments, tool-call records, lifecycle fields, and generation events shared
by DB, API, Web, and Omiro.

## Scope

In scope: strict schemas, inferred types, lifecycle invariants, and contract
tests. Out of scope: route behavior, UI behavior, persistence migrations, and
provider implementation.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Define shared records | packages/chat schemas | — | Chat contract tests | All shared records have one runtime schema owner. |
| W-002 | Enforce lifecycle invariants | packages/chat | W-001 | Valid and malformed fixture tests | Confirmation, execution, commitment, IDs, JSON, and file sizes reject invalid combinations. |
| W-003 | Remove duplicate contracts | DB/API/Web/Omiro consumers | W-002 | Production search + package tests | Consumers import the canonical contract without duplicate schemas. |

## Acceptance criteria

- [x] AC-001: Valid records parse and infer shared types.
- [x] AC-002: Invalid lifecycle combinations, unknown legacy fields, invalid JSON, empty IDs, and invalid file sizes are rejected.
- [x] AC-003: Focused Chat, DB, RPC, Web, and Omiro checks pass.

## Evidence

Focused test output and the production symbol search are the authoritative
evidence. Volatile run IDs belong in generated artifacts.

## Exit gate

Implemented. New shared chat behavior must be added to the shared package with
contract tests before consumers change. No remaining work belongs here.
