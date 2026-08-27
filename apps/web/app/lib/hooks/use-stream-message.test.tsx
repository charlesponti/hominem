// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockTanstack = vi.hoisted(() => ({
  finish: undefined as ((message: unknown) => void) | undefined,
  sendMessage: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('@tanstack/ai-react', () => ({
  fetchHttpStream: vi.fn(() => ({})),
  useChat: (options: { onFinish?: (message: unknown) => void }) => {
    mockTanstack.finish = options.onFinish;
    return {
      messages: [],
      isLoading: false,
      runId: 'run-1',
      sendMessage: mockTanstack.sendMessage,
      stop: mockTanstack.stop,
    };
  },
}));

import { useStreamMessage } from './use-stream-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useStreamMessage', () => {
  it('sends through TanStack and projects the finished assistant message', async () => {
    mockTanstack.sendMessage.mockImplementationOnce(async () => {
      mockTanstack.finish?.({
        role: 'assistant',
        parts: [{ type: 'text', content: 'Done' }],
      });
    });

    const onCommitted = vi.fn();
    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Hello', onCommitted });

    await waitFor(() => expect(result.current.status).toBe('committed'));
    expect(mockTanstack.sendMessage).toHaveBeenCalledWith('Hello', expect.any(Object));
    expect(onCommitted).toHaveBeenCalledWith(expect.objectContaining({ content: 'Done' }));
  });

  it('stops the TanStack run and reports cancellation', async () => {
    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.cancel();

    expect(mockTanstack.stop).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.status).toBe('cancelled'));
  });
});
