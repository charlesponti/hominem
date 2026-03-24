# Voice I/O Implementation Status

Last updated: 2026-03-24

This document captures everything implemented so far for the Voice I/O initiative, including what is complete, what changed by file, what was validated, and what remains.

---

## Executive Snapshot

### Completed so far
- Voice input UX moved from modal-first to inline composer capture (record button, recording state, transcription state, waveform bars, timer).
- Voice input reliability improved (recording lifecycle, state synchronization, audio-level monitoring, language pass-through, better error handling).
- Voice output for web chat now uses server TTS (`/api/voice/speech`) instead of browser `speechSynthesis`.
- Voice conversational mode MVP is implemented on web (`/api/voice/respond` + PCM16 playback + header toggle + overlay controls).
- Voice event telemetry path improved (still logs to console, now attempts PostHog capture when available on `window`).
- PCM16 response contract cleaned up in services/API (format aligned to streaming reality).

### Not yet complete
- Voice Mode is currently push-to-talk style (explicit start/stop), not automatic silence-turn loop.
- Voice Mode transcript history is captured in hook state but not fully surfaced in overlay UI.
- ChatVoiceModal still exists in UI package (improved a11y), but composer flow no longer depends on it.
- Full monorepo `bun run check` remains blocked by unrelated pre-existing mobile typecheck issue.

---

## What Was Implemented

## 1) Voice Input: Inline Composer Capture

### Before
- Voice was launched via `ChatVoiceModal`.
- Composer displayed recording state optimistically before recorder lifecycle fully started.

### After
- Composer now hosts inline voice capture controls and status.
- Transcription happens from inline flow directly.
- User sees clear state transitions: `Ready` -> `Recording mm:ss` -> `Transcribing`.

### Key UX improvements
- Inline `SpeechInput` adjacent to composer tools.
- Live waveform bars based on microphone amplitude.
- Recording timer (`mm:ss`) while capture is active.
- Inline destructive error text for mic permission/transcription failures.
- Live interim transcript continues to populate draft text.

### Files changed
- `packages/ui/src/components/composer/composer.tsx`
- `packages/ui/src/components/composer/composer-tools.tsx`
- `packages/ui/src/components/ai-elements/speech-input.tsx`

---

## 2) Voice Input: Reliability and State Architecture Fixes

### Recording lifecycle + state sync
- `SpeechInput` now emits recording state up to parent (`onRecordingStateChange`).
- Composer now reflects actual recorder state rather than optimistic toggles.

### Processing lifecycle
- `SpeechInput` now emits processing state (`onProcessingStateChange`) for UX synchronization.

### Audio-level monitoring
- Added `onAudioLevelChange` callback.
- `SpeechInput` creates/tears down `AudioContext + AnalyserNode` safely.
- Cleanup includes stopping RAF loops, closing audio context, resetting level to zero.

### Web Speech / recorder interaction hardening
- Recorder blob finalization moved to recorder stop path.
- Web Speech end/error handling no longer drives premature blob completion in normal flow.
- Better stop path semantics and cleanup of tracks.

### Permission feedback
- Permission failure surfaces error via callback (`onPermissionDenied`) and inline messaging.

### Accessibility improvements
- `ComposerTools` includes an `aria-live` status region for recording start/stop messaging.
- `SpeechInput` includes status text region for recording/processing/idle.

### Files changed
- `packages/ui/src/components/ai-elements/speech-input.tsx`
- `packages/ui/src/components/composer/composer-tools.tsx`
- `packages/ui/src/components/composer/composer.tsx`

---

## 3) Language Hint Pass-through (Web -> API -> Transcription)

### Implemented
- Web transcription mutation accepts optional language.
- Client passes `navigator.language` during transcription requests.
- API routes now consume `language` from request body and pass it to service layer.
- Removed hardcoded `'en'` transcription hint in routes.

### Files changed
- `apps/web/app/hooks/use-transcribe.ts`
- `services/api/src/rpc/routes/mobile.ts`
- (usage path wired in composer/voice UI)

---

## 4) Voice Telemetry Enhancements

### Implemented
- Kept console event logging.
- Added browser PostHog capture attempt when `window.posthog` is available.
- Added recording start/stop emissions from `SpeechInput`.

### Files changed
- `packages/services/src/voice-events.ts`
- `packages/ui/src/components/ai-elements/speech-input.tsx`

---

## 5) Voice Output: Web Chat Now Uses Server TTS

### Before
- Web used browser `speechSynthesis`.

### After
- Web route now uses `useServerSpeech` hook.
- Hook calls RPC `voice.speech` (`/api/voice/speech`) and plays decoded audio in `AudioContext`.
- Chat UI receives both `speakingId` and `speechLoadingId`.
- Message actions include loading state (`Loading audio`) and active playback state (`Stop reading`).

### Files changed
- `apps/web/app/hooks/use-server-speech.ts` (new)
- `apps/web/app/routes/chat/chat.$chatId.tsx`
- `packages/ui/src/components/chat/chat.tsx`
- `packages/ui/src/components/chat/chat-messages.tsx`
- `packages/ui/src/components/chat/chat-message.tsx`

---

## 6) `/voice/respond` PCM Path + Voice Mode MVP (Web)

### PCM player utility
- Added client-side raw PCM16 playback utility with proper sample conversion and lifecycle cleanup.

### Voice Mode hook
- Added `useVoiceMode` hook handling:
  - activation/deactivation
  - recording start/stop via `MediaRecorder`
  - request to `/api/voice/respond`
  - response header transcript decoding (`X-User-Transcript`, `X-AI-Transcript`)
  - PCM16 playback through `PCMPlayer`
  - state machine: `idle | listening | processing | speaking | error`

### Voice Mode UI integration
- Added header toggle in chat header.
- Added overlay component for voice mode controls and state display.
- Wired overlay to route-level hook functions.

### Files added
- `apps/web/app/lib/audio/pcm-player.ts`
- `apps/web/app/hooks/use-voice-mode.ts`
- `packages/ui/src/components/chat/voice-mode-overlay.tsx`

### Files updated
- `packages/ui/src/components/chat/chat-header.tsx`
- `packages/ui/src/components/chat/chat.tsx`
- `packages/ui/src/components/chat/index.ts`
- `apps/web/app/routes/chat/chat.$chatId.tsx`

---

## 7) API/Service Contract Cleanup for PCM16

### Implemented
- Voice response service format contract tightened to PCM16-only in implementation/types.
- API `/voice/respond` format handling aligned to PCM16 output behavior.
- Tests updated accordingly.
- Dynamic `require('node:fs')` in voice services replaced with static imports (`existsSync`) for cleaner module behavior.

### Files changed
- `packages/services/src/voice-response.service.ts`
- `packages/services/src/voice-response.service.test.ts`
- `packages/services/src/voice-transcription.service.ts`
- `services/api/src/rpc/routes/mobile.ts`

---

## Other Voice-Related Improvements Already Applied During This Work

- `ChatVoiceModal` received a11y/interaction improvements (focus handling, Escape close, labelled dialog, error wiring), though composer now uses inline voice flow.
  - `packages/ui/src/components/chat/chat-voice-modal.tsx`

---

## Validation and Checks Performed

Targeted checks run multiple times and currently passing for touched workspaces:
- `bun run --filter @hominem/ui typecheck` ✅
- `bun run --filter @hominem/web typecheck` ✅
- `bun run --filter @hominem/services typecheck` ✅
- `bun run --filter @hominem/api typecheck` ✅

Full repo check status:
- `bun run check` ❌ blocked by unrelated pre-existing mobile issue:
  - `apps/mobile/lib/widget-storage.ts` (`MMKV` value/type mismatch)

This blocker is outside Voice I/O scope and was not modified as part of this implementation.

---

## Current UX State (As Implemented)

### Voice input in composer
- User taps voice button in composer tools.
- Inline recorder appears with state, timer, and waveform.
- Speech recognition interim text updates draft.
- Stop triggers transcription request with locale hint.
- Result updates draft text and returns to ready state.

### Voice output for messages
- Assistant message action supports server-backed read-aloud.
- UI handles loading/play/stop states.

### Voice Mode
- User can toggle voice mode in chat header.
- Overlay appears with state orb and controls.
- User explicitly starts recording, then explicitly stops/sends.
- Endpoint returns AI audio + transcript headers.
- PCM16 audio plays successfully in browser.

---

## Remaining Gaps / Known Follow-ups

1. Voice Mode automation
- Add silence-based auto stop/send and auto restart loop for hands-free turn-taking.

2. Overlay transcript visibility
- Surface latest user/AI transcript pair in `VoiceModeOverlay` for confidence and correction.

3. Interrupt behavior
- Add tap-to-interrupt while assistant is speaking.

4. Safety controls
- Add max-recording-duration guard in Voice Mode path.

5. API/client affordances
- Consider exposing richer typed client methods for `/voice/respond` in `@hominem/rpc` domain wrappers (today implementation uses direct `fetch` in web hook).

6. Cleanup
- Consider deprecating/removing `ChatVoiceModal` from public exports once migration is fully complete and no consumers remain.

---

## File Inventory (Voice I/O Workstream)

### New files
- `docs/voice-io-plan.md`
- `docs/voice-io-implementation-status.md`
- `apps/web/app/hooks/use-server-speech.ts`
- `apps/web/app/hooks/use-voice-mode.ts`
- `apps/web/app/lib/audio/pcm-player.ts`
- `packages/ui/src/components/chat/voice-mode-overlay.tsx`

### Updated files
- `apps/web/app/hooks/use-transcribe.ts`
- `apps/web/app/routes/chat/chat.$chatId.tsx`
- `packages/services/src/voice-events.ts`
- `packages/services/src/voice-response.service.ts`
- `packages/services/src/voice-response.service.test.ts`
- `packages/services/src/voice-transcription.service.ts`
- `services/api/src/rpc/routes/mobile.ts`
- `packages/ui/src/components/ai-elements/speech-input.tsx`
- `packages/ui/src/components/chat/chat-header.tsx`
- `packages/ui/src/components/chat/chat-message.tsx`
- `packages/ui/src/components/chat/chat-messages.tsx`
- `packages/ui/src/components/chat/chat.tsx`
- `packages/ui/src/components/chat/chat-voice-modal.tsx`
- `packages/ui/src/components/chat/index.ts`
- `packages/ui/src/components/composer/composer-tools.tsx`
- `packages/ui/src/components/composer/composer.tsx`

---

## Status Summary by Planned Phase

### Phase 1 (foundation fixes)
- Mostly complete (state sync, language pass-through, accessibility improvements, eventing, permission/error handling, PCM alignment).

### Phase 2 (inline voice input)
- Implemented MVP and active in composer.

### Phase 3 (server TTS output)
- Implemented for web chat and wired to message actions.

### Phase 4 (Voice Mode)
- MVP implemented (toggle + overlay + record/stop/send + PCM playback).
- Auto-loop and transcript-rich overlay still pending.
