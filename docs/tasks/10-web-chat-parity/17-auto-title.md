---
type: task
id: WEB-CHAT-17
title: Add automatic chat title updates on web
status: complete
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
estimate: S
assignee: unassigned
depends_on:
  - WEB-CHAT-03
blocks: []
---

# Add automatic chat title updates on web

After the first meaningful user message, normalize and persist a title only
when the chat still has the default title. Update active, sidebar, and list
caches consistently and preserve custom titles.

## Acceptance criteria

- Blank and default-only messages do not create poor titles.
- Custom titles are never overwritten.
- Optimistic title updates roll back or invalidate on failure.
- Sidebar and list views show the same title after a fresh read.

## Implementation update — 2026-08-24

- Added meaningful-message title normalization that ignores blank and default-only messages.
- Added optimistic title mutation with rollback and list-cache reconciliation while preserving custom titles.
- Wired the first accepted message in chat detail to update a still-default chat title.

## Validation update — 2026-08-24

- Title normalization and cache rollback tests pass.
- Web formatting and typecheck pass.
