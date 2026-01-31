/**
 * Computed Chat Types
 *
 * This file contains all derived types computed from Chat schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from chats.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import {
  chat,
  chatMessage,
  chatRelations,
  chatMessageRelations,
} from './chats.schema'

// Inferred types from Drizzle schema
export type Chat = InferSelectModel<typeof chat>
export type ChatInsert = InferInsertModel<typeof chat>
export type ChatMessage = InferSelectModel<typeof chatMessage>
export type ChatMessageInsert = InferInsertModel<typeof chatMessage>

// Legacy aliases for backward compatibility
export type ChatSelect = Chat
export type ChatMessageSelect = ChatMessage

export type ChatOutput = Chat
export type ChatInput = ChatInsert
export type ChatMessageOutput = ChatMessage
export type ChatMessageInput = ChatMessageInsert

// Re-export tables and relations
export {
  chat,
  chatMessage,
  chatRelations,
  chatMessageRelations,
} from './chats.schema'

// Re-export union types
export type {
  ChatMessageReasoning,
  ChatMessageToolCall,
  ChatMessageFile,
  ChatMessageRole,
  ChatMessageReasoning as ChatMessageReasoningType,
  ChatMessageToolCall as ChatMessageToolCallType,
  ChatMessageFile as ChatMessageFileType,
  ChatMessageRole as ChatMessageRoleType,
} from './chats.schema'
