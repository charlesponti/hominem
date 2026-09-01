---
title: "Replace untyped generation boundary parsing"
status: "Partial"
priority: "high"
labels: [chat, validation, api, ci]
depends_on: []
blocks: [004-generation-crash-recovery.md]
estimated_size: "L"
---

## Objective

Replace unchecked parsing at every generation ingress with typed decoders and
stable error categories, without changing valid v1 event behavior.

## Context

The concrete boundaries are `parseArguments` in
`services/api/src/application/chat-generation-service.ts`, provider chunk
normalization in `chat-generation-provider.ts`, event payload parsing in
`packages/db/src/services/chats/chat-generation.repository.ts`, RPC/SSE parsing
in `packages/rpc/src/types/generation-events.ts` and the Web/Omiro consumers,
and encrypted snapshot decoding in the database recovery path.

## Requirements

- Replace `parseArguments`'s raw `JSON.parse` with a checked object decoder that
  returns a typed tool-input error; malformed arguments must become a persisted
  `tool.failed` result rather than an uncategorized throw.
- Make `toProviderChunk` reject malformed provider deltas (invalid index,
  missing function fields, or unsupported chunk shape) with a provider-input
  error before the machine receives them.
- Replace repository `safeParse`/manual guards that collapse all failures to a
  generic `Error` with stable categories while retaining owner and generation
  context.
- Validate event envelopes and SSE records at the RPC boundary before mapping
  them to client state; malformed records must not advance the durable cursor.
- Define callback-exception behavior: failed durable append is terminal-safe and
  failed live delivery does not masquerade as a successful append.
- Add the uncached CI command and required fake environment to the relevant
  validation workflow.

## Implementation Notes

- Reuse `GenerationHistoryEventPayloadSchema`,
  `GenerationDomainEventSchema`, and existing Hominem error classes.
- Keep provider/tool payloads out of safe messages and telemetry attributes.
- Do not start services as part of validation.
- Preserve the v1 wire shape for valid inputs.

## Acceptance Criteria

- [ ] Malformed tool arguments produce a failed tool result with a stable
  category and never invoke the MCP tool.
- [ ] Invalid provider chunks, snapshots, domain events, and SSE records are
  rejected at their ingress boundary and do not advance state/cursors.
- [ ] Persistence and live callback exceptions have distinct tested behavior.
- [ ] CI runs `TURBO_FORCE=true pnpm run check` with the generation dependencies'
  required environment values.

## Testing

- Extend `services/api/src/application/chat-generation-provider.test.ts` for
  malformed chunks and fragmented calls.
- Extend `services/api/src/application/chat-generation-service.test.ts` for
  malformed/non-object tool arguments.
- Extend repository, RPC, Web, and Omiro SSE parser tests for malformed events.
- Run the affected package checks and the uncached root validation command.
