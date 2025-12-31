import { useCallback, useEffect, useRef, useState } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { getScrollDistanceFromBottom } from '~/lib/utils/scroll'

interface UseScrollDetectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  parentRef?: React.RefObject<HTMLDivElement | null>
  threshold?: number
  shouldUseVirtualScrolling?: boolean
}

/**
 * Hook for detecting scroll position and whether user is near bottom
 */
export function useScrollDetection({
  containerRef,
  parentRef,
  threshold = 100,
  shouldUseVirtualScrolling = false,
}: UseScrollDetectionOptions) {
  const [isNearBottom, setIsNearBottom] = useState(true)
  const userScrolledUpRef = useRef(false)

  const checkIfNearBottom = useCallback(() => {
    const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current
    if (!container) return false
    const distanceFromBottom = getScrollDistanceFromBottom(container)
    return distanceFromBottom <= threshold
  }, [containerRef, parentRef, threshold, shouldUseVirtualScrolling])

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const container = shouldUseVirtualScrolling ? parentRef?.current : containerRef.current
    if (!container) return

    const handleScroll = () => {
      const nearBottom = checkIfNearBottom()
      setIsNearBottom(nearBottom)
      userScrolledUpRef.current = !nearBottom
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [checkIfNearBottom, shouldUseVirtualScrolling, containerRef, parentRef])

  return {
    isNearBottom,
    checkIfNearBottom,
    userScrolledUp: userScrolledUpRef,
  }
}

