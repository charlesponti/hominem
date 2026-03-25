import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';

import { useAutoScroll } from '../../lib/hooks/use-auto-scroll';
import { useScrollDetection } from '../../lib/hooks/use-scroll-detection';
import type { ExtendedMessage } from '../../types/chat';
import { ChatMessage } from './chat-message';
import { ChatShimmerMessage } from './chat-shimmer-message';
import { ChatThinkingIndicator } from './chat-thinking-indicator';

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

export function ChatMessages({
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
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const shouldUseVirtualScrolling = messages.length >= 50;

  const virtualizer = useVirtualizer({
    count: messages.length,
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
    messageCount: messages.length,
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
  const showThinking = status === 'submitted' || (status === 'streaming' && !hasStreamingMessage);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={shouldUseVirtualScrolling ? parentRef : containerRef}
        className="flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-6"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
        style={
          shouldUseVirtualScrolling
            ? { height: '100%', width: '100%', overflow: 'auto' }
            : {}
        }
      >
        {error ? (
          <div className="mx-auto mb-6 w-full max-w-3xl rounded-md border border-destructive/30 bg-destructive/5 p-4 shadow-sm">
            <div className="mb-1 text-sm font-semibold text-destructive">Something went wrong</div>
            <div className="text-xs text-destructive/70">
              {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
        ) : null}

        {isLoading || (messages.length === 0 && status === 'idle') ? (
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <ChatShimmerMessage />
            <ChatShimmerMessage />
            <ChatShimmerMessage />
          </div>
        ) : null}

        {shouldUseVirtualScrolling ? (
          <div
            className="relative mx-auto w-full max-w-3xl"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualItems?.map((virtualItem) => {
              const message = messages[virtualItem.index];
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
                        virtualItem.index === messages.length - 1 &&
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex flex-col gap-6">
              {messages.length === 0 ? null : (
                messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    showDebug={showDebug}
                    speakingId={speakingId ?? null}
                    speechLoadingId={speechLoadingId ?? null}
                    isStreaming={
                      (status === 'streaming' &&
                        index === messages.length - 1 &&
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
}
