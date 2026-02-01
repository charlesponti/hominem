/**
 * Computed Chat Types
 *
 * This file contains all derived types computed from the Chat schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from chats.schema.ts
 */

import type {
  Chat,
  ChatInsert,
  ChatSelect,
  ChatMessage,
  ChatMessageInsert,
  ChatMessageSelect,
  ChatMessageReasoning,
  ChatMessageToolCall,
  ChatMessageFile,
  ChatMessageRole,
} from './chats.schema';

export type {
  Chat,
  ChatInsert,
  ChatSelect,
  ChatMessage,
  ChatMessageInsert,
  ChatMessageSelect,
  ChatMessageReasoning,
  ChatMessageToolCall,
  ChatMessageFile,
  ChatMessageRole,
};

// Legacy aliases for backward compatibility
export type ChatOutput = Chat;
export type ChatInput = ChatInsert;

export type ChatMessageOutput = ChatMessage;
export type ChatMessageInput = ChatMessageInsert;
