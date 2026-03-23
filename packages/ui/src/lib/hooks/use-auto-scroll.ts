import type { Virtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';

import { scrollToBottom } from '../utils';

interface UseAutoScrollOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef?: React.RefObject<HTMLDivElement | null>;
  virtualizer?: Virtualizer<HTMLDivElement, Element> | null;
  messageCount: number;
  status: string;
  isNearBottom: boolean;
  shouldUseVirtualScrolling: boolean;
  checkIfNearBottom?: () => boolean;
}

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

  useEffect(() => {
    const currentMessageCount = messageCount;
    const previousMessageCount = previousMessageCountRef.current;

    if ((currentMessageCount > previousMessageCount || status === 'streaming') && isNearBottom) {
      const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current;
      if (container) {
        const performScroll = () => {
          const lastIndex = messageCount > 0 ? messageCount - 1 : 0;
          scrollToBottom(container, virtualizer, shouldUseVirtualScrolling, lastIndex);
        };

        requestAnimationFrame(() => {
          performScroll();
          setTimeout(performScroll, 100);
        });
      }
    }

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

  useEffect(() => {
    if (status === 'streaming' && isNearBottom && checkIfNearBottom) {
      const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current;
      if (!container) return undefined;

      const intervalId = setInterval(() => {
        if (checkIfNearBottom()) {
          const lastIndex = messageCount > 0 ? messageCount - 1 : 0;
          scrollToBottom(container, virtualizer, shouldUseVirtualScrolling, lastIndex);
        }
      }, 100);

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