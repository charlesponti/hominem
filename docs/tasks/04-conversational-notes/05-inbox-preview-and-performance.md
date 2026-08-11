---
type: task
id: CONVERSATIONAL-NOTES-05
title: Render discussion previews and tune panel performance
status: ready
priority: medium
team: omiro
project: conversational-notes
labels:
  - inbox
  - performance
estimate: M
assignee: unassigned
depends_on:
  - CONVERSATIONAL-NOTES-02
  - CONVERSATIONAL-NOTES-03
---

# Render discussion previews and tune panel performance

Extend `InboxStreamItem` for note items with optional `chatPreview` containing message count and latest-message snippet. Render the nested preview only when a discussion exists, keep the main note tap unchanged, and add a deterministic deep-link action that opens the note with the panel visible. Truncate preview text without changing the API value and provide accessible labels.

Profile note editing with the panel closed/open on the smallest supported iPhone. Use FlashList and lazy mounting as approved by evidence; do not add speculative memoization or disable editor behavior without a measured reason.
