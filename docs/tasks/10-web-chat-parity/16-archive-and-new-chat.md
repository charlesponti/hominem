---
type: task
id: WEB-CHAT-16
title: Complete web archive and new-chat detail actions
status: complete
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - navigation
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-12
blocks: []
---

# Complete web archive and new-chat detail actions

Expose archive from the active conversation and chat list rows, remove archived
items from active navigation according to the approved optimistic contract, and
add the detail-toolbar action for creating a new chat.

## Acceptance criteria

- Archive has confirmation or the approved direct-action behavior.
- Successful archive routes away from the archived conversation.
- Archive failure restores active-list state.
- New chat from detail disables while pending and navigates only after creation.

## Implementation update — 2026-08-24

- Added pending-safe new-chat creation to the detail toolbar; navigation occurs after the create response succeeds.
- Added archive actions to the full chat list and retained the detail archive redirect.
- Made chat-list archive optimistic with query-cache rollback on failure and reconciliation after completion.

## Validation update — 2026-08-24

- Focused archive hook, conversation-action, and chat-message tests pass.
- Archive failure rollback and debug/new-chat control states are covered.
- Web formatting and typecheck pass.
