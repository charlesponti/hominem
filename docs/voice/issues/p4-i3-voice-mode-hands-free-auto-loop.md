# P4-I3: Voice Mode Hands-Free Auto Loop

## Linear Fields

- **Title:** `P4-I3 Voice Mode Hands-Free Auto Loop`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `web`, `voice-mode`, `automation`, `phase-4`
- **Blocked By:** `P4-I2`
- **Blocks:** `None`
- **Feature Flag:** `voice_mode_auto_loop_enabled`
- **Rollout Strategy:** Internal -> 5% -> 25% -> 100% with strict latency/error gates

## Description

Upgrade Voice Mode from manual push-to-talk to true conversational loop with silence auto-send, auto-relisten, and transcript visibility.

## Problem

Voice Mode remains manual push-to-talk in MVP form. This does not yet meet the target conversational experience where users can speak naturally in a turn-based loop without repeatedly pressing controls. Additionally, transcript confidence is reduced if latest turn text is not clearly surfaced.

## Solution

Implement hands-free conversational loop behavior:
- silence-based auto-stop and send
- automatic return to listening after AI playback
- overlay display of latest user/assistant transcript pair

This issue delivers the compounding UX jump from "voice controls" to "voice conversation."

## Implementation Checklist

- [ ] Silence detection and auto-send.
  - [ ] Add configurable silence threshold and debounce window.
  - [ ] Auto-stop recording on sustained silence.
  - [ ] Transition to processing/send state automatically.

- [ ] Auto-relisten loop.
  - [ ] After AI playback completes, return to listening state automatically.
  - [ ] Preserve manual override controls (pause/exit).

- [ ] Transcript visibility.
  - [ ] Display latest user transcript and AI transcript in overlay.
  - [ ] Handle missing/partial header values gracefully.

- [ ] Loop safety.
  - [ ] Ensure loop respects interruption and max-duration safeguards from P4-I2.
  - [ ] Ensure exit action immediately breaks loop and releases resources.

- [ ] Telemetry for loop quality.
  - [ ] Track auto-loop turn completion rate.
  - [ ] Track silence false-stop patterns.
  - [ ] Track cycle latency (`listening -> speaking -> listening`).

- [ ] Rollout plan.
  - [ ] Gate with `voice_mode_auto_loop_enabled`.
  - [ ] Roll out internal -> 5% -> 25% -> 100% with threshold checks.

- [ ] Validation.
  - [ ] Manual: multiple consecutive turns without manual start/stop.
  - [ ] Manual: noisy-room and low-volume scenarios.
  - [ ] `bun run --filter @hominem/web typecheck`
  - [ ] `bun run --filter @hominem/ui typecheck`

## Deployability

Independently deployable behind dedicated auto-loop flag; can be rolled back without disabling Voice Mode MVP.

## Acceptance Criteria

- Silence detection auto-stops and sends turns reliably.
- Playback completion returns mode to listening automatically.
- Overlay shows latest user and AI transcripts.
- Loop remains interruptible and respects safety controls.

## Definition of Done

- Implementation checklist completed.
- Multi-turn manual validation in real-world noise conditions passes.
- Targeted web/ui typechecks pass.

## Rollback Plan

- Disable `voice_mode_auto_loop_enabled` while keeping `voice_mode_enabled` on.
- Users fall back to manual Voice Mode MVP flow.

## Dependencies

- P4-I2 Voice Mode Safety and Interrupt Controls

## Unblocks

- Full target-state Voice Mode rollout.
