import type { ChatMessageOutput, ChatOutput } from '../contracts';

export interface CreateChatParams {
  archivedAt?: string | null;
  title: string;
  userId: string;
  noteId?: string;
}

export interface SearchChatsParams {
  userId: string;
  query: string;
  limit?: number;
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

export type { ChatOutput, ChatMessageOutput };
