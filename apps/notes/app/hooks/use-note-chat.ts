import type { HonoClient } from '@hominem/hono-client';
import type { Chat } from '@hominem/hono-rpc/types/chat.types';

import { useHonoMutation, useHonoQuery } from '@hominem/hono-client/react';

export function useNoteChat(noteId: string) {
  return useHonoQuery<Chat>(
    ['chats', 'note', noteId],
    async (client: HonoClient) => {
      const res = await client.api.chats['note/:noteId'].$get({
        param: { noteId },
      });
      return res.json() as Promise<Chat>;
    },
    {
      enabled: !!noteId,
      staleTime: 1000 * 60 * 5,
    },
  );
}

export function useCreateNoteChat() {
  return useHonoMutation<Chat, { noteId: string; title?: string }>(
    async (client: HonoClient, variables: { noteId: string; title?: string }) => {
      const res = await client.api.chats.$post({
        json: {
          title: variables.title || 'Note Chat',
          noteId: variables.noteId,
        },
      });
      return res.json() as Promise<Chat>;
    },
  );
}
