import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useChatArchive } from '~/services/chat/use-chat-archive';
import { useChatMessages } from '~/services/chat/use-chat-messages';
import { chatKeys } from '~/services/notes/query-keys';
import {
  hasNonEmptyListData,
  resolveRestoredQueryState,
} from '~/services/query/restored-query-state';

interface UseChatDataInput {
  chatId: string;
  onChatArchive: () => void;
}

export function useChatData({ chatId, onChatArchive }: UseChatDataInput) {
  const queryClient = useQueryClient();
  const {
    error: messagesError,
    isFetching: isMessagesFetching,
    isPending: isMessagesPending,
    refetch: refetchMessages,
    data: messages,
  } = useChatMessages({ chatId });
  const { mutate: archiveChat, isPending: isArchiving } = useChatArchive({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
      onChatArchive();
    },
  });
  const messagesState = resolveRestoredQueryState({
    data: messages,
    isPending: isMessagesPending,
    isFetching: isMessagesFetching,
    hasUsableData: hasNonEmptyListData,
  });

  const handleArchiveChat = useCallback(() => {
    archiveChat();
  }, [archiveChat]);

  return {
    messages: messages && messages.length > 0 ? messages : [],
    messagesError,
    isMessagesLoading: messagesState.isInitialLoading,
    isMessagesRefreshing: messagesState.isRefreshing,
    refetchMessages,
    handleArchiveChat,
    isArchiving,
  };
}
