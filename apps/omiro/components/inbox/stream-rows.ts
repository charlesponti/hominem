import type { InboxStreamItemData } from './InboxStreamItem.types';

// Ids in the leading contiguous run of unseen items. A new capture lands at
// the top, so only that run slides in -- pagination appends below already-
// seen items (never in the run) and filter switches replay only seen ids, so
// both mount static.
export function getEnteringItemIds(
  items: InboxStreamItemData[],
  seenIds: ReadonlySet<string>,
): Set<string> {
  const entering = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      break;
    }
    entering.add(item.id);
  }
  return entering;
}
