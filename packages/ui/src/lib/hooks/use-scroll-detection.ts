import { useCallback, useEffect, useRef, useState } from 'react';

import { getScrollDistanceFromBottom } from '../utils';

interface UseScrollDetectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef?: React.RefObject<HTMLDivElement | null>;
  threshold?: number;
  shouldUseVirtualScrolling?: boolean;
}

export function useScrollDetection({
  containerRef,
  parentRef,
  threshold = 100,
  shouldUseVirtualScrolling = false,
}: UseScrollDetectionOptions) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const userScrolledUpRef = useRef(false);

  const checkIfNearBottom = useCallback(() => {
    const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current;
    if (!container) return false;
    const distanceFromBottom = getScrollDistanceFromBottom(container);
    return distanceFromBottom <= threshold;
  }, [containerRef, parentRef, threshold, shouldUseVirtualScrolling]);

  useEffect(() => {
    const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const nearBottom = checkIfNearBottom();
      setIsNearBottom(nearBottom);
      userScrolledUpRef.current = !nearBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfNearBottom, shouldUseVirtualScrolling, containerRef, parentRef]);

  return {
    isNearBottom,
    checkIfNearBottom,
    userScrolledUp: userScrolledUpRef,
  };
}