---
type: task
id: CONVERSATIONAL-NOTES-00
title: Approve conversational note ownership and lifecycle
status: blocked
priority: urgent
team: product
project: conversational-notes
labels:
  - product-decision
  - data-model
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CONVERSATIONAL-NOTES-01
  - CONVERSATIONAL-NOTES-02
---

# Approve conversational note ownership and lifecycle

Resolve the proposal's contradiction between `ON DELETE SET NULL` and cascade-deleting scoped chats. Decide whether `notes.chat_id` is the sole owner reference, whether a scoped chat appears in the inbox, whether a note may have more than one discussion, whether a summary note may be edited/deleted independently, and how `content_links` relates to direct ownership columns.

Define exact AI context boundaries, summary title/content format, retry behavior, and whether deleting a note deletes its scoped chat transactionally.

## Acceptance criteria

- Ownership, cardinality, deletion, visibility, and retry semantics are written here.
- Direct ownership versus general-purpose links is unambiguous.
- Downstream tickets do not choose cascade behavior independently.
