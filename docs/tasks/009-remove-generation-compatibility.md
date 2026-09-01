---
title: "Remove legacy generation compatibility paths"
status: "Implemented"
priority: "high"
labels: [chat, api, cleanup, legacy]
depends_on: [008-generation-runtime-consolidation.md]
blocks: [010-functional-chat-shipping-evidence.md]
estimated_size: "L"
---

## Objective

Delete the compatibility implementation and aliases as part of establishing
the v1 resource-oriented runtime. This greenfield system has no backward
compatibility requirement for the obsolete path.

## Context

The concrete legacy files are `services/api/src/application/chat-generation-service.ts`,
`services/api/src/rpc/routes/chat-completion-loop.ts`,
`services/api/src/rpc/routes/chat-completion-loop.test.ts`, and
`packages/rpc/src/types/chat.types.ts` plus the conversion function in
`packages/rpc/src/types/generation-events.ts`.

## Requirements

- Remove the `runChatGeneration` export and its test file; move only behavior
  that belongs to the current facade into facade tests.
- Delete `chat-completion-loop.ts` and its tests once no route or application
  service imports `runCompletionWithTools`.
- Delete `ChatStreamEvent`, `LegacyChatStreamEvent`, and
  `ChatsStartStreamEvent`; migrate the remaining RPC imports to
  `GenerationDomainEvent`/`GenerationLiveEvent`.
- Replace duplicated route/application generation result types with the shared
  `@hominem/chat` and repository DTOs.
- Preserve the current v1 durable/live event contract and required semantic
  behavior. Do not preserve obsolete result types, aliases, or persisted
  shapes solely for compatibility.

## Implementation Notes

- Run the exact searches `rg -n "runChatGeneration|runCompletionWithTools|ChatStreamEvent|LegacyChatStreamEvent|ChatsStartStreamEvent" services packages apps`.
- Delete obsolete compatibility data and fixtures when they are no longer
  referenced by the current runtime; do not create a migration layer for them.

## Acceptance Criteria

- [ ] The exact legacy-symbol search returns no production definitions or imports.
- [ ] RPC, Web, Omiro, and API fixtures use only the v1 event contract.
- [ ] The facade tests replace all behavior coverage removed with the legacy loop.
- [ ] Full validation passes after removal.

## Testing

- Run affected API/RPC/client tests.
- Run the exact repository search from Implementation Notes.
- Run `TURBO_FORCE=true pnpm run check` with the CI environment.
