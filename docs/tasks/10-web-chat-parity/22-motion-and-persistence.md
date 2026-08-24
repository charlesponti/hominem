---
type: task
id: WEB-CHAT-22
title: Add web chat motion and persistence parity
status: proposed
priority: medium
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - motion
  - persistence
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-01
  - WEB-CHAT-04
blocks: []
---

# Add web chat motion and persistence parity

Add the approved composer-to-transcript handoff motion, reduced-motion behavior,
draft persistence, resume target, and restored-versus-initial loading semantics.
Keep motion interruptible and never make it part of the send critical path.

## Acceptance criteria

- A submitted message has one visible transcript representation.
- Reduced motion removes travel while retaining state feedback.
- Reload/re-entry preserves only the approved draft and resume state.
- Motion never delays typing, scrolling, cancellation, or error recovery.

