---
type: task
id: CROSS-LINK-03
title: Implement Save as note and Discuss client flows
status: ready
priority: high
team: omiro
project: cross-linking
labels:
  - mobile
  - mutations
  - chat
  - notes
estimate: L
assignee: unassigned
depends_on:
  - CROSS-LINK-02
blocks:
  - CROSS-LINK-04
---

# Implement Save as note and Discuss client flows

1. Add `useCreateLink` and the approved transaction/recovery behavior for creating an item plus its link.
2. In `ChatDetailScreen`, add the approved toolbar action. Export the full conversation as plain text with role labels, create a note, create the link, invalidate both item queries and the inbox, then show the approved toast with View navigation.
3. In `NoteDetailScreen`, add Discuss. Create a chat titled from the note, pass the note text as hidden AI context exactly as the API contract defines, create the link, and open the chat immediately.
4. Prevent duplicate taps and preserve source content if either operation fails.
5. Use test IDs for actions, pending states, toast View actions, and linked navigation.

Do not alter chat/note entity models in this ticket; the join table owns general-purpose links.
