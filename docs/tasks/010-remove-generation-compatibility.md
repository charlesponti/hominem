---
title: 'Remove legacy generation compatibility'
status: 'Implemented'
priority: 'high'
labels: [chat, api, cleanup, legacy]
depends_on: [009-generation-runtime-consolidation.md]
blocks: [011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome

Legacy callback loops, generation result types, stream aliases, duplicate RPC
contracts, and persisted compatibility mappers are removed from production.
Web and Omiro consume canonical shared events directly.

## Scope

In scope: production symbol removal and migration validation. Out of scope:
new generation behavior, recovery, and release evidence.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Inventory legacy symbols | API/Web/Omiro production code | Task 009 | exact search report | Every compatibility symbol has a replacement or explicit disposition. |
| W-002 | Remove compatibility paths | listed production boundaries | W-001 | focused package tests | No legacy mapper, alias, or duplicate RPC generation contract remains. |
| W-003 | Validate the canonical path | Chat/DB/API/Web/Omiro | W-002 | focused suites + full check | Consumers pass against the canonical runtime. |

## Acceptance criteria

- [x] AC-001: Exact production searches find no legacy generation symbols.
- [x] AC-002: Focused API, Chat, DB, Web, and Omiro suites pass.
- [x] AC-003: No compatibility alias is reintroduced to simplify typing.

## Evidence

The exact production search and focused validation output are authoritative.

## Exit gate

Implemented. New boundary problems require a canonical contract or explicit
application operation, not a compatibility alias.
