import gsap from 'gsap';
import { useCallback, useRef } from 'react';

import { MOBILE_EXPANDED_HEIGHT_VH, PILL_HEIGHT, playSwipeSnap } from './animations';

interface UseSwipeGestureOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}

export function useSwipeGesture({
  containerRef,
  isExpanded,
  setIsExpanded,
}: UseSwipeGestureOptions) {
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const quickToRef = useRef<((value: number) => void) | null>(null);

  const getExpandedHeight = () => Math.round(window.innerHeight * MOBILE_EXPANDED_HEIGHT_VH);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
      quickToRef.current = gsap.quickTo(el, 'height', { duration: 0.05 });
    },
    [containerRef],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const el = containerRef.current;
      if (!el || !quickToRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaY = touchStartYRef.current - touch.clientY;
      const currentH = isExpanded ? getExpandedHeight() : PILL_HEIGHT;
      const newH = Math.max(PILL_HEIGHT, Math.min(getExpandedHeight(), currentH + deltaY * 0.5));
      quickToRef.current(newH);
    },
    [containerRef, isExpanded],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaY = touchStartYRef.current - touch.clientY;
      const elapsed = Date.now() - touchStartTimeRef.current;
      const velocity = Math.abs(deltaY) / elapsed;

      const shouldExpand = deltaY > 40 || (velocity > 0.5 && deltaY > 0);
      const targetHeight = shouldExpand ? getExpandedHeight() : PILL_HEIGHT;

      playSwipeSnap(el, targetHeight, () => {
        setIsExpanded(shouldExpand);
      });
    },
    [containerRef, setIsExpanded],
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
