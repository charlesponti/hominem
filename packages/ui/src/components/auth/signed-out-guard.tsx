import { useAuth } from '@hominem/auth';
import { Navigate, useLocation } from 'react-router';

interface SignedOutGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function SignedOutGuard({ children, redirectTo = '/auth' }: SignedOutGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    const searchParams = new URLSearchParams();
    searchParams.set('next', location.pathname);
    return <Navigate to={`${redirectTo}?${searchParams.toString()}`} replace />;
  }

  return <>{children}</>;
}
