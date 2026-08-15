// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockPlayAudioReply = vi.fn();
let listeners: Array<(snapshot: { activeMessageId: string | null; playing: boolean }) => void> = [];
let snapshot: { activeMessageId: string | null; playing: boolean } = {
  activeMessageId: null,
  playing: false,
};

vi.mock('~/components/media/audio-playback.service', () => ({
  playAudioReply: mockPlayAudioReply,
  getPlaybackSnapshot: () => snapshot,
  subscribePlayback: (listener: (snapshot: typeof snapshot) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((registered) => registered !== listener);
    };
  },
}));

const { useAudioPlayback } = await import('~/components/media/useAudioPlayback');

function emitSnapshot(next: typeof snapshot) {
  snapshot = next;
  for (const listener of listeners) listener(next);
}

describe('useAudioPlayback', () => {
  afterEach(() => {
    vi.clearAllMocks();
    listeners = [];
    snapshot = { activeMessageId: null, playing: false };
  });

  it('reports not speaking when no message is active', () => {
    const { result } = renderHook(() => useAudioPlayback('message-1', 'https://audio.example/1'));
    expect(result.current.isSpeaking).toBe(false);
  });

  it('reports speaking only for the message that matches the active playback', () => {
    snapshot = { activeMessageId: 'message-1', playing: true };
    const { result: matching } = renderHook(() =>
      useAudioPlayback('message-1', 'https://audio.example/1'),
    );
    const { result: other } = renderHook(() =>
      useAudioPlayback('message-2', 'https://audio.example/2'),
    );

    expect(matching.current.isSpeaking).toBe(true);
    expect(other.current.isSpeaking).toBe(false);
  });

  it('reacts to snapshot changes emitted after mount', () => {
    const { result } = renderHook(() => useAudioPlayback('message-1', 'https://audio.example/1'));
    expect(result.current.isSpeaking).toBe(false);

    act(() => {
      emitSnapshot({ activeMessageId: 'message-1', playing: true });
    });

    expect(result.current.isSpeaking).toBe(true);
  });

  it('calls playAudioReply with the message id and url on toggle', () => {
    const { result } = renderHook(() => useAudioPlayback('message-1', 'https://audio.example/1'));

    act(() => {
      result.current.toggle();
    });

    expect(mockPlayAudioReply).toHaveBeenCalledWith('message-1', 'https://audio.example/1');
  });

  it('does not call playAudioReply when the url is missing', () => {
    const { result } = renderHook(() => useAudioPlayback('message-1', null));

    act(() => {
      result.current.toggle();
    });

    expect(mockPlayAudioReply).not.toHaveBeenCalled();
  });
});
