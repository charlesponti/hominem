---
type: task
id: WEB-CHAT-10
title: Add web message copy and share actions
status: completed
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

## Validation update — 2026-08-24

- Web formatting and lint pass.
- Focused chat component tests pass.

## Completion update — 2026-08-24

- Copy success and failure states are announced through accessible labels and tooltips.
- Native share success/failure states are announced accessibly.
- Unsupported browsers use the text-file download fallback.
- Empty and streaming assistant messages do not expose copy/share actions.
- Focused web component tests pass: 14 tests across message-action and deletion coverage.
- Browser verification confirmed the copy action in the authenticated chat; share availability remains browser-dependent and is covered by deterministic component tests.
