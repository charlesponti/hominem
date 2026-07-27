import t from '~/translations';

export type VoiceComposerState = 'idle' | 'recording' | 'transcribing' | 'cleaning' | 'failed';

export type VoiceComposerErrorCode =
  | 'permission-denied'
  | 'recording-failed'
  | 'transcription-failed';

export interface VoiceComposerError {
  code: VoiceComposerErrorCode;
}

export interface VoiceComposerErrorPresentation {
  message: string;
}

// Appends the transcript rather than replacing the draft, so voice input can
// be layered onto text the user already typed.
export function mergeTranscriptIntoDraft(message: string, transcript: string) {
  const trimmedMessage = message.trimEnd();
  if (!trimmedMessage) return transcript;
  return `${trimmedMessage}\n${transcript}`;
}

// Swaps the raw transcript for its cleaned version only if the draft still
// ends with exactly that raw text — if the user has since edited it away,
// there's nothing left to safely replace.
export function replaceTranscriptInDraft(draft: string, rawText: string, cleanedText: string) {
  const suffix = draft.endsWith(rawText) ? rawText : null;
  if (!suffix) return draft;

  return `${draft.slice(0, -rawText.length)}${cleanedText}`;
}

// Cleanup runs in the background after the raw transcript is already inserted,
// so by the time it resolves the user may have kept typing. Only apply the
// cleaned text if the draft is unchanged since insertion — otherwise a
// cleanup edit could clobber or land in the wrong place relative to newer text.
export function maybeApplyCleanedTranscript(input: {
  currentDraft: string;
  insertedDraft: string;
  rawText: string;
  cleanedText: string;
  changed: boolean;
}) {
  if (!input.changed) return input.currentDraft;
  if (input.currentDraft !== input.insertedDraft) return input.currentDraft;

  return replaceTranscriptInDraft(input.insertedDraft, input.rawText, input.cleanedText);
}

export function deriveVoiceComposerState(input: {
  isRecording: boolean;
  isTranscribing: boolean;
  isCleaningVoice: boolean;
  error: VoiceComposerError | null;
}): VoiceComposerState {
  if (input.error) return 'failed';
  if (input.isCleaningVoice) return 'cleaning';
  if (input.isTranscribing) return 'transcribing';
  if (input.isRecording) return 'recording';
  return 'idle';
}

export function createVoiceComposerError(code: VoiceComposerErrorCode): VoiceComposerError {
  return { code };
}

export function getVoiceComposerErrorPresentation(
  code: VoiceComposerErrorCode,
): VoiceComposerErrorPresentation {
  const { voiceErrors } = t.inboxComposer.composer;
  switch (code) {
    case 'permission-denied':
      return { message: voiceErrors.permissionDenied };
    case 'recording-failed':
      return { message: voiceErrors.recordingFailed };
    case 'transcription-failed':
      return { message: voiceErrors.transcriptionFailed };
  }
}
