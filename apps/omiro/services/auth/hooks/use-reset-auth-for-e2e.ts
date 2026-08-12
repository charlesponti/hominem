import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { E2E_TESTING } from '~/constants';
import { authClient } from '~/services/auth/auth-client';
import { clearPersistedQueryCache } from '~/services/query-persistence';
import { LocalStore } from '~/services/storage/local-store';

export function useResetAuthForE2E() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    if (!E2E_TESTING) return;
    await authClient.signOut();
    queryClient.clear();
    await clearPersistedQueryCache();
    await LocalStore.clearAllData();
  }, [queryClient]);
}
