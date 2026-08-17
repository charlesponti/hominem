import { useCallback } from 'react';

import { authClient } from '~/services/auth/auth-client';

export function useAuthHeaders() {
  return useCallback(async () => {
    const cookie = await authClient.getCookie();
    return cookie ? ({ cookie } satisfies Record<string, string>) : ({} as Record<string, string>);
  }, []);
}
