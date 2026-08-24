---
type: task
id: WEB-CHAT-23
title: Verify web chat parity and accessibility states
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - testing
  - accessibility
estimate: L
assignee: unassigned
depends_on:
  - WEB-CHAT-03
  - WEB-CHAT-05
  - WEB-CHAT-06
  - WEB-CHAT-07
  - WEB-CHAT-08
  - WEB-CHAT-09
  - WEB-CHAT-10
  - WEB-CHAT-12
  - WEB-CHAT-13
  - WEB-CHAT-14
  - WEB-CHAT-15
  - WEB-CHAT-16
  - WEB-CHAT-17
  - WEB-CHAT-18
  - WEB-CHAT-19
  - WEB-CHAT-20
  - WEB-CHAT-21
  - WEB-CHAT-22
blocks: []
---

# Verify web chat parity and accessibility states

Build route, hook, component, and browser acceptance coverage for the completed
web chat parity work. Use the Omiro inventory as the source matrix and verify
present capabilities as well as newly added gaps.

## Scenarios

- first chat creation and accepted-message navigation;
- send, commit, cancel, failure, retry, and regeneration;
- edit, delete, copy, share, speech playback, and tool approval;
- search, settings, debug, archive, new chat, and missing-chat recovery;
- attachments, voice input, offline behavior, draft restoration, and reduced motion;
- chat-to-note, task extraction, linked note discussion, and responsive layout.

## Acceptance criteria

- Every task marked complete has focused automated coverage.
- Critical user journeys have browser acceptance flows.
- Keyboard navigation, screen-reader labels, focus recovery, and responsive
  behavior are verified for each new action surface.
- The gap map is updated so no feature is marked present without evidence.

## Verification update — 2026-08-24

- Web automated validation passes: 13 test files and 37 tests, lint, typecheck, production build, and Storybook build.
- Integrated-browser verification covered chat-first new-chat navigation, message submission, preparing/thinking state, streamed response completion, and composer transitions.
- Component Storybook coverage includes chat home, composer, stream status, and `ChatMessage` states.
- Full parity verification remains open for the unimplemented mutation, search, settings, offline, transformation, and accessibility scenarios listed above.
