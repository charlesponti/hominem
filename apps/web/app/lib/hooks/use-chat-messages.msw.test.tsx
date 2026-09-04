// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const server = setupServer();

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => ({
    api: {
      chats: {
        ':id': {
          messages: {
            $get: ({ param }: { param: { id: string } }) =>
              fetch(`https://web.test/api/chats/${param.id}/messages?limit=50`),
          },
        },
      },
    },
  }),
}));

import { useChatMessages } from './use-chat-messages';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

describe('useChatMessages MSW recovery boundary', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('exposes a dependency error and recovers through the hook retry command', async () => {
    server.use(
      http.get('https://web.test/api/chats/chat-1/messages', () =>
        HttpResponse.json({ error: 'upstream unavailable' }, { status: 503 }),
      ),
    );

    const { result } = renderHook(() => useChatMessages({ chatId: 'chat-1' }), { wrapper });
    await waitFor(() =>
      expect(result.current.error?.message).toBe('Unable to load this conversation.'),
    );
    expect(result.current.isNotFound).toBe(false);

    server.use(
      http.get('https://web.test/api/chats/chat-1/messages', () =>
        HttpResponse.json([
          {
            id: 'message-1',
            chatId: 'chat-1',
            userId: 'user-1',
            role: 'user',
            content: 'Recovered',
            files: null,
            toolCalls: null,
            reasoning: null,
            parentMessageId: null,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ]),
      ),
    );

    await result.current.retry();
    await waitFor(() => expect(result.current.messages[0]?.content).toBe('Recovered'));
  });
});
