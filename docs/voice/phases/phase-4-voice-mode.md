# Phase 4 — Voice Mode

## 1) Goal

Ship a reliable, low-friction conversational voice loop in web chat that uses `/api/voice/respond` end-to-end: capture user speech, submit turn audio, play AI PCM16 response, and return to listening with clear state transitions.

This phase should move from the current Voice Mode MVP (manual push-to-talk loop) to the planned hands-free conversational loop while preserving accessibility, predictable controls, and production-safe failure handling.

## 2) Problems this phase solves

- Voice interaction is currently not truly hands-free; users must explicitly start/stop each turn.
- Conversational continuity is weak because turn transcripts are captured in state but not clearly surfaced in overlay UI.
- Raw PCM16 playback is non-trivial and easy to break without a dedicated, reusable player abstraction.
- State transitions (`idle`, `listening`, `processing`, `speaking`, `error`) can desync without a single lifecycle owner.
- Users need clear entry/exit controls in chat header and overlay to avoid being trapped in mode.
- Error recovery (permission issues, network/API failures, playback errors) needs deterministic behavior and fast return to a usable state.

## 3) Task breakdown (individual tasks)

- `P4-T1` — Build and harden `useVoiceMode` lifecycle/state machine.
- `P4-T2` — Integrate `/api/voice/respond` request/response path (binary + transcript headers).
- `P4-T3` — Implement PCM16 playback utility and connect it to Voice Mode.
- `P4-T4` — Add Voice Mode overlay/orb UI with state-driven visuals and accessibility semantics.
- `P4-T5` — Add chat-header Voice Mode toggle and route-level wiring.
- `P4-T6` — Implement silence-based auto-stop/send + auto-relisten loop (hands-free).
- `P4-T7` — Surface latest turn transcript pair (user + assistant) in overlay.
- `P4-T8` — Add interruption and safety controls (tap-to-interrupt, max recording duration, robust fallback paths).

## 4) Implementation details by task (problem + solution)

### `P4-T1` — `useVoiceMode` lifecycle/state machine
- **Problem being solved:** Voice Mode behavior fragments across UI components without a single owner, causing inconsistent transitions and harder recovery from errors.
- **How solution solves it:** Centralize activation/deactivation, recording control, API request lifecycle, playback lifecycle, and error handling in `useVoiceMode`; expose a strict state machine (`idle | listening | processing | speaking | error`) plus history/current turn.
- **Key files touched (paths):**
  - `apps/web/app/hooks/use-voice-mode.ts`
  - `apps/web/app/routes/chat/chat.$chatId.tsx`

### `P4-T2` — `/voice/respond` client integration
- **Problem being solved:** The web client needs to correctly send captured audio and consume binary + transcript metadata from `/api/voice/respond`.
- **How solution solves it:** Add a client request path that submits `Blob` audio, reads binary response body for playback, and decodes `X-User-Transcript` / `X-AI-Transcript` headers into turn state for UX confidence.
- **Key files touched (paths):**
  - `apps/web/app/hooks/use-voice-mode.ts`
  - `services/api/src/rpc/routes/mobile.ts`
  - `packages/services/src/voice-response.service.ts`

### `P4-T3` — PCM16 playback utility
- **Problem being solved:** `/voice/respond` returns PCM16 raw audio; browser playback requires explicit conversion and buffer lifecycle control.
- **How solution solves it:** Introduce `PCMPlayer` utility to convert `Int16` PCM to `Float32`, construct `AudioBuffer`, manage playback start/stop/cleanup, and provide a consistent audio pipeline for Voice Mode.
- **Key files touched (paths):**
  - `apps/web/app/lib/audio/pcm-player.ts`
  - `apps/web/app/hooks/use-voice-mode.ts`

### `P4-T4` — Voice overlay and orb UI
- **Problem being solved:** Users need persistent visual feedback for listening/processing/speaking/error and an accessible control surface while in Voice Mode.
- **How solution solves it:** Add a dedicated overlay component tied to hook state, with orb/status presentation, explicit controls, and semantic announcements (`role="status"`-style behavior and labeled controls).
- **Key files touched (paths):**
  - `packages/ui/src/components/chat/voice-mode-overlay.tsx`
  - `packages/ui/src/components/chat/chat.tsx`
  - `packages/ui/src/components/chat/index.ts`

### `P4-T5` — Header toggle and route wiring
- **Problem being solved:** Voice Mode must be discoverable and easy to enter/exit without affecting non-voice chat usage.
- **How solution solves it:** Add a Voice Mode toggle to chat header; wire activation/deactivation through route-level state so mode is scoped to the current chat route and exits cleanly.
- **Key files touched (paths):**
  - `packages/ui/src/components/chat/chat-header.tsx`
  - `packages/ui/src/components/chat/chat.tsx`
  - `apps/web/app/routes/chat/chat.$chatId.tsx`

### `P4-T6` — Silence-based conversational auto-loop (pending)
- **Problem being solved:** Current MVP is push-to-talk and does not meet the planned hands-free conversational loop.
- **How solution solves it:** Add silence detection that automatically ends capture, sends turn audio, transitions to speaking on response playback, then returns to listening automatically for the next turn.
- **Key files touched (paths):**
  - `apps/web/app/hooks/use-voice-mode.ts`
  - `apps/web/app/lib/audio/pcm-player.ts`
  - `packages/ui/src/components/chat/voice-mode-overlay.tsx`

### `P4-T7` — Transcript visibility in overlay (pending)
- **Problem being solved:** Transcript data exists in hook state but users cannot reliably verify what was heard/returned while in Voice Mode.
- **How solution solves it:** Render latest user/assistant transcript pair in overlay (at minimum last turn), allowing confidence checks and easier correction/retry decisions.
- **Key files touched (paths):**
  - `packages/ui/src/components/chat/voice-mode-overlay.tsx`
  - `apps/web/app/hooks/use-voice-mode.ts`

### `P4-T8` — Interruption and safety controls (pending)
- **Problem being solved:** Long turns and uninterruptible playback degrade usability and can trap users in poor interaction loops.
- **How solution solves it:** Add tap-to-interrupt during `speaking`, enforce max recording duration guardrails, and ensure failure paths immediately restore a recoverable state (`error` -> `listening` or `idle`).
- **Key files touched (paths):**
  - `apps/web/app/hooks/use-voice-mode.ts`
  - `apps/web/app/lib/audio/pcm-player.ts`
  - `packages/ui/src/components/chat/voice-mode-overlay.tsx`

## 5) Acceptance criteria

- Voice Mode can be entered/exited from chat header, scoped to current chat route, without breaking normal text chat flow.
- `useVoiceMode` exposes stable lifecycle state and does not leave stale recorder/player resources after deactivate/unmount.
- `/api/voice/respond` path works end-to-end: audio upload, binary response playback, transcript headers captured.
- PCM16 playback is audibly correct (no major distortion/pitch artifacts) and supports stop/cleanup.
- Overlay clearly reflects current mode state and provides accessible controls/labels.
- Hands-free loop is implemented: silence auto-stop/send, assistant playback, automatic return to listening.
- Latest turn transcripts are visible in overlay.
- Interrupt control works during assistant speech.
- Max recording duration and error recovery paths are enforced and user-visible.

## 6) Validation checklist

- Typecheck impacted workspaces:
  - `bun run --filter @hominem/web typecheck`
  - `bun run --filter @hominem/ui typecheck`
  - `bun run --filter @hominem/api typecheck`
  - `bun run --filter @hominem/services typecheck`
- Manual functional checks:
  - Enter Voice Mode from header and exit via UI control and `Esc`.
  - Record a turn, send to `/voice/respond`, verify playback and state transitions.
  - Confirm transcript headers populate turn state and render in overlay.
  - Verify silence auto-loop cycles through listening -> processing -> speaking -> listening.
  - Verify tap-to-interrupt stops assistant audio immediately.
  - Verify max recording duration behavior.
- Failure-path checks:
  - Deny mic permission and confirm recoverable UI state.
  - Simulate network/API failure and confirm state moves to `error` then recoverable state.
  - Validate cleanup on route change/unmount (no lingering audio or active mic).
- Repo-wide check note:
  - `bun run lint` currently blocked by pre-existing unrelated mobile issue in `apps/mobile/lib/widget-storage.ts` (outside Voice I/O scope).

## 7) Risks and mitigations

- Browser audio policy can block playback until user gesture.
  - Mitigation: ensure activation gesture initializes/resumes `AudioContext`; show clear retry affordance.
- Silence detection may over-trigger in noisy/quiet environments.
  - Mitigation: tune thresholds + debounce window; keep manual stop/send fallback.
- PCM16 handling bugs can produce clipping/distortion.
  - Mitigation: centralize conversion in `PCMPlayer`; add deterministic unit/behavioral tests around sample conversion assumptions.
- State-machine race conditions (rapid toggle, interrupt during processing).
  - Mitigation: gate transitions, cancel in-flight operations on deactivate, and enforce single active turn invariant.
- Missing transcript surfacing reduces user trust in voice loop.
  - Mitigation: always decode/store headers when present; show latest turn in overlay.
- Long-running capture can hurt UX/perf.
  - Mitigation: enforce max duration + explicit timeout messaging and auto-reset.

## 8) Status (what is done vs pending)

- Done:
  - Voice Mode MVP implemented with header toggle, overlay controls, `useVoiceMode`, `/voice/respond` integration, transcript header decoding in hook state, and PCM16 playback utility.
  - Core state machine and route/UI wiring are in place and typechecked in affected workspaces.
- Pending:
  - Silence-based automatic conversational loop (hands-free turn-taking).
  - Transcript history visibility in overlay UI (beyond internal hook state).
  - Interrupt UX hardening and explicit max-recording-duration safety guard in Voice Mode path.
  - Optional client API ergonomics improvements for typed `/voice/respond` wrappers in `@hominem/rpc`.
