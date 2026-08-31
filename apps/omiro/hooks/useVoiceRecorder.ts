import type { VoiceDiscardReason } from '@hominem/rpc/voice-events';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import {
  discardRecording,
  getRecordingCoreSnapshot,
  getRecordingSnapshot,
  isRecorderActive,
  startRecording,
  stopRecording,
  subscribeRecording,
} from '~/components/media/audio.service';
import VoiceTranscriberModule from '~/modules/voice-transcriber';

// Expo Modules attaches a stable `code` string to errors thrown from a native
// Exception (see VoiceTranscriberModule.swift's VoiceTranscriberException).
export function getNativeErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

interface UseVoiceRecorderOptions<TError> {
  onRecordingStopped: (fileUri: string) => Promise<void>;
  createPermissionDeniedError: () => TError;
  createRecordingFailedError: () => TError;
  onError?: (error: TError) => void;
}

function discardIfOwned(ownerId: string, reason: VoiceDiscardReason) {
  const snapshot = getRecordingSnapshot();
  if (snapshot.ownerId === ownerId && isRecorderActive(snapshot.state)) {
    void discardRecording(ownerId, reason);
  }
}

export function useVoiceRecorder<TError>({
  onRecordingStopped,
  createPermissionDeniedError,
  createRecordingFailedError,
  onError,
}: UseVoiceRecorderOptions<TError>) {
  const ownerId = useId();
  // Uses the "core" snapshot (no meterings) -- this hook doesn't need
  // per-poll metering data, and subscribing to the full snapshot would
  // re-render every consumer at the 10Hz metering-poll rate for the whole
  // recording.
  const recordingSnapshot = useSyncExternalStore(
    subscribeRecording,
    getRecordingCoreSnapshot,
    getRecordingCoreSnapshot,
  );
  const [error, setError] = useState<TError | null>(null);
  const isStartingRef = useRef(false);

  const isOwnedByThis = recordingSnapshot.ownerId === ownerId;
  const isRecordingElsewhere = isRecorderActive(recordingSnapshot.state) && !isOwnedByThis;

  const clearError = useCallback(() => setError(null), []);

  const reportError = useCallback(
    (nextError: TError) => {
      setError(nextError);
      onError?.(nextError);
    },
    [onError],
  );

  const ensureSpeechRecognitionPermission = useCallback(async () => {
    const currentStatus = await VoiceTranscriberModule.getPermissions();
    if (currentStatus === 'authorized') return true;

    const nextStatus = await VoiceTranscriberModule.requestPermissions();
    return nextStatus === 'authorized';
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setError(null);

    try {
      let hasSpeechRecognitionPermission: boolean;
      try {
        hasSpeechRecognitionPermission = await ensureSpeechRecognitionPermission();
      } catch {
        reportError(createPermissionDeniedError());
        return;
      }

      if (!hasSpeechRecognitionPermission) {
        reportError(createPermissionDeniedError());
        return;
      }

      const result = await startRecording(ownerId);
      // A duplicate tap racing this async permission check isn't a real
      // failure -- the recorder singleton correctly rejected the second
      // caller, nothing to surface to the user.
      if (result.ok || result.reason === 'busy') return;

      reportError(
        result.reason === 'permission-denied'
          ? createPermissionDeniedError()
          : createRecordingFailedError(),
      );
    } finally {
      isStartingRef.current = false;
    }
  }, [
    createPermissionDeniedError,
    createRecordingFailedError,
    ensureSpeechRecognitionPermission,
    ownerId,
    reportError,
  ]);

  // `onRecordingStopped` is a closure over the caller's own per-render state
  // (draft text, mutation functions, etc.), so it changes every render --
  // read it via ref to avoid recreating `stopAndProcessRecording`/
  // `handleMicPress` every time.
  const onRecordingStoppedRef = useRef(onRecordingStopped);
  useEffect(() => {
    onRecordingStoppedRef.current = onRecordingStopped;
  }, [onRecordingStopped]);

  const stopAndProcessRecording = useCallback(async () => {
    const result = await stopRecording(ownerId);
    if (!result.ok || !result.fileUri) return;
    await onRecordingStoppedRef.current(result.fileUri);
  }, [ownerId]);

  const cancelVoiceRecording = useCallback(
    async (reason: VoiceDiscardReason = 'user-cancelled') => {
      await discardRecording(ownerId, reason);
      setError(null);
    },
    [ownerId],
  );

  const handleMicPress = useCallback(async () => {
    if (isRecordingElsewhere) return;

    if (
      isOwnedByThis &&
      (recordingSnapshot.state === 'RECORDING' || recordingSnapshot.state === 'PAUSED')
    ) {
      await stopAndProcessRecording();
      return;
    }

    if (recordingSnapshot.state !== 'IDLE') return;

    await startVoiceRecording();
  }, [
    isOwnedByThis,
    isRecordingElsewhere,
    recordingSnapshot.state,
    startVoiceRecording,
    stopAndProcessRecording,
  ]);

  // Discard (never transcribe) an owned recording left behind when the
  // consumer disappears -- an unmount or navigating away means abandonment,
  // not intent to submit.
  useEffect(() => {
    return () => {
      discardIfOwned(ownerId, 'unmounted');
    };
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        discardIfOwned(ownerId, 'navigated-away');
      };
    }, [ownerId]),
  );

  const isRecording = isOwnedByThis && isRecorderActive(recordingSnapshot.state);

  return {
    error,
    clearError,
    handleMicPress,
    cancelVoiceRecording,
    isRecording,
    isRecordingElsewhere,
    recordingStartedAt: isRecording ? recordingSnapshot.startedAt : null,
  };
}
