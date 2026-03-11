import { createAuthLogoutRoute } from '@hominem/ui';

import { serverEnv } from '~/lib/env';

const authLogoutRoute = createAuthLogoutRoute({
  apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
});

export const { action, loader } = authLogoutRoute;
