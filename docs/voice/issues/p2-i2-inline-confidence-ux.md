# P2-I2: Inline Confidence UX (Timer + Waveform + State Copy)

## Linear Fields

- **Title:** `P2-I2 Inline Confidence UX (Timer + Waveform + State Copy)`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `Medium`
- **Labels:** `voice`, `web`, `ux`, `phase-2`
- **Blocked By:** `P2-I1`
- **Blocks:** `P2-I3`
- **Feature Flag:** `voice_input_inline_enabled`
- **Rollout Strategy:** Follow P2-I1 rollout cohorts

## Description

Improve inline recording confidence with explicit visual and textual state indicators so users trust capture progress.

## Problem

Even when inline capture works, users still hesitate if they cannot clearly see what the recorder is doing. Lack of visible confidence cues causes premature retries, accidental stops, and uncertainty about whether speech was captured.

## Solution

Add a confidence layer to inline capture:
- Recording timer (`mm:ss`)
- Live amplitude waveform bars
- Explicit state copy (`Ready`, `Recording`, `Transcribing`)

These cues reduce uncertainty and improve completion rate without changing backend behavior.

## Implementation Checklist

- [x] Recording timer UX.
  - [x] Track recording start timestamp.
  - [x] Update elapsed display while recording.
  - [x] Reset elapsed time on stop/cancel.

- [x] Audio-level waveform UX.
  - [x] Emit audio level from recorder component.
  - [x] Render stable waveform bars in inline control area.
  - [x] Ensure bars gracefully settle to idle when recording ends.

- [x] State copy UX.
  - [x] Display clear state transitions: `Ready` -> `Recording` -> `Transcribing` -> `Ready`.
  - [x] Ensure copy is synchronized with real callback state.

- [x] Lifecycle hygiene.
  - [x] Ensure RAF/analyser/audio context teardown on stop/unmount.
  - [x] Prevent stale levels/timer after cancellation.

- [x] Accessibility.
  - [x] Keep existing status/live semantics compatible with new visual indicators.

- [x] Validation.
  - [x] Manual: timer increments correctly and resets.
  - [x] Manual: waveform responds to voice amplitude changes.
  - [x] Manual: state text never desyncs from real behavior.
  - [x] `bun run --filter @hominem/ui typecheck`
  - [x] `bun run --filter @hominem/web typecheck`

## Deployability

Independently deployable after inline MVP. It is a UX-only enhancement with no API contract changes.

## Acceptance Criteria

- Timer displays and resets correctly per recording session.
- Waveform bars reflect live input and return to idle after stop.
- State copy remains synchronized with recorder lifecycle.
- No lifecycle leaks from audio monitor setup/teardown.

## Definition of Done

- Implementation checklist completed.
- Manual UX checks pass for timer/waveform/state transitions.
- Targeted UI/web typechecks pass.

## Rollback Plan

- Keep inline capture path enabled but remove confidence subcomponents.
- Revert to simpler inline control UI if regressions appear.

## Dependencies

- P2-I1 Inline Capture MVP Behind Flag

## Unblocks

- P2-I3 Inline Migration Cleanup and Modal Retirement
