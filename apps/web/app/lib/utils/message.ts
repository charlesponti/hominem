import type { ExtendedMessage } from '@hominem/ui/types/chat';

/**
 * Filters messages by search query (case-insensitive)
 */
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

/**
 * Finds the previous user message before the given index
 */
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
