// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: { chats: { ':id': { messages: { search: { $get: vi.fn() } } } } },
}));

vi.mock('@hominem/rpc/react', () => ({ useApiClient: () => mockClient }));

import { useChatMessageSearch } from './use-chat-message-search';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useChatMessageSearch', () => {
  it('does not query for blank or whitespace-only input', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useChatMessageSearch('chat-1', true), { wrapper });

    act(() => result.current.setQuery('   '));
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(mockClient.api.chats[':id'].messages.search.$get).not.toHaveBeenCalled();
  });

  it('trims the debounced query and keeps results outside the message cache', async () => {
    mockClient.api.chats[':id'].messages.search.$get.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 'message-1', content: 'Release plan' }]), { status: 200 }),
    );
    const { result } = renderHook(() => useChatMessageSearch('chat-1', true), { wrapper });

    act(() => result.current.setQuery('  release  '));
    await waitFor(() =>
      expect(mockClient.api.chats[':id'].messages.search.$get).toHaveBeenCalled(),
    );
    expect(mockClient.api.chats[':id'].messages.search.$get).toHaveBeenCalledWith({
      param: { id: 'chat-1' },
      query: { query: 'release', limit: '50' },
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    act(() => result.current.close());
    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
  });
});
