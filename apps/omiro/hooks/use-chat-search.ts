import type { ChatMessageItem } from '@hominem/chat';
import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { TextInput } from 'react-native';

import { filterMessagesByQuery } from '~/services/chat/chat-search';

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

export function useChatSearch(messages: ChatMessageItem[]) {
  const [state, dispatch] = useReducer(chatSearchReducer, initialChatSearchState);
  const searchInputRef = useRef<TextInput | null>(null);

  const displayMessages = useMemo(
    () => filterMessagesByQuery(messages, state.searchQuery),
    [messages, state.searchQuery],
  );

  const handleOpenSearch = useCallback(() => {
    dispatch({ type: 'open-search' });
    setTimeout(() => {
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
  };
}
