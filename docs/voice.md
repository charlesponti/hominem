# IV. Voice

Voice is a first-class capture path. A person speaks because typing is the wrong interface in that moment; the system must honor that by being decisive, private, and recoverable.

## Outcome law

Every recording ends in one of two states: useful text or an actionable error. The interface never waits forever on native work, and it never silently loses the meaning that was successfully captured.

## Flow

```text
recording
  -> native transcription
  -> raw transcript
  -> composer insertion or task extraction
  -> optional cleanup / persisted tasks
```

- `audio.service.ts` owns the singleton recorder, ownership, metering, file URI, keep-awake behavior, and recorder cleanup.
- `useVoiceRecorder.ts` owns permission, start/stop/cancel, abandonment, and shared React lifecycle behavior.
- `RecordingLevelMeter.tsx` alone consumes live meter data. Other consumers use the stable core snapshot; recording must not cause a 10 Hz app-tree rerender.
- `VoiceTranscriberModule.swift` owns native file validation, on-device asset readiness, audio conversion, stream completion, transcript assembly, and native errors.
- The composer inserts raw text before optional background cleanup. Cleanup never overwrites edits made after insertion.
- Task extraction failure preserves the raw transcript for manual recovery.

## Native reliability law

`VoiceTranscriberModule.transcribeFile(fileUri)` settles exactly once. It returns non-empty text or a stable actionable error. No callback, stream, task, continuation, or asset operation may leave JavaScript in a busy state.

The current engine is iOS `SpeechAnalyzer`. It is on-device by design. The recorded file is converted into the analyzer's negotiated format, streamed through `AsyncStream<AnalyzerInput>`, and collected as final transcription results. The input stream finishes on success and failure; analysis failure cancels result collection before rejection.

Any callback-based API introduced here has an explicit lifetime owner for its delegate, task, and continuation. Weak delegates and unowned callbacks are not permitted.

## Failure and privacy law

- Native errors use stable codes: `INVALID_AUDIO_URL`, `RECOGNIZER_UNAVAILABLE`, `MISSING_PERMISSION`, and `EMPTY_TRANSCRIPT`.
- TypeScript consumes the exported constants, not duplicated string literals.
- Failed transcription and failed task extraction best-effort delete the temporary recording. Error copy describes that behavior truthfully.
- Recording controls have one owner while active: `VoiceRecordingPanel` owns stop; the toolbar does not present a competing stop action.
- Logs may record boundary events—JavaScript invocation, native start, success, and failure—but never transcript content, identifying file paths, tokens, cookies, or credentials.

## Proof required for change

- A spoken physical-device recording returns non-empty text.
- Invalid file, denied permission, unavailable recognizer, and no speech reach visible recoverable states.
- Native failure cannot leave the UI transcribing indefinitely.
- A failed task extraction exposes its raw transcript.
- Background cleanup cannot overwrite subsequent human edits.
- Temporary recordings are cleaned up after failures.


