---
type: task
id: CHAT-DELETE-04
title: Verify message deletion and storage safety
status: ready
priority: high
team: chat
project: chat-message-delete
labels:
  - testing
  - maestro
  - storage
estimate: M
assignee: unassigned
depends_on:
  - CHAT-DELETE-03
---

# Verify message deletion and storage safety

Cover first, middle, and last deletion; each approved role; confirmation cancel/confirm; pending; API failure rollback; fresh refetch; subsequent send history; audio/file/tool-call cleanup; wrong-user rejection; and streaming-state protection. Add a Maestro flow that deletes a real message and confirms the resulting chat state after reopening. Verify storage state directly when the cleanup contract requires it.

## Acceptance criteria

- The UI, API, database, and storage outcomes agree.
- No orphaned dependent records or storage objects remain.
- The approved middle-message history behavior is proven with a later send.
- Existing send, edit, and regenerate actions remain intact.
