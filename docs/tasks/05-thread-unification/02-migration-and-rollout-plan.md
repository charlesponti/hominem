---
type: task
id: THREAD-V2-02
title: Design thread migration rollback and rollout
status: ready
priority: urgent
team: platform
project: thread-unification
labels:
  - migration
  - rollout
  - data-integrity
estimate: XL
assignee: unassigned
depends_on:
  - THREAD-V2-01
blocks:
  - THREAD-V2-04
---

# Design thread migration rollback and rollout

Create a dry-run migration plan from chats/notes to threads/messages/documents. Define source-to-target mapping, row-count/content/timestamp/link checksums, malformed-row handling, rerun/idempotency behavior, backup requirements, rollback procedure, and post-migration reconciliation.

Design the proposed parallel rollout: versioned `/api/v2/threads`, feature flag, dual-read/write rules, beta cohort, observability, cutover, old-table retention, and deprecation timeline. Include exact rollback triggers and who can execute them. Do not run a production migration as part of this task.

## Acceptance criteria

- Dry run can prove zero loss for messages, documents, links, timestamps, and ownership.
- Rollback restores the old API/client/database state without relying on an untested manual edit.
- Dual-write consistency and failure recovery are specified.
