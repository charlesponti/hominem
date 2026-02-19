import * as z from 'zod';

// ============================================================================
// Re-export Database Types (Single Source of Truth)
// ============================================================================

export type {
  Chat,
  ChatMessage,
  ChatMessageToolCall,
  ChatMessageFile,
  ChatMessageRole,
} from '@hominem/db/types/chats';

// ============================================================================
// API-Specific Composition Types
// ============================================================================

import type { Chat, ChatMessage } from '@hominem/db/types/chats';

export type ChatWithMessages = Chat & {
  messages: ChatMessage[];
};

// ============================================================================
// SEND MESSAGE
// ============================================================================

export type ChatsSendInput = {
  message: string;
  chatId?: string;
};

export type ChatUIMessageInput = {
  id: string
  role: 'system' | 'user' | 'assistant' | 'data'
  content: string
  parts?: Array<Record<string, unknown>>
  toolInvocations?: Array<Record<string, unknown>>
  createdAt?: string | Date
}

export type ChatsUISendInput = {
  messages: ChatUIMessageInput[]
  chatId?: string
  metadata?: Record<string, unknown>
}

export const chatsSendSchema = z.object({
  message: z.string().min(1),
  chatId: z.string().optional(),
});

export const chatsUISendSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['system', 'user', 'assistant', 'data']),
      content: z.string(),
      parts: z.array(z.record(z.string(), z.unknown())).optional(),
      toolInvocations: z.array(z.record(z.string(), z.unknown())).optional(),
      createdAt: z.union([z.string(), z.date()]).optional(),
    }),
  ),
  chatId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ChatsSendOutput = {
  streamId: string;
  chatId: string;
  chatTitle: string;
  messages: {
    user: ChatMessage;
    assistant: ChatMessage;
  };
  metadata: {
    startTime: number;
    timestamp: string;
  };
};

export type ChatsCreateInput = {
  title: string;
};

// ============================================================================
// Output Types (Inferred from returns - these are optional aliases)
// ============================================================================

export type ChatsListOutput = Chat[];
export type ChatsGetOutput = ChatWithMessages;
export type ChatsCreateOutput = Chat;
export type ChatsUpdateOutput = { success: boolean };
export type ChatsDeleteOutput = { success: boolean };
export type ChatsGetMessagesOutput = ChatMessage[];

// ============================================================================
// MESSAGES OPERATIONS
// ============================================================================

export type MessagesGetOutput = { message: ChatMessage };

export type MessagesUpdateInput = {
  content: string;
};

export type MessagesUpdateOutput = { message: ChatMessage };

export type MessagesDeleteOutput = { success: boolean };

export type MessagesDeleteAfterInput = {
  chatId: string;
  afterTimestamp: string;
};

export type MessagesDeleteAfterOutput = { deletedCount: number };
