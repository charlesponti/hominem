import type { Virtualizer } from '@tanstack/react-virtual';

/**
 * Scrolls container to bottom, handling both virtual and regular scrolling
 */
export function scrollToBottom(
  container: HTMLDivElement | null,
  virtualizer?: Virtualizer<HTMLDivElement, Element>,
  shouldUseVirtual?: boolean,
  lastIndex?: number,
): void {
  if (!container) return;

  if (shouldUseVirtual && virtualizer && lastIndex !== undefined) {
    virtualizer.scrollToIndex(lastIndex, { align: 'end' });
  } else {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Calculates the distance from the bottom of the scroll container
 */
export function getScrollDistanceFromBottom(container: HTMLDivElement | null): number {
  if (!container) return Number.POSITIVE_INFINITY;
  return container.scrollHeight - container.scrollTop - container.clientHeight;
}
