---
type: task
id: WEB-CHAT-21
title: Close web chat composer attachment and voice parity
status: proposed
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - compose
  - voice
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-02
  - WEB-CHAT-00
blocks: []
---

# Close web chat composer attachment and voice parity

Bring the existing web file upload and browser speech controls into the shared
composer contract. Preserve drafts and attachments through failure, and decide
whether the approved web product includes Omiro's cleanup, walkie-talkie, and
audio-response behavior.

## Acceptance criteria

- Upload, remove, retry, and attachment-only states are explicit.
- Voice permission, unsupported-browser, transcription, and cleanup failures
  preserve recoverable draft text.
- Approved audio-response behavior includes the correct request modality.
- Busy states prevent duplicate send, upload, and voice actions.

