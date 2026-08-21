import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useChatArchive } from '~/services/chat/use-chat-archive';
import { chatKeys } from '~/services/notes/query-keys';

interface UseChatArchiveActionInput {
  chatId: string;
  onChatArchive: () => void;
}

export function useChatArchiveAction({ chatId, onChatArchive }: UseChatArchiveActionInput) {
  const queryClient = useQueryClient();
  const { mutate: archiveChat, isPending: isArchiving } = useChatArchive({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
      onChatArchive();
    },
  });

  const handleArchiveChat = useCallback(() => {
    archiveChat();
  }, [archiveChat]);

  return { handleArchiveChat, isArchiving };
}
