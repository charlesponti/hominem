---
type: task
id: CHAT-EDIT-04
title: Verify chat message edit end to end
status: ready
priority: high
team: chat
project: chat-message-edit
labels:
  - testing
  - maestro
  - integration
estimate: M
assignee: unassigned
depends_on:
  - CHAT-EDIT-03
---

# Verify chat message edit end to end

## Coverage

- repository success and authorization tests;
- RPC validation and ownership tests;
- client optimistic update, rollback, and cache reconciliation tests;
- Maestro flow: open chat, edit own user message, submit, confirm updated text, reload/refetch, confirm persistence;
- verify edit is absent for assistant messages, streaming messages, and messages owned by another user;
- verify keyboard, modal cancel, empty-content validation, pending, and error states.

## Acceptance criteria

- The live mobile flow proves the action is reachable and the persisted result is visible after refetch.
- No test relies only on rendered button existence.
- Existing chat send and message action flows still pass.
- Any unavailable backend or simulator state is reported as unproven.
