import type { Virtualizer } from '@tanstack/react-virtual';

import { useEffect, useRef } from 'react';

import { scrollToBottom } from '~/lib/utils/scroll';

interface UseAutoScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef?: React.RefObject<HTMLDivElement | null>;
  virtualizer?: Virtualizer<HTMLDivElement, Element>;
  messageCount: number;
  status: string;
  isNearBottom: boolean;
  shouldUseVirtualScrolling: boolean;
  checkIfNearBottom?: () => boolean;
}

/**
 * Hook for auto-scrolling to bottom when messages change or during streaming
 */
export function useAutoScroll({
  containerRef,
  parentRef,
  virtualizer,
  messageCount,
  status,
  isNearBottom,
  shouldUseVirtualScrolling,
  checkIfNearBottom,
}: UseAutoScrollOptions) {
  const previousMessageCountRef = useRef(0);

  // Auto-scroll to bottom when messages change (only if user is near bottom)
  useEffect(() => {
    const currentMessageCount = messageCount;
    const previousMessageCount = previousMessageCountRef.current;

    // Only scroll if we have new messages or if we're streaming, AND user is near bottom
    if ((currentMessageCount > previousMessageCount || status === 'streaming') && isNearBottom) {
      const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current;
      if (container) {
        const performScroll = () => {
          const lastIndex = messageCount > 0 ? messageCount - 1 : 0;
          scrollToBottom(container, virtualizer, shouldUseVirtualScrolling, lastIndex);
        };

        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          performScroll();
          // Also scroll after a small delay to handle any dynamic content rendering
          setTimeout(performScroll, 100);
        });
      }
    }

    // Update the ref with current count
    previousMessageCountRef.current = currentMessageCount;
  }, [
    messageCount,
    status,
    isNearBottom,
    shouldUseVirtualScrolling,
    virtualizer,
    containerRef,
    parentRef,
  ]);

  // Auto-scroll during streaming with a more frequent interval (only if near bottom)
  useEffect(() => {
    if (status === 'streaming' && isNearBottom && checkIfNearBottom) {
      const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current;
      if (!container) return undefined;

      const intervalId = setInterval(() => {
        if (checkIfNearBottom()) {
          const lastIndex = messageCount > 0 ? messageCount - 1 : 0;
          scrollToBottom(container, virtualizer, shouldUseVirtualScrolling, lastIndex);
        }
      }, 100); // Scroll every 100ms during streaming

      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [
    status,
    isNearBottom,
    checkIfNearBottom,
    shouldUseVirtualScrolling,
    virtualizer,
    messageCount,
    containerRef,
    parentRef,
  ]);
}
