---
type: task
id: WEB-CHAT-14
title: Add web response-length settings
status: proposed
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - settings
estimate: S
assignee: unassigned
depends_on: []
blocks: []
---

# Add web response-length settings

Persist the short/medium/long response preference and include the selected
value in send and regeneration requests. Add a detail-level settings surface
with an explicit default and recoverable storage behavior.

## Acceptance criteria

- Medium is the default for a new browser profile.
- Selection survives reload and affects the next generation request.
- Invalid stored values fall back safely.
- Settings can be opened, changed, and dismissed without losing the draft.

