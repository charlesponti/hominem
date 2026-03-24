# Phase 1 — Foundation Fixes

## 1) Goal

Ship a correct, accessible, and observable baseline for Voice I/O before layering new UX.
Phase 1 focuses on fixing reliability and contract issues in existing voice flows so recording, transcription, telemetry, and playback behavior are predictable across web and API boundaries.

## 2) Problems this phase solves

- Recording UI state could diverge from actual recorder state, causing false "recording" indicators.
- Recorder completion could be triggered by speech-recognition lifecycle events, causing premature truncation.
- Transcription language was hardcoded (`en`), degrading non-English accuracy.
- `/voice/respond` format behavior did not match its runtime PCM16 behavior.
- Mic permission denial did not consistently produce actionable user feedback.
- Accessibility gaps existed in dialog labeling/focus and recording status announcements.
- Voice analytics events were missing or not wired to telemetry backend.

## 3) Task breakdown (individual tasks)

- `P1-T1` — Recording state synchronization
- `P1-T2` — Recorder stop semantics and silence-timeout hardening
- `P1-T3` — Language hint pass-through (client -> API -> service)
- `P1-T4` — PCM16 contract alignment for `/voice/respond`
- `P1-T5` — Mic permission denial handling
- `P1-T6` — Accessibility fixes (status/live regions and modal accessibility)
- `P1-T7` — Voice analytics event wiring

## 4) Implementation details by task (problem + solution)

### `P1-T1` — Recording state synchronization

**Problem being solved**
Composer-level optimistic state could indicate recording before media capture actually started, creating UX mismatch and brittle control logic.

**How solution solves it**
Recording state is emitted from `SpeechInput` lifecycle callbacks to parent, making recorder state the source of truth. Composer/toolbar state is now derived from actual capture transitions.

**Key files touched**
- `packages/ui/src/components/ai-elements/speech-input.tsx`
- `packages/ui/src/components/composer/composer.tsx`
- `packages/ui/src/components/composer/composer-tools.tsx`

### `P1-T2` — Recorder stop semantics and silence-timeout hardening

**Problem being solved**
Web Speech `onend`/error paths could indirectly finalize recording blobs, truncating audio when users paused naturally.

**How solution solves it**
Blob finalization is bound to recorder stop path, not speech-recognition end events. Speech lifecycle still updates interim transcript/state, but does not own final audio completion in normal flow.

**Key files touched**
- `packages/ui/src/components/ai-elements/speech-input.tsx`

### `P1-T3` — Language hint pass-through (client -> API -> service)

**Problem being solved**
Hardcoded `language: 'en'` in API route reduced transcription quality for users with other locales.

**How solution solves it**
Web passes `navigator.language` in transcription requests, API consumes `language` from body, and service path receives the hint. Hardcoded English fallback was removed from route logic.

**Key files touched**
- `apps/web/app/hooks/use-transcribe.ts`
- `services/api/src/rpc/routes/mobile.ts`
- `packages/ui/src/components/composer/composer.tsx` (usage path integration)

### `P1-T4` — PCM16 contract alignment for `/voice/respond`

**Problem being solved**
Response format options and runtime output behavior were misaligned, creating ambiguity for clients and tests.

**How solution solves it**
Service/API contract was tightened around PCM16 behavior to match streaming reality, and related tests were updated. This removes format ambiguity and stabilizes client decode expectations.

**Key files touched**
- `packages/services/src/voice-response.service.ts`
- `packages/services/src/voice-response.service.test.ts`
- `services/api/src/rpc/routes/mobile.ts`
- `packages/services/src/voice-transcription.service.ts`

### `P1-T5` — Mic permission denial handling

**Problem being solved**
Permission failures could fail silently or without clear inline feedback, leaving users without recovery guidance.

**How solution solves it**
`SpeechInput` now emits explicit permission-denied callback behavior, and composer surfaces inline error messaging tied to recording flow state.

**Key files touched**
- `packages/ui/src/components/ai-elements/speech-input.tsx`
- `packages/ui/src/components/composer/composer.tsx`

### `P1-T6` — Accessibility fixes (status/live regions and modal accessibility)

**Problem being solved**
Screen-reader users lacked clear announcements for recording/transcription state; modal labeling/focus behavior needed WCAG-aligned improvements.

**How solution solves it**
Added live/status regions in composer voice controls for recording state changes and processing state. `ChatVoiceModal` received improved labeling/focus/escape interaction handling.

**Key files touched**
- `packages/ui/src/components/composer/composer-tools.tsx`
- `packages/ui/src/components/ai-elements/speech-input.tsx`
- `packages/ui/src/components/chat/chat-voice-modal.tsx`

### `P1-T7` — Voice analytics event wiring

**Problem being solved**
`voice_record_started` and `voice_record_stopped` were not consistently emitted and telemetry path had limited observability.

**How solution solves it**
Recording start/stop emissions were added in `SpeechInput`; `emitVoiceEvent` now logs and attempts PostHog capture when available in browser runtime.

**Key files touched**
- `packages/ui/src/components/ai-elements/speech-input.tsx`
- `packages/services/src/voice-events.ts`

## 5) Acceptance criteria

- Recording indicator reflects actual recorder lifecycle, not optimistic UI toggles.
- Recorder completion is not triggered by speech-recognition end events in standard flow.
- Transcription requests pass locale language hints from web client to API/service.
- `/voice/respond` behavior and type/test contract are aligned to PCM16 expectations.
- Mic permission denial produces visible inline error feedback in composer flow.
- Recording and processing status are announced for assistive technologies.
- Recording start/stop events are emitted and routed through telemetry utility.
- Touched voice modules typecheck in their respective workspaces.

## 6) Validation checklist

- [x] `bun run --filter @hominem/ui typecheck`
- [x] `bun run --filter @hominem/web typecheck`
- [x] `bun run --filter @hominem/services typecheck`
- [x] `bun run --filter @hominem/api typecheck`
- [x] Manual: start/stop recording state matches actual recorder behavior
- [x] Manual: interim transcript updates while recording; stop finalizes correctly
- [x] Manual: locale hint is included in transcription request path
- [x] Manual: permission denial surfaces inline error
- [x] Manual: screen-reader status announcements present for recording/processing states
- [x] Manual: recording telemetry events fire on start/stop
- [ ] Full monorepo `bun run lint` (currently blocked by unrelated mobile typecheck issue in `apps/mobile/lib/widget-storage.ts`)

## 7) Risks and mitigations

- **Risk:** Cross-browser differences in MediaRecorder/Web Speech behavior can reintroduce lifecycle edge cases.
  **Mitigation:** Keep recorder finalization isolated to recorder stop path; preserve defensive cleanup in `SpeechInput`.

- **Risk:** Telemetry capture depends on runtime availability of `window.posthog`.
  **Mitigation:** Maintain console fallback and non-throwing capture attempt in `emitVoiceEvent`.

- **Risk:** Accessibility regressions when voice UI evolves in later phases.
  **Mitigation:** Keep aria-live/status patterns in shared composer controls and include a11y checks in regression QA.

- **Risk:** Contract drift between API docs/types and actual `/voice/respond` output.
  **Mitigation:** Enforce PCM16-only expectation in service/API tests and keep route/service schemas synchronized.

## 8) Status (what is done vs pending)

**Done**
- `P1-T1` Recording state synchronization
- `P1-T2` Recorder stop semantics hardening
- `P1-T3` Language hint pass-through
- `P1-T4` PCM16 contract alignment
- `P1-T5` Mic permission error handling
- `P1-T6` Accessibility improvements (live/status + modal fixes)
- `P1-T7` Voice event emission and telemetry path improvement

**Pending / partial**
- Full monorepo `bun run lint` is still blocked by unrelated pre-existing mobile issue (`apps/mobile/lib/widget-storage.ts`), outside Voice I/O scope.
- Telemetry path currently includes PostHog capture attempt plus console logging; full centralized observability hardening can be expanded in later phases.
