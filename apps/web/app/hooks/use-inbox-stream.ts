/**
 * useInboxStream
 *
 * Merges notes and chats into a single chronological feed sorted by updatedAt DESC.
 * Web equivalent of the mobile InboxStream data layer.
 *
 * Naming aligned with mobile:
 *   - mobile: useFocusQuery (notes) + toInboxStreamItems (merge)
 *   - web:    useInboxStream (fetch + merge in one hook, same output shape)
 */

import { useRpcQuery } from '@hominem/rpc/react';
import type { Chat } from '@hominem/chat-services';
import type { Note } from '@hominem/rpc/types/notes.types';
import type { ChatsListOutput } from '@hominem/rpc/types/chat.types';
import { useNotesList } from './use-notes';

// ─── Model (aligned with mobile InboxStreamItem shape) ────────────────────────

export interface InboxNoteItem {
  kind: 'note';
  id: string;
  title: string;
  preview: string | null;
  updatedAt: string;
  /** Full note for web-specific actions (delete, tag management) */
  note: Note;
}

export interface InboxChatItem {
  kind: 'chat';
  id: string;
  title: string;
  preview: string | null;
  updatedAt: string;
  /** Full chat for web-specific actions (delete) */
  chat: Chat;
}

export type InboxStreamItem = InboxNoteItem | InboxChatItem;

// ─── Mappers ──────────────────────────────────────────────────────────────────

function noteTitle(note: Note): string {
  if (note.title?.trim()) return note.title.trim();
  if (note.excerpt?.trim()) return note.excerpt.trim().slice(0, 80);
  if (note.content?.trim()) return note.content.trim().slice(0, 80);
  return 'Untitled note';
}

function toNoteItem(note: Note): InboxNoteItem {
  return {
    kind: 'note',
    id: note.id,
    title: noteTitle(note),
    preview: null,
    updatedAt: note.updatedAt,
    note,
  };
}

function toChatItem(chat: Chat): InboxChatItem {
  return {
    kind: 'chat',
    id: chat.id,
    title: chat.title?.trim() || 'Untitled session',
    preview: null,
    updatedAt: chat.updatedAt,
    chat,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const CHAT_LIMIT = 20;
const NOTE_LIMIT = 100;

export function useInboxStream(): {
  items: InboxStreamItem[];
  isLoading: boolean;
  noteCount: number;
  chatCount: number;
} {
  const { data: notes = [], isLoading: notesLoading } = useNotesList({
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: NOTE_LIMIT,
  });

  const { data: chats, isLoading: chatsLoading } = useRpcQuery(
    ({ chats: c }) => c.list({ limit: CHAT_LIMIT }),
    { queryKey: ['chats', 'list', { limit: CHAT_LIMIT }] },
  );

  const noteItems = (notes as Note[]).map(toNoteItem);
  const chatItems = (chats ?? []).map(toChatItem);

  const items: InboxStreamItem[] = [...noteItems, ...chatItems].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    items,
    isLoading: notesLoading || chatsLoading,
    noteCount: noteItems.length,
    chatCount: chatItems.length,
  };
}
