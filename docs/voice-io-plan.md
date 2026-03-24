# Voice I/O — Product & Engineering Plan

## Objective

Design and implement the best possible end-to-end voice experience for the Hakumi chat system, resolving all existing gaps between the voice infrastructure that is already built and the UX that currently reaches users.

---

## North Star

Voice in Hakumi is a **capture tool**, not a feature.

It should feel as natural and unremarkable as typing. A user should be able to think out loud, hear the workspace respond, and keep going — without needing to see a screen, tap buttons, or think about the interface.

The experience should align directly with the product's core stance: **calm, capable, continuous**. Voice should reduce friction at capture time, not introduce ceremony.

---

## Current State

### What works end-to-end
- Voice input: Mic button → modal → MediaRecorder + Web Speech API → POST `/voice/transcribe` → transcript inserted into composer textarea
- Voice output: AI message text → browser `speechSynthesis` (OS built-in voices, low quality)

### What is server-complete but has no client
- `POST /api/voice/speech` — high-quality OpenAI TTS-1, returns MP3 audio; no web hook exists
- `POST /api/voice/respond` — full round-trip (audio in → transcribe → AI → audio out); no web hook or UI exists

### Known structural gaps
| Gap | File | Impact |
|---|---|---|
| `isRecording` state desynced between Composer and SpeechInput | `composer.tsx` / `speech-input.tsx` | Toolbar shows "recording" before mic is active |
| Language hardcoded to `en` | `mobile.ts` route | Non-English speakers get degraded results silently |
| TTS uses browser voices instead of OpenAI TTS-1 | `use-speech.ts` | Quality gap; jarring compared to transcription fidelity |
| PCM16/format mismatch in voice-response service | `voice-response.service.ts` | Clients requesting non-PCM16 receive wrong bytes |
| Mic permission denial is silent | `speech-input.tsx` | No user feedback; interaction disappears |
| Web Speech silence timeout drives blob delivery | `speech-input.tsx` | Premature recording termination mid-sentence |
| No focus trap in ChatVoiceModal | `chat-voice-modal.tsx` | Accessibility failure |
| `aria-labelledby` missing on dialog | `chat-voice-modal.tsx` | Screen reader doesn't announce dialog title |
| No `aria-live` region for recording state | `composer-tools.tsx` | Screen reader users don't know recording started |
| `voice_record_started` / `voice_record_stopped` never emitted | `speech-input.tsx` | Recording analytics blind spot |
| `emitVoiceEvent` is console-only | `voice-events.ts` | Zero observability |

---

## Principles

1. **Voice-first means capture-first.** The path from "I want to say something" to "it's in the system" must be as short as possible. No confirmation screens. No extra taps.
2. **Quality over capability.** It is better to do two voice things very well than five things acceptably.
3. **Output should match input quality.** If the AI understands nuanced speech, its voice response must sound equally capable. Browser `speechSynthesis` is not good enough.
4. **Never block the primary text experience.** Voice is additive. A user who never uses voice should feel zero friction. A user who uses voice should feel zero friction.
5. **Fail loudly, fail recoverable.** Permission denied, network failure, and low audio quality all need clear, actionable messages with a path to try again.
6. **Accessibility is not optional.** Voice features interact with users who may rely on assistive technology; all components must meet WCAG 2.1 AA.

---

## Experience Design

### Mode 1 — Voice Input (Speak to Compose)

The user's spoken words become the composer's text. This mode already exists but needs to be significantly improved.

**Ideal interaction:**

1. User taps the Mic button in the composer toolbar.
2. Recording starts **immediately** — no modal required, no extra tap.
3. The composer itself becomes the voice state surface:
   - Textarea placeholder changes to a live transcript (interim Web Speech results)
   - Mic button becomes a pulsing stop indicator with a recording timer
   - A subtle waveform or amplitude indicator appears below the toolbar
4. User finishes speaking. They either tap stop, or a configurable silence timeout fires.
5. The final audio blob is sent to `/voice/transcribe` in the background.
6. While waiting (~1.6s): the interim Web Speech transcript stays visible in the textarea — the user can already read it back
7. Server result arrives: replaces the interim text. If identical, no visible change. If corrected, a brief diff-highlight fades in.
8. User can immediately edit the text or send.

**What changes:**
- Remove the modal entirely for voice input. The modal was a workaround for not having inline recording UI.
- `SpeechInput` component is absorbed into the composer, not a separate modal component.
- The composer area expands slightly during recording to show the waveform row.
- Live interim transcript is the primary feedback mechanism — users see their words appear in real time.

**Error handling:**
- Mic permission denied → inline notification in composer: "Microphone access blocked. [Open settings]"
- Network transcription failure → interim Web Speech result is kept; toast: "Transcription failed — your speech was captured from your browser. You can edit it before sending."
- Unsupported browser (no Web Speech API) → graceful degradation: recording still works via MediaRecorder only; show "Transcribing…" spinner until server responds.

---

### Mode 2 — Voice Output (AI Speaks Back)

The AI reads its response aloud using high-quality TTS. This replaces the current `useSpeech` browser synthesis implementation.

**Design decision: explicit per-message playback, not automatic.**

Automatic voice-out breaks the experience for users in public, at desks, or with headphones not connected. An explicit 🔊 button per AI message is the right default. A "Voice Mode" toggle (described below) layers on top for power users.

**Per-message speak button:**

Each AI message card already has an action row (copy, regenerate, etc.). Add a speaker icon:
- Idle: muted speaker icon, no fill
- Loading: icon with subtle spinner ring (audio is being fetched, ~500ms–1.5s)
- Playing: filled speaker with waveform animation, tap to stop
- Error: icon with small error indicator, tap to retry

**On tap:**
1. Call `POST /api/voice/speech` with `{ text, voice: 'nova' }` (default voice, configurable later)
2. Receive MP3 binary
3. Decode with Web Audio API, play immediately
4. Message card shows waveform animation while playing
5. On completion: return to idle state

**What changes:**
- `useSpeech.ts` rewrites to call `/api/voice/speech` instead of `window.speechSynthesis`
- New `useServerSpeech` hook: manages loading state, audio buffer, playback, and abort
- `Chat` component receives and passes `onSpeak` / `speakingId` / `speechLoadingId` (new)
- Message card component renders the speak button as part of the action row

---

### Mode 3 — Voice Mode (Conversational)

A hands-free conversational mode powered by the existing `/voice/respond` endpoint.

**This is a distinct mode, not an extension of Modes 1 and 2.**

**Entry:**
- A "Voice Mode" toggle in the chat header (microphone icon + label: "Voice mode")
- Keyboard shortcut: `Cmd+Shift+V` (web)
- When active: the chat interface shifts into a focused voice state

**Visual treatment during Voice Mode:**
- Chat messages fade to reduced opacity — context is available but not the focus
- A persistent voice orb or waveform indicator anchors the center of the viewport
- A subtle overlay/vignette signals the mode without obscuring content
- Exit button in the corner: `Esc` or tap outside

**Voice Mode interaction loop:**
1. User says something (no button tap required — Voice Mode is always listening)
2. The orb animates to show "listening" state
3. On silence: automatically sends audio to `/voice/respond`
4. Orb transitions to "thinking" state (different animation)
5. AI response audio streams back, orb transitions to "speaking" state
6. On completion: orb returns to listening state, ready for next turn

**Visual orb states:**
- Listening: slow pulse, breathing animation
- Processing: faster rotation/wave
- Speaking: synchronized amplitude visualization tied to audio output level
- Error: brief red flash, returns to listening

**When to ship:**
- Mode 3 is a Phase 2 deliverable. Modes 1 and 2 must ship first and be stable.
- Mode 3 depends on a robust client implementation of the streaming PCM16 audio from `/voice/respond`.

---

## Technical Plan

### Phase 1 — Fix the foundation

These are correctness fixes and quality improvements that must land before any new UI ships.

**P1-A: Fix recording state synchronization**
- Remove `isRecording` from `Composer`. Single source of truth lives in the recording component.
- Composer receives a callback `onRecordingStateChange(isRecording: boolean)` from the recording component.
- The toolbar Mic button reflects actual hardware state, not an optimistic local toggle.

**P1-B: Fix silence-timeout-driven blob delivery**
- In `SpeechInput`, decouple `MediaRecorder` stop from Web Speech `onend`.
- Web Speech `onend` should update the interim transcript but NOT trigger `onAudioRecorded`.
- `onAudioRecorded` fires only when the user explicitly taps stop, OR when a configured `maxRecordingDuration` is exceeded.
- This eliminates premature truncation when the user pauses mid-sentence.

**P1-C: Wire language detection**
- The API route currently passes `language: 'en'` hardcoded.
- Pass `navigator.language` (or user locale from session) from the client.
- The transcription service already accepts the `language` parameter.

**P1-D: Fix PCM16 format mismatch**
- In `voice-response.service.ts`: when the caller requests a format other than `pcm16`, convert using a server-side audio processing step, OR remove the `format` parameter from the input schema and always return `pcm16` with the correct `Content-Type`.
- For Phase 1: remove the `format` parameter and document that `/voice/respond` always returns raw PCM16.

**P1-E: Mic permission error handling**
- In `SpeechInput.startRecording()`: catch `getUserMedia` permission errors explicitly.
- Call a new `onPermissionDenied()` callback.
- Composer surfaces an inline error below the toolbar (not a toast).

**P1-F: Accessibility fixes**
- `ChatVoiceModal`: add `aria-labelledby` pointing to the title element. Add `FocusTrap` component.
- `ComposerTools`: add `aria-live="polite"` region that announces "Recording started" / "Recording stopped".
- `SpeechInput`: add `role="status"` region for processing state.

**P1-G: Wire analytics events**
- `SpeechInput`: emit `voice_record_started` in `startRecording()`, `voice_record_stopped` in `stopRecording()`.
- `voice-events.ts`: implement `emitVoiceEvent` to call `posthog.capture()` (already installed).

---

### Phase 2 — Redesign voice input (inline, no modal)

**P2-A: Inline recording in composer**
- New component: `VoiceCapture` — owns `MediaRecorder` + `Web Speech API`, no modal.
- Mounted directly inside `Composer`, below the textarea, conditionally visible.
- Props: `onTranscriptUpdate(text: string)`, `onRecordingComplete(blob: Blob, interimText: string)`, `onError(type: 'permission' | 'network' | 'unsupported')`.
- Renders: waveform visualizer (amplitude bars from `AnalyserNode`), timer, stop button.

**P2-B: Composer integration**
- When voice is active, the textarea becomes a live transcript surface.
- `placeholder` is replaced by interim transcript text (not inside the placeholder attribute — rendered as a lightweight overlay or by setting `value` directly).
- On stop: textarea receives the server-confirmed transcript. User can edit and send.
- Modal (`ChatVoiceModal`) is removed from the Composer entirely.

**P2-C: Waveform visualizer**
- `Web Audio API` `AnalyserNode` connected to the microphone input stream.
- Renders 20–30 bars that respond to frequency amplitude.
- Uses `requestAnimationFrame` for rendering.
- Stops updating on `stopRecording`, settles to flat line on transition.

---

### Phase 3 — High-quality voice output

**P3-A: `useServerSpeech` hook**

```typescript
interface UseServerSpeechReturn {
  speakingId: string | null
  loadingId: string | null
  speak: (id: string, text: string) => void
  stop: () => void
}
```

- `speak(id, text)`: fetches `/api/voice/speech` → decodes response ArrayBuffer → plays via `Web Audio API AudioContext`.
- `loadingId`: the message currently being fetched (shows spinner on the button).
- `speakingId`: the message currently playing.
- `stop()`: cancels fetch and disconnects the audio graph.
- `AudioContext` is created once and reused across calls.

**P3-B: Message speak button**
- New `SpeakButton` component: receives `messageId`, `content`, `speakingId`, `loadingId`, `onSpeak`, `onStop`.
- States: idle → loading → playing → idle (on completion or stop).
- Animation during playback: three-bar waveform icon (CSS animation, synced loosely to playback, exact timing not required).

**P3-C: Replace `useSpeech.ts`**
- Deprecate `useSpeech.ts` (browser `speechSynthesis`).
- `chat.$chatId.tsx` switches to `useServerSpeech`.
- The `onSpeak` callback now routes through the server TTS path.

---

### Phase 4 — Voice Mode (conversational)

**P4-A: `useVoiceMode` hook**

Manages the full Voice Mode lifecycle:

```typescript
interface VoiceModeTurn {
  userTranscript: string
  aiTranscript: string
  audioBuffer: ArrayBuffer
}

interface UseVoiceModeReturn {
  isActive: boolean
  state: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
  currentTurn: VoiceModeTurn | null
  history: VoiceModeTurn[]
  activate: () => void
  deactivate: () => void
  error: VoiceError | null
}
```

**P4-B: `/voice/respond` client integration**

- `POST /api/voice/respond` already exists.
- New `mutateAsync` wrapper: sends audio blob, receives binary + headers.
- Plays the binary via `AudioContext`.
- Reads `X-User-Transcript` and `X-AI-Transcript` response headers to populate turn history.

**P4-C: PCM16 playback**

Raw PCM16 requires manual `AudioBuffer` construction:
```typescript
const audioContext = new AudioContext({ sampleRate: 24000 })
const pcm = new Int16Array(buffer)
const float32 = Float32Array.from(pcm, v => v / 32768)
const audioBuffer = audioContext.createBuffer(1, float32.length, 24000)
audioBuffer.copyToChannel(float32, 0)
const source = audioContext.createBufferSource()
source.buffer = audioBuffer
source.connect(audioContext.destination)
source.start()
```

A `PCMPlayer` utility class should wrap this with pause/stop/volume controls.

**P4-D: Voice orb component**

- Pure CSS + SVG animation; no library dependency.
- Four states, four visual treatments (described in Experience Design section).
- Accessible: `role="status"`, `aria-label` updates to reflect current state.
- Touch target: minimum 64×64px.

**P4-E: Voice Mode toggle in chat header**

- Icon button in the chat header action row, next to the existing controls.
- Activating Voice Mode: slides an overlay panel up from the bottom (mobile) or dims the chat (desktop) and centers the voice orb.
- `Esc` or a close button exits Voice Mode.
- State is local to the chat route; does not persist across navigation.

---

## Component Map (target state)

```
apps/web/app/routes/chat/chat.$chatId.tsx
  useServerSpeech()           ← replaces useSpeech
  useVoiceMode()              ← new (Phase 4)
  <Chat>
    <MessageList>
      <MessageCard>
        <SpeakButton />       ← new (Phase 3)
    <VoiceModeOverlay />      ← new (Phase 4)

packages/ui/src/components/composer/composer.tsx
  <VoiceCapture />            ← new (Phase 2), replaces ChatVoiceModal
  ComposerTools
    MicButton                 ← drives VoiceCapture visibility

packages/ui/src/components/voice/
  VoiceCapture.tsx            ← new
  SpeakButton.tsx             ← new
  VoiceModeOverlay.tsx        ← new
  VoiceOrb.tsx                ← new
  PCMPlayer.ts                ← new utility

packages/ui/src/lib/hooks/
  use-server-speech.ts        ← new (replaces use-speech.ts)
  use-voice-mode.ts           ← new

apps/web/app/hooks/
  use-transcribe.ts           ← updated (pass navigator.language)
  use-server-speech.ts        ← new (fetches /voice/speech, plays via AudioContext)
```

---

## Audio Format Strategy

| Use case | Endpoint | Format | Playback |
|---|---|---|---|
| AI reads a message | `/voice/speech` | MP3 (OpenAI TTS-1) | `Audio` element or `AudioContext` |
| Voice Mode response | `/voice/respond` | PCM16 raw | `PCMPlayer` utility with manual `AudioBuffer` |

PCM16 requires the `PCMPlayer` utility. MP3 can use `new Audio(objectURL)` or `AudioContext.decodeAudioData` — either works. Prefer `AudioContext` for both so volume, routing, and teardown are consistent.

---

## Phased Delivery

| Phase | Scope | Outcome |
|---|---|---|
| **Phase 1** | Fix foundation bugs + a11y | Correct, accessible, observable voice input as it exists today |
| **Phase 2** | Inline recording | No modal; live waveform and interim transcript in composer |
| **Phase 3** | Server TTS | High-quality AI voice playback, per-message speak button |
| **Phase 4** | Voice Mode | Hands-free conversational loop using `/voice/respond` |

Phases 1 and 2 can be worked in parallel by separate engineers. Phase 3 is independent of Phase 2. Phase 4 depends on Phase 3 being stable.

---

## Out of Scope

- **Wake word / always-listening mode.** Requires background audio access; privacy/battery concerns are not justified for initial delivery.
- **Voice-only notes capture.** Voice capture outside the composer (e.g. a dedicated voice note flow) is a separate product surface. The Composer is the right entry point for now.
- **Voice settings panel** (speed, voice character, language override). These are Phase 5+ and should not block any earlier work.
- **Mobile native voice integration.** This plan covers the web client. Mobile (React Native) has its own audio API constraints and is a separate track.
- **Real-time streaming transcription.** The current server-confirmed approach (interim from Web Speech, confirmed from Gemini) is sufficient. True word-level streaming from the server is not justified by latency data.
