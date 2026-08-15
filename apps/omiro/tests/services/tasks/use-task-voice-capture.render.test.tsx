// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockTranscribeFile = vi.fn();
const mockCreateVoiceTasks = vi.fn();
const mockHandleMicPress = vi.fn();
const mockCancelVoiceRecording = vi.fn().mockResolvedValue(undefined);
const mockClearRecorderError = vi.fn();
const mockFileDelete = vi.fn();

vi.mock('~/modules/voice-transcriber', () => ({
  default: { transcribeFile: mockTranscribeFile },
  VoiceTranscriberErrorCode: { MISSING_PERMISSION: 'MISSING_PERMISSION' },
}));

vi.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    delete() {
      mockFileDelete(this.uri);
    }
  },
}));

vi.mock('~/services/tasks/use-voice-tasks', () => ({
  useVoiceTasks: () => ({ mutateAsync: mockCreateVoiceTasks }),
}));

let capturedOnRecordingStopped: ((fileUri: string) => Promise<void>) | undefined;
let recorderReturn: {
  error: unknown;
  isRecording: boolean;
  isRecordingElsewhere: boolean;
  recordingStartedAt: number | null;
};

vi.mock('~/hooks/useVoiceRecorder', () => ({
  getNativeErrorCode: (error: unknown) =>
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined,
  useVoiceRecorder: (options: { onRecordingStopped: (fileUri: string) => Promise<void> }) => {
    capturedOnRecordingStopped = options.onRecordingStopped;
    return {
      error: recorderReturn.error,
      clearError: mockClearRecorderError,
      handleMicPress: mockHandleMicPress,
      cancelVoiceRecording: mockCancelVoiceRecording,
      isRecording: recorderReturn.isRecording,
      isRecordingElsewhere: recorderReturn.isRecordingElsewhere,
      recordingStartedAt: recorderReturn.recordingStartedAt,
    };
  },
}));

const { useTaskVoiceCapture } = await import('~/services/tasks/use-task-voice-capture');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useTaskVoiceCapture', () => {
  beforeEach(() => {
    capturedOnRecordingStopped = undefined;
    recorderReturn = {
      error: null,
      isRecording: false,
      isRecordingElsewhere: false,
      recordingStartedAt: null,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('moves through transcribing then creating state and reports the created count on success', async () => {
    const transcription = deferred<{ rawText: string }>();
    const creation = deferred<{ tasks: { id: string }[] }>();
    mockTranscribeFile.mockReturnValue(transcription.promise);
    mockCreateVoiceTasks.mockReturnValue(creation.promise);

    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());
    expect(result.current.state).toBe('idle');

    act(() => {
      void capturedOnRecordingStopped?.('file://recording.m4a');
    });
    expect(result.current.state).toBe('transcribing');
    expect(mockTranscribeFile).toHaveBeenCalledWith('file://recording.m4a');

    await act(async () => {
      transcription.resolve({ rawText: 'buy milk and eggs' });
    });
    expect(result.current.state).toBe('creating');
    expect(mockCreateVoiceTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: 'buy milk and eggs',
        referenceDate: expect.any(String),
        timezone: expect.any(String),
      }),
    );

    await act(async () => {
      creation.resolve({ tasks: [{ id: '1' }, { id: '2' }] });
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.createdCount).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('does nothing when the transcript is empty after trimming', async () => {
    mockTranscribeFile.mockResolvedValueOnce({ rawText: '   ' });
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    await act(async () => {
      await capturedOnRecordingStopped?.('file://recording.m4a');
    });

    expect(mockCreateVoiceTasks).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
    expect(result.current.createdCount).toBeNull();
  });

  it('sets a transcription-failed error and deletes the orphaned recording when transcription throws', async () => {
    mockTranscribeFile.mockRejectedValueOnce(new Error('native transcription error'));
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    await act(async () => {
      await capturedOnRecordingStopped?.('file://recording.m4a');
    });

    expect(result.current.state).toBe('failed');
    expect(result.current.error).toEqual({ code: 'transcription-failed' });
    expect(mockFileDelete).toHaveBeenCalledWith('file://recording.m4a');
  });

  it('maps a missing-permission native error code to a permission-denied error', async () => {
    mockTranscribeFile.mockRejectedValueOnce({ code: 'MISSING_PERMISSION' });
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    await act(async () => {
      await capturedOnRecordingStopped?.('file://recording.m4a');
    });

    expect(result.current.error).toEqual({ code: 'permission-denied' });
  });

  it('sets a creation-failed error with the transcript and deletes the recording when task creation throws', async () => {
    mockTranscribeFile.mockResolvedValueOnce({ rawText: 'buy milk' });
    mockCreateVoiceTasks.mockRejectedValueOnce(new Error('server error'));
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    await act(async () => {
      await capturedOnRecordingStopped?.('file://recording.m4a');
    });

    expect(result.current.state).toBe('failed');
    expect(result.current.error).toEqual({ code: 'creation-failed', transcript: 'buy milk' });
    expect(mockFileDelete).toHaveBeenCalledWith('file://recording.m4a');
  });

  it('surfaces the recorder error without running the transcription flow', () => {
    recorderReturn.error = { code: 'permission-denied' };
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    expect(result.current.state).toBe('failed');
    expect(result.current.error).toEqual({ code: 'permission-denied' });
    expect(mockTranscribeFile).not.toHaveBeenCalled();
  });

  it('reflects isRecording as the recording state', () => {
    recorderReturn.isRecording = true;
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    expect(result.current.state).toBe('recording');
    expect(result.current.isBusy).toBe(true);
  });

  it('clears both the recorder error and the task error on clearError', async () => {
    mockTranscribeFile.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    await act(async () => {
      await capturedOnRecordingStopped?.('file://recording.m4a');
    });
    expect(result.current.state).toBe('failed');

    act(() => {
      result.current.clearError();
    });

    expect(mockClearRecorderError).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.state).toBe('idle');
  });

  it('resets transcribing/creating state and clears the task error on cancelVoiceCapture', async () => {
    const transcription = deferred<{ rawText: string }>();
    mockTranscribeFile.mockReturnValue(transcription.promise);
    const { result } = renderHookWithQueryClient(() => useTaskVoiceCapture());

    act(() => {
      void capturedOnRecordingStopped?.('file://recording.m4a');
    });
    expect(result.current.state).toBe('transcribing');

    await act(async () => {
      await result.current.cancelVoiceCapture();
    });

    expect(mockCancelVoiceRecording).toHaveBeenCalledWith('user-cancelled');
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
