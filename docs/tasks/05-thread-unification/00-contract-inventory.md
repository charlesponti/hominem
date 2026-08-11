---
type: task
id: THREAD-V2-00
title: Inventory chat and note contracts before unification
status: ready
priority: urgent
team: architecture
project: thread-unification
labels:
  - discovery
  - architecture
  - migration
estimate: L
assignee: unassigned
depends_on: []
blocks:
  - THREAD-V2-01
---

# Inventory chat and note contracts before unification

Trace every current chat/note table, repository method, API route, RPC type, client hook, route/deep link, cache key, analytics event, attachment/file relation, archive/delete flow, search path, AI context path, empty state, onboarding path, and test. Produce a matrix with owner file, input/output contract, persistence behavior, and migration impact.

Use code search and existing architecture docs. Do not infer completeness from the proposal's `What goes away` list. The inventory must identify features that would regress if kind branching disappeared.

## Acceptance criteria

- Every current chat/note dependency has an owner and migration disposition.
- Existing deep-link and external API compatibility requirements are listed.
- Unknown or ambiguous dependencies are marked for investigation, not silently omitted.
