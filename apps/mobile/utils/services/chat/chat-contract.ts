import type { ChatMessageItem } from '@hominem/ui/chat';

// ChatMessageItem is the canonical shared type for rendered chat messages.
// Re-exported as MessageOutput for backward compatibility with existing consumers.
export type { ChatMessageItem as MessageOutput } from '@hominem/ui/chat';

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
): ChatMessageItem {
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
  previous: ChatMessageItem[],
  serverMessages: ChatMessageItem[],
): ChatMessageItem[] {
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
