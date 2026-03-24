# Phase 2 — Inline Voice Input

## 1) Goal

Ship a production-ready inline voice input experience in the composer so users can record, see live feedback, and transcribe speech without leaving the primary writing surface or using a modal.

## 2) Problems this phase solves

- Modal-based voice input added unnecessary interaction cost and context switching.
- Composer recording UI could desync from actual recorder lifecycle, causing misleading state.
- Users lacked high-confidence inline feedback during capture (audio activity, time elapsed, processing state).
- Error handling for permissions/transcription was too easy to miss or too late in the flow.
- Language hinting and lifecycle coordination needed to be reliable enough for real-world capture quality.

## 3) Task breakdown (individual tasks)

### `P2-T1` — Move voice capture into composer (remove modal dependency in primary flow)
- **Problem being solved:** Voice capture was launched in `ChatVoiceModal`, adding friction and separating capture from draft editing.
- **How solution solves it:** Render voice controls inline in composer so capture, transcript updates, and editing happen in one surface.
- **Key files touched:** `packages/ui/src/components/composer/composer.tsx`, `packages/ui/src/components/composer/composer-tools.tsx`, `packages/ui/src/components/ai-elements/speech-input.tsx`

### `P2-T2` — Synchronize recorder lifecycle with composer UI state
- **Problem being solved:** Composer previously reflected optimistic recording state before recorder start/stop completed.
- **How solution solves it:** `SpeechInput` emits lifecycle callbacks (`onRecordingStateChange`, `onProcessingStateChange`) and composer derives UI from recorder truth.
- **Key files touched:** `packages/ui/src/components/ai-elements/speech-input.tsx`, `packages/ui/src/components/composer/composer.tsx`

### `P2-T3` — Keep interim speech visible and flow into draft text
- **Problem being solved:** Users needed immediate confidence that speech was captured while server transcription was pending.
- **How solution solves it:** Web Speech interim transcript continuously updates draft text; stop triggers server transcription and confirmed text replacement.
- **Key files touched:** `packages/ui/src/components/ai-elements/speech-input.tsx`, `packages/ui/src/components/composer/composer.tsx`, `apps/web/app/hooks/use-transcribe.ts`

### `P2-T4` — Add inline capture feedback (waveform + timer + explicit state transitions)
- **Problem being solved:** No robust in-context feedback for recording intensity/duration increased uncertainty during capture.
- **How solution solves it:** Add audio-level monitoring via `AudioContext` + `AnalyserNode`, waveform bars, and `mm:ss` timer with clear `Ready -> Recording -> Transcribing` transitions.
- **Key files touched:** `packages/ui/src/components/ai-elements/speech-input.tsx`, `packages/ui/src/components/composer/composer.tsx`, `packages/ui/src/components/composer/composer-tools.tsx`

### `P2-T5` — Harden permission and failure UX inline
- **Problem being solved:** Permission denials and transcription/network failures could fail silently or be easy to miss.
- **How solution solves it:** Surface inline destructive error text and explicit permission callback handling in composer-adjacent UI.
- **Key files touched:** `packages/ui/src/components/ai-elements/speech-input.tsx`, `packages/ui/src/components/composer/composer.tsx`

### `P2-T6` — Pass locale hint for better transcription quality
- **Problem being solved:** Hardcoded `'en'` degraded non-English transcription quality.
- **How solution solves it:** Pass `navigator.language` from web client through API route into transcription service.
- **Key files touched:** `apps/web/app/hooks/use-transcribe.ts`, `services/api/src/rpc/routes/mobile.ts`

### `P2-T7` — Complete planned component architecture cleanup (pending)
- **Problem being solved:** Phase plan targeted a dedicated `VoiceCapture` inline component; implementation currently extends existing `SpeechInput`.
- **How solution solves it:** Extract `VoiceCapture` to isolate inline recorder UI/state from legacy AI-elements context and reduce coupling.
- **Key files touched:** `packages/ui/src/components/voice/VoiceCapture.tsx` (new, pending), `packages/ui/src/components/composer/composer.tsx` (pending refactor), `packages/ui/src/components/ai-elements/speech-input.tsx` (pending reduction/deprecation)

### `P2-T8` — Remove residual modal surface from exported UI API (pending cleanup)
- **Problem being solved:** `ChatVoiceModal` still exists, which keeps dead-path complexity and migration ambiguity.
- **How solution solves it:** Deprecate then remove modal exports once no consumers remain.
- **Key files touched:** `packages/ui/src/components/chat/chat-voice-modal.tsx`, `packages/ui/src/components/chat/index.ts`

## 4) Implementation details by task (problem + solution)

### `P2-T1`
- **Problem:** Modal flow interrupted drafting and created a two-surface input model.
- **Solution:** Composer now hosts inline voice controls/state, so users stay in one interaction loop from speaking to editing/sending.

### `P2-T2`
- **Problem:** UI could display recording before recorder hardware/session was actually active.
- **Solution:** Parent UI now subscribes to recorder lifecycle callbacks emitted by `SpeechInput`, making toolbar and status labels reflect actual state.

### `P2-T3`
- **Problem:** Capture confidence dropped when users had to wait for server transcription without visible interim text.
- **Solution:** Interim speech recognition text updates draft during recording and pending transcription; server transcript finalizes content when returned.

### `P2-T4`
- **Problem:** Minimal recording feedback increased uncertainty and early interruption risk.
- **Solution:** Amplitude bars and timer are driven from live audio analysis with proper setup/teardown and RAF cleanup to avoid stale UI or leaks.

### `P2-T5`
- **Problem:** Permission and network failures were not consistently recoverable in-place.
- **Solution:** Explicit permission callbacks and inline error messaging provide immediate, actionable feedback without forcing modal/toast-only recovery.

### `P2-T6`
- **Problem:** Language hinting was fixed to English, reducing transcription quality for many users.
- **Solution:** Locale now travels client -> API -> service so transcription receives contextual language input.

### `P2-T7` (pending)
- **Problem:** Architecture plan called for `VoiceCapture`, but current implementation still relies on expanded `SpeechInput`.
- **Solution:** Extract and migrate to `VoiceCapture` to align with target component map and simplify future maintenance.

### `P2-T8` (pending)
- **Problem:** Residual modal component can confuse future contributors and prolong dual-path support.
- **Solution:** Remove modal exports and implementation after confirming zero runtime consumers.

## 5) Acceptance criteria

- Voice input starts and operates inline in composer without requiring `ChatVoiceModal`.
- Composer voice state reflects true recorder lifecycle (`recording`, `processing`, `idle`) with no optimistic mismatch.
- Users see live inline feedback during capture (waveform/audio level + timer + status).
- Interim transcript is visible during recording/transcribing and final transcript is applied when API returns.
- Permission and transcription failures surface inline with clear recovery messaging.
- Transcription requests include locale hint (no hardcoded `'en'` path).
- Phase 2 path passes targeted package typechecks for touched workspaces.
- Remaining cleanup items are explicitly tracked as pending (component extraction and modal removal).

## 6) Validation checklist

- [ ] Manual: Start recording from composer and confirm no modal opens.
- [ ] Manual: Confirm state progression `Ready -> Recording -> Transcribing -> Ready`.
- [ ] Manual: Confirm waveform bars animate while speaking and settle on stop.
- [ ] Manual: Confirm timer increments during active recording.
- [ ] Manual: Confirm interim text appears before server response.
- [ ] Manual: Confirm final transcript replaces/updates draft after response.
- [ ] Manual: Deny microphone permission and verify inline error handling appears.
- [ ] Manual: Simulate/force transcription failure and verify inline fallback/error behavior.
- [ ] Manual: Verify locale sent from client (`navigator.language`) reaches transcription API path.
- [ ] Automated: `bun run --filter @hominem/ui typecheck`
- [ ] Automated: `bun run --filter @hominem/web typecheck`
- [ ] Automated: `bun run --filter @hominem/services typecheck`
- [ ] Automated: `bun run --filter @hominem/api typecheck`
- [ ] Repo-wide note: `bun run lint` currently blocked by pre-existing unrelated mobile issue (`apps/mobile/lib/widget-storage.ts` MMKV mismatch).

## 7) Risks and mitigations

- **Browser API variance (Web Speech/MediaRecorder):** Implement capability checks, keep server transcription path authoritative, provide clear unsupported/error UI.
- **Audio resource leaks (AudioContext/RAF/tracks):** Enforce strict teardown on stop/unmount and reset level/state to avoid stuck indicators.
- **State race conditions between recognition and recorder stop:** Keep blob finalization tied to recorder stop path; avoid Web Speech end/error driving finalization.
- **UX regressions during architecture cleanup:** Extract `VoiceCapture` behind same callback contract and migrate incrementally with focused UI tests/manual QA.
- **Residual dead code confusion from modal:** Mark deprecation and remove once consumer audit is complete.

## 8) Status (what is done vs pending)

### Done
- Inline composer capture flow is implemented and active.
- Recorder/composer state synchronization and processing lifecycle callbacks are in place.
- Waveform, timer, and inline status/error messaging are implemented.
- Locale pass-through for transcription is implemented (`navigator.language` -> API/service).
- Targeted typechecks pass for touched workspaces (`@hominem/ui`, `@hominem/web`, `@hominem/services`, `@hominem/api`).

### Pending
- Extract dedicated `VoiceCapture` component per Phase 2 target architecture (currently achieved functionally via evolved `SpeechInput`).
- Remove/deprecate `ChatVoiceModal` from public exports after final consumer cleanup.
- Full monorepo `bun run lint` is still blocked by unrelated pre-existing mobile typecheck issue, outside Voice I/O scope.
