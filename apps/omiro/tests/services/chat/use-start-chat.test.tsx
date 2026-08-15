// @vitest-environment jsdom
import type { ChatsStartStreamEvent } from '@hominem/rpc/types';
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageOutput } from '~/services/chat/chatMessages';
import { chatKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';
import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockRandomUUID = vi.fn();
const mockGetAuthHeaders = vi.fn().mockResolvedValue({});
const mockNetInfoFetch = vi.fn().mockResolvedValue({ isConnected: true });
const mockStreamSSE = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

vi.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: { fetch: mockNetInfoFetch },
}));

vi.mock('~/services/chat/stream-sse', () => ({ streamSSE: mockStreamSSE }));

vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

const { useStartChat } = await import('~/services/chat/use-start-chat');

interface PendingStreamCall {
  onEvent: (event: ChatsStartStreamEvent) => void;
  onDone?: () => void;
  resolve: () => void;
  reject: (error: unknown) => void;
}

let pendingStreamCalls: PendingStreamCall[] = [];

function nextStreamCall(): PendingStreamCall {
  const call = pendingStreamCalls.shift();
  if (!call) throw new Error('Expected a pending streamSSE call');
  return call;
}

function fakeChat(id: string) {
  return {
    id,
    title: 'New conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
  };
}

describe('useStartChat', () => {
  beforeEach(() => {
    let uuidCount = 0;
    mockRandomUUID.mockImplementation(() => `uuid-${++uuidCount}`);
    mockStreamSSE.mockImplementation(
      ({ onEvent, onDone }: { onEvent: (e: ChatsStartStreamEvent) => void; onDone?: () => void }) =>
        new Promise<void>((resolve, reject) => {
          pendingStreamCalls.push({ onEvent, onDone, resolve, reject });
        }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    pendingStreamCalls = [];
  });

  it('throws before streaming when the device is offline', async () => {
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false });
    const { result } = renderHookWithQueryClient(() => useStartChat());

    await act(async () => {
      await expect(result.current.startChat({ message: 'Hello there' } as never)).rejects.toThrow(
        'offline_unavailable',
      );
    });

    expect(mockStreamSSE).not.toHaveBeenCalled();
  });

  it('seeds the chat cache, navigates, and invokes onReady when the stream becomes ready', async () => {
    const onReady = vi.fn();
    const { result, queryClient } = renderHookWithQueryClient(() => useStartChat());

    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current.startChat({
        message: 'Hello there',
        onReady,
      } as never);
    });

    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));
    const call = nextStreamCall();

    act(() => {
      call.onEvent({ type: 'ready', chatId: 'chat-1', chat: fakeChat('chat-1') } as never);
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/(protected)/inbox/chat/chat-1');

    const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages('chat-1'));
    expect(messages).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
      expect.objectContaining({ role: 'assistant', message: '', isStreaming: true }),
    ]);

    act(() => {
      call.onEvent({ type: 'chunk', chunk: 'Hi!' } as never);
      call.onDone?.();
      call.resolve();
    });

    await act(async () => {
      await startPromise;
    });

    const finalMessages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages('chat-1'));
    expect(finalMessages).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
      expect.objectContaining({ role: 'assistant', message: 'Hi!', isStreaming: false }),
    ]);
  });

  it('ignores chunk events that arrive before the ready event', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useStartChat());

    act(() => {
      void result.current.startChat({ message: 'Hello there' } as never);
    });

    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));
    const call = nextStreamCall();

    act(() => {
      call.onEvent({ type: 'chunk', chunk: 'too early' } as never);
    });

    expect(queryClient.getQueryData(chatKeys.messages('chat-1'))).toBeUndefined();
  });

  it('marks the assistant message failed when the stream errors after ready', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useStartChat());

    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current
        .startChat({ message: 'Hello there' } as never)
        .catch(() => undefined);
    });

    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));
    const call = nextStreamCall();

    act(() => {
      call.onEvent({ type: 'ready', chatId: 'chat-1', chat: fakeChat('chat-1') } as never);
    });

    act(() => {
      call.reject(new Error('stream dropped'));
    });

    await act(async () => {
      await startPromise;
    });

    const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages('chat-1'));
    expect(messages?.at(-1)).toEqual(
      expect.objectContaining({
        role: 'assistant',
        isStreaming: false,
        message: expect.stringContaining('stream dropped'),
      }),
    );
  });

  it('rethrows the error without touching the cache when the stream fails before ready', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useStartChat());

    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current
        .startChat({ message: 'Hello there' } as never)
        .catch((error) => {
          throw error;
        });
    });

    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));
    const call = nextStreamCall();

    act(() => {
      call.reject(new Error('never became ready'));
    });

    await expect(startPromise).rejects.toThrow('never became ready');
    expect(queryClient.getQueryData(chatKeys.messages('chat-1'))).toBeUndefined();
  });
});
