---
type: task
id: WEB-CHAT-13
title: Add in-chat message search
status: complete
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - search
estimate: M
assignee: unassigned
depends_on: []
blocks:
  - WEB-CHAT-12
---

# Add in-chat message search

Add a debounced chat search control backed by the message-search RPC. Display
result count, empty results, loading, close/reset, and return-to-transcript
behavior without mutating the canonical message cache.

## Acceptance criteria

- Search does not query for blank or whitespace-only input.
- Results are mapped to the same message presentation model.
- Closing search restores the full transcript and clears the query.
- Search behavior has hook and route-level coverage.

## Implementation update — 2026-08-24

- Added `useChatMessageSearch` with trimmed, debounced queries backed by the message-search RPC.
- Added route-level search controls with loading, result count, empty-result, error, close, and transcript-restoration states.
- Search results remain isolated from the canonical message cache and use the shared `ChatMessageView` presentation model.
- Added Storybook coverage for empty, loading, result, no-result, and error states.
- Added hook coverage for whitespace suppression, trimmed debouncing, isolated results, and close/reset behavior.

## Validation update — 2026-08-24

- Web formatting, lint, typecheck, build, and tests pass.
