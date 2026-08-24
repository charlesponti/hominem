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

## Implementation update — 2026-08-24

- Added reusable `apps/web/app/components/chat/chat-message.tsx` to own `Message`/`MessageContent` composition.
- The component now renders assistant speech controls and tool-call previews, statuses, and approval actions.
- Added focused component tests and Storybook stories for user, assistant, and tool-approval states.
- Reasoning, referenced-note labels, timestamps, failed/interrupted presentation, and debug gating remain open gaps for this task.
