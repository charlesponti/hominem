import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useImperativeHandle, useMemo, useRef } from 'react';

import type { ExtendedMessage } from '../../types/chat';
import { filterMessagesByQuery } from '../../types/chat';
import { useAutoScroll } from './use-auto-scroll';
import { useMessageSearch } from './use-message-search';
import { useScrollDetection } from './use-scroll-detection';

export interface UseChatMessagesControllerOptions {
  messages: ExtendedMessage[];
  status: string;
  scrollThreshold?: number;
}

export interface ChatMessagesControllerRef {
  showSearch: () => void;
}

export interface ChatMessagesController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMessages: ExtendedMessage[];
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  virtualizer: ReturnType<typeof useVirtualizer> | null;
  virtualItems: ReturnType<ReturnType<typeof useVirtualizer>['getVirtualItems']> | null;
  shouldUseVirtualScrolling: boolean;
  isNearBottom: boolean;
  checkIfNearBottom: () => boolean;
  hasStreamingMessage: boolean;
  showThinkingComponent: boolean;
  displayMessages: ExtendedMessage[];
  lastMessageIndex: number;
}

export function useChatMessagesController(
  options: UseChatMessagesControllerOptions,
  ref?: React.ForwardedRef<ChatMessagesControllerRef>,
) {
  const { messages, status, scrollThreshold = 100 } = options;

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    filteredMessages,
    showSearch,
    setShowSearch,
    searchInputRef,
  } = useMessageSearch({ messages, enabled: true });

  const shouldUseVirtualScrolling = messages.length >= 50;

  const virtualizer = useMemo(() => {
    if (!shouldUseVirtualScrolling) return null;

    return useVirtualizer({
      count: filteredMessages.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 150,
      overscan: 5,
      enabled: shouldUseVirtualScrolling,
    });
  }, [filteredMessages.length, shouldUseVirtualScrolling]);

  const virtualItems = useMemo(() => {
    if (!virtualizer) return null;
    return virtualizer.getVirtualItems();
  }, [virtualizer]);

  useImperativeHandle(ref, () => ({
    showSearch: () => {
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    },
  }));

  const { isNearBottom, checkIfNearBottom } = useScrollDetection({
    containerRef: messagesContainerRef,
    parentRef,
    threshold: scrollThreshold,
    shouldUseVirtualScrolling,
  });

  useAutoScroll({
    containerRef: messagesContainerRef,
    parentRef,
    virtualizer: virtualizer ?? null,
    messageCount: filteredMessages.length,
    status,
    isNearBottom,
    shouldUseVirtualScrolling,
    checkIfNearBottom,
  });

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const hasStreamingMessage =
    messages.length > 0 &&
    lastMessage !== undefined &&
    lastMessage.role === 'assistant' &&
    (status === 'streaming' || lastMessage.isStreaming);

  const showThinkingComponent =
    status === 'submitted' || (status === 'streaming' && !hasStreamingMessage);

  return {
    containerRef: messagesContainerRef,
    parentRef,
    searchQuery,
    setSearchQuery,
    filteredMessages,
    showSearch,
    setShowSearch,
    searchInputRef,
    virtualizer,
    virtualItems,
    shouldUseVirtualScrolling,
    isNearBottom,
    checkIfNearBottom,
    hasStreamingMessage,
    showThinkingComponent,
    displayMessages: filteredMessages,
    lastMessageIndex: filteredMessages.length - 1,
  };
}