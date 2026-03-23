import type { ChatMessage } from '@hominem/rpc/types/chat.types';

export type ExtendedMessage = ChatMessage & {
  isStreaming?: boolean;
};

export function filterMessagesByQuery(
  messages: ExtendedMessage[],
  query: string,
): ExtendedMessage[] {
  if (!query.trim()) return messages;
  const lowerQuery = query.toLowerCase();
  return messages.filter(
    (message) => !!message.content && message.content.toLowerCase().includes(lowerQuery),
  );
}

export function findPreviousUserMessage(
  messages: ExtendedMessage[],
  startIndex: number,
): ExtendedMessage | undefined {
  let index = startIndex - 1;
  while (index >= 0) {
    const message = messages[index];
    if (message && message.role === 'user') {
      return message;
    }
    index--;
  }
  return undefined;
}