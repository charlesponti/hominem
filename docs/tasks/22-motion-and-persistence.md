# WEB-CHAT-22 — Add web chat motion and persistence parity

Status: proposed · priority: medium

Add the approved new-message entrance motion (see
[chat.design.md](../chat.design.md)), reduced-motion behavior, draft
persistence, resume target, and restored-versus-initial loading semantics.
Keep motion interruptible and never make it part of the send critical path.

## Acceptance criteria

- A submitted message has one visible transcript representation.
- Reduced motion removes travel while retaining state feedback.
- Reload/re-entry preserves only the approved draft and resume state.
- Motion never delays typing, scrolling, cancellation, or error recovery.
