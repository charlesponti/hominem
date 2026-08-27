// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());
const mockClient = { api: { chats: { $post: mockCreate } } };

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import { useStartChat } from './use-start-chat';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useStartChat', () => {
  it('creates the product chat and returns its durable id without starting a stream', async () => {
    mockCreate.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'chat-1', title: 'Hello', archivedAt: null }),
    });
    const onAccepted = vi.fn();
    const { result } = renderHook(() => useStartChat(), { wrapper });

    await result.current.start({ title: 'Hello', message: 'Hello', onAccepted });

    expect(mockCreate).toHaveBeenCalledWith({ json: { title: 'Hello' } });
    expect(onAccepted).toHaveBeenCalledWith({
      chatId: 'chat-1',
      chat: { id: 'chat-1', title: 'Hello', archivedAt: null },
    });
  });
});
