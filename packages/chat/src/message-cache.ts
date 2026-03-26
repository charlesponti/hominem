export interface ChatMessageToolCallLike {
  args: Record<string, string>;
  toolCallId: string;
  toolName: string;
  type: 'tool-call';
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  created_at: string;
  chat_id: string;
  profile_id: string;
  focus_ids: string[] | null;
  focus_items: Array<{ id: string; text: string }> | null;
  reasoning?: string | null;
  toolCalls: ReadonlyArray<ChatMessageToolCallLike> | null;
  isStreaming?: boolean;
}

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
    (message) => message.role !== 'user' || serverMessages.some((next) => next.id === message.id),
  );
  const newMessages = serverMessages.filter(
    (serverMessage) => !withoutOptimistic.some((message) => message.id === serverMessage.id),
  );

  return [...withoutOptimistic, ...newMessages];
}

export function getChatRetryDelayMs(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 10000);
}
