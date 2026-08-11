---
type: task
id: CONVERSATIONAL-NOTES-04
title: Add chat summarize action and linked artifact UI
status: ready
priority: high
team: omiro
project: conversational-notes
labels:
  - mobile
  - ai
  - chat
  - notes
estimate: L
assignee: unassigned
depends_on:
  - CONVERSATIONAL-NOTES-02
  - CROSS-LINK-04
---

# Add chat summarize action and linked artifact UI

Add the approved `Summarize` action to the existing chat toolbar menu. Use `useSummarizeChat(chatId)`, show pending/error/retry states, update the chat banner after success, and provide the approved View navigation to the editable note. Render the linked note title in `ChatDetailScreen` without recursive link expansion. Preserve existing search, review, archive, and message actions.

Test that AI failure leaves the chat unchanged and that a successful summary is editable and independently navigable.
