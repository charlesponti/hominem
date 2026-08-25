import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';

export const CHAT_NOTE_MAX_LENGTH = 12_000;
export const CHAT_NOTE_DRAFT_STORAGE_KEY = 'hominem:chat-note-draft';

export type ChatNoteDraft = {
  title: string;
  content: string;
  truncated: boolean;
};

export function buildChatNoteDraft(messages: ChatMessageDto[], title: string): ChatNoteDraft {
  const transcript = messages
    .filter((message) => message.content.trim())
    .map(
      (message) => `${message.role === 'user' ? 'You' : 'Assistant'}:\n${message.content.trim()}`,
    )
    .join('\n\n');
  const content = transcript.slice(0, CHAT_NOTE_MAX_LENGTH);

  return {
    title: title.trim() || 'Chat transcript',
    content,
    truncated: content.length < transcript.length,
  };
}

export function saveChatNoteDraft(draft: ChatNoteDraft): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(CHAT_NOTE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }
}

export function readChatNoteDraft(): ChatNoteDraft | null {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(CHAT_NOTE_DRAFT_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ChatNoteDraft;
  } catch {
    return null;
  }
}

export function clearChatNoteDraft(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(CHAT_NOTE_DRAFT_STORAGE_KEY);
  }
}
