---
type: task
id: WEB-CHAT-05
title: Add chat offline and recoverable error states
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - resilience
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-04
blocks:
  - WEB-CHAT-22
---

# Add chat offline and recoverable error states

Add explicit offline detection and user-facing recovery for initial load,
message send, stream failure, upload failure, and missing conversations.
Preserve raw draft text and attachments whenever retry is safe.

## Acceptance criteria

- Offline send is blocked with actionable copy and no lost draft.
- Stream and load errors have retry controls.
- Missing/deleted chats render a recovery state rather than an empty transcript.
- Error states are covered at the route and hook boundaries.

## Implementation update — 2026-08-24

- Added browser online/offline state tracking for chat-first and chat-detail sends.
- Offline sends are blocked while the draft and uploaded attachments remain in the composer.
- Stream failures restore the draft context through the stream callback boundary.
- Message-load failures expose retry and distinguish missing conversations from empty transcripts.
- Added focused connectivity-hook coverage; browser interaction and route-level acceptance verification remain open.
- Added Storybook coverage for offline composer, upload failure, load retry, missing conversation, and regeneration recovery states.

## Browser verification update — 2026-08-24

- Verified the live chat route renders its transcript and composer in the integrated browser.
- Navigated to a nonexistent chat and observed the `Conversation unavailable` recovery state.
- Activated `Start a new chat` and confirmed return to the existing chat-first route.
- Offline send, stream failure, and load-retry interactions remain unverified in-browser because the current browser session does not expose network emulation.

## Hydration fix — 2026-08-24

- Made the initial online state deterministic during SSR and hydration, then reconciled `navigator.onLine` after mount to prevent the composer error badge from changing the server/client tree.
- Connectivity hook coverage continues to pass.
