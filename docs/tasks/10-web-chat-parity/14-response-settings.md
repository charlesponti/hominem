---
type: task
id: WEB-CHAT-14
title: Add web response-length settings
status: complete
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

## Implementation update — 2026-08-24

- Added a hydration-safe `useResponseLength` preference with medium as the default and safe fallback for invalid stored values.
- Added a dismissible response settings panel and wired the preference into new-chat sends, chat sends, and regeneration requests.
- Added focused component tests and Storybook coverage for short, medium, and long settings.
- Added hook coverage for the new-profile default, valid preference restoration, and invalid-value fallback.

## Validation update — 2026-08-24

- Web formatting and lint pass.
- Focused response-settings and connectivity tests pass.
- Full web typecheck, build, and tests pass.
