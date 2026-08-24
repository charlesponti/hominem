---
type: task
id: WEB-CHAT-11
title: Match Omiro message presentation states on web
status: proposed
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - ui
estimate: M
assignee: unassigned
depends_on: []
blocks: []
---

# Match Omiro message presentation states on web

Render the available message fields consistently: reasoning, referenced notes,
tool calls, timestamps, failed/interrupted states, and debug details. Reuse the
existing AI element primitives where appropriate.

## Acceptance criteria

- Persisted reasoning is visible through the web reasoning component.
- Referenced notes and timestamps are rendered with accessible labels.
- Failed, interrupted, and streaming states are visually distinct.
- Debug details are hidden unless the approved debug mode is active.

