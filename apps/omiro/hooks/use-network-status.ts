import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

// Reuses React Query's onlineManager (already wired to NetInfo in
// services/query-client.ts) instead of adding a second NetInfo listener, so
// there's a single source of truth for connectivity across the app.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
  );
}
