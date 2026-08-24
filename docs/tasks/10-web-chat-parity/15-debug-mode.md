---
type: task
id: WEB-CHAT-15
title: Add web chat debug mode
status: proposed
priority: low
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - diagnostics
estimate: S
assignee: unassigned
depends_on:
  - WEB-CHAT-11
  - WEB-CHAT-12
blocks: []
---

# Add web chat debug mode

Add a local conversation debug toggle and render diagnostic message metadata
only when enabled. Keep sensitive content out of logs and preserve normal chat
presentation when disabled.

## Acceptance criteria

- Debug mode is opt-in and scoped to the active chat view.
- The toggle has an accessible name and state.
- Debug output does not alter persisted message content.
- Debug output is excluded from normal screenshots and default rendering.

