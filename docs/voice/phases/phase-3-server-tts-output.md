# Phase 3 — Server TTS Output

## 1) Goal

Deliver high-quality, server-backed text-to-speech playback for assistant messages in web chat by replacing browser `speechSynthesis` with `/api/voice/speech` playback, while preserving a simple per-message, user-controlled interaction model.

## 2) Problems this phase solves

- Browser `speechSynthesis` produced inconsistent, low-quality output across devices/OS voices.
- Voice output quality did not match improved transcription/input quality, creating a noticeable UX gap.
- The web client had no integration path for the already-available server TTS endpoint (`/api/voice/speech`).
- Message-level playback state (loading, playing, stop) was not robustly represented in chat actions.
- Audio lifecycle management (decode/play/stop/cleanup) was too dependent on browser-native speech APIs and hard to standardize.

## 3) Task breakdown (individual tasks)

### `P3-T1` — Implement server TTS playback hook

- **Problem being solved:** Web chat had no reusable client hook to fetch and play server-generated TTS audio.
- **How solution solves it:** Added a dedicated `useServerSpeech` hook that fetches TTS audio from `voice.speech` (`/api/voice/speech`), decodes audio, and controls playback through `AudioContext`, while exposing `speakingId` and `loadingId`.
- **Key files touched (paths):**
  - `apps/web/app/hooks/use-server-speech.ts`

### `P3-T2` — Wire chat route to server speech state/actions

- **Problem being solved:** Route-level chat orchestration still depended on legacy speech behavior and lacked centralized server-TTS state wiring.
- **How solution solves it:** Updated chat route to use `useServerSpeech` and pass speech state/callbacks into chat UI so message actions can trigger read-aloud with deterministic state transitions.
- **Key files touched (paths):**
  - `apps/web/app/routes/chat/chat.$chatId.tsx`

### `P3-T3` — Update chat UI components for per-message speak UX

- **Problem being solved:** Message UI did not fully represent server-backed voice states (request in-flight vs active playback vs idle).
- **How solution solves it:** Updated chat presentation components to reflect loading/play/stop action states for each assistant message, including labels like `Loading audio` and `Stop reading`.
- **Key files touched (paths):**
  - `packages/ui/src/components/chat/chat.tsx`
  - `packages/ui/src/components/chat/chat-messages.tsx`
  - `packages/ui/src/components/chat/chat-message.tsx`

### `P3-T4` — Deprecate browser speech path from active chat flow

- **Problem being solved:** Legacy `useSpeech.ts` (`speechSynthesis`) path remained the active route for message playback.
- **How solution solves it:** Switched active chat flow to server-backed hook usage in route/UI integration, effectively replacing browser synthesis for this surface.
- **Key files touched (paths):**
  - `apps/web/app/routes/chat/chat.$chatId.tsx`
  - `apps/web/app/hooks/use-server-speech.ts`
  - `packages/ui/src/components/chat/chat.tsx`
  - `packages/ui/src/components/chat/chat-message.tsx`

## 4) Implementation details by task (problem + solution)

### `P3-T1` — Server speech hook

- **Problem:** No standardized client abstraction existed for server TTS fetch/decode/playback control.
- **Solution:** Built `useServerSpeech` to encapsulate:
  - request lifecycle (`loadingId`)
  - playback lifecycle (`speakingId`)
  - Web Audio decode/play
  - stop/cleanup semantics for interrupted playback

### `P3-T2` — Route integration

- **Problem:** Chat route did not orchestrate server TTS state across message actions.
- **Solution:** Route now owns and passes server speech handlers/state into chat components, enabling consistent behavior regardless of message position and re-render timing.

### `P3-T3` — Message action UX states

- **Problem:** Users lacked clear affordance for "fetching audio" versus "audio currently playing."
- **Solution:** Message actions now expose explicit stateful behavior:
  - idle: standard read-aloud action
  - loading: `Loading audio`
  - playing: `Stop reading`
  This reduces ambiguity and supports quick interruption.

### `P3-T4` — Legacy speech replacement

- **Problem:** Browser-native synthesis remained a quality and consistency bottleneck.
- **Solution:** Active chat message playback path now uses server TTS endpoint output, aligning output quality with server voice stack and avoiding device-voice variance.

## 5) Acceptance criteria

- Assistant message read-aloud in web chat uses `/api/voice/speech` (not `window.speechSynthesis`) in active flow.
- Triggering read-aloud on a message shows loading state while audio is being fetched/decoded.
- Once playback starts, UI clearly indicates active playback and supports stopping.
- `speakingId` and `loadingId` are propagated from route-level state to message actions.
- Playback completes cleanly and returns UI to idle state without stale state carryover.
- No regressions to non-voice chat interactions (message rendering, existing actions).

## 6) Validation checklist

- [x] Implement `useServerSpeech` hook for web chat.
- [x] Integrate hook into `chat.$chatId` route state/control path.
- [x] Update chat UI components to render loading/playing/stop states.
- [x] Confirm assistant message action triggers server-backed TTS playback.
- [x] Validate targeted typechecks:
  - [x] `bun run --filter @hominem/ui typecheck`
  - [x] `bun run --filter @hominem/web typecheck`
  - [x] `bun run --filter @hominem/services typecheck`
  - [x] `bun run --filter @hominem/api typecheck`
- [ ] Full monorepo `bun run check` (currently blocked by unrelated `apps/mobile/lib/widget-storage.ts` MMKV type issue).

## 7) Risks and mitigations

- **Risk:** Network or decode latency creates perceived lag before playback.
  - **Mitigation:** Explicit loading state in message action (`Loading audio`) to set user expectation.
- **Risk:** Playback lifecycle leaks (or overlapping playback) can leave stale UI state.
  - **Mitigation:** Centralized hook lifecycle with stop/cleanup and single active `speakingId`.
- **Risk:** Endpoint availability/response failures degrade UX.
  - **Mitigation:** Retry via same action control path; retain deterministic idle fallback on failure.
- **Risk:** Architectural drift between planned standalone `SpeakButton` and implemented message-action integration.
  - **Mitigation:** Current implementation keeps behavior in existing chat action components; can be extracted later without API behavior changes.
- **Risk:** Repository-wide quality gate appears red despite phase completion.
  - **Mitigation:** Track unrelated monorepo blocker separately; rely on passing targeted workspace checks for this phase scope.

## 8) Status (what is done vs pending)

### Done

- Server-backed TTS is implemented and active in web chat message playback flow.
- `useServerSpeech` exists and is wired through chat route/UI.
- Message action states for loading and active playback are implemented.
- Browser `speechSynthesis` path is no longer the active path for this feature surface.
- Targeted typecheck validation for affected workspaces is passing.

### Pending

- Full monorepo `bun run check` remains unresolved due to unrelated mobile type mismatch (`apps/mobile/lib/widget-storage.ts`), outside Phase 3 scope.
- Optional post-phase refinements (not blockers): caching/preload optimization, expanded playback telemetry, and potential extraction to a dedicated reusable `SpeakButton` component if desired for design-system consistency.
