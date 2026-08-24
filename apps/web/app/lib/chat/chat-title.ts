const DEFAULT_CHAT_TITLE = 'New chat';
const CHAT_TITLE_MAX_LENGTH = 80;

export function normalizeChatTitle(message: string): string {
  const title = message.trim().replace(/\s+/g, ' ').slice(0, CHAT_TITLE_MAX_LENGTH);
  return title || DEFAULT_CHAT_TITLE;
}
