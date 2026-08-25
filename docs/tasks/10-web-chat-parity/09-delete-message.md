---
type: task
id: WEB-CHAT-09
title: Wire web message deletion
status: completed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - mutation
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
blocks: []
---

# Wire web message deletion

Resolve the approved delete semantics, replace the no-op `deleteMessage`
function, and expose the action from the message presentation with explicit
confirmation and rollback behavior.

## Acceptance criteria

- The approved eligible roles and ownership checks are enforced.
- Destructive confirmation names the message action clearly.
- Failed deletion restores the message and surfaces recovery copy.
- No unrelated messages or chat metadata are changed.

## Implementation update — 2026-08-24

- Added the typed `DELETE /api/chats/:id/messages/:messageId` route with chat ownership enforcement.
- Added transactional repository deletion for the selected user message and all later messages.
- Added optimistic web removal, exact rollback, invalidation, and duplicate-request protection.
- Added an accessible confirmation dialog and failure recovery copy.
- Added retryable cleanup for message-owned generated audio; reusable uploaded attachments remain untouched.

## Validation update — 2026-08-24

- Repository deletion tests pass for truncation and wrong-user rejection.
- API route tests pass for successful deletion and ownership rejection.
- Web component and hook tests pass for confirmation, failure recovery, optimistic removal, and rollback.
- Browser verification confirmed the destructive confirmation copy and cancellation path without mutating the authenticated chat.
