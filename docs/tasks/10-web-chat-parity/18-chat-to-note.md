---
type: task
id: WEB-CHAT-18
title: Add chat-to-note transformation on web
status: complete
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

## Implementation update — 2026-08-24

- Added a transform action that serializes non-empty chat messages with speaker labels into a session-backed draft.
- Added `/notes/new` as an editable title/content surface using the existing optimistic note creation hook.
- Added a 12,000-character transcript limit with visible truncation messaging and preserved title metadata.

## Validation update — 2026-08-24

- Draft construction, empty-content handling, and truncation tests pass.
- Web formatting and typecheck pass.
