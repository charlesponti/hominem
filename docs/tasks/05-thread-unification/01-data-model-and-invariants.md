---
type: task
id: THREAD-V2-01
title: Design and approve the unified thread data model
status: ready
priority: urgent
team: architecture
project: thread-unification
labels:
  - data-model
  - architecture
  - product-decision
estimate: L
assignee: unassigned
depends_on:
  - THREAD-V2-00
blocks:
  - THREAD-V2-02
  - THREAD-V2-04
---

# Design and approve the unified thread data model

Produce a schema proposal for threads, messages, documents, ownership, archive/delete, timestamps, links, attachments, and derived mode. Define whether messages/documents are nullable, how titles are derived, how `updatedAt` is computed, how system/tool messages map, and how existing `content_links` maps to thread links.

Specify invariants for conversational, documentary, and hybrid modes; allowed empty states; ownership; deletion; idempotency; ordering; and transaction boundaries. Include example rows for every migration case: chat only, note only, linked chat/note, archived item, deleted target, and malformed legacy data.

## Acceptance criteria

- The schema and invariants are approved by product, API, database, and mobile owners.
- No table is created before this document is approved.
- The model addresses every dependency found by THREAD-V2-00.
