---
type: task
id: WEB-CHAT-20
title: Add linked note discussion flows on web
status: complete
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - notes
  - links
estimate: L
assignee: unassigned
depends_on:
  - WEB-CHAT-00
  - WEB-CHAT-18
blocks: []
---

# Add linked note discussion flows on web

Extend the existing note mention and `noteId` seed behavior into a complete
note-owned discussion lifecycle: create/open the scoped chat, show the linked
note context, expose approved summarize behavior, and preserve ownership and
navigation links.

## Acceptance criteria

- A note can open its discussion with the approved context injected.
- The chat identifies its linked note without recursive navigation.
- Summarize creates an editable linked note with pending/error/retry states.
- Note, chat, and list deletion behavior follows the approved ownership contract.

## Implementation update — 2026-08-24

- Added linked-note context presentation when a chat is opened with `noteId`.
- Reused the editable note draft handoff for linked-note summaries, preserving the source note ID and communicating the relationship in the editor.
- Kept linked-note context display-only to avoid recursive navigation from chat back into the same discussion.

## Validation update — 2026-08-24

- Linked transcript draft, task extraction, chat action, formatting, and typecheck checks pass.
