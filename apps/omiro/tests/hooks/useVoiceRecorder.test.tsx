// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getNativeErrorCode } from '~/hooks/useVoiceRecorder';

const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockDiscardRecording = vi.fn();
const mockIsRecorderActive = vi.fn();
const mockGetRecordingSnapshot = vi.fn();
const mockGetRecordingCoreSnapshot = vi.fn();

const mockGetPermissions = vi.fn();
const mockRequestPermissions = vi.fn();

let focusCleanup: (() => void) | undefined;

vi.mock('expo-router', () => ({
  useFocusEffect: (callback: () => (() => void) | void) => {
    focusCleanup = callback() ?? undefined;
  },
}));

vi.mock('~/components/media/audio.service', () => ({
  discardRecording: (...args: unknown[]) => mockDiscardRecording(...args),
  getRecordingCoreSnapshot: () => mockGetRecordingCoreSnapshot(),
  getRecordingSnapshot: () => mockGetRecordingSnapshot(),
  isRecorderActive: (...args: unknown[]) => mockIsRecorderActive(...args),
  startRecording: (...args: unknown[]) => mockStartRecording(...args),
  stopRecording: (...args: unknown[]) => mockStopRecording(...args),
  subscribeRecording: () => () => {},
}));

vi.mock('~/modules/voice-transcriber', () => ({
  default: {
    getPermissions: (...args: unknown[]) => mockGetPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  },
}));

const { useVoiceRecorder } = await import('~/hooks/useVoiceRecorder');

const IDLE_SNAPSHOT = { ownerId: null, state: 'IDLE' as const, startedAt: null };

function options(overrides: Partial<Parameters<typeof useVoiceRecorder>[0]> = {}) {
  return {
    onRecordingStopped: vi.fn().mockResolvedValue(undefined),
    createPermissionDeniedError: () => ({ code: 'permission-denied' }),
    createRecordingFailedError: () => ({ code: 'recording-failed' }),
    ...overrides,
  };
}

describe('getNativeErrorCode', () => {
  it('extracts a string code from a native error-like object', () => {
    expect(getNativeErrorCode({ code: 'MISSING_PERMISSION' })).toBe('MISSING_PERMISSION');
  });

  it('returns undefined for non-error-like values', () => {
    expect(getNativeErrorCode(new Error('plain'))).toBeUndefined();
    expect(getNativeErrorCode(null)).toBeUndefined();
    expect(getNativeErrorCode('nope')).toBeUndefined();
  });
});

describe('useVoiceRecorder', () => {
  beforeEach(() => {
    mockGetRecordingCoreSnapshot.mockReturnValue(IDLE_SNAPSHOT);
    mockGetRecordingSnapshot.mockReturnValue(IDLE_SNAPSHOT);
    mockIsRecorderActive.mockImplementation((state: string) => state !== 'IDLE');
    mockGetPermissions.mockResolvedValue('authorized');
    mockStartRecording.mockResolvedValue({ ok: true });
    mockStopRecording.mockResolvedValue({ ok: true, fileUri: 'file://recording.m4a' });
    mockDiscardRecording.mockResolvedValue({ ok: true });
    focusCleanup = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests speech permission then starts recording on mic press when idle', async () => {
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockGetPermissions).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockStartRecording).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('requests permission when not already authorized, and starts recording once granted', async () => {
    mockGetPermissions.mockResolvedValueOnce('denied');
    mockRequestPermissions.mockResolvedValueOnce('authorized');
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockStartRecording).toHaveBeenCalledTimes(1);
  });

  it('reports a permission-denied error and never starts recording when permission is refused', async () => {
    mockGetPermissions.mockResolvedValueOnce('denied');
    mockRequestPermissions.mockResolvedValueOnce('denied');
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder(options({ onError })));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockStartRecording).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({ code: 'permission-denied' });
    expect(onError).toHaveBeenCalledWith({ code: 'permission-denied' });
  });

  it('reports a permission-denied error when the native permission check throws', async () => {
    mockGetPermissions.mockRejectedValueOnce(new Error('native failure'));
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockStartRecording).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({ code: 'permission-denied' });
  });

  it('does not report an error when starting the recording races another owner and is rejected as busy', async () => {
    mockStartRecording.mockResolvedValueOnce({ ok: false, reason: 'busy' });
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(result.current.error).toBeNull();
  });

  it('maps a permission-denied start failure to the permission error', async () => {
    mockStartRecording.mockResolvedValueOnce({ ok: false, reason: 'permission-denied' });
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(result.current.error).toEqual({ code: 'permission-denied' });
  });

  it('maps any other start failure to the recording-failed error', async () => {
    mockStartRecording.mockResolvedValueOnce({ ok: false, reason: 'error' });
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(result.current.error).toEqual({ code: 'recording-failed' });
  });

  it('stops and processes the recording on mic press while owning an active recording', async () => {
    const onRecordingStopped = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(() =>
      useVoiceRecorder(options({ onRecordingStopped })),
    );

    await act(async () => {
      await result.current.handleMicPress();
    });
    expect(mockStartRecording).toHaveBeenCalledTimes(1);
    const ownerId = mockStartRecording.mock.calls[0]?.[0];

    mockGetRecordingCoreSnapshot.mockReturnValue({
      ownerId,
      state: 'RECORDING',
      startedAt: 1,
    });
    rerender();

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockStopRecording).toHaveBeenCalledWith(ownerId);
    expect(onRecordingStopped).toHaveBeenCalledWith('file://recording.m4a');
  });

  it('does not call onRecordingStopped when stopRecording resolves without a fileUri', async () => {
    const onRecordingStopped = vi.fn();
    const { result, rerender } = renderHook(() =>
      useVoiceRecorder(options({ onRecordingStopped })),
    );

    await act(async () => {
      await result.current.handleMicPress();
    });
    const ownerId = mockStartRecording.mock.calls[0]?.[0];
    mockGetRecordingCoreSnapshot.mockReturnValue({
      ownerId,
      state: 'RECORDING' as const,
      startedAt: 1,
    });
    rerender();

    mockStopRecording.mockResolvedValueOnce({ ok: true, fileUri: undefined });
    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockStopRecording).toHaveBeenCalledWith(ownerId);
    expect(onRecordingStopped).not.toHaveBeenCalled();
  });

  it('reports isRecordingElsewhere when another owner holds an active recording', () => {
    mockGetRecordingCoreSnapshot.mockReturnValue({
      ownerId: 'some-other-owner',
      state: 'RECORDING' as const,
      startedAt: 1,
    });
    const { result } = renderHook(() => useVoiceRecorder(options()));

    expect(result.current.isRecordingElsewhere).toBe(true);
    expect(result.current.isRecording).toBe(false);
  });

  it('ignores mic presses while another owner is recording', async () => {
    mockGetRecordingCoreSnapshot.mockReturnValue({
      ownerId: 'some-other-owner',
      state: 'RECORDING' as const,
      startedAt: 1,
    });
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });

    expect(mockStartRecording).not.toHaveBeenCalled();
    expect(mockStopRecording).not.toHaveBeenCalled();
  });

  it('clears the error via clearError', async () => {
    mockGetPermissions.mockResolvedValueOnce('denied');
    mockRequestPermissions.mockResolvedValueOnce('denied');
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('cancels an owned active recording via discardRecording with a user-cancelled reason by default', async () => {
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.cancelVoiceRecording();
    });

    expect(mockDiscardRecording).toHaveBeenCalledWith(expect.any(String), 'user-cancelled');
    expect(result.current.error).toBeNull();
  });

  it('discards an owned active recording as abandoned on unmount', async () => {
    const { result, unmount } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });
    const ownerId = mockStartRecording.mock.calls[0]?.[0];
    mockGetRecordingSnapshot.mockReturnValue({
      ownerId,
      state: 'RECORDING' as const,
      startedAt: 1,
    });

    unmount();

    expect(mockDiscardRecording).toHaveBeenCalledWith(ownerId, 'unmounted');
  });

  it('does not discard on unmount when nothing is recording', () => {
    const { unmount } = renderHook(() => useVoiceRecorder(options()));

    unmount();

    expect(mockDiscardRecording).not.toHaveBeenCalled();
  });

  it('discards an owned active recording as navigated-away when the focus effect cleans up', async () => {
    const { result } = renderHook(() => useVoiceRecorder(options()));

    await act(async () => {
      await result.current.handleMicPress();
    });
    const ownerId = mockStartRecording.mock.calls[0]?.[0];
    mockGetRecordingSnapshot.mockReturnValue({
      ownerId,
      state: 'RECORDING' as const,
      startedAt: 1,
    });

    act(() => {
      focusCleanup?.();
    });

    expect(mockDiscardRecording).toHaveBeenCalledWith(ownerId, 'navigated-away');
  });
});
