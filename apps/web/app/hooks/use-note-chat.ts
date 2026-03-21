import { useHonoQuery } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types/chat.types';

export function useNoteChat(noteId: string) {
  return useHonoQuery<Chat>(['chats', 'note', noteId], ({ chats }) => chats.getByNote({ noteId }), {
    enabled: !!noteId,
    staleTime: 1000 * 60 * 5,
  });
}
