---
type: task
id: WEB-CHAT-06
title: Add retry for failed and interrupted responses
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - recovery
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-04
blocks: []
---

# Add retry for failed and interrupted responses

Render retry actions for failed user sends and interrupted assistant replies.
Retain the last valid input or target message, prevent concurrent retry and
send operations, and reconcile the result through the shared stream lifecycle.

## Acceptance criteria

- Failed user rows can be retried without duplicating successful messages.
- Interrupted assistant replies can be retried from the approved history.
- Retry is disabled while another generation is active.
- Failure after retry remains recoverable and preserves the correct state.

## Implementation update — 2026-08-24

- Added an explicit retry action to the composer error state.
- Failed sends before durable acceptance preserve the draft and attachment context for retry.
- Concurrent sends and retries are blocked while a generation is preparing, streaming, or stopping.
- Durable interrupted-response retry and assistant regeneration remain separate follow-up work for `WEB-CHAT-07`.
- Added Storybook coverage for retryable errors, retrying state, offline preservation, and upload failure recovery.
