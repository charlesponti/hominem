import type { ChatMessageSnapshot, ChatMessageToolCallRecord } from './generation-schemas';

export type { ChatMessageFileRecord, ChatMessageToolCallRecord } from './generation-schemas';

export interface ChatMessageItem {
  id: string;
  // Stable id for list rendering that survives server reconciliation
  renderKey?: string;
  role: Exclude<ChatMessageSnapshot['role'], 'tool'>;
  message: string;
  created_at: string;
  chat_id: string;
  profile_id: string;
  reasoning?: string | null;
  toolCalls: ChatMessageToolCallRecord[] | null;
  isStreaming?: boolean;
  audio?: { url: string; mimeType: string } | null;
  // Set when a send fails or a stream gets interrupted, instead of removing
  // the message — keeps it visible in the transcript so the user can retry
  failed?: boolean;
  error?: string | null;
}

export type MarkdownComponent = import('react').ComponentType<{
  children: import('react').ReactNode;
  style?: object;
}>;
