---
type: project-index
status: proposed
priority: high
team: chat
project: chat-message-regenerate
labels:
  - chat
  - ai
  - api
source: ../07-chat-message-regenerate.md
---

# Chat Message Regenerate

Regeneration is blocked until message-order semantics are approved. The implementation must reuse send-path usage accounting and streaming behavior; it must not create a second unmetered AI path.

## Delivery order

1. `CHAT-REGENERATE-00`: choose replacement vs truncate-forward semantics.
2. `CHAT-REGENERATE-01`: implement authorized server regeneration and usage accounting.
3. `CHAT-REGENERATE-02`: implement client streaming/cache behavior and wire the callback.
4. `CHAT-REGENERATE-03`: verify cancellation, failure, ordering, and limits.
