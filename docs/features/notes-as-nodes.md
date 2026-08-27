---
status: agreed
slug: notes-as-nodes
title: Notes as Nodes
visibility: private
updated: 2026-08-26T23:00:00.000Z
type: note
---

# Notes as Nodes

Notes should stop pretending to be markdown files and behave like first-class
nodes in the same graph as chats, people, places, and possessions. This
document is the working model for that shift. It starts from what is actually
live in the schema today, names the dead weight already removed, and records
the decisions that turn notes into real nodes.

## Where notes stand after the cleanup

`app.notes` is down to the live surface — every column is read or written by
production code:

| column | live use | status |
| --- | --- | --- |
| `id`, `owner_userid`, `createdat`, `updatedat` | ownership + ordering (all surfaces) | kept |
| `title`, `content` | the note itself (omiro editor, web, chat propose/save) | kept |
| `excerpt` | derived 240-char preview; search results, inbox lists | kept |
| `source` | was the **memories** discriminator (`source='memory'`) | **dropped** — replaced by `kind` (see Decisions) |
| `kind` | `'note' \| 'memory'` — typed node identity | added |

Supporting relations, all live:

- `app.note_files` — attachments (create/update sync, load)
- `app.vector_documents` — per-note embeddings (`embedding-generation` worker)
- `app.chat_sources` — the note↔chat ownership edge
- `app.tags` / `app.tag_assignments` — tags attach to **people, places,
  possessions, and now notes** (see Decisions)

### What was killed (20260728 → 20260827)

The markdown-file envelope is gone: `note_versions`, `note_shares`,
`note.parent_note_id` / `current_version_id` / `is_locked` / `archived_at`,
`tag_aliases`, `spaces`/`space_*`, `entities`, `entity_links`,
`task_assignments`, `chats.note_id` / `source` / `metadata`,
`chat_messages.referenced_note_ids`, `tag_assignments.assignment_period`,
`notes.source`, and the write-only tag columns (`tags.description`,
`tags.icon`, `tags.created_by_userid`,
`tag_assignments.assigned_by_userid`, `tag_assignments.confidence`).

## The node model

A note as a node = identity + content + edges. Identity and content are
already minimal. The edges are what make it a node, and the edge machinery
already exists and is live — the missing pieces have now been decided:

```
                ┌──────────────┐
                │    chats      │◄── chat_sources ──┐
                └──────────────┘                    │
                                                     ▼
    people ──┐    notes ── (new)          ┌──────────────────────┐
    places ──┼── tag_assignments ───────►│        note          │
 possessions┘                            │  id, kind, title,    │
    (agent + user tags)                  │  content             │
                                        └──────────────────────┘
          files ── note_files ──────────►▲        │
          vectors ── vector_documents ──►│        ▼
                                          │   (next) content_links — notes ↔ notes,
                                          │   notes ↔ people/places/chats, wikilinks
```

## Decisions (recorded)

### 1. Node kind is a typed column, not a string sentinel — DECIDED

Add `app.notes.kind` (`'note' | 'memory'`, `NOT NULL DEFAULT 'note'`, CHECK),
backfill `kind = 'memory' WHERE source = 'memory'`, switch the memory MCP/RPC
surfaces to filter and assert on `kind`, then **drop `source`**.

Why: `source='memory'` was a discriminant hiding in a free-text provenance
column. Kind is typed identity; tags stay organizational. A one-value
provenance column is the file-era thinking this model removes.

Rejected: system-owned `#memory` tag (kind becomes soft and detachable — a
user could untag it and change what the node *is*), and keeping `source` as a
free-text channel (untyped, unfilterable, and after the migration it has zero
values).

### 2. Notes join the tag graph — DECIDED

Add `notes` to `ENTITY_TABLE_MAP` (`services/api/src/application/
tags.service.ts`) and `entityTypeSchema`. Notes become taggable through the
same `tag_assignments` machinery as people/places/possessions — MCP
`tag_entity`/`entity_tags` and the composer hashtag surface work for notes
with zero schema change.

- User-facing hashtags and agent-assigned tags (with `assignment_source`
  provenance) are both in scope.
- Confirmation-preview display name for a note = `title`, falling back to
  `(untitled note)`.

### 3. Content-link semantics — DECIDED (unblocks CROSS-LINK-00)

`app.content_links` as planned in `docs/tasks/02-cross-linking`, with these
semantics:

- **Cardinality:** many-to-many. A note can link to many targets; a target can
  be linked from many sources. One link per ordered
  (source_kind, source_id, target_kind, target_id) pair.
- **Creation:** idempotent — the same pair created twice yields the existing
  link, not a duplicate.
- **Deletion:** explicit link deletion only. **No cascade FKs** — a deleted
  target's links remain queryable and render as a missing/deleted target,
  exactly as CROSS-LINK-01 specifies.
- **Drivers:** both user- and agent-driven links (sources recorded for
  provenance, like `assignment_source`).
- The **build** is the cross-linking project in the work tracker
  (CROSS-LINK-01..04). This decision unblocks its `00` product ticket.

### 4. Write-only tag columns — DECIDED: strip and drop

`tags.description`, `tags.icon`, `tags.created_by_userid`,
`tag_assignments.assigned_by_userid`, `tag_assignments.confidence` are
written by the finance Copilot import pipeline and `categories.ts` but read by
nothing. Strip the vestigial writes from `packages/finance` (import
`findOrCreateTag`, `createTag`, and the integration test), then drop the
columns plus their dependent FKs/check/partial index in one migration.

Kept: `tags.color` (finance UI reads it), `slug`/`path` (live filters),
`archived_at`, `removed_at`, `assignment_source` (live filters and
provenance).

## What "done" looks like

- `app.notes` carries only live columns; kind is a real discriminator.
- Notes are taggable through the same graph as people/places/possessions.
- Notes have typed edges to notes, chats, and files via `content_links`.
- The finance import pipeline no longer writes columns nothing reads.