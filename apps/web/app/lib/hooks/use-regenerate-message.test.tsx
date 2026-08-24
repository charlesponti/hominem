// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: {
    chats: {
      ':id': {
        messages: { ':messageId': { regenerate: { $post: vi.fn() } } },
      },
    },
  },
}));

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import { useRegenerateMessage } from './use-regenerate-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useRegenerateMessage', () => {
  it('streams regeneration and prevents a concurrent request', async () => {
    const encoder = new TextEncoder();
    let closeStream: () => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"type":"status","generationId":"g","status":"preparing"}\n'),
            );
            closeStream = () => controller.close();
          },
        }),
      ),
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    const first = result.current.regenerate('message-1');
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));
    await result.current.regenerate('message-2');

    expect(
      mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post,
    ).toHaveBeenCalledOnce();
    closeStream();
    await first;
  });
});
