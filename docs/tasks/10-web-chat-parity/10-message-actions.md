---
type: task
id: WEB-CHAT-10
title: Add web message copy and share actions
status: proposed
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - accessibility
estimate: S
assignee: unassigned
depends_on: []
blocks: []
---

# Add web message copy and share actions

Add per-message copy and share/download controls for eligible assistant
messages. Keep whole-conversation download separate from individual-message
actions.

## Acceptance criteria

- Copy reports success/failure accessibly.
- Share uses the supported browser share API with a download fallback.
- Actions are hidden or disabled for empty and streaming messages.
- Keyboard and screen-reader labels identify the message being acted on.

## Implementation update — 2026-08-24

- Added accessible copy and share actions for non-empty, non-streaming assistant messages.
- Copy reports its result through the action tooltip; share uses the browser share API and downloads a text fallback when unavailable.
- Added Storybook coverage through `AssistantActions`.
