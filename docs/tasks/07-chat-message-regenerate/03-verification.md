---
type: task
id: CHAT-REGENERATE-03
title: Verify regeneration ordering and usage safety
status: ready
priority: high
team: chat
project: chat-message-regenerate
labels:
  - testing
  - ai
  - maestro
estimate: L
assignee: unassigned
depends_on:
  - CHAT-REGENERATE-02
---

# Verify regeneration ordering and usage safety

Test the last assistant response and a middle assistant response with later messages. Cover cancellation, model failure, retry, concurrent send/regenerate prevention, ownership failure, monthly-limit failure, and fresh-refetch consistency. Assert usage-event calls and limits in server tests. Add a Maestro flow that taps the real action, observes streamed output, and confirms the selected ordering semantics in the chat UI.

## Acceptance criteria

- No duplicate or orphaned messages remain after success, cancellation, or failure.
- Usage is counted once per accepted regeneration and never bypasses the monthly limit.
- The approved ordering behavior is verified against database/API state, not inferred from the optimistic UI.
