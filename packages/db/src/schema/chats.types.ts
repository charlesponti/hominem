/**
 * Computed Chat Types
 *
 * This file contains all derived types computed from Chat schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from chats.schema.ts
 */

import type {
  Chat,
  ChatInsert,
  ChatMessage,
  ChatMessageInsert,
} from './chats.schema';
import {
  chat,
  chatMessage,
  chatRelations,
  chatMessageRelations,
} from './chats.schema';

// ============================================
// CHAT TYPES
// ============================================

export type ChatOutput = Chat;
export type ChatInput = ChatInsert;
export type ChatSelect = Chat;

// ============================================
// CHAT MESSAGE TYPES
// ============================================

export type ChatMessageOutput = ChatMessage;
export type ChatMessageInput = ChatMessageInsert;
export type ChatMessageSelect = ChatMessage;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  chat,
  chatMessage,
  chatRelations,
  chatMessageRelations,
} from './chats.schema';

// ============================================
// RE-EXPORT UNION TYPES
// ============================================

export type {
  ChatMessageReasoning as ChatMessageReasoningType,
  ChatMessageToolCall as ChatMessageToolCallType,
  ChatMessageFile as ChatMessageFileType,
  ChatMessageRole as ChatMessageRoleType,
} from './chats.schema';
