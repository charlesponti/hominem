import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';

import { useAutoScroll } from '../../lib/hooks/use-auto-scroll';
import { useScrollDetection } from '../../lib/hooks/use-scroll-detection';
import { scrollToBottom } from '../../lib/utils';
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

  const handleScrollToBottom = useCallback(() => {
    const container = shouldUseVirtualScrolling ? parentRef.current : containerRef.current;
    const lastIndex = messages.length > 0 ? messages.length - 1 : 0;
    scrollToBottom(container, virtualizer, shouldUseVirtualScrolling, lastIndex);
  }, [containerRef, parentRef, virtualizer, shouldUseVirtualScrolling, messages.length]);

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
        className="flex-1 pb-10 pt-8"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
        style={shouldUseVirtualScrolling ? { height: '100%', width: '100%', overflow: 'auto' } : {}}
      >
        {error ? (
          <div className="mx-1 mb-6 w-full rounded-xl border border-[var(--color-destructive)]/20 bg-[var(--color-destructive-subtle)] px-4 py-3">
            <div className="mb-0.5 text-sm font-semibold text-[var(--color-destructive)]">
              Something went wrong
            </div>
            <div className="text-[13px] leading-relaxed text-[var(--color-destructive)]/70">
              {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
        ) : null}

        {isLoading || (messages.length === 0 && status === 'idle') ? (
          <div className="w-full space-y-2 void-anim-stagger-list">
            <ChatShimmerMessage />
            <ChatShimmerMessage />
            <ChatShimmerMessage />
          </div>
        ) : null}

        {shouldUseVirtualScrolling ? (
          <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
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
          <div className="w-full">
            <div className="flex flex-col gap-4">
              {messages.length === 0
                ? null
                : messages.map((message, index) => (
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
                  ))}
            </div>
          </div>
        )}
      </div>

      {showThinking ? <ChatThinkingIndicator /> : null}

      {!isNearBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <button
            type="button"
            onClick={handleScrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/95 px-4 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] shadow-[var(--shadow-medium)] backdrop-blur-sm transition-all hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] hover:shadow-[var(--shadow-high)]"
            aria-label="Jump to bottom"
          >
            <ChevronDown className="size-3.5" aria-hidden />
            New messages
          </button>
        </div>
      )}
    </div>
  );
}
