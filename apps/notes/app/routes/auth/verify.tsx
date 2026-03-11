import {
  createAuthVerifyComponent,
} from '@hominem/ui';
import { createAuthVerifyAction, createAuthVerifyLoader } from '@hominem/ui/auth-server-routes';

import { AUTH_ROUTE_CONFIG } from './config';

export const loader = createAuthVerifyLoader(AUTH_ROUTE_CONFIG, async (request) => {
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
export const action = createAuthVerifyAction(AUTH_ROUTE_CONFIG);

export default createAuthVerifyComponent(AUTH_ROUTE_CONFIG);
