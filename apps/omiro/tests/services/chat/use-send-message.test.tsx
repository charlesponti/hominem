// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MessageOutput } from '~/services/chat/chatMessages';
import { chatKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const { mockGetAuthHeaders, mockImpactAsync, mockNetInfoFetch, mockRandomUUID, mockSendMessage } =
  vi.hoisted(() => ({
    mockGetAuthHeaders: vi.fn().mockResolvedValue({}),
    mockImpactAsync: vi.fn().mockResolvedValue(undefined),
    mockNetInfoFetch: vi.fn().mockResolvedValue({ isConnected: true }),
    mockRandomUUID: vi.fn(() => 'uuid-1'),
    mockSendMessage: vi.fn(),
  }));

vi.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: { Light: 'light' },
}));
vi.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));
vi.mock('@react-native-community/netinfo', () => ({ default: { fetch: mockNetInfoFetch } }));
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));
vi.mock('~/hooks/use-chat-response-length', () => ({ getChatResponseLength: () => 'medium' }));
vi.mock('@hominem/rpc/react', () => ({
  queryKeys: {
    inbox: { pages: () => ['inbox', 'pages'] },
    chats: { list: ['chats', 'list'], messages: (id: string) => ['chats', 'messages', id] },
  },
  useApiClient: () => ({
    api: { chats: { ':id': { generations: { ':generationId': { cancel: { $post: vi.fn() } } } } } },
  }),
}));
vi.mock('~/services/chat/chat-runtime', () => ({
  useChatRuntime: () => ({
    sendMessage: mockSendMessage,
    messages: [],
    isLoading: false,
    runId: 'run-1',
    stop: vi.fn(),
    addToolApprovalResponse: vi.fn(),
    interrupts: [],
  }),
}));

const { useSendMessage } = await import('~/services/chat/use-send-message');

const CHAT_ID = 'chat-1';

describe('useSendMessage', () => {
  afterEach(() => vi.clearAllMocks());

  it('keeps generated prose out of the cache until TanStack finishes', async () => {
    mockSendMessage.mockResolvedValueOnce(undefined);
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );

    await act(async () => {
      await result.current.sendChatMessage({ message: 'Hello there' });
    });

    await waitFor(() => expect(result.current.generation).toBeNull());
    expect(mockSendMessage).toHaveBeenCalledWith('Hello there', expect.any(Object));
    expect(queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID))).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
    ]);
    expect(mockImpactAsync).toHaveBeenCalledOnce();
  });

  it('keeps the optimistic user message when TanStack fails', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('generation failed'));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );

    await act(async () => {
      await result.current.sendChatMessage({ message: 'Hello there' }).catch(() => undefined);
    });

    expect(queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID))).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
    ]);
    expect(result.current.generation).toMatchObject({
      stage: 'failed',
      error: 'generation failed',
    });
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });
});
