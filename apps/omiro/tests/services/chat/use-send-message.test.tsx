// @vitest-environment jsdom
import type { GenerationWireEvent } from '@hominem/chat';
import type { ChatMessageDto } from '@hominem/rpc/types';
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
  consumeGenerationSseXhr: mockConsumeSseXhr,
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

const committedMessage = {
  id: 'assistant-1',
  chatId: CHAT_ID,
  userId: 'user-1',
  role: 'assistant',
  content: 'A durable reply.',
  files: null,
  toolCalls: null,
  reasoning: null,
  parentMessageId: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} satisfies ChatMessageDto;

type PendingStream = {
  onEvent: (event: GenerationWireEvent) => void;
  resolve: () => void;
  reject: (error: Error) => void;
};

let pending: PendingStream | null = null;

describe('useSendMessage', () => {
  beforeEach(() => {
    let count = 0;
    mockRandomUUID.mockImplementation(() => `uuid-${++count}`);
    mockConsumeSseXhr.mockImplementation(
      ({
        onEvent,
        replayUrl,
      }: {
        onEvent: (event: GenerationWireEvent) => void;
        replayUrl?: (afterSequence: number) => string;
      }) =>
        new Promise<void>((resolve, reject) => {
          replayUrl?.(0);
          pending = { onEvent, resolve, reject };
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
      pending?.onEvent({
        version: 1,
        generationId: 'uuid-1',
        sequence: 1,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'saving' },
      });
    });
    expect(result.current.generation).toMatchObject({ stage: 'saving' });

    act(() => {
      pending?.onEvent({
        version: 1,
        type: 'generation.committed',
        generationId: 'uuid-1',
        sequence: 2,
        payload: {
          type: 'generation.committed',
          message: committedMessage,
        },
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

  it('turns a durable generation failure into the failed generation state', async () => {
    const { result } = renderHookWithQueryClient(() => useSendMessage({ chatId: CHAT_ID }));
    let sendPromise: Promise<void> | undefined;

    act(() => {
      sendPromise = result.current.sendChatMessage({ message: 'Hello there' });
    });
    await waitFor(() => expect(mockConsumeSseXhr).toHaveBeenCalledOnce());

    await act(async () => {
      try {
        pending?.onEvent({
          version: 1,
          generationId: 'uuid-1',
          sequence: 1,
          type: 'generation.failed',
          payload: { type: 'generation.failed', message: 'durable failure' },
        });
        pending?.resolve();
      } catch (error) {
        pending?.reject(error instanceof Error ? error : new Error(String(error)));
      }
      await sendPromise?.catch(() => undefined);
    });

    await waitFor(() => expect(result.current.generation?.stage).toBe('failed'));
    expect(result.current.generation?.error).toBe('durable failure');
  });

  it('reduces phase and cancellation events through the shared client reducer', async () => {
    const { result } = renderHookWithQueryClient(() => useSendMessage({ chatId: CHAT_ID }));

    act(() => {
      void result.current.sendChatMessage({ message: 'Stop this reply' });
    });
    await waitFor(() => expect(mockConsumeSseXhr).toHaveBeenCalledOnce());

    act(() => {
      pending?.onEvent({
        version: 1,
        generationId: 'uuid-1',
        sequence: 1,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'preparing' },
      });
      pending?.onEvent({
        version: 1,
        generationId: 'uuid-1',
        sequence: 2,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'cancel_requested' },
      });
      pending?.onEvent({
        version: 1,
        generationId: 'uuid-1',
        sequence: 3,
        type: 'generation.cancelled',
        payload: { type: 'generation.cancelled' },
      });
      pending?.resolve();
    });

    await waitFor(() => expect(result.current.generation).toMatchObject({ stage: 'cancelled' }));
  });

  it('refetches persisted messages when a tool requires confirmation', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );
    queryClient.setQueryData(chatKeys.messages(CHAT_ID), []);

    act(() => {
      void result.current.sendChatMessage({ message: 'Create a collection.' });
    });
    await waitFor(() => expect(mockConsumeSseXhr).toHaveBeenCalledOnce());

    act(() => {
      pending?.onEvent({
        version: 1,
        generationId: 'uuid-1',
        sequence: 1,
        type: 'confirmation.required',
        payload: {
          type: 'confirmation.required',
          call: {
            id: 'call-1',
            name: 'create_collection',
            arguments: '{}',
            turnId: 'uuid-1:0',
            iteration: 0,
          },
        },
      });
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(chatKeys.messages(CHAT_ID))?.isInvalidated).toBe(true),
    );
  });
});
