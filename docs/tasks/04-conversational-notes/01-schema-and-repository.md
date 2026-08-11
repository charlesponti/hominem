---
type: task
id: CONVERSATIONAL-NOTES-01
title: Add note discussion and chat artifact persistence
status: ready
priority: urgent
team: database
project: conversational-notes
labels:
  - database
  - migration
  - repository
estimate: L
assignee: unassigned
depends_on:
  - CONVERSATIONAL-NOTES-00
  - CROSS-LINK-01
blocks:
  - CONVERSATIONAL-NOTES-02
---

# Add note discussion and chat artifact persistence

Add nullable ownership references for note-owned chats and chat-produced notes only after the approved lifecycle is recorded. Add repository DTOs and methods to create/find a note discussion, attach a summary artifact, and delete/unlink owned records according to the contract. Enforce ownership and one-to-one constraints at the database/repository boundary. Preserve existing independent chats and notes.

Use the approved Goose migration and codegen workflow. Test empty, attached, duplicate, deleted-owner, wrong-user, and transaction-rollback cases. Do not hand-edit generated database types.
