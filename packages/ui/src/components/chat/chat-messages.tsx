import { useVirtualizer } from '@tanstack/react-virtual';
import type { RefObject } from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { useAutoScroll } from '../../lib/hooks/use-auto-scroll';
import { useMessageSearch } from '../../lib/hooks/use-message-search';
import { useScrollDetection } from '../../lib/hooks/use-scroll-detection';
import type { ExtendedMessage } from '../../types/chat';
import { ChatMessage } from './chat-message';
import { ChatSearchModal } from './chat-search-modal';
import { ChatShimmerMessage } from './chat-shimmer-message';
import { ChatThinkingIndicator } from './chat-thinking-indicator';

export interface ChatMessagesHandle {
  showSearch: () => void;
}

interface ChatMessagesProps {
  messages: ExtendedMessage[];
  status?: string;
  isLoading?: boolean;
  error?: Error | null;
  showDebug?: boolean;
  speakingId?: string | null | undefined;
  speechLoadingId?: string | null | undefined;
  onRegenerate?: ((messageId: string) => void) | undefined;
  onEdit?: ((messageId: string, newContent: string) => void) | undefined;
  onDelete?: ((messageId: string) => void) | undefined;
  onSpeak?: ((messageId: string, content: string) => void) | undefined;
}

export const ChatMessages = forwardRef<ChatMessagesHandle, ChatMessagesProps>(function ChatMessages(
  {
    messages,
    status = 'idle',
    isLoading = false,
    error,
    showDebug = false,
    speakingId,
    speechLoadingId,
    onRegenerate,
    onEdit,
    onDelete,
    onSpeak,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const [showSearch, setShowSearch] = useState(false);
  const { searchQuery, setSearchQuery, filteredMessages, searchInputRef } = useMessageSearch({
    messages,
  });

  const shouldUseVirtualScrolling = filteredMessages.length >= 50;

  const virtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
    enabled: shouldUseVirtualScrolling,
  });

  const virtualItems = useMemo(() => {
    if (!shouldUseVirtualScrolling) return null;
    return virtualizer.getVirtualItems();
  }, [shouldUseVirtualScrolling, virtualizer]);

  const { isNearBottom, checkIfNearBottom } = useScrollDetection({
    containerRef,
    parentRef,
    threshold: 100,
    shouldUseVirtualScrolling,
  });

  useAutoScroll({
    containerRef,
    parentRef,
    virtualizer,
    messageCount: filteredMessages.length,
    status,
    isNearBottom,
    shouldUseVirtualScrolling,
    checkIfNearBottom,
  });

  useImperativeHandle(ref, () => ({
    showSearch: () => {
      setShowSearch(true);
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    },
  }));

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const hasStreamingMessage =
    messages.length > 0 &&
    lastMessage !== undefined &&
    lastMessage.role === 'assistant' &&
    (status === 'streaming' || lastMessage.isStreaming);
  const showThinking = status === 'submitted' || (status === 'streaming' && !hasStreamingMessage);

  if (error) {
    // displayed below with message list shell
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ChatSearchModal
        visible={showSearch}
        searchQuery={searchQuery}
        resultCount={filteredMessages.length}
        searchInputRef={searchInputRef as RefObject<HTMLInputElement | null>}
        onClose={() => {
          setShowSearch(false);
          setSearchQuery('');
        }}
        onChangeSearchQuery={setSearchQuery}
      />

      <div
        ref={shouldUseVirtualScrolling ? parentRef : containerRef}
        className="flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-6"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
        style={
          shouldUseVirtualScrolling
            ? {
                height: '100%',
                width: '100%',
                overflow: 'auto',
              }
            : {}
        }
      >
        {error ? (
          <div
            className="mx-auto mb-6 w-full rounded-md border border-destructive/30 bg-destructive/5 p-4 shadow-sm"
            style={{ maxWidth: 720 }}
          >
            <div className="mb-1 text-sm font-semibold text-destructive">Something went wrong</div>
            <div className="text-xs text-destructive/70">
              {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
        ) : null}

        {isLoading || (messages.length === 0 && status === 'idle') ? (
          <div className="mx-auto w-full space-y-5" style={{ maxWidth: 720 }}>
            <ChatShimmerMessage />
            <ChatShimmerMessage />
            <ChatShimmerMessage />
          </div>
        ) : null}

        {shouldUseVirtualScrolling ? (
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: 720,
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems?.map((virtualItem) => {
              const message = filteredMessages[virtualItem.index];
              if (!message) return null;

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ChatMessage
                    message={message}
                    showDebug={showDebug}
                    speakingId={speakingId ?? null}
                    speechLoadingId={speechLoadingId ?? null}
                    isStreaming={
                      (status === 'streaming' &&
                        virtualItem.index === filteredMessages.length - 1 &&
                        message.role === 'assistant') ||
                      Boolean(message.isStreaming)
                    }
                    {...(message.role === 'assistant' && {
                      onRegenerate: () => onRegenerate?.(message.id),
                      onSpeak: onSpeak,
                    })}
                    {...(message.role === 'user' && {
                      onEdit: (messageId: string, newContent: string) =>
                        onEdit?.(messageId, newContent),
                    })}
                    onDelete={() => onDelete?.(message.id)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto w-full" style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {filteredMessages.length === 0 && showSearch && searchQuery ? (
                <div className="py-8 text-center text-text-secondary">
                  <div className="mb-2 text-2xl">Search</div>
                  <p>No messages found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredMessages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    showDebug={showDebug}
                    speakingId={speakingId ?? null}
                    speechLoadingId={speechLoadingId ?? null}
                    isStreaming={
                      (status === 'streaming' &&
                        index === filteredMessages.length - 1 &&
                        message.role === 'assistant') ||
                      Boolean(message.isStreaming)
                    }
                    {...(message.role === 'assistant' && {
                      onRegenerate: () => onRegenerate?.(message.id),
                      onSpeak,
                    })}
                    {...(message.role === 'user' && {
                      onEdit: (messageId: string, newContent: string) =>
                        onEdit?.(messageId, newContent),
                    })}
                    onDelete={() => onDelete?.(message.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showThinking ? <ChatThinkingIndicator /> : null}
    </div>
  );
});
