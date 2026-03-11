import { AuthRouteLayout } from '@hominem/ui';
import { Outlet } from 'react-router';

export default function AuthLayout() {
  return (
    <AuthRouteLayout>
      <Outlet />
    </AuthRouteLayout>
  );
}
