// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTanstack = vi.hoisted(() => ({
  finish: undefined as (() => void) | undefined,
  sendMessage: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@tanstack/ai-react', () => ({
  fetchHttpStream: vi.fn(() => ({})),
  useChat: (options: { onFinish?: () => void }) => {
    mockTanstack.finish = options.onFinish;
    return {
      isLoading: false,
      runId: 'run-1',
      sendMessage: mockTanstack.sendMessage,
      stop: mockTanstack.stop,
    };
  },
}));

import { useRegenerateMessage } from './use-regenerate-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useRegenerateMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the canonical regenerate operation', async () => {
    mockTanstack.sendMessage.mockImplementationOnce(async () => mockTanstack.finish?.());
    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.regenerate('message-1', 'long');

    expect(mockTanstack.sendMessage).toHaveBeenCalledWith('', {
      body: {
        operation: { kind: 'regenerate', assistantMessageId: 'message-1', responseLength: 'long' },
      },
    });
    await waitFor(() => expect(result.current.status).toBe('committed'));
  });

  it('keeps the target request for retry', async () => {
    mockTanstack.sendMessage.mockRejectedValueOnce(new Error('failed'));
    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.regenerate('message-1', 'long');

    await waitFor(() => expect(result.current.error?.message).toBe('failed'));
    expect(result.current.lastMessageId).toBe('message-1');
  });
});
