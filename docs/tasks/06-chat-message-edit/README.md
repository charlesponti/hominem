---
type: project-index
status: proposed
priority: medium
team: chat
project: chat-message-edit
labels:
  - chat
  - api
  - mobile
source: ../06-chat-message-edit.md
---

# Chat Message Edit

## Delivery order

1. `CHAT-EDIT-01`: repository authorization and update.
2. `CHAT-EDIT-02`: RPC route and contract.
3. `CHAT-EDIT-03`: optimistic client mutation and screen wiring.
4. `CHAT-EDIT-04`: failure, authorization, and UI verification.

Use the existing edit modal and message action plumbing. The feature is not complete until `ChatDetailScreen` supplies the missing callback.
