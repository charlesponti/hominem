---
type: task
id: WEB-CHAT-11
title: Match Omiro message presentation states on web
status: complete
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

- The reusable `ChatMessage` component owns `Message`/`MessageContent` composition, speech controls, tool-call previews, and approval actions.
- Added persisted reasoning, referenced-note chips, accessible timestamps, interrupted/failed banners, and opt-in debug details to `ChatMessage`.
- Extended `ChatMessageView` with transient failed/error presentation state while keeping debug details disabled by default.
- Added an explicit accessible presentation state for complete, streaming, failed, and interrupted messages; streaming now shows the in-message Thinking indicator used by Omiro.
- Normalized non-user message roles to the assistant presentation so tool/system records cannot render as user bubbles.
- Added focused tests and Storybook coverage for the presentation states.

## Validation update — 2026-08-24

- Web formatting and lint pass.
- Focused `chat-message.test.tsx` suite passes: 13 tests.
- Full web typecheck, lint, formatting, and component tests pass.
