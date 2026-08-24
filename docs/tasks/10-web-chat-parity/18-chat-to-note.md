---
type: task
id: WEB-CHAT-18
title: Add chat-to-note transformation on web
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - notes
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
  - WEB-CHAT-12
blocks: []
---

# Add chat-to-note transformation on web

Add a conversation action that builds a note draft from the transcript, guards
against empty chats, carries the approved title/truncation metadata, and hands
off to an editable note surface.

## Acceptance criteria

- Empty conversations cannot be transformed.
- Draft title and transcript are preserved through navigation.
- Truncation is communicated to the user.
- Successful note creation invalidates or updates the relevant web list.

