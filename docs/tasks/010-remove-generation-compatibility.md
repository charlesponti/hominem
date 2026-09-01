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

The legacy callback loop, generation service result types, stream aliases, and
duplicate RPC generation contract are gone from production code. Web and Omiro
consume canonical `@hominem/chat` events directly.

## Evidence

The production legacy-symbol search returns no matches. The API, Chat, DB, Web,
and Omiro focused suites pass against the current runtime. No compatibility
mapper or legacy persisted shape is retained.

## Exit gate

This task is recorded as implemented. Its gate is the exact production legacy
symbol search, focused API/Chat/DB/Web/Omiro suites, and full validation after
the runtime migration. Do not reintroduce aliases to make a boundary easier
to type; update the canonical contract or add an explicit application
operation.
