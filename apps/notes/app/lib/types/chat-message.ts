// Message types from Hono RPC API response
export type MessageFromQuery = {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    type: string;
    args: Record<string, string>;
  }>;
  createdAt: string;
  updatedAt: string;
};

// Extend the inferred message type with client-side properties
export type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean;
};
