import { useChatMessages } from '~/services/chat/use-chat-messages';
import {
  hasNonEmptyListData,
  resolveRestoredQueryState,
} from '~/services/query/restored-query-state';

interface UseChatDataInput {
  chatId: string;
}

export function useChatData({ chatId }: UseChatDataInput) {
  const {
    error: messagesError,
    isFetching: isMessagesFetching,
    isPending: isMessagesPending,
    refetch: refetchMessages,
    data: messages,
  } = useChatMessages({ chatId });
  const messagesState = resolveRestoredQueryState({
    data: messages,
    isPending: isMessagesPending,
    isFetching: isMessagesFetching,
    isReady: hasNonEmptyListData,
  });

  return {
    messages: messages && messages.length > 0 ? messages : [],
    messagesError,
    isMessagesLoading: messagesState.isInitialLoading,
    isMessagesRefreshing: messagesState.isRefreshing,
    refetchMessages,
  };
}
