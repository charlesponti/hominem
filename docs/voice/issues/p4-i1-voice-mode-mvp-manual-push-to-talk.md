# P4-I1: Voice Mode MVP (Manual Push-to-Talk)

## Linear Fields

- **Title:** `P4-I1 Voice Mode MVP (Manual Push-to-Talk)`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `web`, `voice-mode`, `phase-4`
- **Blocked By:** `P1-I1`, `P1-I2`, `P1-I3`
- **Blocks:** `P4-I2`
- **Feature Flag:** `voice_mode_enabled`
- **Rollout Strategy:** Internal-only first, then staged rollout

## Description

Ship first deployable Voice Mode experience with explicit start/stop controls and end-to-end `/voice/respond` integration.

## Problem

Users who want conversational voice interaction currently lack a dedicated mode in web chat. The backend can already produce end-to-end voice responses, but there is no cohesive route-level voice mode UX tying capture, response, and playback together in one flow.

## Solution

Ship a deployable Voice Mode MVP with explicit controls:
- chat header toggle
- voice overlay UI
- manual start recording / stop and send turn
- `/api/voice/respond` request path
- PCM16 playback of response audio

This creates a usable conversational baseline while avoiding the complexity of auto-loop in the same issue.

## Implementation Checklist

- [x] Route-level hook integration.
  - [x] Add/verify `useVoiceMode` in chat route.
  - [x] Wire activate/deactivate and start/stop actions.

- [x] Header entry point.
  - [x] Add voice mode toggle in chat header.
  - [x] Reflect active mode state in header control.

- [x] Overlay UX.
  - [x] Render stateful overlay with controls and clear state copy.
  - [x] Include close action to exit mode.

- [x] End-to-end request/playback.
  - [x] Capture turn audio via `MediaRecorder`.
  - [x] Submit multipart request to `/api/voice/respond`.
  - [x] Decode transcript headers and store turn data.
  - [x] Play PCM16 response through player utility.

- [x] State machine behavior.
  - [x] Ensure deterministic transitions among `idle`, `listening`, `processing`, `speaking`, `error`.
  - [x] Ensure deactivation stops recorder and playback cleanly.

- [x] Validation.
  - [x] Manual: enter/exit voice mode repeatedly without stale resources.
  - [x] Manual: record -> send -> hear AI response flow works.
  - [x] `bun run --filter @hominem/web typecheck`
  - [x] `bun run --filter @hominem/ui typecheck`

## Deployability

Independently deployable behind `voice_mode_enabled`.

## Acceptance Criteria

- Users can enter/exit Voice Mode from chat header.
- Manual record -> send -> AI playback loop works end-to-end.
- PCM16 audio playback works reliably in supported browsers.
- Deactivation releases recorder/player resources.

## Definition of Done

- Implementation checklist completed.
- Manual Voice Mode MVP scenarios pass.
- Targeted web/ui typechecks pass.

## Rollback Plan

- Disable `voice_mode_enabled` to hide Voice Mode surface.
- Retain existing chat behavior without Voice Mode entry points.

## Dependencies

- P1-I1 Recorder Reliability and State Truth
- P1-I2 API Contract Correctness and Language Path
- P1-I3 Accessibility and Telemetry Baseline

## Unblocks

- P4-I2 Voice Mode Safety and Interrupt Controls
- P4-I3 Voice Mode Hands-Free Auto Loop
