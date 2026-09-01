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

`ChatGenerationService` owns send, start, regenerate, confirmation response,
replay, and cancellation. Its prepared-generation engine owns provider/tool
execution, event persistence/publication, message commits, usage, embeddings,
cancellation, and terminal handling. Speech and message deletion have
application services for coordinated workflows.

Generation RPC handlers authenticate, validate, invoke one service operation,
and adapt the canonical iterable through shared SSE behavior. Resource CRUD
routes remain direct repository adapters where no multi-resource workflow is
coordinated.

## Evidence

- `services/api/src/application/chat-generation.service.ts` and its tests.
- `chat-speech.service.ts` and `chat-message.service.ts` with focused tests.
- Split chat RPC route family and route tests.
- Latest focused API run: 50 files, 250 tests passed.

## Exit gate

This task is recorded as implemented from earlier work. Its gate is the
application-service and route evidence above plus a clean production search
showing no route-owned provider, repository, MCP, bus, or generation lifecycle
orchestration. Recovery, convergence, observability, and shipping evidence do
not count as satisfied by this extraction.
