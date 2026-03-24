# P2-I1: Inline Capture MVP Behind Flag

## Linear Fields

- **Title:** `P2-I1 Inline Capture MVP Behind Flag`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `web`, `ux`, `phase-2`
- **Blocked By:** `P1-I1`, `P1-I3`
- **Blocks:** `P2-I2`, `P2-I3`
- **Feature Flag:** `voice_input_inline_enabled`
- **Rollout Strategy:** Internal -> 5% -> 25% -> 100%

## Description

Ship inline composer voice capture as the primary experience under flag, while preserving fallback behavior during ramp.

## Problem

Voice input currently has modal-era baggage and fragmented control flow. Even with reliability fixes, users still incur context switching if the primary experience is not inline. We need an inline composer-native capture path that is deployable incrementally and reversible.

## Solution

Introduce inline capture in composer as the primary path under a feature flag, while preserving fallback behavior during rollout.

Key goals:
- Record/transcribe from the same composer surface where users edit/send text.
- Keep flow reversible behind `voice_input_inline_enabled`.
- Avoid breaking legacy consumers while migrating.

## Implementation Checklist

- [x] Add/verify feature flag gate.
  - [x] Add `voice_input_inline_enabled` evaluation in web composer container.
  - [x] When disabled, preserve existing fallback path.

- [x] Inline capture wiring.
  - [x] Render `SpeechInput` inline within composer controls.
  - [x] Route `onAudioRecorded` to transcription mutation.
  - [x] Route interim transcript to draft text updates.

- [x] State ownership.
  - [x] Recorder state (`recording`/`processing`) comes from callbacks.
  - [x] Composer mic affordance reflects real recorder lifecycle.

- [x] Error handling in-context.
  - [x] Permission-denied and transcription errors appear inline.
  - [x] Recovery action is obvious (retry recording without leaving composer).

- [x] Rollout plan.
  - [x] Internal-only enablement first.
  - [x] 5% -> 25% -> 100% rollout using flag.
  - [x] Monitor voice-start, voice-stop, transcribe-fail metrics.

- [x] Validation.
  - [x] Manual: no modal required when flag is on.
  - [x] Manual: fallback works when flag is off.
  - [x] `bun run --filter @hominem/ui typecheck`
  - [x] `bun run --filter @hominem/web typecheck`

## Deployability

Independently deployable behind flag with low risk. Immediate UX improvement for flagged cohort.

## Acceptance Criteria

- Inline voice capture is available in composer when flag is enabled.
- Fallback path remains functional when flag is disabled.
- Recording/transcription state is stable and recoverable in-place.
- Inline permission/transcription failures are user-visible and retryable.

## Definition of Done

- Implementation checklist completed.
- Flag rollout plan documented and applied.
- Targeted UI/web typechecks pass.

## Rollback Plan

- Turn off `voice_input_inline_enabled`.
- Users revert to previous fallback voice input path.

## Dependencies

- P1-I1 Recorder Reliability and State Truth
- P1-I3 Accessibility and Telemetry Baseline

## Unblocks

- P2-I2 Inline Confidence UX (Timer + Waveform + State Copy)
- P2-I3 Inline Migration Cleanup and Modal Retirement
