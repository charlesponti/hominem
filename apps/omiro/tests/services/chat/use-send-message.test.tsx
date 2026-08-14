// @vitest-environment jsdom
import type { ChatStreamEvent } from '@hominem/rpc/types';
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageOutput } from '~/services/chat/chatMessages';
import { chatKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';
import { renderHookWithQueryClient } from '../../utils/render-hook';

// A deterministic AppState double. Defined inside vi.hoisted (not imported)
// so it's available before this file's own imports run — Vitest hoists
// vi.mock factories above the module graph, and a plain top-level const
// referenced from a factory would still be in the temporal dead zone at
// that point.
const { fakeAppState } = vi.hoisted(() => {
  type AppStateStatus = 'active' | 'background' | 'inactive';
  type Listener = (status: AppStateStatus) => void;
  let listeners: Listener[] = [];

  return {
    fakeAppState: {
      addEventListener: (event: string, listener: Listener) => {
        if (event !== 'change') return { remove: () => {} };
        listeners.push(listener);
        return {
          remove: () => {
            listeners = listeners.filter((registered) => registered !== listener);
          },
        };
      },
      emit: (status: AppStateStatus) => {
        for (const listener of listeners) listener(status);
      },
      reset: () => {
        listeners = [];
      },
    },
  };
});

const mockImpactAsync = vi.fn().mockResolvedValue(undefined);
const mockRandomUUID = vi.fn();
const mockGetAuthHeaders = vi.fn().mockResolvedValue({});
const mockNetInfoFetch = vi.fn().mockResolvedValue({ isConnected: true });
const mockStreamSSE = vi.fn();
const mockPlayAudioReply = vi.fn();

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, AppState: fakeAppState };
});

vi.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: { Light: 'light' },
}));

vi.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));

vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));

vi.mock('~/components/media/audio-playback.service', () => ({
  playAudioReply: mockPlayAudioReply,
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: { fetch: mockNetInfoFetch },
}));

vi.mock('~/services/chat/stream-sse', () => ({ streamSSE: mockStreamSSE }));

// Avoid pulling in the real expo-constants -> expo-modules-core chain, which
// needs a native `globalThis.expo` binding that doesn't exist under jsdom.
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

const { useSendMessage } = await import('~/services/chat/use-send-message');

interface PendingStreamCall {
  onEvent: (event: ChatStreamEvent) => void;
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

function serverMessage(overrides: Partial<MessageOutput>): MessageOutput {
  return {
    id: 'server-message',
    role: 'assistant',
    message: '',
    created_at: new Date().toISOString(),
    chat_id: CHAT_ID,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: null,
    referencedNotes: null,
    toolCalls: null,
    isStreaming: false,
    ...overrides,
  } as MessageOutput;
}

const CHAT_ID = 'chat-1';

describe('useSendMessage', () => {
  beforeEach(() => {
    let uuidCount = 0;
    mockRandomUUID.mockImplementation(() => `uuid-${++uuidCount}`);
    mockStreamSSE.mockImplementation(
      ({ onEvent, onDone }: { onEvent: (e: ChatStreamEvent) => void; onDone?: () => void }) =>
        new Promise<void>((resolve, reject) => {
          pendingStreamCalls.push({ onEvent, onDone, resolve, reject });
        }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    fakeAppState.reset();
    pendingStreamCalls = [];
  });

  it('streams chunks into the assistant placeholder and fires the completion haptic once', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendChatMessage({ message: 'Hello there' });
    });

    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));

    const messagesAfterMutate = queryClient.getQueryData<MessageOutput[]>(
      chatKeys.messages(CHAT_ID),
    );
    expect(messagesAfterMutate).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
      expect.objectContaining({ role: 'assistant', message: '', isStreaming: true }),
    ]);

    const call = nextStreamCall();
    act(() => {
      call.onEvent({ type: 'chunk', chunk: 'Hi ' });
      call.onEvent({ type: 'chunk', chunk: 'back!' });
      call.onDone?.();
      call.resolve();
    });

    await act(async () => {
      await sendPromise;
    });

    const finalMessages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID));
    expect(finalMessages).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
      expect.objectContaining({ role: 'assistant', message: 'Hi back!', isStreaming: false }),
    ]);
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
  });

  it('regression: does not double-fire the completion haptic when a backgrounded stream is reconciled and the mutation later also resolves', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );
    vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue(undefined);

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendChatMessage({ message: 'Hello there' });
    });

    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));
    const call = nextStreamCall();

    // App backgrounds mid-stream.
    act(() => {
      fakeAppState.emit('background');
    });

    // While backgrounded, the server finishes the reply — simulate that by
    // seeding the cache with a real server-shaped conversation, matching
    // what reconcileBackgroundedAssistantStream looks for (a user message
    // with the same text, followed by an assistant reply).
    act(() => {
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID), [
        serverMessage({ id: 'server-user', role: 'user', message: 'Hello there' }),
        serverMessage({
          id: 'server-assistant',
          role: 'assistant',
          message: 'Hi back, from the server!',
        }),
      ]);
    });

    // App returns to foreground: the AppState listener refetches, sees the
    // server already has the reply, reconciles, and fires the haptic.
    await act(async () => {
      fakeAppState.emit('active');
      await waitFor(() => expect(mockImpactAsync).toHaveBeenCalledTimes(1));
    });

    // The original streamSSE call — never cancelled by the reconcile — now
    // also resolves normally, as if the connection wasn't actually killed.
    act(() => {
      call.onEvent({ type: 'chunk', chunk: 'Hi back, from the server!' });
      call.onDone?.();
      call.resolve();
    });

    await act(async () => {
      await sendPromise;
    });

    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
  });

  it('marks the message failed without firing a haptic when the app resumes and the server has no reply yet', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );
    // The refetch reflects what the server actually has: just the user
    // message, no assistant reply yet. (A no-op mock would leave the local
    // optimistic streaming placeholder in the cache, which the reconcile
    // heuristic — any assistant row after the user row — would misread as
    // "the server already replied".)
    vi.spyOn(queryClient, 'refetchQueries').mockImplementation(async () => {
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID), [
        serverMessage({ id: 'server-user', role: 'user', message: 'Hello there' }),
      ]);
      return [];
    });

    act(() => {
      void result.current.sendChatMessage({ message: 'Hello there' });
    });
    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));

    act(() => {
      fakeAppState.emit('background');
    });

    await act(async () => {
      fakeAppState.emit('active');
      await waitFor(() => {
        const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID));
        expect(messages?.find((m) => m.role === 'assistant')?.isStreaming).toBe(false);
      });
    });

    const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID));
    expect(messages).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there' }),
      expect.objectContaining({
        role: 'assistant',
        isStreaming: false,
        message: expect.stringContaining('interrupted'),
      }),
    ]);
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });

  it('marks the user message failed without firing a haptic when the stream errors', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useSendMessage({ chatId: CHAT_ID }),
    );

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current
        .sendChatMessage({ message: 'Hello there' })
        .catch(() => undefined);
    });
    await waitFor(() => expect(mockStreamSSE).toHaveBeenCalledTimes(1));

    const call = nextStreamCall();
    act(() => {
      call.reject(new Error('network dropped'));
    });

    await act(async () => {
      await sendPromise;
    });

    const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID));
    expect(messages).toEqual([
      expect.objectContaining({ role: 'user', message: 'Hello there', failed: true }),
    ]);
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });
});
