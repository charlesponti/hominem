---
type: project-index
status: proposed
priority: high
team: platform
project: conversational-notes
labels:
  - database
  - ai
  - notes
  - chat
source: ../04-conversational-notes.md
---

# Conversational Notes

This is a high-risk feature that depends on Cross-Linking for summary artifacts and ownership semantics.

## Delivery order

1. `CONVERSATIONAL-NOTES-00`: approve scoped-chat lifecycle and ownership model.
2. `CONVERSATIONAL-NOTES-01`: add schema/repository support.
3. `CONVERSATIONAL-NOTES-02`: implement discuss and summarize server workflows.
4. `CONVERSATIONAL-NOTES-03`: build the Note chat panel.
5. `CONVERSATIONAL-NOTES-04`: add summarize and linked-note UI.
6. `CONVERSATIONAL-NOTES-05`: add inbox preview and performance safeguards.
7. `CONVERSATIONAL-NOTES-06`: verify deletion, persistence, AI failure, and iPhone SE performance.

Requires CROSS-LINK-01/02 before link-producing work.
