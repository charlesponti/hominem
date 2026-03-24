# P1-I1: Recorder Reliability and State Truth

## Linear Fields

- **Title:** `P1-I1 Recorder Reliability and State Truth`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `web`, `reliability`, `phase-1`
- **Blocked By:** `None`
- **Blocks:** `P2-I1`, `P4-I1`
- **Feature Flag:** `voice_input_inline_enabled` (indirect dependency)
- **Rollout Strategy:** Ship directly (no user-visible surface change)

## Description

Stabilize recorder lifecycle behavior so UI state, audio completion, and cleanup are always driven by recorder truth. This reduces flake and prevents premature finalization that can corrupt downstream transcription UX.

## Problem

Voice capture reliability is the foundation for every downstream voice feature. Today, recording state can drift from actual recorder lifecycle transitions, which creates misleading UI and occasional behavior where the user sees a recording indicator that does not reflect real capture state. In addition, recording completion can be influenced by speech-recognition lifecycle edges (like `onend`) instead of recorder lifecycle truth, which can lead to premature or inconsistent blob finalization.

If this issue is not solved first, later investments (inline UI polish, Voice Mode, output voice UX) stack on unstable behavior and increase debugging complexity.

## Solution

Make `MediaRecorder` lifecycle the source of truth for recording state and recording completion. Treat speech recognition as advisory (interim text) rather than authoritative for audio completion. Explicitly propagate recorder state upward so composer/tooling always render real state.

Scope of solution:
- Recorder owns start/stop truth.
- Parent UI derives from recorder callbacks.
- Blob finalization runs on recorder stop path.
- Cleanup is deterministic (tracks, refs, processing state).

## Implementation Checklist

- [x] Normalize recording state ownership in `SpeechInput`.
  - [x] Ensure `onRecordingStateChange` is emitted only on real recorder transitions.
  - [x] Ensure parent components do not set optimistic recording state ahead of recorder start.

- [x] Enforce recorder-driven completion semantics.
  - [x] Final audio blob is produced from recorder stop handler.
  - [x] Speech recognition end/error handlers do not finalize blob by themselves.

- [x] Harden stop/start edge handling.
  - [x] Prevent duplicate stops.
  - [x] Reset chunks and refs on each new recording session.
  - [x] Ensure processing state transitions are consistent around stop and transcription start.

- [x] Validate parent wiring.
  - [x] Composer and composer tools consume recorder state callbacks.
  - [x] UI labels/icons map correctly to idle/recording/processing.

- [x] Add/refresh tests where feasible.
  - [x] Unit-level behavior checks for recorder lifecycle transitions.
  - [x] Regression scenario: pause/silence in speech recognition does not prematurely finalize capture.

- [x] Run validation.
  - [x] `bun run --filter @hominem/ui typecheck`
  - [x] `bun run --filter @hominem/web typecheck`

## Deployability

This issue is independently shippable and safe. It improves reliability without changing product surface area.

## Acceptance Criteria

- Recorder state callbacks reflect actual recorder transitions.
- Audio blob finalization occurs only on recorder stop lifecycle.
- No premature completion from speech-recognition end/error handlers.
- Composer voice state remains in sync across start/stop/retry cycles.

## Definition of Done

- Implementation checklist completed.
- Targeted typechecks pass for touched packages.
- Manual lifecycle regression test (start/stop/pause/retry) passes.

## Rollback Plan

- Revert to previous recorder callback wiring.
- Disable dependent inline voice rollout until recorder lifecycle patch is restored.

## Dependencies

- None

## Unblocks

- P2-I1 Inline Capture MVP Behind Flag
- P4-I1 Voice Mode MVP (Manual Push-to-Talk)
