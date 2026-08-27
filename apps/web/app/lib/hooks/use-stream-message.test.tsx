// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockTanstack = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  stop: vi.fn(),
}));

const runtime = vi.hoisted(() => ({
  messages: [] as Array<{ role: string; parts: Array<{ type: string; content: string }> }>,
  isLoading: false,
  runId: 'run-1',
  sendMessage: mockTanstack.sendMessage,
  stop: mockTanstack.stop,
}));

vi.mock('./use-chat-runtime', () => ({ useChatRuntime: () => runtime }));

import { useStreamMessage } from './use-stream-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useStreamMessage', () => {
  it('sends through TanStack and projects the finished assistant message', async () => {
    mockTanstack.sendMessage.mockImplementationOnce(async () => {
      runtime.messages = [{ role: 'assistant', parts: [{ type: 'text', content: 'Done' }] }];
    });

    const onCommitted = vi.fn();
    const { result } = renderHook(
      () => useStreamMessage({ chatId: 'chat-1', runtime: runtime as never }),
      { wrapper },
    );
    await result.current.stream({ message: 'Hello', onCommitted });

    await waitFor(() => expect(result.current.status).toBe('committed'));
    expect(mockTanstack.sendMessage).toHaveBeenCalledWith('Hello', expect.any(Object));
    expect(onCommitted).toHaveBeenCalledWith(expect.objectContaining({ content: 'Done' }));
  });

  it('stops the TanStack run and reports cancellation', async () => {
    const { result } = renderHook(
      () => useStreamMessage({ chatId: 'chat-1', runtime: runtime as never }),
      { wrapper },
    );
    await result.current.cancel();

    expect(mockTanstack.stop).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.status).toBe('cancelled'));
  });
});
