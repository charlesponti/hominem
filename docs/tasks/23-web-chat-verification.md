# WEB-CHAT-23 — Verify web chat parity and accessibility states

Status: proposed · priority: high · depends on WEB-CHAT-21, WEB-CHAT-22

Build route, hook, component, and browser acceptance coverage for the completed
web chat parity work. Use [chat.capabilities.md](../chat.capabilities.md) as
the source matrix and verify present capabilities as well as newly added gaps.
This also depends on earlier web-chat-parity phases (`WEB-CHAT-00` through
`WEB-CHAT-20`); those were completed and their task specs removed, so only the
two still-tracked tasks above remain listed here.

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
