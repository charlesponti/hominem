import type { ChatMessageItem } from '~/components/chat';

// ChatMessageItem is the canonical shared type for rendered chat messages.
// Re-exported as MessageOutput for existing consumers.
export type { ChatMessageItem as MessageOutput } from '~/components/chat';

function fallbackId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createOptimisticMessage(
  chatId: string,
  messageText: string,
  referencedNotes: ChatMessageItem['referencedNotes'] = null,
  id = fallbackId(),
): ChatMessageItem {
  return {
    id,
    renderKey: id,
    role: 'user',
    message: messageText,
    created_at: new Date().toISOString(),
    chat_id: chatId,
    profile_id: '',
    reasoning: null,
    referencedNotes,
    toolCalls: null,
    isStreaming: false,
  };
}
