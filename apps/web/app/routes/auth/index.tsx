import { createAuthEntryComponent } from '@hominem/ui';
import { createAuthEntryAction, createAuthEntryLoader } from '@hominem/ui/auth-server-routes';

import { AUTH_CONFIG, AUTH_SERVER_ROUTE_CONFIG } from './config';

export const loader = createAuthEntryLoader(AUTH_CONFIG, async (request) => {
  const { getServerAuth } = await import('~/lib/auth.server');
  const { user, headers } = await getServerAuth(request);

  return {
    headers,
    user: user
      ? {
          id: user.id,
          email: user.email,
          ...(user.name ? { name: user.name } : {}),
        }
      : null,
  };
});
export const action = createAuthEntryAction(AUTH_SERVER_ROUTE_CONFIG);

export default createAuthEntryComponent(AUTH_CONFIG);
