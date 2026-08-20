import type { QueryClient } from '@tanstack/react-query';

import { clearPersistedQueryCache } from '~/services/query-persistence';
import { LocalStore } from '~/services/storage/local-store';

// Wipes every local trace of the signed-out session (query cache, its
// persisted copy, and local-store data) so a stale, possibly wrong-account
// cache never survives into the next sign-in.
export async function clearLocalSessionState(queryClient: QueryClient) {
  queryClient.clear();
  await clearPersistedQueryCache();
  await LocalStore.clearAllData();
}
