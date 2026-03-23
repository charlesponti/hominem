import { useRpcQuery } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types/chat.types';

export function useNoteChat(noteId: string) {
  return useRpcQuery(({ chats }) => chats.getByNote({ noteId }), {
    queryKey: ['chats', 'note', noteId],
    enabled: !!noteId,
    staleTime: 1000 * 60 * 5,
  });
}
