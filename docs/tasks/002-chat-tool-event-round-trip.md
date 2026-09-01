---
title: 'Prove chat tool event round trips'
status: 'Implemented'
priority: 'high'
labels: [chat, events, clients]
depends_on: [001-chat-domain-contract.md]
blocks: [005-generation-cursor-recovery.md, 006-client-convergence.md]
estimated_size: 'M'
---

## Outcome

The shared chat package reconstructs fragmented provider tool calls and reduces
durable tool and confirmation events. One shared fixture now covers tool
request, successful execution, confirmation rejection, retry, failed execution,
commit, and duplicate delivery across persistence, replay, Web, and Omiro.

## Evidence gate

Task 002 is complete. The gate passed with:

- Shared fixture tests in Chat, DB, API replay, Web fetch/SSE, and Omiro XHR.
- Field-level assertions for call IDs, tool names, arguments, confirmation and
  execution state, terminal state, and durable cursor.
- Existing generation-service tests proving failed persistence does not publish
  a fabricated durable event.
- Focused validation: Chat 13 tests, DB 17 tests, API replay/service/route 9
  tests, Web SSE 5 tests, and Omiro XHR 18 tests; Chat, DB, API, Web, and Omiro
  typechecks pass.

The full Web suite has unrelated jsdom `localStorage` setup failures in this
environment; the changed Web adapter test passes and that environment issue is
not treated as task evidence.
