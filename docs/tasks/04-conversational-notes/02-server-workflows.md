---
type: task
id: CONVERSATIONAL-NOTES-02
title: Implement discuss and summarize server workflows
status: ready
priority: urgent
team: api
project: conversational-notes
labels:
  - api
  - ai
  - transactions
estimate: XL
assignee: unassigned
depends_on:
  - CONVERSATIONAL-NOTES-01
  - CROSS-LINK-02
blocks:
  - CONVERSATIONAL-NOTES-03
  - CONVERSATIONAL-NOTES-04
---

# Implement discuss and summarize server workflows

Add typed endpoints for note discuss and chat summarize using shared schemas and one application service per workflow. Discuss must create the scoped chat, attach ownership, inject note content as hidden context, and return the chat ID. Summarize must authorize the chat, produce the structured editable note through the existing AI boundary, attach ownership, and create the approved content link transactionally.

Extend detail endpoints with only the optional IDs/titles required by the client and add optional inbox `chatPreview` metadata. Define behavior for empty notes/chats, AI failure, link failure, duplicate requests, monthly usage, and deletion according to CONVERSATIONAL-NOTES-00. Add integration tests for every branch.
