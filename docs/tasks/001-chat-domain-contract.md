---
title: 'Canonical chat domain contract'
status: 'Implemented'
priority: 'high'
labels: [chat, domain, schema]
depends_on: []
blocks: []
estimated_size: 'L'
---

## Outcome

`@hominem/chat` owns chat snapshots, attachments, tool-call records, lifecycle
fields, and generation event schemas. The schemas are strict and inferred, and
are shared by the database, API application, Web, and Omiro.

Confirmation status and execution outcome are separate fields. Waiting for
confirmation is not commitment or execution. Invalid lifecycle combinations,
unknown legacy `status` fields, non-object JSON values, empty identifiers, and
invalid file sizes are rejected.

## Exit gate

Task 001 is complete only when `packages/chat/src/generation-schemas.ts` and
`packages/chat/src/chat-record-schemas.ts` are the sole shared runtime schema
owners; Chat schema, generation, DB, RPC, Web, and Omiro contract tests cover
valid and malformed records; and the exact production search finds no duplicate
chat lifecycle schema, reducer, or DTO conversion outside the domain owner.

The gate must also record the focused Chat, DB, RPC, Web, and Omiro validation
commands and results.

## Remaining work

None. New shared chat behavior must be added to `@hominem/chat` with contract
tests before consumers are changed.
