// @vitest-environment jsdom
import type { GenerationStreamEvent } from '@hominem/rpc/types';
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chatKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';
import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockRandomUUID = vi.fn();
const mockGetAuthHeaders = vi.fn().mockResolvedValue({});
const mockConsumeSseXhr = vi.fn();

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());
vi.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));
vi.mock('@react-native-community/netinfo', () => ({
  default: { fetch: vi.fn().mockResolvedValue({ isConnected: true }) },
}));
vi.mock('~/services/chat/consume-sse-xhr', () => ({
  consumeSseXhr: mockConsumeSseXhr,
}));
vi.mock('~/services/chat/use-chat-messages', () => ({
  toMessageOutput: (message: { id: string; role: 'user'; content: string }) => ({
    id: message.id,
    role: message.role,
    message: message.content,
  }),
}));
vi.mock('~/services/inbox/inbox-refresh', () => ({ invalidateInboxQueries: vi.fn() }));
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

const { useStartChat } = await import('~/services/chat/use-start-chat');

describe('useStartChat', () => {
  beforeEach(() => {
    mockRandomUUID.mockReturnValue('generation-1');
    mockConsumeSseXhr.mockImplementation(
      ({ onEvent }: { onEvent: (event: GenerationStreamEvent) => void }) => {
        onEvent({
          version: 1,
          type: 'generation.accepted',
          generationId: 'generation-1',
          sequence: 1,
          payload: {
            type: 'generation.accepted',
            chatId: 'chat-1',
            chat: { id: 'chat-1' } as never,
            userMessage: { id: 'user-1', role: 'user', content: 'Hello' } as never,
          },
        });
        return Promise.resolve();
      },
    );
  });

  afterEach(() => vi.clearAllMocks());

  it('reports the chat only after the durable user message is accepted', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useStartChat());
    const onAccepted = vi.fn();

    await act(async () => {
      await result.current.startChat({ title: 'Test', message: 'Hello', onAccepted });
    });

    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
    expect(onAccepted).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ chatId: 'chat-1' }) }),
    );
    expect(queryClient.getQueryData(chatKeys.messages('chat-1'))).toEqual([
      expect.objectContaining({ id: 'user-1', message: 'Hello' }),
    ]);
  });
});
