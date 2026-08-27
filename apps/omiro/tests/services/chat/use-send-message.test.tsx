// @vitest-environment jsdom
import type { ChatStreamEvent } from '@hominem/rpc/types';
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessageItem } from '~/components/chat';
import { chatKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';
import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockImpactAsync = vi.fn().mockResolvedValue(undefined);
const mockRandomUUID = vi.fn();
const mockGetAuthHeaders = vi.fn().mockResolvedValue({});
const mockNetInfoFetch = vi.fn().mockResolvedValue({ isConnected: true });
const mockConsumeSseXhr = vi.fn();

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());
vi.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: { Light: 'light' },
}));
vi.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));
vi.mock('~/components/media/audio-playback.service', () => ({ playAudioReply: vi.fn() }));
vi.mock('@react-native-community/netinfo', () => ({ default: { fetch: mockNetInfoFetch } }));
vi.mock('~/services/chat/consume-sse-xhr', () => ({
  consumeSseXhr: mockConsumeSseXhr,
}));
vi.mock('~/services/chat/use-chat-messages', () => ({
  toMessageOutput: (message: { id: string; role: 'user' | 'assistant'; content: string }) => ({
    id: message.id,
    renderKey: message.id,
    role: message.role,
    message: message.content,
    created_at: new Date().toISOString(),
    chat_id: CHAT_ID,
    profile_id: '',
    reasoning: null,
    toolCalls: null,
    isStreaming: false,
  }),
}));
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

const { useSendMessage } = await import('~/services/chat/use-send-message');

const CHAT_ID = 'chat-1';

type PendingStream = {
  onEvent: (event: ChatStreamEvent) => void;
  resolve: () => void;
};

let pending: PendingStream | null = null;

describe('useSendMessage', () => {
  beforeEach(() => {
    let count = 0;
    mockRandomUUID.mockImplementation(() => `uuid-${++count}`);
    mockConsumeSseXhr.mockImplementation(
      ({ onEvent }: { onEvent: (event: ChatStreamEvent) => void }) =>
        new Promise<void>((resolve) => {
          pending = { onEvent, resolve };
        }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    pending = null;
  });

  it('keeps generated prose out of the cache until the server commits it', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );

    act(() => {
      void result.current.sendChatMessage({ message: 'Hello there' });
    });
    await waitFor(() => expect(mockConsumeSseXhr).toHaveBeenCalledOnce());

    expect(queryClient.getQueryData<ChatMessageItem[]>(chatKeys.messages(CHAT_ID))).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
    ]);
    expect(result.current.generation).toMatchObject({ stage: 'preparing' });

    act(() => {
      pending?.onEvent({ type: 'status', generationId: 'uuid-1', status: 'saving' });
    });
    expect(result.current.generation).toMatchObject({ stage: 'saving' });

    act(() => {
      pending?.onEvent({
        type: 'committed',
        generationId: 'uuid-1',
        message: { id: 'assistant-1', role: 'assistant', content: 'A durable reply.' } as never,
      });
      pending?.resolve();
    });

    await waitFor(() => expect(result.current.generation).toBeNull());
    expect(queryClient.getQueryData<ChatMessageItem[]>(chatKeys.messages(CHAT_ID))).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
      expect.objectContaining({ role: 'assistant', message: 'A durable reply.' }),
    ]);
    expect(mockImpactAsync).toHaveBeenCalledOnce();
  });

  it('keeps the user message and exposes a retry state when generation fails', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );
    mockConsumeSseXhr.mockRejectedValueOnce(new Error('generation failed'));

    await act(async () => {
      await result.current.sendChatMessage({ message: 'Hello there' }).catch(() => undefined);
    });

    expect(queryClient.getQueryData<ChatMessageItem[]>(chatKeys.messages(CHAT_ID))).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
    ]);
    expect(result.current.generation).toMatchObject({
      stage: 'failed',
      error: 'generation failed',
    });
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });
});
