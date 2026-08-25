---
type: task
id: WEB-CHAT-02
title: Add the reusable chat composer
status: completed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - compose
  - chat
estimate: L
assignee: unassigned
depends_on:
  - WEB-CHAT-01
  - WEB-CHAT-00
blocks:
  - WEB-CHAT-03
---

# Add the reusable chat composer

Add a shared chat composer for the chat-first home start flow and existing chat
detail. It owns draft, attachment, note-reference, busy, submit, and recoverable
error presentation. Mixed chat/note inference and note submission are deferred.

## Acceptance criteria

- The composer exposes one chat submission boundary without duplicating the input.
- Attachment and note-reference context can be rendered without owning remote data.
- Draft text and attachment state survive the approved recoverable failures.
- Chat submission uses the existing typed API boundary.

## Implementation update — 2026-08-24

- Implemented the reusable `ChatComposer` around the shared prompt-input primitives.
- Extracted composer state into `apps/web/app/lib/hooks/use-chat-composer-state.ts`.
- Covered draft, seeded-note, mention suggestion, attachment, restore, voice, busy, and dismissible error behavior with unit tests and Storybook stories.
- The composer now exposes one submit/stop boundary for chat detail and chat-first entry.
