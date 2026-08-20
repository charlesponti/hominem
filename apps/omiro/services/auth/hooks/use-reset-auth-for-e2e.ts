import { logger } from '@hominem/telemetry';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { E2E_TESTING } from '~/constants';
import { authClient } from '~/services/auth/auth-client';
import { clearLocalSessionState } from '~/services/auth/clear-local-session-state';

export function useResetAuthForE2E() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    if (!E2E_TESTING) return;
    // Best-effort: even if the server-side sign-out fails, local state must
    // still be wiped so a stale cache from a prior account never leaks in.
    await authClient
      .signOut()
      .catch((error) => logger.warn('[useResetAuthForE2E] Best-effort sign-out failed', { error }));
    await clearLocalSessionState(queryClient);
  }, [queryClient]);
}
