import { createAuthLogoutRoute } from '@hominem/ui/auth-server-routes';

import { serverEnv } from '~/lib/env';

const authLogoutRoute = createAuthLogoutRoute({
  getApiBaseUrl: () => serverEnv.VITE_PUBLIC_API_URL,
});

export const action = authLogoutRoute.action;
export const loader = authLogoutRoute.loader;
