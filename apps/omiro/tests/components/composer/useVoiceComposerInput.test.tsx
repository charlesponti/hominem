// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const { fakeRecorder } = vi.hoisted(() => {
  return {
    fakeRecorder: {
      lastOptions: null as {
        onRecordingStopped: (fileUri: string) => Promise<void>;
        createPermissionDeniedError: () => unknown;
        createRecordingFailedError: () => unknown;
        onError?: (error: unknown) => void;
      } | null,
      isRecording: false,
      isRecordingElsewhere: false,
    },
  };
});

const mockHandleMicPress = vi.fn().mockResolvedValue(undefined);
const mockCancelVoiceRecordingInternal = vi.fn().mockResolvedValue(undefined);
const mockClearRecorderError = vi.fn();
const mockTranscribeFile = vi.fn();
const mockCleanup = vi.fn();
const mockFileDelete = vi.fn();
const mockOnError = vi.fn();
let mockIsCleaningVoice = false;

vi.mock('~/hooks/useVoiceRecorder', () => ({
  getNativeErrorCode: (error: unknown) =>
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: string }).code
      : undefined,
  useVoiceRecorder: (options: typeof fakeRecorder.lastOptions) => {
    fakeRecorder.lastOptions = options;
    return {
      error: null,
      clearError: mockClearRecorderError,
      handleMicPress: mockHandleMicPress,
      cancelVoiceRecording: mockCancelVoiceRecordingInternal,
      isRecording: fakeRecorder.isRecording,
      isRecordingElsewhere: fakeRecorder.isRecordingElsewhere,
      recordingStartedAt: null,
    };
  },
}));

vi.mock('~/modules/voice-transcriber', () => ({
  default: { transcribeFile: mockTranscribeFile },
  VoiceTranscriberErrorCode: { MISSING_PERMISSION: 'MISSING_PERMISSION' },
}));

vi.mock('~/services/ai', () => ({
  useVoiceCleanup: () => ({ cleanup: mockCleanup, isCleaningVoice: mockIsCleaningVoice }),
}));

vi.mock('expo-file-system', () => ({
  File: class {
    constructor(public uri: string) {}
    delete() {
      mockFileDelete(this.uri);
    }
  },
}));

const { useVoiceComposerInput } = await import('~/components/composer/useVoiceComposerInput');

function setup(overrides: { onWalkieTalkieSend?: (rawText: string) => void } = {}) {
  let message = '';
  const getMessage = vi.fn(() => message);
  const setMessage = vi.fn((next: string) => {
    message = next;
  });
  const rendered = renderHookWithQueryClient(() =>
    useVoiceComposerInput({ getMessage, setMessage, onError: mockOnError, ...overrides }),
  );
  return { ...rendered, getMessage, setMessage };
}

describe('useVoiceComposerInput', () => {
  beforeEach(() => {
    fakeRecorder.isRecording = false;
    fakeRecorder.isRecordingElsewhere = false;
    fakeRecorder.lastOptions = null;
    mockIsCleaningVoice = false;
    mockCleanup.mockResolvedValue({ cleanedText: 'Cleaned text.', changed: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('merges the transcript into the draft and applies the cleaned result once cleanup resolves', async () => {
    mockTranscribeFile.mockResolvedValue({
      rawText: 'raw words',
      locale: 'en-US',
      isOnDevice: true,
    });
    const { result, setMessage } = setup();

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });

    expect(setMessage).toHaveBeenCalledWith('raw words');
    expect(mockCleanup).toHaveBeenCalledWith({
      rawText: 'raw words',
      locale: 'en-US',
      source: 'apple-on-device',
    });
    expect(setMessage).toHaveBeenLastCalledWith('Cleaned text.');
    expect(result.current.isBusy).toBe(false);
  });

  it('ignores the cleanup result when the draft changed after transcript insertion', async () => {
    mockTranscribeFile.mockResolvedValue({
      rawText: 'raw words',
      locale: 'en-US',
      isOnDevice: true,
    });
    const { setMessage } = setup();

    let resolveCleanup: (value: { cleanedText: string; changed: boolean }) => void = () => {};
    mockCleanup.mockReturnValue(
      new Promise((resolve) => {
        resolveCleanup = resolve;
      }),
    );

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });

    // The user edits the draft themselves before cleanup finishes.
    act(() => setMessage('Edited by user'));
    setMessage.mockClear();
    await act(async () => {
      resolveCleanup({ cleanedText: 'Cleaned text.', changed: true });
      await Promise.resolve();
    });

    // Cleanup still writes back through setMessage, but with the draft left
    // untouched -- the cleaned text is discarded because the draft moved on.
    expect(setMessage).toHaveBeenCalledWith('Edited by user');
    expect(setMessage).not.toHaveBeenCalledWith('Cleaned text.');
  });

  it('does not touch the draft when the transcript is empty', async () => {
    mockTranscribeFile.mockResolvedValue({ rawText: '   ', locale: 'en-US', isOnDevice: true });
    const { setMessage } = setup();

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });

    expect(setMessage).not.toHaveBeenCalled();
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it('auto-sends the raw transcript via onWalkieTalkieSend instead of updating the draft when walkie-talkie mode is on', async () => {
    mockTranscribeFile.mockResolvedValue({
      rawText: 'quick note',
      locale: 'en-US',
      isOnDevice: true,
    });
    const onWalkieTalkieSend = vi.fn();
    const { result, setMessage } = setup({ onWalkieTalkieSend });

    act(() => result.current.setWalkieTalkie(true));

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });

    expect(onWalkieTalkieSend).toHaveBeenCalledWith('quick note');
    expect(setMessage).not.toHaveBeenCalled();
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it('reports a transcription-failed error and deletes the orphaned file on generic failure', async () => {
    mockTranscribeFile.mockRejectedValue(new Error('boom'));
    const { result } = setup();

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });

    expect(mockFileDelete).toHaveBeenCalledWith('file://recording.m4a');
    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'transcription-failed' }),
    );
    expect(result.current.error).toEqual(expect.objectContaining({ code: 'transcription-failed' }));
  });

  it('maps a missing-permission native error onto a permission-denied error', async () => {
    mockTranscribeFile.mockRejectedValue({ code: 'MISSING_PERMISSION' });
    const { result } = setup();

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'permission-denied' }),
    );
    expect(result.current.error).toEqual(expect.objectContaining({ code: 'permission-denied' }));
  });

  it('clears both recorder and transcription errors on clearError', async () => {
    const { result } = setup();

    act(() => {
      result.current.clearError();
    });

    expect(mockClearRecorderError).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('clears any pending transcription error when a recording is cancelled', async () => {
    mockTranscribeFile.mockRejectedValue(new Error('boom'));
    const { result } = setup();

    await act(async () => {
      await fakeRecorder.lastOptions?.onRecordingStopped('file://recording.m4a');
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.cancelVoiceRecording();
    });

    expect(mockCancelVoiceRecordingInternal).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('derives isBusy from the recording state', () => {
    fakeRecorder.isRecording = true;
    const { result } = setup();
    expect(result.current.isBusy).toBe(true);
  });
});
