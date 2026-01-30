import type { ChatOutput, ChatMessageOutput } from '@hominem/db/schema';

export interface CreateChatParams {
  title: string;
  userId: string;
}

export interface SearchChatsParams {
  userId: string;
  query: string;
  limit?: number;
}

export interface ChatStats {
  totalChats: number;
  totalMessages: number;
  averageMessagesPerChat: number;
  recentActivity: Date | null;
}

export class ChatError extends Error {
  constructor(
    public type:
      | 'VALIDATION_ERROR'
      | 'DATABASE_ERROR'
      | 'CHAT_NOT_FOUND'
      | 'MESSAGE_NOT_FOUND'
      | 'AUTH_ERROR',
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'ChatError';
  }
}

// Re-exporting these types to be used in other files
export type { ChatOutput, ChatMessageOutput };
