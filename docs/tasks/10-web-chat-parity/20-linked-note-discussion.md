---
type: task
id: WEB-CHAT-20
title: Add linked note discussion flows on web
status: proposed
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

