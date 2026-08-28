import { useApiClient } from '@hominem/rpc/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function useChatMessageSearch(chatId: string, enabled: boolean) {
  const client = useApiClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ['chats', chatId, 'message-search', debouncedQuery],
    enabled: enabled && debouncedQuery.length > 0,
    queryFn: async () => {
      const response = await client.api.chats[':id'].messages.search.$get({
        param: { id: chatId },
        query: { query: debouncedQuery, limit: '50' },
      });
      if (!response.ok) throw new Error('Unable to search this conversation.');
      return response.json();
    },
  });

  function close() {
    setQuery('');
    setDebouncedQuery('');
  }

  return {
    query,
    setQuery,
    debouncedQuery,
    results: searchQuery.data ?? [],
    isSearching: searchQuery.isFetching,
    error: searchQuery.error,
    close,
  };
}
