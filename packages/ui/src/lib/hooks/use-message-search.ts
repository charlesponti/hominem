import { useEffect, useMemo, useRef, useState } from 'react';

import { filterMessagesByQuery, type ExtendedMessage } from '../../types/chat';

interface UseMessageSearchOptions {
  messages: ExtendedMessage[];
  enabled?: boolean;
}

function isMac() {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

export function useMessageSearch({ messages, enabled = true }: UseMessageSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMessages = useMemo(() => {
    return filterMessagesByQuery(messages, searchQuery);
  }, [messages, searchQuery]);

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
