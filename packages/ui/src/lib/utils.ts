import type { Virtualizer } from '@tanstack/react-virtual';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scrollToBottom(
  container: HTMLDivElement | null,
  virtualizer?: Virtualizer<HTMLDivElement, Element> | null,
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

export function getScrollDistanceFromBottom(container: HTMLDivElement | null): number {
  if (!container) return Number.POSITIVE_INFINITY;
  return container.scrollHeight - container.scrollTop - container.clientHeight;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
