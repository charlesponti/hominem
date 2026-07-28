import { useApiClient } from '@hominem/rpc/react';
import type { Chat, ChatMessageDto as RpcChatMessage } from '@hominem/rpc/types';
import { useQuery } from '@tanstack/react-query';

import { chatKeys } from '../notes/query-keys';
import { selectChat } from './chat-activity';
import { type MessageOutput } from './chatMessages';

export const CHAT_MESSAGES_LIMIT = 50;

function toMessageOutput(message: RpcChatMessage): MessageOutput | null {
  if (message.role === 'tool') {
    return null;
  }

  const audioFile = message.files?.find((file) => file.type === 'audio');

  return {
    id: message.id,
    role: message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: message.reasoning,
    referencedNotes: message.referencedNotes ?? null,
    toolCalls: message.toolCalls ?? null,
    isStreaming: false,
    audio:
      audioFile?.url && audioFile.mimeType
        ? { url: audioFile.url, mimeType: audioFile.mimeType }
        : null,
  };
}

export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useApiClient();
  return useQuery<MessageOutput[]>({
    queryKey: chatKeys.messages(chatId),
    queryFn: async () => {
      const res = await client.api.chats[':id'].messages.$get({
        param: { id: chatId },
        query: { limit: String(CHAT_MESSAGES_LIMIT) },
      });
      const messages = (await res.json()) as RpcChatMessage[];

      const nextMessages = messages.flatMap((message: RpcChatMessage) => {
        const output = toMessageOutput(message as RpcChatMessage);
        return output ? [output] : [];
      });
      return nextMessages;
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
      if (chatId) {
        const res = await client.api.chats[':id'].$get({ param: { id: chatId } });
        const chat = await res.json();
        const { messages: _messages, ...chatRecord } = chat;
        return chatRecord;
      }

      const listRes = await client.api.chats.$get({ query: { limit: '50' } });
      const chats = await listRes.json();
      return selectChat(chats, chatId);
    },
    enabled: Boolean(chatId),
  });
};
