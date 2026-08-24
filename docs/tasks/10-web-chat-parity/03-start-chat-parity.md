---
type: task
id: WEB-CHAT-03
title: Match accepted-message start-chat behavior on web
status: completed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - streaming
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-02
blocks: []
---

# Match accepted-message start-chat behavior on the chat-first home

Use the start-chat stream for a first submission from the chat-first home
composer. Seed the active chat and accepted user message before navigation,
then reconcile the committed assistant response and invalidate the relevant
list queries.

## Acceptance criteria

- A first message is not lost when navigation occurs.
- Navigation occurs only after the accepted durable user message event.
- A committed assistant response appears in the new chat.
- Failure before acceptance restores the draft and leaves no orphan route.

## Implementation update — 2026-08-24

- Implemented `useStartChat` with accepted-message, committed-response, abort, and query-cache reconciliation behavior.
- Wired the chat-first home route to the start-chat stream and durable chat navigation.
- Added hook tests for event ordering, generation IDs, request signals, and committed responses.
- Browser verification confirmed new-chat navigation, first-message submission, and streamed response completion.
