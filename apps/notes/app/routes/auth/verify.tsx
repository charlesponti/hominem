import { createAuthVerifyRoute } from '@hominem/ui';

import { AUTH_ROUTE_CONFIG } from './config';

const authVerifyRoute = createAuthVerifyRoute(AUTH_ROUTE_CONFIG);

export const { action, loader } = authVerifyRoute;

export default authVerifyRoute.Component;
