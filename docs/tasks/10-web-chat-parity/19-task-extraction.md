---
type: task
id: WEB-CHAT-19
title: Add chat task extraction and review on web
status: proposed
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

