# P4-I2: Voice Mode Safety and Interrupt Controls

## Linear Fields

- **Title:** `P4-I2 Voice Mode Safety and Interrupt Controls`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `web`, `voice-mode`, `hardening`, `phase-4`
- **Blocked By:** `P4-I1`
- **Blocks:** `P4-I3`
- **Feature Flag:** `voice_mode_enabled`
- **Rollout Strategy:** Required hardening before auto-loop rollout

## Description

Add safety controls and interruption behavior so Voice Mode is robust enough for broader rollout.

## Problem

Voice Mode MVP is usable but not resilient enough for broad rollout. Without interruption controls and capture safety bounds, users can get stuck in long turns, unwanted playback, or hard-to-recover states after edge-case failures.

## Solution

Harden Voice Mode runtime behavior:
- tap-to-interrupt while assistant audio is playing
- max recording duration guardrail
- robust recovery from mic/network/playback failures

This issue improves trust and operational safety before enabling hands-free auto-loop.

## Implementation Checklist

- [ ] Interrupt control.
  - [ ] Add explicit control to stop assistant playback mid-response.
  - [ ] Ensure interrupt resets state for next action.

- [ ] Recording safety bounds.
  - [ ] Add max recording duration timer.
  - [ ] Auto-stop and transition to send path when max duration is reached.
  - [ ] Surface clear user message when auto-stop triggers.

- [ ] Failure recovery hardening.
  - [ ] Handle permission denial with recoverable UI state.
  - [ ] Handle network/API errors with clear retry path.
  - [ ] Ensure no orphaned recorder or audio resources after failures.

- [ ] State consistency.
  - [ ] Verify no race conditions when toggling voice mode rapidly.
  - [ ] Verify transitions remain valid during interrupt and auto-stop actions.

- [ ] Telemetry additions.
  - [ ] Track interrupt usage and max-duration auto-stop events.
  - [ ] Track Voice Mode error categories for rollout diagnostics.

- [ ] Validation.
  - [ ] Manual: interrupt during speaking works reliably.
  - [ ] Manual: max-duration triggers and still returns usable state.
  - [ ] `bun run --filter @hominem/web typecheck`
  - [ ] `bun run --filter @hominem/ui typecheck`

## Deployability

Independently deployable after MVP; recommended before enabling auto-loop.

## Acceptance Criteria

- Users can interrupt assistant playback instantly.
- Max recording duration guardrail is enforced.
- Error states are recoverable without page refresh.
- No stale recorder/player state after interrupts or failures.

## Definition of Done

- Implementation checklist completed.
- Failure-path manual QA passes.
- Targeted web/ui typechecks pass.

## Rollback Plan

- Keep Voice Mode enabled but revert interrupt/max-duration logic if regressions appear.
- Pause expansion cohorts until hardening is restored.

## Dependencies

- P4-I1 Voice Mode MVP (Manual Push-to-Talk)

## Unblocks

- P4-I3 Voice Mode Hands-Free Auto Loop
