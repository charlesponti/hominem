---
type: task
id: CONVERSATIONAL-NOTES-06
title: Verify conversational notes lifecycle and performance
status: ready
priority: urgent
team: platform
project: conversational-notes
labels:
  - integration
  - maestro
  - performance
estimate: XL
assignee: unassigned
depends_on:
  - CONVERSATIONAL-NOTES-03
  - CONVERSATIONAL-NOTES-04
  - CONVERSATIONAL-NOTES-05
---

# Verify conversational notes lifecycle and performance

Verify note discussion creation, message persistence, panel dismiss/reopen, note editing while open, summarize success/failure/retry, linked navigation, inbox preview, note deletion with scoped chat, chat deletion with artifact, duplicate requests, ownership failures, AI/usage failures, refresh, and deep links. Assert database ownership/link state and API state, not only rendered UI.

Run Maestro flows on the booted iPhone simulator and collect screenshots for closed/open/keyboard/dismissed states. Measure the smallest supported device for editor and panel jank. Record unproven states explicitly.
