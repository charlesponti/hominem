---
title: 'Add web chat motion and persistence parity'
status: 'Proposed'
priority: 'medium'
labels: [web, chat, motion, persistence]
depends_on: []
blocks: [23-web-chat-verification.md]
estimated_size: 'M'
---

## Outcome

Web chat provides approved entrance motion, reduced-motion behavior, draft
persistence, resume targeting, and correct restored-versus-initial loading
semantics without delaying core interaction.

## Scope

In scope: message entrance, reduced motion, draft/resume persistence, and
loading semantics. Out of scope: new navigation or server architecture.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Confirm motion contract | Web design/docs | — | approved behavior note | Timing, interruption, and reduced-motion behavior are defined. |
| W-002 | Implement motion | Web chat transcript | W-001 | component/browser tests | Motion is interruptible and never blocks typing, scroll, cancel, or recovery. |
| W-003 | Implement persistence | Web composer/lifecycle | W-001 | reload tests | Only approved draft and resume state survive re-entry. |
| W-004 | Separate loading modes | Web routes/hooks | W-002, W-003 | loading-state tests | Initial, restored, and active-generation states are distinguishable. |

## Acceptance criteria

- [ ] AC-001: A submitted message has one visible transcript representation.
- [ ] AC-002: Reduced motion removes travel while retaining state feedback.
- [ ] AC-003: Reload preserves only approved draft and resume state.
- [ ] AC-004: Motion never delays core interaction or recovery.

## Exit gate

Close only with focused state tests and a browser check at the smallest
supported viewport.
