import { useEffect, useMemo, useRef, useState } from 'react';

import type { ExtendedMessage } from '~/lib/types/chat-message';

import { filterMessagesByQuery } from '~/lib/utils/message';
import { isMac } from '~/lib/utils/platform';

interface UseMessageSearchOptions {
  messages: ExtendedMessage[];
  enabled?: boolean;
}

/**
 * Hook for message search functionality with keyboard shortcuts
 */
export function useMessageSearch({ messages, enabled = true }: UseMessageSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMessages = useMemo(() => {
    return filterMessagesByQuery(messages, searchQuery);
  }, [messages, searchQuery]);

  // Focus search input when Cmd+F is pressed
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = isMac() ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, showSearch]);

  return {
    searchQuery,
    setSearchQuery,
    filteredMessages,
    showSearch,
    setShowSearch,
    searchInputRef,
  };
}
