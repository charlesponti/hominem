// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockCleanupPost = vi.fn();
const mockEmitVoiceEvent = vi.fn();

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    api: { voice: { cleanup: { $post: mockCleanupPost } } },
  }),
}));

vi.mock('@hominem/rpc/voice-events', () => ({
  emitVoiceEvent: mockEmitVoiceEvent,
}));

const { useVoiceCleanup } = await import('~/services/ai/use-voice-cleanup');

describe('useVoiceCleanup', () => {
  it('sends rawText and source, emits requested/succeeded events, and returns the data', async () => {
    mockCleanupPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'cleaned text' }),
    });
    const { result } = renderHook(() => useVoiceCleanup());

    let data: unknown;
    await act(async () => {
      data = await result.current.cleanup({ rawText: 'raw', source: 'dictation' });
    });

    expect(mockCleanupPost).toHaveBeenCalledWith({
      json: { rawText: 'raw', source: 'dictation' },
    });
    expect(data).toEqual({ text: 'cleaned text' });
    expect(mockEmitVoiceEvent).toHaveBeenCalledWith(
      'voice_transcribe_requested',
      expect.objectContaining({ platform: 'mobile-ios' }),
    );
    expect(mockEmitVoiceEvent).toHaveBeenCalledWith(
      'voice_transcribe_succeeded',
      expect.objectContaining({ stage: 'complete' }),
    );
  });

  it('includes locale in the payload when provided', async () => {
    mockCleanupPost.mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'x' }) });
    const { result } = renderHook(() => useVoiceCleanup());

    await act(async () => {
      await result.current.cleanup({ rawText: 'raw', locale: 'en-US', source: 'dictation' });
    });

    expect(mockCleanupPost).toHaveBeenCalledWith({
      json: { rawText: 'raw', locale: 'en-US', source: 'dictation' },
    });
  });

  it('throws with the server message and emits a failed event when the response is not ok', async () => {
    mockCleanupPost.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'cleanup broke' }),
    });
    const { result } = renderHook(() => useVoiceCleanup());

    await act(async () => {
      await expect(result.current.cleanup({ rawText: 'raw', source: 'dictation' })).rejects.toThrow(
        'cleanup broke',
      );
    });

    expect(mockEmitVoiceEvent).toHaveBeenCalledWith(
      'voice_transcribe_failed',
      expect.objectContaining({ platform: 'mobile-ios' }),
    );
  });

  it('falls back to a status-based message when the error body has no message', async () => {
    mockCleanupPost.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const { result } = renderHook(() => useVoiceCleanup());

    await act(async () => {
      await expect(result.current.cleanup({ rawText: 'raw', source: 'dictation' })).rejects.toThrow(
        'Voice cleanup failed (503)',
      );
    });
  });

  it('resets isCleaningVoice after completion', async () => {
    mockCleanupPost.mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'x' }) });
    const { result } = renderHook(() => useVoiceCleanup());

    let cleanupPromise: Promise<unknown> | undefined;
    act(() => {
      cleanupPromise = result.current.cleanup({ rawText: 'raw', source: 'dictation' });
    });

    await waitFor(() => expect(result.current.isCleaningVoice).toBe(true));

    await act(async () => {
      await cleanupPromise;
    });

    expect(result.current.isCleaningVoice).toBe(false);
  });
});
