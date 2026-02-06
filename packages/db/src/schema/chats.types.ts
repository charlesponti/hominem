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
/**
 * @deprecated Use {@link Chat} instead. This alias will be removed in a future version.
 */
export type ChatOutput = Chat;

/**
 * @deprecated Use {@link ChatInsert} instead. This alias will be removed in a future version.
 */
export type ChatInput = ChatInsert;

/**
 * @deprecated Use {@link ChatMessage} instead. This alias will be removed in a future version.
 */
export type ChatMessageOutput = ChatMessage;

/**
 * @deprecated Use {@link ChatMessageInsert} instead. This alias will be removed in a future version.
 */
export type ChatMessageInput = ChatMessageInsert;
