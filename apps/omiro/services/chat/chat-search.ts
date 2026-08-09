import type { ChatMessageItem } from '@hominem/chat';

export function filterMessagesByQuery(
  messages: ChatMessageItem[],
  query: string,
): ChatMessageItem[] {
  if (!query.trim()) return messages;
  const lower = query.toLowerCase();
  return messages.filter((message) => message.message?.toLowerCase().includes(lower));
}
