import type { ChatMessageItem, ChatMessageToolCallLike } from './message-cache';

export interface ServerChatMessageLike {
  id: string;
  role: 'assistant' | 'system' | 'tool' | 'user';
  content: string;
  createdAt: string;
  chatId: string;
  reasoning?: string | null;
  toolCalls?: ReadonlyArray<ChatMessageToolCallLike> | null;
}

export function toChatMessageItem(message: ServerChatMessageLike): ChatMessageItem | null {
  if (message.role === 'tool') {
    return null;
  }

  return {
    id: message.id,
    role: message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: message.reasoning ?? null,
    toolCalls: message.toolCalls ?? null,
    isStreaming: false,
  };
}
