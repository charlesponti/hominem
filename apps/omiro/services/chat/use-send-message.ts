import type { ChatStreamEvent } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import { playAudioReply } from '~/components/media/audio-playback.service';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';
import { isTestMode, MOCK_AI_RESPONSE } from '~/services/testing/test-mode';

import {
  createOptimisticMessage,
  createStreamingPlaceholder,
  type MessageOutput,
} from './chatMessages';
import { streamSSE } from './stream-sse';

// Batch chunk writes at ~2 frames (60 fps) to avoid a setQueryData per token.
const FLUSH_INTERVAL_MS = 32;

export interface SendInput {
  message: string;
  fileIds?: string[];
  noteIds?: string[];
  responseModality?: 'text' | 'audio';
}

export function useSendMessage({ chatId }: { chatId: string }) {
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
      if (event.type === 'audio') {
        const id = streamingIdRef.current;
        if (!id) return;
        queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
          prev?.map((m) =>
            m.id === id ? { ...m, audio: { url: event.url, mimeType: event.mimeType } } : m,
          ),
        );
        playAudioReply(id, event.url);
        return;
      }

      if (event.type !== 'chunk') {
        return;
      }

      chunkBufferRef.current += event.chunk;
      scheduleFlush();
    },
    [chatId, queryClient, scheduleFlush],
  );

  const mutation = useMutation<
    void,
    Error,
    SendInput,
    { previousMessages: MessageOutput[]; userMsgId: string; assistantMsgId: string }
  >({
    onMutate: async ({ message }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const previousMessages =
        queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId)) ?? [];

      const userMsgId = randomUUID();
      const assistantMsgId = randomUUID();
      streamingIdRef.current = assistantMsgId;
      chunkBufferRef.current = '';

      queryClient.setQueryData<MessageOutput[]>(
        chatKeys.messages(chatId),
        [
          ...previousMessages,
          createOptimisticMessage(chatId, message, null, userMsgId),
          createStreamingPlaceholder(chatId, assistantMsgId),
        ].slice(-50),
      );
      return { previousMessages, userMsgId, assistantMsgId };
    },

    mutationFn: async ({ message, fileIds, noteIds, responseModality }) => {
      if (isTestMode()) {
        // Simulate streaming token-by-token without hitting the real API.
        for (const char of MOCK_AI_RESPONSE) {
          onEvent({ type: 'chunk', chunk: char });
          await new Promise((r) => setTimeout(r, 2));
        }
        flushNow();
        return;
      }

      const net = await NetInfo.fetch();
      if (net.isConnected === false) throw new Error('offline_unavailable');

      await streamSSE<ChatStreamEvent>({
        url: `${API_BASE_URL}/api/chats/${chatId}/stream`,
        payload: {
          message: message.trim(),
          fileIds,
          noteIds,
          responseModality,
          responseLength: getChatResponseLength(),
        },
        getHeaders: getAuthHeaders,
        onEvent,
        onDone: flushNow,
      });

      flushNow();
    },

    onSuccess: (_data, _input, context) => {
      streamingIdRef.current = null;
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        prev?.map((m) => (m.id === context?.assistantMsgId ? { ...m, isStreaming: false } : m)),
      );
      // In test mode the mock never writes to the server, so a background refetch
      // would overwrite the local optimistic data with an empty array.
      if (!isTestMode()) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
        void queryClient.invalidateQueries({ queryKey: inboxKeys.pages() });
      }
    },

    // Marks the failed turn in place instead of rolling it back out of the
    // list -- the user's message (and any partial reply that had already
    // streamed in) stays visible with a failed/interrupted marker so nothing
    // is silently lost, and it can be retried from the transcript.
    onError: (error, _input, context) => {
      streamingIdRef.current = null;
      flushNow();
      if (!context) return;

      const sendErrorMessage =
        error instanceof Error && error.message === 'offline_unavailable'
          ? 'You appear to be offline.'
          : 'Failed to send.';

      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        (prev ?? context.previousMessages).flatMap((m) => {
          if (m.id === context.assistantMsgId) {
            // Drop the placeholder if no reply text ever streamed in;
            // otherwise keep the partial reply, marked interrupted.
            if (!m.message) return [];
            return [{ ...m, isStreaming: false, failed: true, error: 'Response interrupted.' }];
          }
          if (m.id === context.userMsgId) {
            return [{ ...m, failed: true, error: sendErrorMessage }];
          }
          return [m];
        }),
      );
    },
  });

  const sendChatMessage = useCallback(
    async (input: SendInput): Promise<void> => {
      if (!input.message.trim()) return;
      await mutation.mutateAsync(input);
    },
    [mutation],
  );

  // Re-sends a failed user turn: drops the failed message (and any
  // interrupted reply right after it) from the cache, then resubmits its
  // text as a fresh send. Attachments aren't preserved on retry since
  // MessageOutput doesn't retain the original fileIds once sent.
  const retryFailedMessage = useCallback(
    async (messageId: string) => {
      const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId)) ?? [];
      const index = messages.findIndex((m) => m.id === messageId);
      const failedMessage = messages[index];
      if (!failedMessage || failedMessage.role !== 'user' || !failedMessage.failed) return;

      const next = messages.filter((m, i) => {
        if (i === index) return false;
        if (i === index + 1 && m.role === 'assistant' && m.failed) return false;
        return true;
      });
      queryClient.setQueryData(chatKeys.messages(chatId), next);
      // Failure is re-surfaced inline via onError above (it marks the fresh
      // optimistic pair as failed again) -- nothing more to do with the
      // rejection here, just don't let it become an unhandled rejection.
      await sendChatMessage({ message: failedMessage.message }).catch(() => {});
    },
    [chatId, queryClient, sendChatMessage],
  );

  return {
    isChatSending: mutation.isPending,
    sendChatError: mutation.isError,
    sendChatMessage,
    retryFailedMessage,
  };
}
