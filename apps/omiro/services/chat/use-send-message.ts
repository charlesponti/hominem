import type { ChatStreamEvent } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { playAudioReply } from '~/components/media/audio-playback.service';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';
import { isTestMode, MOCK_AI_RESPONSE } from '~/services/testing/test-mode';

import {
  type AssistantCompletionHapticGate,
  createAssistantCompletionHapticGate,
} from './assistant-completion-haptic-gate';
import { reconcileBackgroundedAssistantStream } from './chat-stream-cache';
import {
  createOptimisticMessage,
  createStreamingPlaceholder,
  type MessageOutput,
} from './chatMessages';
import { streamSSE } from './stream-sse';

// Batch chunk writes at ~2 frames (60 fps) to avoid a setQueryData per token.
const FLUSH_INTERVAL_MS = 32;

// Approximates production pacing for the dev/E2E mock stream. The real
// endpoint (services/api's chats.ts stream route) forwards raw OpenRouter
// deltas as they arrive with no server-side batching or delay -- each chunk
// event is a few characters wide, not a single character. ~4-char chunks
// every ~20ms targets ~200 chars/sec, in range for the fast model chat is
// configured with (see CHAT_MODEL in packages/env).
const MOCK_CHUNK_DELAY_MS = 20;
const MOCK_CHUNK_MIN_SIZE = 2;
const MOCK_CHUNK_MAX_SIZE = 6;

function* mockStreamChunks(text: string): Generator<string> {
  let index = 0;
  while (index < text.length) {
    const size =
      MOCK_CHUNK_MIN_SIZE +
      Math.floor(Math.random() * (MOCK_CHUNK_MAX_SIZE - MOCK_CHUNK_MIN_SIZE + 1));
    yield text.slice(index, index + size);
    index += size;
  }
}

function triggerAssistantCompletionHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export interface SendInput {
  message: string;
  fileIds?: string[];
  noteIds?: string[];
  responseModality?: 'text' | 'audio';
  /**
   * Pre-generated id for the optimistic user message, so a caller that
   * already started a visual flight for this send (the composer-to-toast
   * handoff) can hand off to the real transcript row under the same id
   * instead of racing a second, independently-generated one. Falls back to
   * a fresh id when omitted -- existing callers are unaffected.
   */
  messageId?: string;
}

export function useSendMessage({ chatId }: { chatId: string }) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const streamingIdRef = useRef<string | null>(null);
  const chunkBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStreamRef = useRef<{
    assistantMessageId: string;
    message: string;
    localMessages: MessageOutput[];
  } | null>(null);
  const wasBackgroundedRef = useRef(false);
  const hapticGateRef = useRef<AssistantCompletionHapticGate>(
    createAssistantCompletionHapticGate(),
  );

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        if (activeStreamRef.current) {
          wasBackgroundedRef.current = true;
        }
        return;
      }

      if (!wasBackgroundedRef.current || !activeStreamRef.current) return;
      wasBackgroundedRef.current = false;
      const stream = activeStreamRef.current;

      void (async () => {
        await queryClient.refetchQueries({ queryKey: chatKeys.messages(chatId), exact: true });
        const result = reconcileBackgroundedAssistantStream(queryClient, {
          chatId,
          ...stream,
        });
        if (result === 'completed') {
          hapticGateRef.current.markCompletedViaBackgroundReconcile(stream.assistantMessageId);
          triggerAssistantCompletionHaptic();
        }
      })();
    });

    return () => subscription.remove();
  }, [chatId, queryClient]);

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
    onMutate: async ({ message, messageId }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const previousMessages =
        queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId)) ?? [];

      const userMsgId = messageId ?? randomUUID();
      const assistantMsgId = randomUUID();
      streamingIdRef.current = assistantMsgId;
      chunkBufferRef.current = '';

      const localMessages = [
        ...previousMessages,
        createOptimisticMessage(chatId, message, null, userMsgId),
        createStreamingPlaceholder(chatId, assistantMsgId),
      ].slice(-50);
      activeStreamRef.current = { assistantMessageId: assistantMsgId, localMessages, message };

      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), localMessages);
      return { previousMessages, userMsgId, assistantMsgId };
    },

    mutationFn: async ({ message, fileIds, noteIds, responseModality }) => {
      if (isTestMode()) {
        for (const chunk of mockStreamChunks(MOCK_AI_RESPONSE)) {
          onEvent({ type: 'chunk', chunk });
          await new Promise((r) => setTimeout(r, MOCK_CHUNK_DELAY_MS));
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
      activeStreamRef.current = null;
      if (hapticGateRef.current.consumeForMutationSettle(context?.assistantMsgId)) {
        triggerAssistantCompletionHaptic();
      }
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

    onError: (_error, _input, context) => {
      streamingIdRef.current = null;
      activeStreamRef.current = null;
      hapticGateRef.current.consumeForMutationSettle(context?.assistantMsgId);
      flushNow();
      if (!context) return;

      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        (prev ?? context.previousMessages).flatMap((m) => {
          if (m.id === context.assistantMsgId) {
            if (!m.message) return [];
            return [{ ...m, isStreaming: false, failed: true, error: 'Response interrupted.' }];
          }
          if (m.id === context.userMsgId) {
            return [{ ...m, failed: true, error: 'Failed to send.' }];
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
