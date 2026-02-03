import type { ChatMessage } from '@hominem/hono-rpc/types/chat.types';

// Message types from Hono RPC API response
export type MessageFromQuery = ChatMessage;

// Extend the inferred message type with client-side properties
export type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean;
};
