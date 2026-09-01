---
title: 'Complete functional chat shipping evidence'
status: 'Open'
priority: 'high'
labels: [chat, e2e, browser, ios, evidence]
depends_on: [004-typed-generation-boundaries.md, 005-generation-crash-recovery.md, 006-generation-cursor-recovery.md, 007-client-convergence.md, 008-generation-observability.md, 010-remove-generation-compatibility.md]
blocks: []
estimated_size: 'L'
---

## Current evidence

Focused Chat, DB, and API suites are green: 163 Chat tests, 26 DB tests, and
250 API tests in the latest runs. A prior full monorepo gate passed 26/26
projects. Browser playbook scenarios B-001 and B-002 have been observed in the
integrated browser; no iOS simulator evidence has been recorded, and the
latest full gate must be rerun after the final boundary changes.

## Remaining release gate

Boundary: production API ↔ Web browser and API ↔ Apple-only Omiro simulator.

Use [`../chat-browser-playbook.md`](../chat-browser-playbook.md) for the Web
scenario order, reset rules, assertions, and evidence record. Map the same
scenario IDs to the corresponding Omiro flow where applicable.

Run send, start, regenerate, confirmation approval/rejection, cancellation,
provider/tool failure and retry, reconnect, terminal replay, and fresh launch
for both clients. Record observed phase, durable cursor, message/tool state,
terminal outcome, correlation identifiers, environment, revision, and artifacts
using `docs/evidence.md`. Run scoped tests, typechecks, builds, lint,
formatting, and the full `pnpm run check` after implementation is complete.
Re-run the exact production search for `runChatGeneration`,
`runCompletionWithTools`, `ChatStreamEvent`, `LegacyChatStreamEvent`, and
`ChatsStartStreamEvent` as part of the release record.

## Exit gate

Task 011 is complete only when every named flow has a browser artifact and an
Apple-only iOS simulator artifact, automated API/replay/client/end-to-end tests
pass, the exact legacy search is clean, and the evidence record includes
environment, revision, observed state, correlation data, artifacts, and every
unverified condition. Only then may user-facing capability claims be changed.
