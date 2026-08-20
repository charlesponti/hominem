import type { ChatStreamEvent } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import type { MessageOutput } from './chatMessages';
import { streamSSE } from './stream-sse';

// Batch chunk writes at ~2 frames (60 fps) to avoid a setQueryData per token.
const FLUSH_INTERVAL_MS = 32;

export function useRegenerateMessage(chatId: string) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const streamingIdRef = useRef<string | null>(null);
  const chunkBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeBuffer = useCallback(() => {
    const id = streamingIdRef.current;
    const buffer = chunkBufferRef.current;
    if (!id || !buffer) return;
    chunkBufferRef.current = '';
    queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
      prev?.map((m) => (m.id === id ? { ...m, message: m.message + buffer } : m)),
    );
  }, [chatId, queryClient]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      writeBuffer();
    }, FLUSH_INTERVAL_MS);
  }, [writeBuffer]);

  const flushNow = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    writeBuffer();
  }, [writeBuffer]);

  const onEvent = useCallback(
    (event: ChatStreamEvent) => {
      if (event.type !== 'chunk') return;
      chunkBufferRef.current += event.chunk;
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const mutation = useMutation<void, Error, string, { previousMessages: MessageOutput[] }>({
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const previousMessages =
        queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId)) ?? [];

      streamingIdRef.current = messageId;
      chunkBufferRef.current = '';

      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        prev?.map((m) =>
          m.id === messageId
            ? { ...m, message: '', isStreaming: true, failed: false, error: null, audio: null }
            : m,
        ),
      );

      return { previousMessages };
    },

    mutationFn: async (messageId) => {
      await streamSSE<ChatStreamEvent>({
        url: `${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/regenerate`,
        payload: { responseLength: getChatResponseLength() },
        getHeaders: getAuthHeaders,
        onEvent,
        onDone: flushNow,
      });

      flushNow();
    },

    onSuccess: (_data, messageId) => {
      streamingIdRef.current = null;
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        prev?.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m)),
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
    },

    onError: (_error, messageId, context) => {
      streamingIdRef.current = null;
      flushNow();
      if (!context) return;

      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        (prev ?? context.previousMessages).map((m) =>
          m.id === messageId
            ? { ...m, isStreaming: false, failed: true, error: 'Failed to regenerate.' }
            : m,
        ),
      );
    },
  });

  const regenerateMessage = useCallback(
    async (messageId: string) => {
      await mutation.mutateAsync(messageId).catch(() => {});
    },
    [mutation],
  );

  return {
    regenerateMessage,
  };
}
