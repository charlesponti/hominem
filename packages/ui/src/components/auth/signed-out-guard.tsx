import { useAuth } from '@hominem/auth';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';

interface SignedOutGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function SignedOutGuard({ children, redirectTo = '/auth' }: SignedOutGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const searchParams = new URLSearchParams();
      searchParams.set('next', location.pathname);
      navigate(`${redirectTo}?${searchParams.toString()}`, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname, redirectTo]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
