import { useEffect, useRef } from 'react';

/**
 * Tracks which message ids are newly appended since this hook instance first
 * saw the transcript, so entrance motion can be gated to genuinely new rows
 * and never replay for history that was already present on mount. Callers
 * that need bookkeeping reset per chat should remount the host component
 * (e.g. `key={chatId}`) rather than resetting this hook's internal state.
 */
export function useNewMessageIds(messageIds: string[]): Set<string> {
  const seenIdsRef = useRef<Set<string> | null>(null);
  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set(messageIds);
  }
  const seenIds = seenIdsRef.current;
  const newIds = new Set(messageIds.filter((id) => !seenIds.has(id)));

  useEffect(() => {
    for (const id of messageIds) {
      seenIds.add(id);
    }
  }, [messageIds, seenIds]);

  return newIds;
}
