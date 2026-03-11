import { createAuthEntryRoute } from '@hominem/ui';

import { AUTH_ROUTE_CONFIG } from './config';

const authEntryRoute = createAuthEntryRoute(AUTH_ROUTE_CONFIG);

export const { action, loader } = authEntryRoute;

export default authEntryRoute.Component;
