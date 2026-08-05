import { Outlet } from 'react-router';

import type { Route } from './+types/_authenticated-pages';

export default function AuthenticatedPagesLayout() {
  return <Outlet />;
}
