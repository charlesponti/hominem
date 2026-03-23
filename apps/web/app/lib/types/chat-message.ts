import type { ChatMessage } from '@hominem/rpc/types/chat.types';

// Extends the RPC ChatMessage with client-side streaming state.
export type ExtendedMessage = ChatMessage & {
  isStreaming?: boolean;
};
