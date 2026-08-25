---
type: task
id: WEB-CHAT-19
title: Add chat task extraction and review on web
status: complete
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - tasks
  - ai
estimate: L
assignee: unassigned
depends_on:
  - WEB-CHAT-12
blocks: []
---

# Add chat task extraction and review on web

Add the chat task-extraction action, pending review surface, accept/reject
behavior, creation result, error/retry state, and list invalidation.

## Acceptance criteria

- Extraction is unavailable while the conversation is empty or already busy.
- Proposed tasks are reviewable before persistence.
- Accept and reject are idempotent and recoverable after failure.
- The task list reflects accepted tasks without a full-page reload.

## Implementation update — 2026-08-24

- Added a busy/empty-safe task extraction action to chat detail.
- Added a review surface with per-task selection, idempotent rejection, accept, and retry states.
- Accepted tasks use the existing batch endpoint and invalidate the task list query.

## Validation update — 2026-08-24

- Web typecheck, formatting, and focused chat/task tests pass.
