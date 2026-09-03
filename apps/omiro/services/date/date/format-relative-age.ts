import { parseInboxTimestamp } from '@hominem/chat';

export function formatRelativeAge(activityAt: string): string {
  const parsed = parseInboxTimestamp(activityAt);
  const diffMs = Date.now() - parsed.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) {
    return 'Just now';
  }
  if (diffH < 24) {
    return `${diffH}h ago`;
  }
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}
