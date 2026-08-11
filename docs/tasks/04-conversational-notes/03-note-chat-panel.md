---
type: task
id: CONVERSATIONAL-NOTES-03
title: Build the note-owned chat panel
status: ready
priority: high
team: omiro
project: conversational-notes
labels:
  - mobile
  - notes
  - chat
  - performance
estimate: XL
assignee: unassigned
depends_on:
  - CONVERSATIONAL-NOTES-02
---

# Build the note-owned chat panel

Add `ChatPanel` using the existing message list, composer, stream/cache hooks, and approved bottom-sheet primitive. It receives a note ID, opens from a bottom handle, preserves chat history and scroll position, and uses the server-created scoped chat. The note editor remains visible above the panel; keyboard avoidance, drag/dismiss, and reopen behavior must be deterministic.

Do not duplicate `ChatDetailScreen` toolbar/search/review UI. Pause or defer expensive note-editor work only where profiling proves it necessary. Add test IDs for handle, panel, composer, send, dismiss, and message list. Verify no independent inbox row is created for an owned scoped chat.
