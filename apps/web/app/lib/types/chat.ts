import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';

export type ChatMessageView = ChatMessageDto & {
  isStreaming?: boolean;
};
