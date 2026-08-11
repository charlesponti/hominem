---
type: task
id: CROSS-LINK-00
title: Approve content-link lifecycle and creation semantics
status: blocked
priority: urgent
team: product
project: cross-linking
labels:
  - product-decision
  - data-model
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CROSS-LINK-01
  - CROSS-LINK-02
  - CROSS-LINK-03
---

# Approve content-link lifecycle and creation semantics

Define whether links are one-to-one or allow multiple targets, whether Save as note/Discuss are idempotent or create a new item each time, exact duplicate behavior, linked-item deletion behavior, and whether a deleted target renders as `Deleted item` or disappears. Confirm role-labeled export text (`You:` / `Omiro:`), note title generation, chat title generation, and link-banner copy.

## Acceptance criteria

- Cardinality and duplicate behavior are explicit.
- Deletion/orphan behavior is explicit.
- Creation flows specify transaction boundaries and recovery when item creation succeeds but link creation fails.
- API response fields needed by inbox and detail screens are listed.
