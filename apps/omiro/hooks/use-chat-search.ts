import type { ChatMessageItem } from '@hominem/chat';
import { useApiClient } from '@hominem/rpc/react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { TextInput } from 'react-native';

import { toMessageOutput } from '~/services/chat/use-chat-messages';
import { chatKeys } from '~/services/notes/query-keys';

import { useDebouncedValue } from './use-debounced-value';

interface ChatSearchState {
  showSearch: boolean;
  searchQuery: string;
}

type ChatSearchAction =
  | { type: 'open-search' }
  | { type: 'close-search' }
  | { type: 'set-search-query'; searchQuery: string };

export const initialChatSearchState: ChatSearchState = {
  showSearch: false,
  searchQuery: '',
};

export function chatSearchReducer(
  state: ChatSearchState,
  action: ChatSearchAction,
): ChatSearchState {
  switch (action.type) {
    case 'open-search':
      return { ...state, showSearch: true };
    case 'close-search':
      return { ...state, showSearch: false, searchQuery: '' };
    case 'set-search-query':
      return { ...state, searchQuery: action.searchQuery };
  }
}

export function useChatSearch(messages: ChatMessageItem[], chatId: string) {
  const client = useApiClient();
  const [state, dispatch] = useReducer(chatSearchReducer, initialChatSearchState);
  const searchInputRef = useRef<TextInput | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) clearTimeout(focusTimerRef.current);
    };
  }, []);

  const searchQuery = state.searchQuery.trim();
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const searchResults = useQuery({
    queryKey: chatKeys.messageSearch(chatId, debouncedSearchQuery),
    queryFn: async () => {
      const res = await client.api.chats[':id'].messages.search.$get({
        param: { id: chatId },
        query: { query: debouncedSearchQuery },
      });
      const result = await res.json();
      return result.flatMap((message) => {
        const output = toMessageOutput(message);
        return output ? [output] : [];
      });
    },
    enabled: state.showSearch && debouncedSearchQuery.length > 0,
  });

  const displayMessages = useMemo(
    () => (searchQuery ? (searchResults.data ?? []) : messages),
    [messages, searchQuery, searchResults.data],
  );

  const handleOpenSearch = useCallback(() => {
    dispatch({ type: 'open-search' });
    if (focusTimerRef.current !== null) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      searchInputRef.current?.focus();
    }, 50);
  }, []);

  const handleCloseSearch = useCallback(() => {
    dispatch({ type: 'close-search' });
  }, []);

  const handleSearchQueryChange = useCallback((searchQuery: string) => {
    dispatch({ type: 'set-search-query', searchQuery });
  }, []);

  return {
    displayMessages,
    showSearch: state.showSearch,
    searchQuery: state.searchQuery,
    searchInputRef,
    handleOpenSearch,
    handleCloseSearch,
    handleSearchQueryChange,
    isSearching: searchResults.isFetching,
  };
}
