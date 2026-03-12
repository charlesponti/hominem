import type { ChatMessage as RpcChatMessage } from '@hominem/hono-rpc/types';

export type MessageOutput = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  created_at: string;
  chat_id: string;
  profile_id: string;
  focus_ids: string[] | null;
  focus_items: Array<{ id: string; text: string }> | null;
  reasoning?: string | null;
  toolCalls: RpcChatMessage['toolCalls'];
  isStreaming?: boolean;
};

function fallbackId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createOptimisticMessage(
  chatId: string,
  messageText: string,
  id = fallbackId(),
): MessageOutput {
  return {
    id,
    role: 'user',
    message: messageText,
    created_at: new Date().toISOString(),
    chat_id: chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: null,
    toolCalls: null,
    isStreaming: false,
  };
}

export function reconcileMessagesAfterSend(
  previous: MessageOutput[],
  serverMessages: MessageOutput[],
): MessageOutput[] {
  const withoutOptimistic = previous.filter(
    (msg) => msg.role !== 'user' || serverMessages.some((m) => m.id === msg.id),
  );
  const newMessages = serverMessages.filter(
    (serverMessage) => !withoutOptimistic.some((oldMessage) => oldMessage.id === serverMessage.id),
  );
  return [...withoutOptimistic, ...newMessages];
}

export function getChatRetryDelayMs(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 10000);
}
