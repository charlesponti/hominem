import {
  createAuthEntryComponent,
} from '@hominem/ui';
import { createAuthEntryAction, createAuthEntryLoader } from '@hominem/ui/auth-server-routes';

import { AUTH_ROUTE_CONFIG } from './config';

export const loader = createAuthEntryLoader(AUTH_ROUTE_CONFIG, async (request) => {
  const { getServerSession } = await import('~/lib/auth.server');
  const { user, headers } = await getServerSession(request);

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
export const action = createAuthEntryAction(AUTH_ROUTE_CONFIG);

export default createAuthEntryComponent(AUTH_ROUTE_CONFIG);
