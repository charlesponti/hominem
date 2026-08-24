---
type: task
id: WEB-CHAT-01
title: Harden the chat-first web entry surface
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - inbox
  - chat
estimate: L
assignee: unassigned
depends_on:
  - WEB-CHAT-00
blocks:
  - WEB-CHAT-02
---

# Harden the chat-first web entry surface

Keep the web home chat-first. Replace the implicit blank-chat redirect with an
explicit entry state that can show recent-chat resolution, no-chat start,
creation failure, retry, and navigation states. Do not add the mixed All stream
or a note destination in this task; that capability is deferred by
`WEB-CHAT-00`.

## Files

`apps/web/app/routes/home.tsx`, `apps/web/app/components/chat/chat-home-page.tsx`,
and the existing chat navigation/query hooks.

## Acceptance criteria

- The home route remains chat-first and does not create a blank chat implicitly.
- A recent chat still navigates to `/chat/:chatId`.
- No-chat and creation-error states are explicit and recoverable.
- The mixed All stream remains documented as deferred rather than partially implemented.

## Implementation update — 2026-08-24

- Implemented the explicit chat-first home state in `apps/web/app/routes/home.tsx`.
- Added `ChatHomePage` coverage and Storybook states for empty, composing, starting, and error flows.
- Verified the authenticated browser flow reaches a new chat and accepts its first message.
- The mixed All stream remains intentionally deferred.
