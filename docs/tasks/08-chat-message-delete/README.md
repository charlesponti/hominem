---
type: project-index
status: proposed
priority: medium
team: chat
project: chat-message-delete
labels:
  - chat
  - api
  - mobile
source: ../08-chat-message-delete.md
---

# Chat Message Delete

Deletion is blocked until the product owner defines the effect of deleting a middle message on subsequent conversation history and approves the storage cleanup contract.

## Delivery order

1. `CHAT-DELETE-00`: approve history and confirmation semantics.
2. `CHAT-DELETE-01`: implement repository deletion and dependent-record cleanup.
3. `CHAT-DELETE-02`: expose the typed delete RPC.
4. `CHAT-DELETE-03`: implement optimistic client deletion and wiring.
5. `CHAT-DELETE-04`: verify persistence, rollback, and storage cleanup.
