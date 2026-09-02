---
title: 'Type generation boundaries'
status: 'Implemented'
priority: 'high'
labels: [chat, validation, api, ci]
depends_on: [003-chat-e2e-test-infrastructure.md]
blocks: [005-generation-crash-recovery.md, 011-functional-chat-shipping-evidence.md]
estimated_size: 'L'
---

## Outcome

Provider, tool, snapshot, event, persistence, and SSE ingress either produce
typed valid data or a safe, classified failure without leaking payloads.

## Scope

In scope: boundary parsing, callback errors, cursor validation, error
categories, redaction, and declaration validation. Out of scope: recovery
policy, client convergence, and production architecture changes.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Inventory untyped ingress | provider/API/DB/SSE | Task 003 | Audit table | Every generic parse has an owner and malformed-input behavior. |
| W-002 | Replace unsafe parsing | listed ingress boundaries | W-001 | Focused boundary tests | Invalid input is rejected, terminalized, or transport-closed intentionally. |
| W-003 | Verify safe diagnostics | errors and telemetry | W-002 | Redaction tests | Errors contain categories and correlation but no sensitive payloads. |
| W-004 | Validate declarations | package/typecheck config | W-002 | Uncached typecheck and full check | Live and emitted declaration contracts agree. |

### W-001 boundary inventory

| Boundary | Owner | Current guard | Malformed-input outcome | Existing evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| OpenRouter stream chunk → generation input | services/api/src/application/chat-generation-provider.ts | toProviderChunk() + providerChunkSchema.safeParse() | ProviderInputError; provider turn becomes a classified failed input | provider malformed-chunk tests | Preserve diagnostics shape while tightening ingress typing in W-002 |
| Provider tool-call fragments → assembled calls | packages/chat and provider adapter | reconstructProviderToolCalls() | Invalid/incomplete call is rejected before tool execution | provider and generation-engine tests | Verify malformed fragments and index ordering in W-002 |
| Tool arguments → tool runtime | services/api/src/application/chat-generation-engine.ts | JSON.parse() + chatMessageJsonObjectSchema.safeParse() | ToolInputError; failed tool result is persisted without executing invalid input | engine tool-input tests | Add explicit malformed JSON/object coverage in W-002 |
| Persisted generation event JSON → projection | packages/db/src/services/chats/chat-generation.repository.ts | GenerationHistoryEventPayloadSchema.safeParse() | ValidationError; event is not projected | repository malformed-payload tests | Verify error redaction and unsupported event shapes in W-002/W-003 |
| Persisted message JSON → message snapshot | packages/db/src/services/chats/chat.repository.ts | message file/tool-call schemas | ValidationError; message read fails safely | repository invalid-message tests | Keep sensitive values out of diagnostics in W-003 |
| SSE frame → client event | packages/chat/src/sse.ts and client reducer | frame decoder + event parser | malformed frame is returned as a typed decoder result; valid frames continue | SSE and client tests | Verify cursor advancement and duplicate frames in W-002 |
| Replay cursor → event query | services/api/src/rpc/routes/chats.generation.ts | decimal/non-negative/safe-integer validation | ValidationError; no event query for invalid cursor | route-helper and replay tests | Keep non-advancing cursor behavior explicit in W-002 |
| Failure/callback hooks → generation terminal state | services/api/src/application/chat-generation.service.ts | typed failure hooks and terminal event projection | failure is classified and terminalized or transport-closed by owner | service and testkit failure tests | Cover each callback failure outcome in W-002 |
| Diagnostics/telemetry → logs | API telemetry and error handlers | allowlisted metadata at call sites | correlation/category only; provider args and tool results excluded | telemetry redaction tests | Add boundary-wide redaction assertions in W-003 |

## Acceptance criteria

- [x] AC-001: Provider, tool, snapshot, event, SSE, persistence, publication, and cursor malformed-input tests pass.
- [x] AC-002: Callback exceptions and cursor non-advancement have defined outcomes.
- [x] AC-003: Safe errors and telemetry pass redaction checks.
- [x] AC-004: `TURBO_FORCE=true pnpm run check` passes.

## Validation record

- Boundary inventory was completed in W-001.
- The provider adapter now consumes the exported `ChatStreamChunk` contract;
  existing schema guards remain responsible for malformed provider data.
- `TURBO_FORCE=true pnpm run check` passed: declaration validation, lint, build,
  typecheck, and the full repository test matrix.
- Focused API and DB boundary tests passed, including malformed provider chunks,
  tool arguments, persisted events/messages, SSE frames, replay cursors,
  callback failures, and telemetry redaction.

## Exit gate

Close when the audit, focused tests, redaction evidence, and uncached validation
are attached. Keep Partial while any boundary lacks an owner or defined
malformed-input behavior. This task is now closed; dependent recovery work may
start at Task 005.
