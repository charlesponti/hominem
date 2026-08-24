---
type: task
id: WEB-CHAT-12
title: Add the web chat conversation action surface
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - ui
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
  - WEB-CHAT-10
  - WEB-CHAT-13
blocks: []
---

# Add the web chat conversation action surface

Add a detail-level toolbar/menu that owns search, response settings, debug,
transform actions, archive, and new-chat navigation. Keep unavailable actions
disabled or absent according to the approved contract.

## Acceptance criteria

- The action surface is available from chat detail and keyboard accessible.
- Pending actions disable only the affected control.
- Missing conversations do not expose actions that cannot succeed.
- Each action delegates to a focused hook rather than a monolithic controller.

## Implementation update — 2026-08-24

- Added a keyboard-accessible conversation toolbar to chat detail with search, new-chat, and archive actions.
- Wired archive through the focused `useArchiveChat` mutation and returned users to the chat-first home after success.
- Kept response settings, debug mode, and conversation transforms visibly disabled until their dedicated tasks and product decisions are complete.
- Added Storybook and focused component coverage for ready, searching, and archiving states.

## Validation update — 2026-08-24

- Web formatting and lint pass.
- Focused conversation-action tests pass.
- Full web typecheck remains blocked only by existing `.storybook/main.ts` typing errors.
