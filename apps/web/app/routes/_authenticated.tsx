import { Outlet } from 'react-router';

import { requireAuthMiddleware } from '~/lib/middleware';

import type { Route } from './+types/_authenticated';

export const middleware: Route.MiddlewareFunction[] = [
  (args, next) => requireAuthMiddleware(args, next),
];

export default function AuthenticatedLayout() {
  return <Outlet />;
}
