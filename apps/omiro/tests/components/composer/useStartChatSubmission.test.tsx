// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockStartChat = vi.fn();
const mockAlert = vi.fn();
let mockIsStartingChat = false;

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, Alert: { alert: mockAlert } };
});

vi.mock('~/services/chat', () => ({
  useStartChat: () => ({ startChat: mockStartChat, isStartingChat: mockIsStartingChat }),
  normalizeChatTitle: (value: string) => `title:${value.trim()}`,
}));

const { useStartChatSubmission } = await import('~/components/composer/useStartChatSubmission');

describe('useStartChatSubmission', () => {
  beforeEach(() => {
    mockIsStartingChat = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts the chat with a normalized title and trimmed message, then clears the composer and completes on ready', async () => {
    const clearComposer = vi.fn();
    const onComplete = vi.fn();
    mockStartChat.mockImplementation(async ({ onReady }: { onReady?: () => void }) => {
      onReady?.();
    });

    const { result } = renderHookWithQueryClient(() => useStartChatSubmission());

    await act(async () => {
      await result.current.submitStartChat({
        clearComposer,
        fileIds: ['file-1'],
        message: '  hello there  ',
        onComplete,
      });
    });

    expect(mockStartChat).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'title:hello there',
        message: 'hello there',
        fileIds: ['file-1'],
        noteIds: [],
      }),
    );
    expect(clearComposer).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('does not start a chat while one is already starting', async () => {
    mockIsStartingChat = true;
    const clearComposer = vi.fn();
    const { result } = renderHookWithQueryClient(() => useStartChatSubmission());

    await act(async () => {
      await result.current.submitStartChat({ clearComposer, fileIds: [], message: 'hi' });
    });

    expect(mockStartChat).not.toHaveBeenCalled();
    expect(clearComposer).not.toHaveBeenCalled();
  });

  it('shows an offline-specific alert when starting the chat fails because the device is offline', async () => {
    mockStartChat.mockRejectedValue(new Error('offline_unavailable'));
    const clearComposer = vi.fn();
    const { result } = renderHookWithQueryClient(() => useStartChatSubmission());

    await act(async () => {
      await result.current.submitStartChat({ clearComposer, fileIds: [], message: 'hi' });
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Could not start chat',
      'You appear to be offline. Please reconnect and try again.',
      [{ text: 'OK' }],
    );
    expect(clearComposer).not.toHaveBeenCalled();
  });

  it('shows a generic alert when starting the chat fails for any other reason', async () => {
    mockStartChat.mockRejectedValue(new Error('server exploded'));
    const clearComposer = vi.fn();
    const { result } = renderHookWithQueryClient(() => useStartChatSubmission());

    await act(async () => {
      await result.current.submitStartChat({ clearComposer, fileIds: [], message: 'hi' });
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Could not start chat',
      'We could not start that chat right now. Please try again.',
      [{ text: 'OK' }],
    );
  });

  it('exposes isStartingChat from the underlying mutation', () => {
    mockIsStartingChat = true;
    const { result } = renderHookWithQueryClient(() => useStartChatSubmission());
    expect(result.current.isStartingChat).toBe(true);
  });
});
