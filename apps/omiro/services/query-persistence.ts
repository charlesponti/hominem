import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { Query, QueryKey } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { storage } from '~/services/storage/mmkv';

const QUERY_CACHE_KEY = 'omiro-react-query-v3';

export function shouldPersistQuery(query: Query<unknown, Error, unknown, QueryKey>) {
  if (query.state.status !== 'success') return false;

  const [namespace] = query.queryKey;
  if (!['inbox', 'notes', 'chats', 'tasks'].includes(String(namespace))) return false;

  return true;
}

const queryStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  removeItem: (key: string) => storage.remove(key),
  setItem: (key: string, value: string) => storage.set(key, value),
};

const queryPersister = createSyncStoragePersister({
  key: QUERY_CACHE_KEY,
  storage: queryStorage,
});

export const mobilePersistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  buster: QUERY_CACHE_KEY,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
  },
  maxAge: 7 * 24 * 60 * 60_000,
  persister: queryPersister,
};

export function clearPersistedQueryCache() {
  return queryPersister.removeClient();
}
