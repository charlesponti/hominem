import { useEffect, useState } from 'react';

/**
 * Tracks which message ids are newly appended since this hook instance first
 * saw the transcript, so entrance motion can be gated to genuinely new rows
 * and never replay for history that was already present on mount. Callers
 * that need bookkeeping reset per chat should remount the host component
 * (e.g. `key={chatId}`) rather than resetting this hook's internal state.
 */
export function useNewMessageIds(messageIds: string[]): Set<string> {
  // Lazy useState initializer instead of a ref written during render: it
  // gives the same "create once, mutate in place thereafter" semantics
  // without touching `.current` outside an effect.
  const [seenIds] = useState<Set<string>>(() => new Set(messageIds));
  const newIds = new Set(messageIds.filter((id) => !seenIds.has(id)));

  useEffect(() => {
    for (const id of messageIds) {
      seenIds.add(id);
    }
  }, [messageIds, seenIds]);

  return newIds;
}
