import { ChatClient } from '@hominem/chat/client';
import type { GenerationClientState } from '@hominem/chat/client';
import { xhrChatTransport } from '@hominem/chat/transport/xhr';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { API_BASE_URL } from '~/constants';
import { useAuth } from '~/services/auth/auth-provider';

import { chatKeys } from '../notes/query-keys';

export function useToolCallRespond({ chatId }: { chatId: string }) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const [isResponding, setIsResponding] = useState(false);
  const clientRef = useRef<ChatClient | null>(null);
  const checkpointsRef = useRef(new Map<string, GenerationClientState>());
  if (!clientRef.current) {
    clientRef.current = new ChatClient({
      baseUrl: API_BASE_URL,
      headers: getAuthHeaders,
      transport: xhrChatTransport(),
      checkpointStore: {
        get: (generationId) => checkpointsRef.current.get(generationId) ?? null,
        set: (state) => {
          checkpointsRef.current.set(state.generationId, state);
        },
        remove: (generationId) => {
          checkpointsRef.current.delete(generationId);
        },
      },
    });
  }

  const respond = useCallback(
    async (input: { messageId: string; toolCallId: string; approved: boolean }) => {
      setIsResponding(true);
      try {
        const generation = clientRef.current!.respondToToolCall({
          chatId,
          messageId: input.messageId,
          toolCallId: input.toolCallId,
          body: { approved: input.approved },
        });
        await generation.done;
      } finally {
        setIsResponding(false);
        await queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatKeys.activeChat(chatId) });
      }
    },
    [chatId, queryClient],
  );

  return { isResponding, respond };
}
