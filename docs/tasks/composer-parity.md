---
title: 'Close web composer attachment and voice parity'
status: 'Proposed'
priority: 'medium'
labels: [web, chat, composer]
depends_on: []
blocks: [web-chat-verification.md]
estimated_size: 'M'
---

## Outcome

The Web composer implements the approved attachment and browser speech
contract while preserving recoverable drafts through failure.

## Scope

In scope: upload/remove/retry, attachment-only sends, voice permissions,
unsupported-browser behavior, transcription/cleanup failure, and busy-state
deduplication. Out of scope: unapproved Omiro audio or walkie-talkie behavior.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Confirm approved behavior | Web product/docs | — | recorded decision | Audio response and Omiro cleanup behavior are explicit or marked open. |
| W-002 | Implement attachment states | Web composer | W-001 | focused component tests | Upload, remove, retry, and attachment-only states preserve draft text. |
| W-003 | Implement voice states | Web composer/speech hook | W-001 | browser/component tests | Permission, unsupported, transcription, and cleanup failures are recoverable. |
| W-004 | Prevent duplicate actions | Web composer | W-002, W-003 | interaction tests | Busy states prevent duplicate send, upload, and voice actions. |

## Acceptance criteria

- [ ] AC-001: Attachment and voice state transitions are visible and recoverable.
- [ ] AC-002: Approved modality behavior is recorded before implementation.
- [ ] AC-003: Focused Web tests and typecheck pass.

## Exit gate

Close only when the approved behavior decision and all acceptance criteria are
recorded. Unapproved audio behavior is an explicit user decision, not an
implementation assumption.
