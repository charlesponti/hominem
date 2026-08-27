import type { ChatMessageItem } from '@hominem/chat';
import { useApiClient } from '@hominem/rpc/react';
import type { Chat, ChatMessageDto as RpcChatMessage } from '@hominem/rpc/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { chatKeys } from '../notes/query-keys';

export const CHAT_MESSAGES_LIMIT = 50;

export function toMessageOutput(message: RpcChatMessage): ChatMessageItem | null {
  if (message.role === 'tool') {
    return null;
  }

  const audioFile = message.files?.find((file) => file.type === 'audio');

  return {
    id: message.id,
    renderKey: message.id,
    role: message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    reasoning: message.reasoning,
    toolCalls: message.toolCalls ?? null,
    isStreaming: false,
    audio:
      audioFile?.url && audioFile.mimeType
        ? { url: audioFile.url, mimeType: audioFile.mimeType }
        : null,
  };
}

export function preserveRenderKeys(
  messages: ChatMessageItem[],
  previousMessages: ChatMessageItem[],
) {
  const usedPreviousIndexes = new Set<number>();

  return messages.map((message) => {
    const previousIndex = previousMessages.findIndex(
      (previous, index) =>
        !usedPreviousIndexes.has(index) &&
        previous.role === message.role &&
        previous.message === message.message,
    );

    if (previousIndex === -1) return message;

    usedPreviousIndexes.add(previousIndex);
    return { ...message, renderKey: previousMessages[previousIndex]?.renderKey };
  });
}

export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useQuery<ChatMessageItem[]>({
    queryKey: chatKeys.messages(chatId),
    queryFn: async () => {
      const res = await client.api.chats[':id'].messages.$get({
        param: { id: chatId },
        query: { limit: String(CHAT_MESSAGES_LIMIT) },
      });
      const messages = (await res.json()) as RpcChatMessage[];

      const nextMessages = messages.flatMap((message: RpcChatMessage) => {
        const output = toMessageOutput(message);
        return output ? [output] : [];
      });
      return preserveRenderKeys(
        nextMessages,
        queryClient.getQueryData<ChatMessageItem[]>(chatKeys.messages(chatId)) ?? [],
      );
    },
    enabled: Boolean(chatId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};

export const useActiveChat = (chatId?: string | null) => {
  const client = useApiClient();
  return useQuery<Chat | null>({
    queryKey: chatKeys.activeChat(chatId ?? null),
    queryFn: async () => {
      const res = await client.api.chats[':id'].$get({ param: { id: chatId as string } });
      const chat = await res.json();
      const { messages: _messages, ...chatRecord } = chat;
      return chatRecord;
    },
    enabled: Boolean(chatId),
  });
};
