---
title: 'Investigate Omiro generation cancellation delivery'
status: 'Proposed'
priority: 'high'
labels: [chat, omiro, ios, cancellation, e2e]
depends_on: []
blocks: []
estimated_size: 'M'
---

## Outcome

Determine why the Apple-only Omiro client does not deliver the visible
`Stop reply` action to the generation cancellation path, then make B-011 pass
with durable cancellation evidence if the defect is in the client or test
harness.

## Scope

### In scope

- Omiro's active-generation stop control and callback delivery.
- The Omiro generation hook, ChatScreen composition, activity timeline, and
  Maestro B-011 flow.
- The existing scripted-provider cancellation timing seam and API durable
  cancellation events.
- Focused Omiro regression coverage and one isolated B-011 rerun.

### Out of scope

- Career, Web, or API product behavior changes.
- Omiro architecture changes, database schema changes, or production failure
  injection.
- Reopening or delaying Task 011's unrelated Browser evidence work.
- Reworking the general chat lifecycle unless a focused reproduction proves it
  owns this defect.

### Deferred

- Broader cancellation and disconnect/replay parity beyond the B-011 contract.
- Any provider or server changes not required to expose the existing supported
  cancellation behavior.

## Known blocker

Task 011's Omiro B-011 scenario is currently blocked. The deterministic test
provider recognizes the `B011-CANCEL-BEFORE` marker and, for streamed
generation requests, holds the response for 9 seconds. Maestro submits the
marker message, observes the visible `Stop reply` control, and taps it about
one second later. The Omiro/API run still commits after the delay.

Observed durable result:

- generation terminal status: `committed`;
- no `generation.cancel_requested` event;
- no `generation.cancelled` event;
- the scripted assistant response is persisted normally.

The immediate diagnostic assertion for `Stopping reply` also fails after the
tap, so the first unknown is callback/state delivery. API cancellation itself
has not been shown to be the failing boundary.

Latest preserved artifact:

- Maestro output: `/tmp/maestro-task003-1788379977/.maestro/tests/2026-09-02_131259`

The API mock delay and its regression test are deterministic and passing. The
following client-side attempts did not change the result: moving the activity
card outside `FlashList`, adding a stable test ID, dismissing the keyboard,
moving the handler to the text node, using the native React Native `Button`,
adding z-index, moving the timeline to `ChatScreen`, adding a parent
responder fallback, and setting the message list to `pointerEvents="box-none"`.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Reproduce the boundary | `apps/omiro` + Maestro + local API | `docs/chat.testing.md`; booted iPhone simulator; scripted provider | Focused B-011 run with callback/state/API timestamps | It is known whether the tap invokes the Omiro callback, whether the hook sends `POST /api/chats/:chatId/generations/:generationId/cancel`, and where the event chain stops. |
| W-002 | Isolate ownership | Omiro generation hook, ChatScreen, activity timeline | W-001 | Focused component/hook regression test and simulator diagnostic output | The responsible component, handler, or transport seam is identified; temporary diagnostics are removed. |
| W-003 | Implement the narrow fix | Confirmed owning Omiro boundary | W-002 | Focused regression test plus Omiro typecheck/lint | Tapping `Stop reply` transitions to `Stopping reply`, sends exactly one cancellation request, and presents the neutral stopped state. |
| W-004 | Verify durable cancellation | Omiro/API test environment | W-003 | B-011 Maestro screenshots/DOM-equivalent artifact and durable inspector output | The run records cancellation-requested and cancelled terminal state, does not commit an assistant response, and has no duplicate events/messages/tool effects. |
| W-005 | Hand off evidence | Task 011 and this task | W-004 | Linked artifact and task-record update | B-011 is removed from Task 011's active gate and linked here as complete, or remains explicitly blocked with the next owner action. |

W-001 and W-002 are serial. W-003 and W-004 are serial because the fix must
be tested at the same client/API boundary. W-005 is required before this task
can close. No later work should be added because a different scenario exposes
an unrelated cancellation or replay concern.

## Acceptance criteria

- [ ] AC-001: On the supported iPhone simulator, B-011's visible stop action
  invokes the active-generation cancellation path.
- [ ] AC-002: The client sends one ownership-checked cancellation request for
  the active generation and displays `Stopping reply`, then neutral `Stopped`.
- [ ] AC-003: Durable state records the cancellation request and cancelled
  terminal outcome, with no committed assistant response, duplicate user
  message, duplicate terminal event, tool effect, or retry run.
- [ ] AC-004: A focused Omiro regression test and the named Maestro B-011 flow
  pass with preserved screenshots and durable correlation evidence.
- [ ] AC-005: Task 011 no longer treats B-011 as an active blocker and links to
  this task; this task remains Proposed/Open if the native harness cannot
  deliver the callback after the investigation is exhausted.

## Evidence record

Volatile simulator logs, screenshots, timestamps, generation IDs, request IDs,
and database records belong in the generated Maestro/testkit artifact
directory. This document stores the stable reproduction contract, observed
failure mode, and links to the latest artifact only.

Technical failure details may remain in API and simulator logs. Do not expose
credentials, cookies, provider arguments, or arbitrary production failure
controls in evidence.

## Exit gate

Mark `Implemented` only when AC-001–AC-004 pass and Task 011 is updated under
AC-005. Mark `Blocked` only when the callback boundary remains unreproducible
after focused client and simulator diagnostics, with the exact harness
limitation and next owner recorded. This task is independent of Task 011's
remaining Browser loading/error evidence and cleanup gate.
