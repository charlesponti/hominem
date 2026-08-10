export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessageReferencedNote {
  id: string;
  title: string | null;
}

export interface ChatMessageToolCall {
  toolName: string;
  type: 'tool-call';
  toolCallId: string;
  args: Record<string, string>;
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
  referencedNotes: ChatMessageReferencedNote[] | null;
  toolCalls: ChatMessageToolCall[] | null;
  isStreaming?: boolean;
  audio?: { url: string; mimeType: string } | null;
}

export function getReferencedNoteLabel(note: ChatMessageReferencedNote) {
  return note.title || note.id;
}

export type MarkdownComponent = import('react').ComponentType<{
  children: import('react').ReactNode;
  style?: object;
}>;
