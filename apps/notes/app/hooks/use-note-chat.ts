import { useHonoMutation, useHonoQuery } from '@hominem/hono-client/react';
import type { Chat } from '@hominem/hono-rpc/types/chat.types';

export function useNoteChat(noteId: string) {
  return useHonoQuery<Chat>(
    ['chats', 'note', noteId],
    ({ chats }) => chats.getByNote({ noteId }),
    {
      enabled: !!noteId,
      staleTime: 1000 * 60 * 5,
    },
  );
}

function useCreateNoteChat() {
  return useHonoMutation<Chat, { noteId: string; title?: string }>(
    ({ chats }, variables) =>
      chats.create({
        title: variables.title || 'Note Chat',
        noteId: variables.noteId,
      }),
  );
}
