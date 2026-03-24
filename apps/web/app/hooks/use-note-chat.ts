import { useRpcQuery } from '@hominem/rpc/react';

import { chatQueryKeys } from '~/lib/query-keys';

export function useNoteChat(noteId: string) {
  return useRpcQuery(({ chats }) => chats.getByNote({ noteId }), {
    queryKey: chatQueryKeys.note(noteId),
    enabled: !!noteId,
    staleTime: 1000 * 60 * 5,
  });
}
