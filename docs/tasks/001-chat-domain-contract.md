---
title: 'Define the chat domain contract'
status: 'in-progress'
priority: 'high'
labels: [chat, domain, schema]
depends_on: []
blocks: [002-chat-tool-event-round-trip.md, 004-generation-crash-recovery.md]
estimated_size: 'L'
---

## Objective

Replace the chat tool-call contract so confirmation state and execution outcome
are represented independently. This greenfield system does not require
backward-compatible reads or writes for the obsolete shape.

## Context

The current `ChatMessageToolCallRecord.status` in
`packages/db/src/guards.ts` mixes confirmation (`pending`, `rejected`) with
execution (`completed`, `failed`). The same shape is repeated in
`packages/rpc/src/types/generation-events.ts`. The machine already emits
`confirmation.required`, `confirmation.approved`, `confirmation.rejected`,
`tool.completed`, and `tool.failed`; the DTOs need to express those meanings
without overloading one field.

## Requirements

- Add `confirmationStatus` with `pending | approved | rejected` and
  `executionStatus` with `pending | running | completed | failed`.
- Replace the overloaded `status` shape in all active DTOs, schemas, mappers,
  fixtures, and client consumers; do not add a compatibility field or mapper.
- Update `packages/db/src/guards.ts`, the chat message DTO mapper, and
  `packages/rpc/src/types/generation-events.ts` and its schemas together.
- Preserve all v1 generation event names and payloads.

## Implementation Notes

- The tool-call data is JSON in `app.chat_messages.tool_calls`; this task does
  not require a new relational column unless the implementation proves one is
  necessary.
- Keep database row types private to `@hominem/db` and expose the normalized
  DTO from the repository.
- Do not change MCP HTTP behavior or the generation machine event vocabulary.

## Acceptance Criteria

- [ ] `parseChatMessageToolCalls` returns normalized split fields for the new
      contract and rejects the obsolete overloaded status shape.
- [ ] A tool call awaiting confirmation cannot also be reported as completed or
      failed by the normalized DTO.
- [ ] RPC validation accepts pending, approved, rejected, completed, and failed
      lifecycle states without `as` assertions.
- [ ] The new contract is covered in repository, RPC, Web, and Omiro fixtures;
      no fixture depends on the obsolete status field.

## Testing

- Extend `packages/db/src/guards.test.ts` or the existing chat repository guard
  tests with new-contract JSON fixtures and malformed obsolete-shape fixtures.
- Extend `packages/rpc/src/types/generation-events.test.ts` with all legal split
  field combinations and malformed combinations.
- Add compile-time fixtures at the DTO boundary used by Web and Omiro.
