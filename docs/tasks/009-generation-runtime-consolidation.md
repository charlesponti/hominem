---
title: 'Consolidate the production generation runtime'
status: 'Implemented'
priority: 'high'
labels: [chat, api, architecture, refactor]
depends_on: [008-generation-observability.md]
blocks: [010-remove-generation-compatibility.md]
estimated_size: 'XL'
---

## Outcome

ChatGenerationService owns send, start, regenerate, confirmation response,
replay, and cancellation. The prepared-generation engine owns provider/tool
execution, event persistence/publication, message commits, usage, embeddings,
cancellation, and terminal handling.

## Scope

In scope: application-service ownership and RPC adapters. Out of scope:
recovery policy, client convergence, observability completion, and release
evidence.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Move generation orchestration | API application services | Task 008 | service tests | All generation operations run through ChatGenerationService. |
| W-002 | Simplify RPC adapters | chat RPC routes | W-001 | route tests | Handlers authenticate, validate, invoke one operation, and adapt canonical SSE. |
| W-003 | Extract adjacent workflows | speech/message services | W-002 | focused service tests | Speech and message deletion use application services where coordination is required. |
| W-004 | Verify ownership boundary | API production code | W-003 | exact search + full validation | Routes contain no provider, repository, MCP, bus, or lifecycle orchestration. |

## Acceptance criteria

- [x] AC-001: Service and route ownership matches the canonical runtime boundary.
- [x] AC-002: Focused API tests and the production ownership search pass.
- [x] AC-003: Recovery, convergence, observability, and release evidence are not claimed by this task.

## Evidence

The service/route tests and production ownership search are the authoritative
artifacts. Current runtime evidence is summarized in the change record.

## Exit gate

Implemented. Do not reopen this task for later recovery or release evidence;
those belong to their named tasks.
