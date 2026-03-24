# P3-I1: Server TTS Hook and Route Integration

## Linear Fields

- **Title:** `P3-I1 Server TTS Hook and Route Integration`
- **Parent:** `Voice I/O Web Rollout`
- **Priority:** `High`
- **Labels:** `voice`, `web`, `tts`, `phase-3`
- **Blocked By:** `P1-I3` (recommended)
- **Blocks:** `P3-I2`
- **Feature Flag:** `voice_tts_server_enabled`
- **Rollout Strategy:** Internal -> 5% -> 25% -> 100%

## Description

Replace browser speech synthesis in active web chat flow with server-generated TTS playback and deterministic UI states.

## Problem

Web chat read-aloud quality is limited by browser `speechSynthesis`, which is inconsistent across devices and voices. This creates a quality mismatch with improved voice input/transcription. The server already provides high-quality speech generation, but web chat needs a robust integration path.

## Solution

Adopt server-backed TTS for web chat actions:
- Use `/api/voice/speech` for assistant message playback.
- Introduce a dedicated hook for request/decode/playback lifecycle.
- Wire loading/playing states through chat route and message UI.

## Implementation Checklist

- [x] Hook implementation.
  - [x] Add/verify `useServerSpeech` for request + decode + playback.
  - [x] Expose `speakingId`, `loadingId`, `speak`, and `stop`.
  - [x] Ensure cleanup on unmount and on new playback.

- [x] Route wiring.
  - [x] Replace active chat route dependency on browser speech hook.
  - [x] Pass server speech states and callbacks into chat components.

- [x] UI wiring.
  - [x] Message actions show `Loading audio` while fetching/decoding.
  - [x] Active playback state switches action to `Stop reading`.
  - [x] Stopping returns message to idle.

- [x] Error behavior.
  - [x] Fail safely to idle state on fetch/decode errors.
  - [x] Avoid stale speaking/loading IDs after failures.

- [x] Validation.
  - [x] Manual: read-aloud uses server endpoint.
  - [x] Manual: loading -> playing -> idle lifecycle works per message.
  - [x] `bun run --filter @hominem/web typecheck`
  - [x] `bun run --filter @hominem/ui typecheck`

## Deployability

Independently deployable behind `voice_tts_server_enabled` if desired. User-facing value is immediate and measurable.

## Acceptance Criteria

- Web chat read-aloud calls server TTS endpoint in active path.
- Message UI shows loading and playing states correctly.
- Stop action works reliably and resets state.
- Failures return UI to retryable idle state.

## Definition of Done

- Implementation checklist completed.
- Internal rollout metrics captured for latency/error rate.
- Targeted web/ui typechecks pass.

## Rollback Plan

- Disable `voice_tts_server_enabled` and restore previous read-aloud path.
- Keep hook code in place for fast re-enable after fixes.

## Dependencies

- P1-I3 Accessibility and Telemetry Baseline (recommended)

## Unblocks

- P3-I2 Server TTS Stabilization and Fallback Policy
