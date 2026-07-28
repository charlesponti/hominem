import { logger } from '@hominem/telemetry';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';

import {
  createVoiceComposerError,
  deriveVoiceComposerState,
  maybeApplyCleanedTranscript,
  mergeTranscriptIntoDraft,
  type VoiceComposerError,
} from '~/components/composer/voiceComposerInput.helpers';
import { getNativeErrorCode, useVoiceRecorder } from '~/hooks/useVoiceRecorder';
import VoiceTranscriberModule, { VoiceTranscriberErrorCode } from '~/modules/voice-transcriber';
import { useVoiceCleanup } from '~/services/ai';

interface UseVoiceComposerInputOptions {
  getMessage: () => string;
  setMessage: (message: string) => void;
  onError?: (error: VoiceComposerError) => void;
  // Walkie-talkie mode: when on, a stopped recording auto-sends its raw
  // transcript via onWalkieTalkieSend instead of landing in the draft for
  // review — see processStoppedRecording's fork below.
  onWalkieTalkieSend?: (rawText: string) => void;
}

// Drives the voice pipeline end to end: useVoiceRecorder owns record/stop and
// its own permission/start errors; once a recording stops, this hook takes over
// for transcription (on-device, synchronous with the UI) and cleanup (an LLM
// pass that runs in the background and swaps in cleaner text if it finishes
// before the user has changed the draft further).
export function useVoiceComposerInput({
  getMessage,
  setMessage,
  onError,
  onWalkieTalkieSend,
}: UseVoiceComposerInputOptions) {
  const { cleanup, isCleaningVoice } = useVoiceCleanup();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isWalkieTalkie, setWalkieTalkie] = useState(false);
  // Transcription/cleanup failures are a distinct concern from recording
  // lifecycle failures (permission/start), which useVoiceRecorder owns below —
  // keeping them in separate state avoids processStoppedRecording needing to
  // reference anything returned by that later hook call.
  const [transcriptionError, setTranscriptionError] = useState<VoiceComposerError | null>(null);

  const processStoppedRecording = useCallback(
    async (fileUri: string) => {
      logger.info('[voice-transcriber] processStoppedRecording: start', { fileUri });
      setIsTranscribing(true);
      setTranscriptionError(null);

      try {
        logger.info('[voice-transcriber] processStoppedRecording: calling transcribeFile');
        const result = await VoiceTranscriberModule.transcribeFile(fileUri);
        logger.info('[voice-transcriber] processStoppedRecording: transcribeFile resolved', {
          rawTextLength: result.rawText.length,
          locale: result.locale,
          isOnDevice: result.isOnDevice,
        });
        const rawText = result.rawText.trim();
        if (!rawText) {
          logger.warn('[voice-transcriber] processStoppedRecording: empty rawText, aborting');
          return;
        }

        if (isWalkieTalkie) {
          logger.info(
            '[voice-transcriber] processStoppedRecording: walkie-talkie mode, auto-sending raw transcript',
          );
          setIsTranscribing(false);
          onWalkieTalkieSend?.(rawText);
          return;
        }

        const insertedDraft = mergeTranscriptIntoDraft(getMessage(), rawText);
        setMessage(insertedDraft);
        setIsTranscribing(false);
        logger.info('[voice-transcriber] processStoppedRecording: draft updated, starting cleanup');
        void cleanup({
          rawText,
          locale: result.locale,
          source: 'apple-on-device',
        })
          .then((cleanupResult) => {
            logger.info('[voice-cleanup] cleanup resolved', {
              changed: cleanupResult.changed,
            });
            setMessage(
              maybeApplyCleanedTranscript({
                currentDraft: getMessage(),
                insertedDraft,
                rawText,
                cleanedText: cleanupResult.cleanedText,
                changed: cleanupResult.changed,
              }),
            );
          })
          .catch((error: unknown) => {
            logger.warn('[voice-cleanup] background cleanup failed', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
      } catch (error) {
        logger.error(
          '[voice-transcriber] processStoppedRecording: transcription failed',
          error as Error,
        );
        try {
          new File(fileUri).delete();
        } catch (deleteError) {
          logger.error(
            '[voice-transcriber] processStoppedRecording: orphaned file delete failed',
            deleteError as Error,
          );
        }
        // Permission can be revoked mid-session (e.g. the user backgrounds
        // the app, revokes Speech Recognition in Settings, then returns and
        // stops a long recording) — route that case to the same actionable
        // permission-denied UX instead of a generic transcription failure.
        const code = getNativeErrorCode(error);
        logger.info('[voice-transcriber] processStoppedRecording: native error code', { code });
        const nextError = createVoiceComposerError(
          code === VoiceTranscriberErrorCode.MISSING_PERMISSION
            ? 'permission-denied'
            : 'transcription-failed',
        );
        setTranscriptionError(nextError);
        onError?.(nextError);
      } finally {
        setIsTranscribing(false);
        logger.info('[voice-transcriber] processStoppedRecording: finished');
      }
    },
    [cleanup, getMessage, setMessage, onError, isWalkieTalkie, onWalkieTalkieSend],
  );

  const {
    error: recorderError,
    clearError: clearRecorderError,
    handleMicPress: handleVoicePress,
    cancelVoiceRecording: cancelVoiceRecordingInternal,
    isRecording,
    isRecordingElsewhere,
    recordingStartedAt,
  } = useVoiceRecorder<VoiceComposerError>({
    onRecordingStopped: processStoppedRecording,
    createPermissionDeniedError: () => createVoiceComposerError('permission-denied'),
    createRecordingFailedError: () => createVoiceComposerError('recording-failed'),
    onError,
  });

  // recorderError (permission/start failures) takes priority since it means
  // transcription never got a chance to run at all.
  const error = recorderError ?? transcriptionError;

  const clearError = useCallback(() => {
    clearRecorderError();
    setTranscriptionError(null);
  }, [clearRecorderError]);

  const cancelVoiceRecording = useCallback(
    async (reason?: Parameters<typeof cancelVoiceRecordingInternal>[0]) => {
      await cancelVoiceRecordingInternal(reason);
      setTranscriptionError(null);
    },
    [cancelVoiceRecordingInternal],
  );

  const voiceState = deriveVoiceComposerState({
    isRecording,
    isTranscribing,
    isCleaningVoice,
    error,
  });

  const isBusy = voiceState !== 'idle' && voiceState !== 'failed';

  return {
    handleVoicePress,
    cancelVoiceRecording,
    isBusy,
    isRecording,
    isRecordingElsewhere,
    isCleaningVoice,
    voiceState,
    error,
    clearError,
    recordingStartedAt,
    isWalkieTalkie,
    setWalkieTalkie,
  };
}
