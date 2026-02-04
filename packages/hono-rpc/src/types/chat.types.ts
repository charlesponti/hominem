import { z } from 'zod';

// ============================================================================
// Data Types
// ============================================================================

export type ChatMessageToolCall = {
  toolCallId: string;
  toolName: string;
  type: 'tool-call' | 'tool-result';
  args: Record<string, any>;
  result?: any;
  isError?: boolean;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  userId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  files: any | null;
  toolCalls: ChatMessageToolCall[] | null;
  reasoning: string | null;
  parentMessageId: string | null;
  messageIndex: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Chat = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatWithMessages = Chat & {
  messages: ChatMessage[];
};

// ============================================================================
// SEND MESSAGE
// ============================================================================

export type ChatsSendInput = {
  message: string;
  chatId?: string; // Optional if we want to support sending to new chat, but route usually takes ID in param
};

export const chatsSendSchema = z.object({
  message: z.string().min(1),
  chatId: z.string().optional(),
});

export type ChatsSendOutputData = {
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

export type ChatsSendOutput = ChatsSendOutputData;

// ============================================================================
// LIST CHATS
// ============================================================================

export type ChatsListOutput = Chat[];

// ============================================================================
// GET CHAT
// ============================================================================

export type ChatsGetOutput = ChatWithMessages;

// ============================================================================
// CREATE CHAT
// ============================================================================

export type ChatsCreateInput = {
  title: string;
};

export type ChatsCreateOutput = Chat;

// ============================================================================
// UPDATE CHAT
// ============================================================================

export type ChatsUpdateInput = {
  title: string;
};

export type ChatsUpdateOutput = { success: boolean };

// ============================================================================
// DELETE CHAT
// ============================================================================

export type ChatsDeleteOutput = { success: boolean };

// ============================================================================
// GET MESSAGES
// ============================================================================

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
