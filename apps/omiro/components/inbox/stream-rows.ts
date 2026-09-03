import type { InboxStreamItemData } from './InboxStreamItem.types';

export type StreamRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'row'; key: string; item: InboxStreamItemData };

// Ids in the leading contiguous run of unseen rows. A new capture lands at
// the top, so only that run slides in -- pagination appends below already-
// seen rows (never in the run) and filter switches replay only seen ids, so
// both mount static. Headers are skipped, never animated.
export function getEnteringItemIds(rows: StreamRow[], seenIds: ReadonlySet<string>): Set<string> {
  const entering = new Set<string>();
  for (const row of rows) {
    if (row.type !== 'row') {
      continue;
    }
    if (seenIds.has(row.item.id)) {
      break;
    }
    entering.add(row.item.id);
  }
  return entering;
}
