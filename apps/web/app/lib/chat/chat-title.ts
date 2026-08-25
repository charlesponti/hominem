const DEFAULT_CHAT_TITLE = 'New chat';
const CHAT_TITLE_MAX_LENGTH = 80;

export function getAutomaticChatTitle(message: string): string | null {
  const title = normalizeChatTitle(message);
  return title === DEFAULT_CHAT_TITLE ? null : title;
}

export function normalizeChatTitle(message: string): string {
  const title = message.trim().replace(/\s+/g, ' ').slice(0, CHAT_TITLE_MAX_LENGTH);
  return title || DEFAULT_CHAT_TITLE;
}
